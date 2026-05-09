import { parseProductKeywords } from "../../utils/productKeywords";

function parseImages(product) {
  if (!product?.images) return [];
  if (Array.isArray(product.images)) return product.images;
  try {
    const parsed = JSON.parse(product.images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {Object} props
 * @param {Object} props.product
 * @param {React.ReactNode} [props.leading] — drag handle + order column (orderable list only)
 * @param {(p: Object) => void} props.onEdit
 * @param {() => void} props.onDuplicate
 * @param {(id: number) => void} props.onDelete
 * @param {boolean} [props.isDragging]
 * @param {boolean} [props.showKeywordTags]
 */
export default function AdminProductListRow({
  product,
  leading = null,
  onEdit,
  onDuplicate,
  onDelete,
  isDragging = false,
  showKeywordTags = false,
}) {
  const images = parseImages(product);
  const keywords = showKeywordTags ? parseProductKeywords(product) : [];

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-4 transition-all ${
        isDragging ? "opacity-50" : "hover:bg-gray-50"
      }`}
    >
      {leading ? <div className="flex shrink-0 items-center gap-4">{leading}</div> : null}

      <div className="flex flex-1 min-w-0 gap-4 items-start sm:items-center">
        <div className="flex-shrink-0">
          {images.length > 0 ? (
            <img src={images[0]} alt={product.name} className="w-14 h-14 object-cover rounded-lg" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "oklch(92% .04 340)" }}>
              <img src="/logo.png" alt="" className="h-6 w-auto object-contain opacity-50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ color: "oklch(20% .02 340)" }}>
            {product.name}
          </div>
          <div className="text-xs line-clamp-2 sm:line-clamp-1" style={{ color: "oklch(50% .02 340)" }}>
            {product.description}
          </div>
          <div className="text-xs mt-1" style={{ color: "oklch(50% .02 340)" }}>
            <span className="font-medium text-[oklch(45%_.02_340)]">Categories: </span>
            {product.categories && product.categories.length > 0
              ? product.categories.map((c) => c.name || c.category?.name).join(", ")
              : product.category?.name || "None"}
          </div>
          {keywords.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {keywords.slice(0, 12).map((kw) => (
                <span
                  key={kw}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
                >
                  {kw}
                </span>
              ))}
              {keywords.length > 12 && (
                <span className="text-[10px] text-muted">+{keywords.length - 12} more</span>
              )}
            </div>
          )}
          <div className="text-xs mt-1 flex gap-2 flex-wrap">
            {product.weightOptions ? (
              (() => {
                try {
                  const weights = Array.isArray(product.weightOptions) ? product.weightOptions : JSON.parse(product.weightOptions);
                  return (
                    <span style={{ color: "oklch(55% .02 340)" }}>
                      <strong>Weights:</strong> {weights.map((w) => w.weight).join(", ")}
                    </span>
                  );
                } catch {
                  return null;
                }
              })()
            ) : product.sizes && product.sizes.length > 0 ? (
              <span style={{ color: "oklch(55% .02 340)" }}>
                <strong>Sizes:</strong> {product.sizes.map((s) => s.label).join(", ")}
              </span>
            ) : product.hasSinglePrice ? (
              <span style={{ color: "oklch(55% .02 340)" }}>
                <strong>Type:</strong> Single Price
              </span>
            ) : null}
            <span
              style={{
                color: typeof product.stock === "number" && product.stock <= 5 ? "oklch(50% .2 25)" : "oklch(55% .02 340)",
              }}
            >
              <strong>Stock:</strong> {typeof product.stock === "number" ? product.stock : 0}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 sm:self-center">
          <div className="flex flex-wrap gap-1">
            {product.isNew && (
              <span className="px-2 py-0.5 text-white text-xs rounded-full font-semibold" style={{ backgroundColor: "var(--primary)" }}>
                New
              </span>
            )}
            {product.isTrending && (
              <span className="px-2 py-0.5 text-white text-xs rounded-full font-semibold" style={{ backgroundColor: "var(--primary)" }}>
                Trending
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
          onMouseEnter={(e) => !isDragging && (e.target.style.backgroundColor = "oklch(88% .06 340)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "oklch(92% .04 340)")}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
          style={{ borderColor: "oklch(70% .06 340)", color: "oklch(40% .02 340)" }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.target.style.backgroundColor = "oklch(96% .02 340)";
              e.target.style.borderColor = "oklch(60% .06 340)";
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "";
            e.target.style.borderColor = "oklch(70% .06 340)";
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDelete(product.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
