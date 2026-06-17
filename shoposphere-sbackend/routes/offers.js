import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { publicBrowseRateLimiter, adminWriteRateLimiter } from "../utils/rateLimit.js";

const router = express.Router();

const VALID_ICON_TYPES = new Set(["gift", "discount", "shipping", "limited"]);

function parseOptionalDate(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOfferCurrentlyActive(offer, now = new Date()) {
  if (!offer.isActive) return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
}

function normalizeOfferBody(body = {}) {
  const iconType = VALID_ICON_TYPES.has(body.iconType) ? body.iconType : "gift";
  return {
    title: String(body.title || "").trim(),
    description: body.description != null && String(body.description).trim() ? String(body.description).trim() : null,
    iconType,
    isActive: body.isActive === "true" || body.isActive === true,
    isLimited: body.isLimited === "true" || body.isLimited === true,
    order: body.order != null && body.order !== "" ? Number(body.order) : 0,
    startsAt: parseOptionalDate(body.startsAt),
    endsAt: parseOptionalDate(body.endsAt),
  };
}

// Get active offers (public) — cached 5 min
router.get("/", publicBrowseRateLimiter, cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const now = new Date();
    const offers = await prisma.offer.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(offers.filter((offer) => isOfferCurrentlyActive(offer, now)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offers (admin)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single offer (admin)
router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create offer (admin)
router.post("/", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/offers");

    const data = normalizeOfferBody(req.body);
    if (!data.title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const offer = await prisma.offer.create({ data });
    res.status(201).json(offer);
  } catch (error) {
    console.error("Create offer error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update offer (admin)
router.put("/:id", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/offers");

    const existing = await prisma.offer.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const data = normalizeOfferBody(req.body);
    if (!data.title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const offer = await prisma.offer.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(offer);
  } catch (error) {
    console.error("Update offer error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder offers (admin)
router.post("/reorder", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    invalidateCache("/offers");

    await prisma.$transaction(
      items.map((item) =>
        prisma.offer.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder offers error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete offer (admin)
router.delete("/:id", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/offers");

    await prisma.offer.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Delete offer error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
