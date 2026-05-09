import Fuse from "fuse.js";

const FUSE_OPTIONS = { threshold: 0.4, includeScore: true, minMatchCharLength: 2 };

function flattenKeywordsForFuse(product) {
  const raw = product?.keywords;
  if (Array.isArray(raw)) return raw.map(String).join(" ");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String).join(" ") : raw;
    } catch {
      return raw;
    }
  }
  return "";
}

/**
 * @param {unknown[]} products
 * @param {unknown[]} categories
 * @param {string} query
 * @returns {{ products: unknown[], categories: unknown[] }}
 */
export function searchAdminCatalog(products, categories, query) {
  const q = String(query || "").trim();
  if (q.length < 2) {
    return { products: [], categories: [] };
  }

  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const enriched = safeProducts.map((p) => {
    const _fuseText = flattenKeywordsForFuse(p);
    return { ...p, _fuseText };
  });

  const productFuse = new Fuse(enriched, {
    keys: ["name", "description", "_fuseText"],
    ...FUSE_OPTIONS,
  });
  const categoryFuse = new Fuse(safeCategories, {
    keys: ["name", "slug", "description"],
    ...FUSE_OPTIONS,
  });

  const matchedProducts = productFuse.search(q).map((r) => {
    const { _fuseText: _ignored, ...rest } = r.item;
    return rest;
  });
  const matchedCategories = categoryFuse.search(q).map((r) => r.item);

  return { products: matchedProducts, categories: matchedCategories };
}
