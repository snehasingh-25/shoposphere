/**
 * Category row for admin lists (non-orderable), e.g. search results.
 */
export default function AdminCategoryListRow({ category, onEdit, onDelete, isDragging = false }) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-4 transition-all ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ backgroundColor: "transparent" }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = "var(--secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div className="flex flex-1 min-w-0 gap-4 items-center">
        <div className="flex-shrink-0">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name} className="w-14 h-14 object-cover rounded-lg" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--secondary)" }}>
              <img src="/logo.png" alt="" className="h-6 w-auto object-contain opacity-50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ color: "var(--foreground)" }}>
            {category.name}
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Slug: {category.slug}
          </div>
        </div>

        <div className="flex-shrink-0 text-left sm:text-right">
          <div className="text-sm font-semibold" style={{ color: "oklch(50% .02 340)" }}>
            {category._count?.products ?? 0} products
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
          onMouseEnter={(e) => !isDragging && (e.target.style.backgroundColor = "oklch(88% .06 340)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "oklch(92% .04 340)")}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(category.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
