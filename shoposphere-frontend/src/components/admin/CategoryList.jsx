import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";
import { optimizeCloudinaryUrl } from "../../utils/imageUrl";

export default function CategoryList({ categories, onEdit, onDelete, onAddSubcategory }) {
  const toast = useToast();

  const handleDelete = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`${API}/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Category deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete category");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const mainCategories = [...categories]
    .filter((c) => !c.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const subsByParent = categories.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  Object.values(subsByParent).forEach((list) => {
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  const renderCategoryRow = (category, { isSub = false, order, dragHandle, orderInput, isDragging } = {}) => (
    <div
      key={category.id}
      className={`flex items-center gap-4 p-4 transition-all ${isDragging ? "opacity-50" : ""} ${isSub ? "pl-10 border-l-2 ml-4" : ""}`}
      style={{ backgroundColor: "transparent", borderColor: isSub ? "var(--border)" : undefined }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = "var(--secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {dragHandle ? <div className="flex-shrink-0">{dragHandle}</div> : <div className="w-8" />}

      <div className="flex-shrink-0 w-20">
        {orderInput || (
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
              {order ?? category.order ?? "—"}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {category.imageUrl ? (
          <img
            src={optimizeCloudinaryUrl(category.imageUrl, 320)}
            alt={category.name}
            className={`object-cover rounded-lg ${isSub ? "w-11 h-11" : "w-14 h-14"}`}
          />
        ) : (
          <div
            className={`rounded-lg flex items-center justify-center ${isSub ? "w-11 h-11" : "w-14 h-14"}`}
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <img src="/logo.png" alt="shoposphere" className="h-6 w-auto object-contain opacity-50" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          {isSub ? <span className="text-muted text-xs">↳</span> : null}
          {category.name}
          {isSub && category.parent?.name ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-500/10 text-muted">
              under {category.parent.name}
            </span>
          ) : null}
        </div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Slug: {category.slug}
          {category.isActive === false ? " · Hidden" : ""}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-semibold" style={{ color: "oklch(92% .04 340)" }}>
          {category._count?.products || 0} products
        </div>
        {!isSub && (category._count?.children > 0 || subsByParent[category.id]?.length) ? (
          <div className="text-[10px] text-muted">
            {category._count?.children ?? subsByParent[category.id]?.length ?? 0} sub
          </div>
        ) : null}
      </div>

      <div className="flex-shrink-0 flex gap-2">
        {!isSub && onAddSubcategory ? (
          <button
            type="button"
            onClick={() => onAddSubcategory(category)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            + Sub
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => handleDelete(category.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (category, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={categories.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-16 px-2 py-1 text-center text-sm font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition"
      style={{
        borderColor: "oklch(92% .04 340)",
        color: "oklch(20% .02 340)",
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  const renderRow = (category, order, dragHandle, orderInput, isDragging) =>
    renderCategoryRow(category, { isSub: false, order, dragHandle, orderInput, isDragging });

  if (mainCategories.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border)" }}>
        <img src="/logo.png" alt="Gift Choice Logo" className="h-12 w-auto mx-auto mb-4 object-contain opacity-50" />
        <p className="text-gray-600 font-medium">No categories yet. Add your first category above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrderableList
        items={mainCategories}
        onReorder={() => onDelete && onDelete()}
        reorderEndpoint="/categories/reorder"
        getItemId={(c) => c.id}
        renderRow={renderRow}
        renderOrderInput={renderOrderInput}
        title="Main Categories"
        emptyState={null}
      />

      {mainCategories.map((main) => {
        const subs = subsByParent[main.id] || [];
        if (!subs.length) return null;
        return (
          <div
            key={`subs-${main.id}`}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          >
            <div
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              Subcategories under {main.name}
            </div>
            {subs.map((sub) => renderCategoryRow(sub, { isSub: true }))}
          </div>
        );
      })}
    </div>
  );
}
