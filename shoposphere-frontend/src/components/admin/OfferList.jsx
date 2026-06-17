import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";

const ICON_LABELS = {
  gift: "Gift",
  discount: "Discount",
  shipping: "Shipping",
  limited: "Limited",
};

export default function OfferList({ offers, onEdit, onDelete }) {
  const toast = useToast();

  const handleDelete = async (offerId) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      const res = await fetch(`${API}/offers/${offerId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Offer deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete offer");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete offer");
    }
  };

  const sortedOffers = [...offers].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderRow = (offer, order, dragHandle, orderInput, isDragging) => (
    <div
      className={`flex items-center gap-4 p-4 transition-all ${
        isDragging ? "opacity-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="shrink-0">{dragHandle}</div>

      <div className="shrink-0 w-20">
        {orderInput || (
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: "oklch(20% .02 340)" }}>
              {order}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <span
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold uppercase"
          style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
        >
          {ICON_LABELS[offer.iconType] || "Deal"}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ color: "oklch(20% .02 340)" }}>
          {offer.title}
        </div>
        {offer.description ? (
          <div className="text-xs line-clamp-1" style={{ color: "oklch(50% .02 340)" }}>
            {offer.description}
          </div>
        ) : null}
        {offer.isLimited ? (
          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Limited time
          </span>
        ) : null}
      </div>

      <div className="shrink-0">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
            offer.isActive ? "text-white" : "bg-gray-100 text-gray-700"
          }`}
          style={offer.isActive ? { backgroundColor: "var(--primary)" } : undefined}
        >
          {offer.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="shrink-0 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(offer)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => handleDelete(offer.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (offer, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sortedOffers.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-16 px-2 py-1 text-center text-sm font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition"
      style={{ borderColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <OrderableList
      items={sortedOffers}
      onReorder={() => onDelete?.()}
      reorderEndpoint="/offers/reorder"
      getItemId={(o) => o.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="All Offers"
      emptyState={
        <>
          <img src="/logo.png" alt="Gift Choice Logo" className="h-12 w-auto mx-auto mb-4 object-contain opacity-50" />
          <p className="text-gray-600 font-medium">No offers yet. Create your first offer above!</p>
        </>
      }
    />
  );
}
