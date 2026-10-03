import express from "express";
import prisma from "../prisma.js";
import { requireRole } from "../utils/auth.js";

const router = express.Router();

export const DEFAULT_FRAME_DESIGNS = [
  {
    name: "Standard Acrylic",
    slug: "standard-acrylic",
    description: "Ultra-sleek frameless cast optical acrylic with polished beveled edges.",
    priceOffset: 0,
    badge: "Classic",
    displayOrder: 0,
    isActive: true,
  },
  {
    name: "Neon Glow",
    slug: "neon-glow",
    description: "USB-powered ambient neon backlight that illuminates the anime artwork in the dark.",
    priceOffset: 450,
    badge: "Otaku Favorite",
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "3D",
    slug: "3d",
    description: "Multi-layered depth dimensional acrylic framing with floating pop-out visual effect.",
    priceOffset: 350,
    badge: "Trending",
    displayOrder: 2,
    isActive: true,
  },
];

/**
 * Ensures default frame designs exist in the database.
 */
export async function ensureDefaultAnimeFrameDesigns() {
  try {
    for (const d of DEFAULT_FRAME_DESIGNS) {
      const existing = await prisma.animeFrameDesign.findUnique({
        where: { slug: d.slug },
      });
      if (!existing) {
        await prisma.animeFrameDesign.create({ data: d });
        console.log(`[ensureDefaultAnimeFrameDesigns] Created design '${d.name}' (+₹${d.priceOffset})`);
      }
    }
  } catch (err) {
    console.error("[ensureDefaultAnimeFrameDesigns] Error:", err);
  }
}

/**
 * GET /anime-frame-designs (Public)
 * Returns all active frame designs ordered by displayOrder.
 */
router.get("/anime-frame-designs", async (req, res) => {
  try {
    const designs = await prisma.animeFrameDesign.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
    res.json(designs);
  } catch (error) {
    console.error("Error fetching anime frame designs:", error);
    res.status(500).json({ error: "Failed to fetch frame designs" });
  }
});

/**
 * GET /admin/anime-frame-designs (Admin only)
 * Returns all frame designs including inactive ones.
 */
router.get("/admin/anime-frame-designs", requireRole("admin"), async (req, res) => {
  try {
    const designs = await prisma.animeFrameDesign.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
    res.json(designs);
  } catch (error) {
    console.error("Error fetching admin frame designs:", error);
    res.status(500).json({ error: "Failed to fetch frame designs" });
  }
});

/**
 * POST /admin/anime-frame-designs (Admin only)
 * Create a new frame design with custom pricing.
 */
router.post("/admin/anime-frame-designs", requireRole("admin"), async (req, res) => {
  try {
    const { name, description, priceOffset, badge, imageUrl, isActive, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Design name is required" });
    }

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const existing = await prisma.animeFrameDesign.findFirst({
      where: {
        OR: [{ name: cleanName }, { slug }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: "A design with this name already exists" });
    }

    const created = await prisma.animeFrameDesign.create({
      data: {
        name: cleanName,
        slug,
        description: description?.trim() || null,
        priceOffset: Number(priceOffset) >= 0 ? Number(priceOffset) : 0,
        badge: badge?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        isActive: isActive !== false,
        displayOrder: Number.isInteger(Number(displayOrder)) ? Number(displayOrder) : 0,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating frame design:", error);
    res.status(500).json({ error: error.message || "Failed to create frame design" });
  }
});

/**
 * PUT /admin/anime-frame-designs/:id (Admin only)
 * Update existing frame design and pricing.
 */
router.put("/admin/anime-frame-designs/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid design ID" });
    }

    const { name, description, priceOffset, badge, imageUrl, isActive, displayOrder } = req.body;

    const existing = await prisma.animeFrameDesign.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Frame design not found" });
    }

    const updateData = {};
    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) return res.status(400).json({ error: "Design name cannot be empty" });
      updateData.name = cleanName;
      updateData.slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priceOffset !== undefined) updateData.priceOffset = Math.max(0, Number(priceOffset) || 0);
    if (badge !== undefined) updateData.badge = badge?.trim() || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder) || 0;

    const updated = await prisma.animeFrameDesign.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating frame design:", error);
    res.status(500).json({ error: error.message || "Failed to update frame design" });
  }
});

/**
 * DELETE /admin/anime-frame-designs/:id (Admin only)
 * Delete a frame design.
 */
router.delete("/admin/anime-frame-designs/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid design ID" });
    }

    await prisma.animeFrameDesign.delete({ where: { id } });
    res.json({ message: "Design deleted successfully" });
  } catch (error) {
    console.error("Error deleting frame design:", error);
    res.status(500).json({ error: error.message || "Failed to delete frame design" });
  }
});

export default router;
