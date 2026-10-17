import express from "express";
import { requireRole } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { publicBrowseRateLimiter, adminWriteRateLimiter } from "../utils/rateLimit.js";

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// Get all active TOP-LEVEL anime categories (public) with their children - Cached 5 min
router.get("/", publicBrowseRateLimiter, cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const categories = await prisma.animeCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: "asc" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching anime categories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sub-categories of a specific parent category by slug (public)
router.get("/subcategories/:slug", publicBrowseRateLimiter, async (req, res) => {
  try {
    const parent = await prisma.animeCategory.findFirst({
      where: { slug: req.params.slug, isActive: true },
    });

    if (!parent) {
      return res.json({ parent: null, subCategories: [] });
    }

    const subCategories = await prisma.animeCategory.findMany({
      where: { parentId: parent.id, isActive: true },
      orderBy: { order: "asc" },
    });

    res.json({ parent, subCategories });
  } catch (error) {
    console.error("Error fetching anime subcategories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single category with its children by slug (public) — powers /anime-frames/:slug
router.get("/by-slug/:slug", publicBrowseRateLimiter, async (req, res) => {
  try {
    const category = await prisma.animeCategory.findFirst({
      where: { slug: req.params.slug, isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching anime category by slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all anime categories (admin - includes inactive, parent-child relations)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const categories = await prisma.animeCategory.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        children: {
          orderBy: { order: "asc" },
        },
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching all anime categories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single anime category (admin)
router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const category = await prisma.animeCategory.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        children: { orderBy: { order: "asc" } },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Anime category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching anime category:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create anime category (Admin only)
router.post("/", requireRole("admin"), adminWriteRateLimiter, upload.single("image"), async (req, res) => {
  try {
    invalidateCache("/anime-categories");
    invalidateCache("/categories");
    invalidateCache("/home");
    invalidateCache("/products");

    const { name, slug, order, isActive, imageUrl: bodyImageUrl, parentId } = req.body;


    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    let finalImageUrl = bodyImageUrl || null;
    if (req.file) {
      finalImageUrl = await getImageUrl(req.file);
    }

    const finalSlug = (slug && slug.trim()) ? slugify(slug.trim()) : slugify(name.trim());

    // Check unique slug or name
    const existing = await prisma.animeCategory.findFirst({
      where: {
        OR: [{ name: name.trim() }, { slug: finalSlug }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: "A category with this name or slug already exists" });
    }

    // Validate parentId if provided
    let finalParentId = null;
    if (parentId && String(parentId).trim() !== "" && String(parentId) !== "0") {
      const parentCat = await prisma.animeCategory.findUnique({ where: { id: Number(parentId) } });
      if (!parentCat) {
        return res.status(400).json({ error: "Parent category not found" });
      }
      finalParentId = parentCat.id;
    }

    const category = await prisma.animeCategory.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        imageUrl: finalImageUrl,
        order: order ? Number(order) : 0,
        isActive: isActive === "true" || isActive === true || isActive === undefined,
        parentId: finalParentId,
      },
    });

    res.json(category);
  } catch (error) {
    console.error("Create anime category error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update anime category (Admin only)
router.put("/:id", requireRole("admin"), adminWriteRateLimiter, upload.single("image"), async (req, res) => {
  try {
    invalidateCache("/anime-categories");
    invalidateCache("/categories");
    invalidateCache("/home");
    invalidateCache("/products");

    const id = Number(req.params.id);
    const { name, slug, order, isActive, existingImage, imageUrl: bodyImageUrl, parentId } = req.body;

    const existingCategory = await prisma.animeCategory.findUnique({ where: { id } });
    if (!existingCategory) {
      return res.status(404).json({ message: "Anime category not found" });
    }

    let finalImageUrl = bodyImageUrl || existingImage || existingCategory.imageUrl;
    if (req.file) {
      finalImageUrl = await getImageUrl(req.file);
    }

    const finalSlug = (slug && slug.trim()) ? slugify(slug.trim()) : (name ? slugify(name.trim()) : existingCategory.slug);

    // Check unique constraint excluding current
    if (name || slug) {
      const duplicate = await prisma.animeCategory.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [name ? { name: name.trim() } : undefined, { slug: finalSlug }].filter(Boolean) },
          ],
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: "Another category with this name or slug already exists" });
      }
    }

    // Handle parentId update
    let finalParentId = existingCategory.parentId;
    if (parentId !== undefined) {
      if (parentId === null || String(parentId).trim() === "" || String(parentId) === "0") {
        finalParentId = null;
      } else {
        const parsedParentId = Number(parentId);
        if (parsedParentId === id) {
          return res.status(400).json({ error: "A category cannot be its own parent" });
        }
        const parentCat = await prisma.animeCategory.findUnique({ where: { id: parsedParentId } });
        if (!parentCat) {
          return res.status(400).json({ error: "Parent category not found" });
        }
        finalParentId = parsedParentId;
      }
    }

    const updated = await prisma.animeCategory.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        slug: finalSlug,
        imageUrl: finalImageUrl,
        ...(order !== undefined ? { order: Number(order) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" || isActive === true } : {}),
        parentId: finalParentId,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update anime category error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder categories (Admin only)
router.post("/reorder", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    invalidateCache("/anime-categories");
    invalidateCache("/categories");
    invalidateCache("/home");
    invalidateCache("/products");

    await prisma.$transaction(
      items.map((item) =>
        prisma.animeCategory.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Categories reordered successfully" });
  } catch (error) {
    console.error("Reorder anime categories error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete anime category (Admin only)
router.delete("/:id", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    invalidateCache("/anime-categories");
    invalidateCache("/categories");
    invalidateCache("/home");
    invalidateCache("/products");

    await prisma.animeCategory.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Anime category deleted successfully" });
  } catch (error) {
    console.error("Delete anime category error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
