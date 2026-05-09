import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import { cloneProductForDuplicate } from "../../utils/cloneProductForDuplicate";
import OrderableList from "./OrderableList";
import AdminProductListRow from "./AdminProductListRow";

export default function ProductList({ products, onEdit, onDelete }) {
  const toast = useToast();

  const safeProducts = Array.isArray(products) ? products : [];

  const handleDelete = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`${API}/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Product deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete product");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const sortedProducts = [...safeProducts].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderRow = (product, order, dragHandle, orderInput, isDragging) => {
    const leading =
      dragHandle || orderInput ? (
        <>
          <div className="flex-shrink-0">{dragHandle}</div>
          <div className="flex-shrink-0 w-20">
            {orderInput || (
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: "oklch(20% .02 340)" }}>
                  {order}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null;

    return (
      <AdminProductListRow
        product={product}
        leading={leading}
        onEdit={onEdit}
        onDuplicate={() => onEdit(cloneProductForDuplicate(product))}
        onDelete={handleDelete}
        isDragging={isDragging}
        showKeywordTags={false}
      />
    );
  };

  const renderOrderInput = (product, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sortedProducts.length}
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

  return (
    <OrderableList
      items={sortedProducts}
      onReorder={() => {
        if (onDelete) onDelete();
      }}
      reorderEndpoint="/products/reorder"
      getItemId={(p) => p.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="All Products"
      emptyState={
        <>
          <img src="/logo.png" alt="Gift Choice Logo" className="h-12 w-auto mx-auto mb-4 object-contain opacity-50" />
          <p className="text-gray-600 font-medium">No products yet. Add your first product above!</p>
        </>
      }
    />
  );
}
