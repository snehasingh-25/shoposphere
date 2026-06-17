import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { publicBrowseRateLimiter, adminWriteRateLimiter } from "../utils/rateLimit.js";

const router = express.Router();

const VALID_ICON_TYPES = new Set(["dispatch", "gift", "shipping", "cod", "return", "limited"]);

function parseOptionalDate(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isAnnouncementActive(item, now = new Date()) {
  if (!item.isActive) return false;
  if (item.startsAt && item.startsAt > now) return false;
  if (item.endsAt && item.endsAt < now) return false;
  if (item.showCountdown && item.countdownEndsAt && item.countdownEndsAt < now) return false;
  return true;
}

function normalizeAnnouncementBody(body = {}) {
  const iconType = VALID_ICON_TYPES.has(body.iconType) ? body.iconType : "gift";
  const showCountdown = body.showCountdown === "true" || body.showCountdown === true;
  const linkUrl = body.linkUrl != null && String(body.linkUrl).trim() ? String(body.linkUrl).trim() : null;

  return {
    message: String(body.message || "").trim(),
    iconType,
    linkUrl,
    isActive: body.isActive === "true" || body.isActive === true,
    order: body.order != null && body.order !== "" ? Number(body.order) : 0,
    startsAt: parseOptionalDate(body.startsAt),
    endsAt: parseOptionalDate(body.endsAt),
    showCountdown,
    countdownEndsAt: showCountdown ? parseOptionalDate(body.countdownEndsAt) : null,
  };
}

router.get("/", publicBrowseRateLimiter, cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const now = new Date();
    const items = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.json(items.filter((item) => isAnnouncementActive(item, now)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const items = await prisma.announcement.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const item = await prisma.announcement.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!item) return res.status(404).json({ message: "Announcement not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/announcements");
    const data = normalizeAnnouncementBody(req.body);
    if (!data.message) return res.status(400).json({ error: "Message is required" });
    if (data.showCountdown && !data.countdownEndsAt) {
      return res.status(400).json({ error: "Countdown end date is required when countdown is enabled" });
    }
    const item = await prisma.announcement.create({ data });
    res.status(201).json(item);
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/announcements");
    const existing = await prisma.announcement.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!existing) return res.status(404).json({ message: "Announcement not found" });

    const data = normalizeAnnouncementBody(req.body);
    if (!data.message) return res.status(400).json({ error: "Message is required" });
    if (data.showCountdown && !data.countdownEndsAt) {
      return res.status(400).json({ error: "Countdown end date is required when countdown is enabled" });
    }

    const item = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/reorder", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "Items must be an array" });

    invalidateCache("/announcements");
    await prisma.$transaction(
      items.map((item) =>
        prisma.announcement.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );
    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder announcements error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/announcements");
    await prisma.announcement.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
