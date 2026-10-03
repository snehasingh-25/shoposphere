import express from "express";
import prisma from "../prisma.js";
import { requireRole } from "../utils/auth.js";
import { roundToTwo } from "../utils/animeFrameBundle.js";

const router = express.Router();

// ─── PUBLIC ENDPOINTS ────────────────────────────────────────────────────────

/**
 * GET /bundles/anime-frames
 * Public: returns all active Anime Frame bundles ordered by displayOrder, then quantity.
 */
router.get("/bundles/anime-frames", async (req, res) => {
  try {
    const bundles = await prisma.animeFrameBundle.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { quantity: "asc" }],
    });
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch bundle offers" });
  }
});

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

/**
 * GET /admin/bundles/anime-frames
 * Admin: returns all bundles (active and inactive).
 */
router.get("/admin/bundles/anime-frames", requireRole("admin"), async (req, res) => {
  try {
    const bundles = await prisma.animeFrameBundle.findMany({
      orderBy: [{ displayOrder: "asc" }, { quantity: "asc" }],
    });
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch bundles for admin" });
  }
});

/**
 * POST /admin/bundles/anime-frames
 * Admin: creates a new bundle offer.
 * Required fields: name, quantity (>0), price (>0).
 * Duplicate quantities are rejected.
 */
router.post("/admin/bundles/anime-frames", requireRole("admin"), async (req, res) => {
  try {
    const { name, quantity, price, offerLabel, isActive, displayOrder } = req.body || {};

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Bundle name is required" });
    }

    const parsedQty = parseInt(quantity, 10);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: "Quantity must be an integer greater than 0" });
    }

    const parsedPrice = roundToTwo(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "Bundle price must be greater than 0" });
    }

    // Check unique quantity constraint
    const existing = await prisma.animeFrameBundle.findUnique({
      where: { quantity: parsedQty },
    });
    if (existing) {
      return res.status(400).json({
        error: `A bundle with quantity ${parsedQty} already exists ("${existing.name}"). Quantities must be unique.`,
      });
    }

    const bundle = await prisma.animeFrameBundle.create({
      data: {
        name: trimmedName,
        quantity: parsedQty,
        price: parsedPrice,
        offerLabel: offerLabel ? String(offerLabel).trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) || 0 : 0,
      },
    });

    res.status(201).json(bundle);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A bundle with this quantity already exists" });
    }
    res.status(500).json({ error: error.message || "Failed to create bundle" });
  }
});

/**
 * PUT /admin/bundles/anime-frames/reorder
 * Admin: updates display order for a list of bundles: [{ id, displayOrder }]
 * NOTE: Placed BEFORE /:id route to prevent route collision.
 */
router.put("/admin/bundles/anime-frames/reorder", requireRole("admin"), async (req, res) => {
  try {
    const { orders } = req.body || {};
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: "orders array is required" });
    }

    await prisma.$transaction(
      orders.map((item) =>
        prisma.animeFrameBundle.update({
          where: { id: parseInt(item.id, 10) },
          data: { displayOrder: parseInt(item.displayOrder, 10) || 0 },
        })
      )
    );

    const bundles = await prisma.animeFrameBundle.findMany({
      orderBy: [{ displayOrder: "asc" }, { quantity: "asc" }],
    });
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to reorder bundles" });
  }
});

/**
 * PUT /admin/bundles/anime-frames/:id
 * Admin: updates an existing bundle offer.
 */
router.put("/admin/bundles/anime-frames/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid bundle ID" });
    }

    const { name, quantity, price, offerLabel, isActive, displayOrder } = req.body || {};

    const existing = await prisma.animeFrameBundle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    const trimmedName = name !== undefined ? String(name).trim() : existing.name;
    if (!trimmedName) {
      return res.status(400).json({ error: "Bundle name cannot be empty" });
    }

    let parsedQty = existing.quantity;
    if (quantity !== undefined) {
      parsedQty = parseInt(quantity, 10);
      if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: "Quantity must be an integer greater than 0" });
      }

      // If quantity is changing, check uniqueness
      if (parsedQty !== existing.quantity) {
        const conflict = await prisma.animeFrameBundle.findFirst({
          where: { quantity: parsedQty, NOT: { id } },
        });
        if (conflict) {
          return res.status(400).json({
            error: `Another bundle with quantity ${parsedQty} already exists ("${conflict.name}").`,
          });
        }
      }
    }

    let parsedPrice = existing.price;
    if (price !== undefined) {
      parsedPrice = roundToTwo(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Bundle price must be greater than 0" });
      }
    }

    const updated = await prisma.animeFrameBundle.update({
      where: { id },
      data: {
        name: trimmedName,
        quantity: parsedQty,
        price: parsedPrice,
        offerLabel: offerLabel !== undefined ? (offerLabel ? String(offerLabel).trim() : null) : existing.offerLabel,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) || 0 : existing.displayOrder,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A bundle with this quantity already exists" });
    }
    res.status(500).json({ error: error.message || "Failed to update bundle" });
  }
});

/**
 * PATCH /admin/bundles/anime-frames/:id/toggle
 * Admin: quickly toggles active/inactive status.
 */
router.patch("/admin/bundles/anime-frames/:id/toggle", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.animeFrameBundle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    const updated = await prisma.animeFrameBundle.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to toggle bundle status" });
  }
});

/**
 * DELETE /admin/bundles/anime-frames/:id
 * Admin: deletes a bundle offer.
 */
router.delete("/admin/bundles/anime-frames/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.animeFrameBundle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    await prisma.animeFrameBundle.delete({ where: { id } });
    res.json({ success: true, message: `Bundle "${existing.name}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to delete bundle" });
  }
});

export default router;
