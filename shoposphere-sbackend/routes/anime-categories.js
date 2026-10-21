import express from "express";
import { requireRole } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { publicBrowseRateLimiter, adminWriteRateLimiter } from "../utils/rateLimit.js";
import {
  validateAnimeCategoryParent,
  assertAnimeSlugUnique,
} from "../utils/animeCategoryHierarchy.js";

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

function invalidateAnimeCategoryCaches() {
  invalidateCache("/anime-categories");
  invalidateCache("/categories");
  invalidateCache("/home");
  invalidateCache("/products");
}

// Get active top-level anime categories (public) — Cached 5 min
router.get("/", publicBrowseRateLimiter, cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const categories = await prisma.animeCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching anime categories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sub-categories of a main anime category by slug (public)
router.get("/subcategories/:slug", publicBrowseRateLimiter, async (req, res) => {
  try {
    const parent = await prisma.animeCategory.findFirst({
      where: { slug: req.params.slug, parentId: null, isActive: true },
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

// Get main anime category with children by slug (public)
router.get("/by-slug/:slug", publicBrowseRateLimiter, async (req, res) => {
  try {
    const category = await prisma.animeCategory.findFirst({
      where: { slug: req.params.slug, parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Anime category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching anime category by slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all anime categories (admin - includes inactive, parent relations)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const categories = await prisma.animeCategory.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
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
        parent: { select: { id: true, name: true, slug: true } },
        children: { orderBy: { order: "asc" } },
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
    invalidateAnimeCategoryCaches();

    const { name, slug, order, isActive, imageUrl: bodyImageUrl } = req.body;
    const parentIdRaw = req.body.parentId ?? req.body.parent_id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const parentCheck = await validateAnimeCategoryParent(null, parentIdRaw);
    if (!parentCheck.ok) {
      return res.status(400).json({ error: parentCheck.error });
    }

    let finalImageUrl = bodyImageUrl || null;
    if (req.file) {
      finalImageUrl = await getImageUrl(req.file);
    }

    const finalSlug = slug && slug.trim() ? slugify(slug.trim()) : slugify(name.trim());

    const slugCheck = await assertAnimeSlugUnique({
      slug: finalSlug,
      parentId: parentCheck.parentId,
    });
    if (!slugCheck.ok) {
      return res.status(400).json({ error: slugCheck.error });
    }

    const category = await prisma.animeCategory.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        imageUrl: finalImageUrl,
        order: order ? Number(order) : 0,
        isActive: isActive === "true" || isActive === true || isActive === undefined,
        parentId: parentCheck.parentId,
      },
    });

    res.json(category);
  } catch (error) {
    console.error("Create anime category error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A category with this name or slug already exists under this parent" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update anime category (Admin only)
router.put("/:id", requireRole("admin"), adminWriteRateLimiter, upload.single("image"), async (req, res) => {
  try {
    invalidateAnimeCategoryCaches();

    const id = Number(req.params.id);
    const { name, slug, order, isActive, existingImage, imageUrl: bodyImageUrl } = req.body;
    const parentIdRaw = req.body.parentId ?? req.body.parent_id;

    const existingCategory = await prisma.animeCategory.findUnique({ where: { id } });
    if (!existingCategory) {
      return res.status(404).json({ message: "Anime category not found" });
    }

    let nextParentId = existingCategory.parentId;
    if (parentIdRaw !== undefined) {
      const parentCheck = await validateAnimeCategoryParent(id, parentIdRaw);
      if (!parentCheck.ok) {
        return res.status(400).json({ error: parentCheck.error });
      }
      nextParentId = parentCheck.parentId;
    }

    let finalImageUrl = bodyImageUrl || existingImage || existingCategory.imageUrl;
    if (req.file) {
      finalImageUrl = await getImageUrl(req.file);
    }

    const finalSlug =
      slug && slug.trim() ? slugify(slug.trim()) : name ? slugify(name.trim()) : existingCategory.slug;

    const slugCheck = await assertAnimeSlugUnique({
      slug: finalSlug,
      parentId: nextParentId,
      excludeId: id,
    });
    if (!slugCheck.ok) {
      return res.status(400).json({ error: slugCheck.error });
    }

    const updated = await prisma.animeCategory.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        slug: finalSlug,
        imageUrl: finalImageUrl,
        ...(order !== undefined ? { order: Number(order) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" || isActive === true } : {}),
        parentId: nextParentId,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update anime category error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Another category with this name or slug already exists under this parent" });
    }
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

    invalidateAnimeCategoryCaches();

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
    const id = Number(req.params.id);

    const childCount = await prisma.animeCategory.count({ where: { parentId: id } });
    if (childCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category. It has ${childCount} subcategory(ies). Delete them first.`,
      });
    }

    invalidateAnimeCategoryCaches();

    await prisma.animeCategory.delete({
      where: { id },
    });

    res.json({ message: "Anime category deleted successfully" });
  } catch (error) {
    console.error("Delete anime category error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
