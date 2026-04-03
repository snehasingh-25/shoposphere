import express from "express";
import prisma from "../prisma.js";
import { cacheMiddleware } from "../utils/cache.js";
import { getPriceRange, getRecommendationsForProduct } from "../utils/recommendationEngine.js";

const router = express.Router();

function deriveSizesFromVariants(variants = []) {
  const byLabel = new Map();

  for (const variant of variants) {
    if (!variant?.sizeLabel) continue;
    const label = String(variant.sizeLabel).trim();
    if (!label) continue;

    const stock = Math.max(0, Number(variant.stock ?? 0));
    const price = Number(variant.price ?? 0);
    const originalPrice = variant.originalPrice != null ? Number(variant.originalPrice) : null;

    if (!byLabel.has(label)) {
      byLabel.set(label, {
        id: variant.id,
        label,
        price,
        originalPrice,
        stock,
      });
      continue;
    }

    const current = byLabel.get(label);
    current.stock += stock;
    if (price < current.price) {
      current.price = price;
      current.id = variant.id;
      current.originalPrice = originalPrice != null ? originalPrice : current.originalPrice;
    }
  }

  return [...byLabel.values()];
}

/**
 * GET /recommendations/:productId?limit=10
 * Returns product recommendations: same category → similar price → popular → high-rated → fallbacks.
 */
router.get("/:productId", cacheMiddleware(10 * 60 * 1000), async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 4), 20);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: { include: { category: true } },
        variants: true,
        colors: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const categoryIds = product.categories.map((pc) => pc.category.id);
    const priceRange = getPriceRange(product);

    const recommendations = await getRecommendationsForProduct(
      productId,
      categoryIds,
      priceRange,
      limit
    );

    const normalizedRecommendations = recommendations.map((p) => ({
      ...p,
      sizes: deriveSizesFromVariants(p.variants || []),
    }));

    res.json(normalizedRecommendations);
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
