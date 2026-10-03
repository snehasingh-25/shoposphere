import express from "express";
import prisma from "../prisma.js";
import { requireRole } from "../utils/auth.js";
import { uploadProductMedia, getImageUrl, getProductImageMeta } from "../utils/upload.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { publicBrowseRateLimiter } from "../utils/rateLimit.js";
import { ANIME_FRAMES_CATEGORY_SLUG } from "../utils/animeFrameBundle.js";

const router = express.Router();

function parseJsonArray(raw) {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function deriveSizesFromVariants(variants = []) {
  const byLabel = new Map();
  for (const v of variants) {
    if (!v?.sizeLabel) continue;
    const key = String(v.sizeLabel).trim();
    if (!key) continue;
    if (!byLabel.has(key)) {
      byLabel.set(key, {
        id: v.id,
        label: key,
        price: Number(v.price || 0),
        originalPrice: v.originalPrice != null ? Number(v.originalPrice) : null,
        stock: Math.max(0, Number(v.stock || 0)),
      });
      continue;
    }
    const current = byLabel.get(key);
    const nextPrice = Number(v.price || 0);
    if (nextPrice < current.price) {
      current.price = nextPrice;
      current.id = v.id;
      current.originalPrice = v.originalPrice != null ? Number(v.originalPrice) : current.originalPrice;
    }
    current.stock += Math.max(0, Number(v.stock || 0));
  }
  return [...byLabel.values()];
}

function normalizeAnimeFrameProduct(p) {
  return {
    ...p,
    isAnimeFrame: true,
    isActive: p.isActive !== false,
    beforeImage: p.beforeImage || null,
    afterImage: p.afterImage || null,
    returnExchangeInfo: p.returnExchangeInfo || null,
    animeSeries: p.animeSeries || "All Series",
    images: p.images ? parseJsonArray(p.images) : [],
    imagesMeta: p.imagesMeta ? parseJsonArray(p.imagesMeta) : null,
    videos: p.videos ? parseJsonArray(p.videos) : [],
    keywords: p.keywords ? parseJsonArray(p.keywords) : [],
    categories: p.categories ? p.categories.map((pc) => pc.category) : [],
    sizes: deriveSizesFromVariants(p.variants || []),
    minPrice: (p.variants || []).length > 0
      ? Math.min(...p.variants.map((v) => Number(v.price || 0)))
      : (p.originalPrice || 699),
  };
}

// ─── GET /anime-frames (Public Active Anime Frames) ───────────────────────────
router.get("/", publicBrowseRateLimiter, cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const { series, search } = req.query;

    const where = {
      isAnimeFrame: true,
      isActive: true,
    };

    if (series && series !== "All Series") {
      where.OR = [
        { animeSeries: series },
        { name: { contains: series } },
        { description: { contains: series } },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { animeSeries: { contains: search } },
          ],
        },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: true,
        categories: { include: { category: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(products.map(normalizeAnimeFrameProduct));
  } catch (error) {
    console.error("Error fetching anime frames:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /anime-frames/all (Admin All Anime Frames, including inactive) ────────
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const { series, search } = req.query;

    const where = {
      isAnimeFrame: true,
    };

    if (series && series !== "All Series") {
      where.animeSeries = series;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { animeSeries: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: true,
        categories: { include: { category: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(products.map(normalizeAnimeFrameProduct));
  } catch (error) {
    console.error("Error fetching all anime frames for admin:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /anime-frames/:id (Single Anime Frame) ─────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        categories: { include: { category: true } },
      },
    });

    if (!product || !product.isAnimeFrame) {
      return res.status(404).json({ error: "Anime frame product not found" });
    }

    res.json(normalizeAnimeFrameProduct(product));
  } catch (error) {
    console.error("Error fetching single anime frame:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /anime-frames (Admin Create Anime Frame) ─────────────────────────────
router.post("/", requireRole("admin"), uploadProductMedia, async (req, res) => {
  try {
    invalidateCache("/products");
    invalidateCache("/anime-frames");

    const {
      name,
      price,
      originalPrice,
      description,
      returnExchangeInfo,
      animeSeries,
      badge,
      isActive,
      keywords,
      existingImages,
      beforeImageUrl,
      afterImageUrl,
      sizes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const basePrice = parseFloat(price) || 0;
    if (basePrice <= 0) {
      return res.status(400).json({ error: "Please enter a valid price" });
    }

    const baseOriginalPrice = originalPrice ? parseFloat(originalPrice) : null;

    // 1. Process Product Images (Sharp -> WebP -> Cloudinary)
    const imageFiles = req.files?.images || [];
    const uploadedImageUrls = [];
    const uploadedImageMetas = [];

    for (const file of imageFiles) {
      try {
        const meta = await getProductImageMeta(file, "new-af");
        uploadedImageMetas.push(meta);
        uploadedImageUrls.push(meta.variants.large);
      } catch (err) {
        console.error("Image upload error:", err);
      }
    }

    const parsedExistingImages = parseJsonArray(existingImages);
    const finalImages = [...parsedExistingImages, ...uploadedImageUrls];

    if (finalImages.length === 0) {
      return res.status(400).json({ error: "Please provide at least one product image" });
    }

    // 2. Process Before Image (file upload or URL)
    let finalBeforeImage = beforeImageUrl ? String(beforeImageUrl).trim() : null;
    if (req.files?.beforeImage?.[0]) {
      try {
        finalBeforeImage = await getImageUrl(req.files.beforeImage[0]);
      } catch (err) {
        console.error("Before image upload error:", err);
      }
    }

    // 3. Process After Image (file upload or URL)
    let finalAfterImage = afterImageUrl ? String(afterImageUrl).trim() : null;
    if (req.files?.afterImage?.[0]) {
      try {
        finalAfterImage = await getImageUrl(req.files.afterImage[0]);
      } catch (err) {
        console.error("After image upload error:", err);
      }
    }

    // 4. Keywords
    let keywordsArray = parseJsonArray(keywords);
    if (!keywordsArray.length) {
      keywordsArray = [
        "anime",
        "frame",
        "wall art",
        name.trim(),
        animeSeries ? animeSeries.trim() : "",
      ].filter(Boolean);
    }

    // 5. Ensure Anime Frames category exists
    let animeCat = await prisma.category.findFirst({
      where: { slug: ANIME_FRAMES_CATEGORY_SLUG },
    });
    if (!animeCat) {
      animeCat = await prisma.category.create({
        data: {
          name: "Anime Frames",
          slug: ANIME_FRAMES_CATEGORY_SLUG,
          description: "Premium Acrylic & LED Anime Wall Art Frames",
        },
      });
    }

    // 6. Create Product
    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : "",
        badge: badge ? badge.trim() : null,
        originalPrice: baseOriginalPrice,
        images: JSON.stringify(finalImages),
        imagesMeta: uploadedImageMetas.length ? JSON.stringify(uploadedImageMetas) : null,
        keywords: JSON.stringify(keywordsArray),
        isAnimeFrame: true,
        isActive: isActive !== "false" && isActive !== false,
        beforeImage: finalBeforeImage,
        afterImage: finalAfterImage,
        returnExchangeInfo: returnExchangeInfo ? returnExchangeInfo.trim() : null,
        animeSeries: animeSeries ? animeSeries.trim() : "All Series",
        categories: {
          create: [{ categoryId: animeCat.id }],
        },
      },
    });

    // 7. Create Standard Frame Variants (A4, A3, A2) or Custom Sizes
    const parsedSizes = parseJsonArray(sizes);
    const variantsToCreate = parsedSizes.length > 0
      ? parsedSizes.map((s, idx) => ({
          sizeLabel: String(s.label || s.sizeLabel || "Standard").trim(),
          price: parseFloat(s.price) || basePrice,
          originalPrice: s.originalPrice ? parseFloat(s.originalPrice) : baseOriginalPrice,
          stock: parseInt(s.stock, 10) || 50,
          sku: `AF-${newProduct.id}-${idx + 1}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          isActive: true,
        }))
      : [
          {
            sizeLabel: "A4",
            price: basePrice,
            originalPrice: baseOriginalPrice,
            stock: 50,
            sku: `AF-${newProduct.id}-A4`,
            isActive: true,
          },
          {
            sizeLabel: "A3",
            price: basePrice + 400,
            originalPrice: baseOriginalPrice ? baseOriginalPrice + 400 : null,
            stock: 50,
            sku: `AF-${newProduct.id}-A3`,
            isActive: true,
          },
          {
            sizeLabel: "A2",
            price: basePrice + 900,
            originalPrice: baseOriginalPrice ? baseOriginalPrice + 900 : null,
            stock: 50,
            sku: `AF-${newProduct.id}-A2`,
            isActive: true,
          },
        ];

    for (const v of variantsToCreate) {
      await prisma.productVariant.create({
        data: {
          productId: newProduct.id,
          sizeLabel: v.sizeLabel,
          price: v.price,
          originalPrice: v.originalPrice,
          stock: v.stock,
          sku: v.sku,
          isActive: true,
        },
      });
    }

    const created = await prisma.product.findUnique({
      where: { id: newProduct.id },
      include: {
        variants: true,
        categories: { include: { category: true } },
      },
    });

    res.status(201).json(normalizeAnimeFrameProduct(created));
  } catch (error) {
    console.error("Error creating anime frame:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT /anime-frames/:id (Admin Update Anime Frame) ──────────────────────────
router.put("/:id", requireRole("admin"), uploadProductMedia, async (req, res) => {
  try {
    invalidateCache("/products");
    invalidateCache("/anime-frames");

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const {
      name,
      price,
      originalPrice,
      description,
      returnExchangeInfo,
      animeSeries,
      badge,
      isActive,
      keywords,
      existingImages,
      beforeImageUrl,
      afterImageUrl,
      removeBeforeImage,
      removeAfterImage,
      sizes,
    } = req.body;

    // 1. Process Product Images
    const imageFiles = req.files?.images || [];
    const uploadedImageUrls = [];
    const uploadedImageMetas = [];

    for (const file of imageFiles) {
      try {
        const meta = await getProductImageMeta(file, id);
        uploadedImageMetas.push(meta);
        uploadedImageUrls.push(meta.variants.large);
      } catch (err) {
        console.error("Image upload error:", err);
      }
    }

    const parsedExistingImages = parseJsonArray(existingImages);
    const finalImages = [...parsedExistingImages, ...uploadedImageUrls];

    // 2. Before Image handling
    let finalBeforeImage = existingProduct.beforeImage;
    if (removeBeforeImage === "true" || removeBeforeImage === true) {
      finalBeforeImage = null;
    } else if (req.files?.beforeImage?.[0]) {
      finalBeforeImage = await getImageUrl(req.files.beforeImage[0]);
    } else if (beforeImageUrl !== undefined) {
      finalBeforeImage = beforeImageUrl ? String(beforeImageUrl).trim() : null;
    }

    // 3. After Image handling
    let finalAfterImage = existingProduct.afterImage;
    if (removeAfterImage === "true" || removeAfterImage === true) {
      finalAfterImage = null;
    } else if (req.files?.afterImage?.[0]) {
      finalAfterImage = await getImageUrl(req.files.afterImage[0]);
    } else if (afterImageUrl !== undefined) {
      finalAfterImage = afterImageUrl ? String(afterImageUrl).trim() : null;
    }

    const updateData = {
      isAnimeFrame: true,
      beforeImage: finalBeforeImage,
      afterImage: finalAfterImage,
    };

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : "";
    if (badge !== undefined) updateData.badge = badge ? badge.trim() : null;
    if (returnExchangeInfo !== undefined) updateData.returnExchangeInfo = returnExchangeInfo ? returnExchangeInfo.trim() : null;
    if (animeSeries !== undefined) updateData.animeSeries = animeSeries ? animeSeries.trim() : "All Series";
    if (isActive !== undefined) updateData.isActive = isActive !== "false" && isActive !== false;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (finalImages.length > 0) updateData.images = JSON.stringify(finalImages);
    if (keywords !== undefined) updateData.keywords = JSON.stringify(parseJsonArray(keywords));

    await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // 4. Update Price / Variants
    const basePrice = parseFloat(price);
    const parsedSizes = parseJsonArray(sizes);

    if (parsedSizes.length > 0) {
      // Update each variant by label or create if missing
      for (const s of parsedSizes) {
        const label = String(s.label || s.sizeLabel).trim();
        const vPrice = parseFloat(s.price) || (basePrice > 0 ? basePrice : 699);
        const vOriginal = s.originalPrice ? parseFloat(s.originalPrice) : updateData.originalPrice;
        const vStock = parseInt(s.stock, 10) || 50;

        const existingV = existingProduct.variants.find((v) => v.sizeLabel === label);
        if (existingV) {
          await prisma.productVariant.update({
            where: { id: existingV.id },
            data: {
              price: vPrice,
              originalPrice: vOriginal,
              stock: vStock,
              isActive: true,
            },
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId: id,
              sizeLabel: label,
              price: vPrice,
              originalPrice: vOriginal,
              stock: vStock,
              sku: `AF-${id}-${label}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              isActive: true,
            },
          });
        }
      }
    } else if (basePrice > 0) {
      // Update base variant (A4) and adjust other existing variants accordingly
      const primaryVariant = existingProduct.variants[0];
      if (primaryVariant) {
        await prisma.productVariant.update({
          where: { id: primaryVariant.id },
          data: {
            price: basePrice,
            originalPrice: updateData.originalPrice,
          },
        });
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        categories: { include: { category: true } },
      },
    });

    res.json(normalizeAnimeFrameProduct(updated));
  } catch (error) {
    console.error("Error updating anime frame:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /anime-frames/:id/toggle-active (Admin Quick Active/Inactive Toggle) ─
router.patch("/:id/toggle-active", requireRole("admin"), async (req, res) => {
  try {
    invalidateCache("/products");
    invalidateCache("/anime-frames");

    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || !product.isAnimeFrame) {
      return res.status(404).json({ error: "Anime frame not found" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    res.json({ success: true, id: updated.id, isActive: updated.isActive });
  } catch (error) {
    console.error("Error toggling anime frame active status:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /anime-frames/:id (Admin Delete Anime Frame) ─────────────────────────
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    invalidateCache("/products");
    invalidateCache("/anime-frames");

    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || !product.isAnimeFrame) {
      return res.status(404).json({ error: "Anime frame not found" });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: "Anime frame deleted successfully" });
  } catch (error) {
    console.error("Error deleting anime frame:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
