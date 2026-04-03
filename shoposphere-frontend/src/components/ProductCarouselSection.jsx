import { useEffect, useState, useRef } from "react";
import { API } from "../api";
import { shuffleArray } from "../utils/shuffle";
import ProductCard from "./ProductCard";

/**
 * Reusable carousel section: title + horizontal scroll of product cards.
 * - If productIds provided: fetches products by ids (preserves order), shows skeleton while loading.
 * - If products provided: renders directly.
 * - Hides section if no products to show.
 */
export default function ProductCarouselSection({
  title,
  productIds = [],
  products: productsProp = null,
  excludeProductId = null,
  className = "",
}) {
  const [fetchedByKey, setFetchedByKey] = useState({});
  const scrollRef = useRef(null);

  const idsToFetch = excludeProductId
    ? productIds.filter((id) => Number(id) !== Number(excludeProductId))
    : productIds;
  const idsKey = idsToFetch.join(",");

  const hasProvidedProducts = Array.isArray(productsProp);

  useEffect(() => {
    if (hasProvidedProducts || idsToFetch.length === 0 || fetchedByKey[idsKey] !== undefined) return;
    const ac = new AbortController();
    fetch(`${API}/products?ids=${idsToFetch.join(",")}`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setFetchedByKey((prev) => ({
          ...prev,
          [idsKey]: shuffleArray(Array.isArray(data) ? data : []),
        }));
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.error("ProductCarouselSection fetch error:", err);
        setFetchedByKey((prev) => ({ ...prev, [idsKey]: [] }));
      })
    return () => ac.abort();
  }, [hasProvidedProducts, idsKey, idsToFetch, fetchedByKey]);

  const products = hasProvidedProducts ? productsProp : (fetchedByKey[idsKey] ?? []);
  const loading = !hasProvidedProducts && idsToFetch.length > 0 && fetchedByKey[idsKey] === undefined;
  const list = products.filter((p) => !excludeProductId || p.id !== Number(excludeProductId));
  if (list.length === 0 && !loading) return null;

  return (
    <section className={`mt-10 max-w-7xl mx-auto px-4 ${className}`}>
      <h2 className="text-xl font-bold font-display mb-6" style={{ color: "var(--foreground)" }}>
        {title}
      </h2>
      {loading ? (
        <div className="flex gap-1 overflow-x-auto scroll-smooth scrollbar-thin pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[calc(50%-0.375rem)] sm:w-64 h-80 rounded-xl animate-pulse"
              style={{ background: "var(--muted)", boxShadow: "var(--shadow-soft)" }}
            />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-thin pb-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {list.map((product) => (
            <div key={`carousel-${product.id}`} className="shrink-0 w-[calc(50%-0.375rem)] sm:w-64">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
