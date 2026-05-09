/** Build a clone for "Duplicate" (no id so form treats as new product). */
export function cloneProductForDuplicate(product) {
  const images = product.images
    ? Array.isArray(product.images)
      ? product.images
      : typeof product.images === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(product.images);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : []
    : [];
  const videos = product.videos && Array.isArray(product.videos) ? product.videos : [];
  return {
    ...product,
    id: null,
    name: (product.name || "").trim() + " (Copy)",
    images,
    videos,
    sizes:
      product.sizes && product.sizes.length > 0
        ? product.sizes.map((s) => ({
            label: s.label,
            price: s.price,
            originalPrice: s.originalPrice ?? null,
          }))
        : [],
    weightOptions: product.weightOptions
      ? (() => {
          try {
            const weights = Array.isArray(product.weightOptions)
              ? product.weightOptions
              : JSON.parse(product.weightOptions);
            return JSON.stringify(
              weights.map((w) => ({
                weight: w.weight,
                price: w.price,
                originalPrice: w.originalPrice ?? null,
              }))
            );
          } catch {
            return null;
          }
        })()
      : null,
    categories: product.categories || [],
  };
}
