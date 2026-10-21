import express from "express";
import { requireRole } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { validateCategoryParent, assertSlugUniqueForCategory } from "../utils/categoryHierarchy.js";

const router = express.Router();

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value === "true" || value === true;
}

const categoryListInclude = {
  _count: {
    select: { products: true, children: true },
  },
  parent: {
    select: { id: true, name: true, slug: true },
  },
};

const activeChildrenInclude = {
  children: {
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      order: true,
      isActive: true,
      parentId: true,
    },
  },
};

// Get all categories (public) - Cached for 5 minutes
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const includeAnime = req.query.includeAnime !== "false";
    const forAdmin = !includeAnime;

    const categoryWhere = forAdmin
      ? {}
      : { parentId: null, isActive: true };

    const categoryQuery = {
      where: categoryWhere,
      include: {
        ...categoryListInclude,
        ...(forAdmin ? {} : activeChildrenInclude),
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    };

    const [categories, animeCategories] = await Promise.all([
      prisma.category.findMany(categoryQuery),
      includeAnime
        ? prisma.animeCategory.findMany({
            where: { isActive: true, parentId: null },
            orderBy: [{ order: "asc" }, { name: "asc" }],
          })
        : Promise.resolve([]),
    ]);

    if (!includeAnime || !animeCategories || animeCategories.length === 0) {
      return res.json(categories);
    }

    const animeProducts = await prisma.product.findMany({
      where: {
        OR: [
          { categories: { some: { category: { slug: "anime-frames" } } } },
          { name: { contains: "anime" } },
        ],
      },
      select: {
        id: true,
        name: true,
        keywords: true,
        description: true,
      },
    });

    const formattedAnimeCategories = animeCategories.map((ac) => {
      const term = (ac.name || "").toLowerCase().trim();
      const slugTerm = (ac.slug || "").toLowerCase().trim();

      const count = animeProducts.filter((p) => {
        const pName = (p.name || "").toLowerCase();
        const pDesc = (p.description || "").toLowerCase();
        const pKeywords = (p.keywords || "").toLowerCase();
        return (
          (term && (pName.includes(term) || pDesc.includes(term) || pKeywords.includes(term))) ||
          (slugTerm && (pName.includes(slugTerm) || pDesc.includes(slugTerm) || pKeywords.includes(slugTerm)))
        );
      }).length;

      return {
        id: 100000 + ac.id,
        animeCategoryId: ac.id,
        isAnimeCategory: true,
        name: ac.name,
        slug: ac.slug,
        description: `Anime Frames Collection - ${ac.name}`,
        imageUrl: ac.imageUrl,
        order: 100 + (ac.order || 0),
        createdAt: ac.createdAt,
        updatedAt: ac.updatedAt,
        _count: {
          products: count,
        },
      };
    });

    res.json([...categories, ...formattedAnimeCategories]);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sub-categories of a main category by parent slug (public)
router.get("/subcategories/:slug", async (req, res) => {
  try {
    const parent = await prisma.category.findFirst({
      where: {
        slug: req.params.slug,
        parentId: null,
        isActive: true,
      },
    });

    if (!parent) {
      return res.json({ parent: null, subCategories: [] });
    }

    const subCategories = await prisma.category.findMany({
      where: { parentId: parent.id, isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    res.json({ parent, subCategories });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a main category with its active children by slug (public)
router.get("/by-slug/:slug", async (req, res) => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        slug: req.params.slug,
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { name: "asc" }],
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching category by slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single category (public)
router.get("/:id", async (req, res) => {
  try {
    const rawId = Number(req.params.id);

    if (rawId >= 100000) {
      const animeCatId = rawId - 100000;
      const animeCat = await prisma.animeCategory.findUnique({
        where: { id: animeCatId },
      });

      if (!animeCat) {
        return res.status(404).json({ message: "Category not found" });
      }

      return res.json({
        id: rawId,
        animeCategoryId: animeCat.id,
        isAnimeCategory: true,
        name: animeCat.name,
        slug: animeCat.slug,
        description: `Anime Frames Collection - ${animeCat.name}`,
        imageUrl: animeCat.imageUrl,
        order: 100 + (animeCat.order || 0),
        createdAt: animeCat.createdAt,
        updatedAt: animeCat.updatedAt,
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: rawId },
      include: {
        products: {
          include: {
            product: { include: { variants: true, colors: true } },
          },
        },
        parent: { select: { id: true, name: true, slug: true } },
        children: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category (Admin only)
router.post("/", requireRole("admin"), upload.single("image"), async (req, res) => {
  try {
    invalidateCache("/categories");
    invalidateCache("/home");

    const { name, slug, description, order, isActive } = req.body;
    const parentIdRaw = req.body.parentId ?? req.body.parent_id;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const parentCheck = await validateCategoryParent(null, parentIdRaw);
    if (!parentCheck.ok) {
      return res.status(400).json({ message: parentCheck.error });
    }

    const finalSlug = slug && String(slug).trim() ? slugify(slug) : slugify(name);
    const slugCheck = await assertSlugUniqueForCategory({
      slug: finalSlug,
      parentId: parentCheck.parentId,
    });
    if (!slugCheck.ok) {
      return res.status(400).json({ message: slugCheck.error });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }

    const category = await prisma.category.create({
      data: {
        name: String(name).trim(),
        slug: finalSlug,
        description: description || null,
        imageUrl: imageUrl || null,
        order: order !== undefined && order !== null && order !== "" ? Number(order) : 0,
        parentId: parentCheck.parentId,
        isActive: parseBoolean(isActive, true),
      },
      include: categoryListInclude,
    });
    res.json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A category with this slug already exists under the selected parent" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update category (Admin only)
router.put("/:id", requireRole("admin"), upload.single("image"), async (req, res) => {
  try {
    invalidateCache("/categories");
    invalidateCache("/home");

    const id = Number(req.params.id);
    const { name, slug, description, existingImageUrl, order, isActive } = req.body;
    const parentIdRaw = req.body.parentId ?? req.body.parent_id;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    let nextParentId = existing.parentId;
    if (parentIdRaw !== undefined) {
      const parentCheck = await validateCategoryParent(id, parentIdRaw);
      if (!parentCheck.ok) {
        return res.status(400).json({ message: parentCheck.error });
      }
      nextParentId = parentCheck.parentId;
    }

    const finalName = name != null && String(name).trim() ? String(name).trim() : existing.name;
    const finalSlug =
      slug != null && String(slug).trim()
        ? slugify(slug)
        : name
          ? slugify(name)
          : existing.slug;

    const slugCheck = await assertSlugUniqueForCategory({
      slug: finalSlug,
      parentId: nextParentId,
      excludeId: id,
    });
    if (!slugCheck.ok) {
      return res.status(400).json({ message: slugCheck.error });
    }

    let imageUrl = existingImageUrl || existing.imageUrl || null;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: finalName,
        slug: finalSlug,
        description: description !== undefined ? description || null : existing.description,
        imageUrl,
        order: order !== undefined && order !== null && order !== "" ? Number(order) : existing.order,
        parentId: nextParentId,
        ...(isActive !== undefined ? { isActive: parseBoolean(isActive, existing.isActive) } : {}),
      },
      include: categoryListInclude,
    });
    res.json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A category with this slug already exists under the selected parent" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update order for multiple categories (Admin only)
router.post("/reorder", requireRole("admin"), async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    invalidateCache("/categories");
    invalidateCache("/home");

    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder categories error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const categoryId = Number(req.params.id);

    const childCount = await prisma.category.count({
      where: { parentId: categoryId },
    });
    if (childCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It has ${childCount} subcategory(ies). Delete or reassign them first.`,
      });
    }

    const productsCount = await prisma.product.count({
      where: { categories: { some: { categoryId } } },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${productsCount} product(s) are still using this category. Please delete or reassign the products first.`,
      });
    }

    invalidateCache("/categories");
    invalidateCache("/home");

    await prisma.category.delete({
      where: { id: categoryId },
    });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        message: "Cannot delete category. It is still being used by products or subcategories.",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
