import prisma from "../prisma.js";

/**
 * Batch-fetch average rating + review count for many products (single groupBy query).
 * @param {number[]} productIds
 * @returns {Promise<Map<number, { averageRating: number, totalReviews: number }>>}
 */
export async function getReviewStatsMap(productIds) {
  const ids = [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))];
  const map = new Map();
  if (ids.length === 0) return map;

  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: ids } },
    _avg: { rating: true },
    _count: { id: true },
  });

  for (const row of grouped) {
    map.set(row.productId, {
      averageRating: Math.round((row._avg.rating ?? 0) * 10) / 10,
      totalReviews: row._count.id,
    });
  }

  return map;
}

export function withReviewStats(product, statsMap) {
  if (!product || product.id == null) return product;
  const stats = statsMap.get(product.id);
  return {
    ...product,
    averageRating: stats?.averageRating ?? 0,
    totalReviews: stats?.totalReviews ?? 0,
  };
}

export async function attachReviewStatsToProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return products;
  const statsMap = await getReviewStatsMap(products.map((p) => p.id));
  return products.map((p) => withReviewStats(p, statsMap));
}
