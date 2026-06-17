import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";

const ICON_LABELS = {
  dispatch: "Dispatch",
  gift: "Offers",
  shipping: "Shipping",
  cod: "COD",
  return: "Returns",
  limited: "Sale",
};

export default function AnnouncementList({ announcements, onEdit, onDelete }) {
  const toast = useToast();

  const handleDelete = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`${API}/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Announcement deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const sorted = [...announcements].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderRow = (item, order, dragHandle, orderInput, isDragging) => (
    <div className={`flex items-center gap-4 p-4 transition-all ${isDragging ? "opacity-50" : "hover:bg-gray-50"}`}>
      <div className="shrink-0">{dragHandle}</div>
      <div className="shrink-0 w-20">{orderInput || <div className="text-center text-sm font-bold">{order}</div>}</div>
      <div className="shrink-0">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1c1d] text-[10px] font-bold uppercase text-white">
          {ICON_LABELS[item.iconType] || "Msg"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{item.message}</div>
        {item.linkUrl ? <div className="text-xs text-gray-500 truncate">Link: {item.linkUrl}</div> : null}
        {item.showCountdown ? (
          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mt-1">Countdown enabled</div>
        ) : null}
      </div>
      <div className="shrink-0">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${item.isActive ? "text-white" : "bg-gray-100 text-gray-700"}`}
          style={item.isActive ? { backgroundColor: "var(--primary)" } : undefined}
        >
          {item.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="shrink-0 flex gap-2">
        <button type="button" onClick={() => onEdit(item)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100">
          Edit
        </button>
        <button type="button" onClick={() => handleDelete(item.id)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold">
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (item, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sorted.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-16 px-2 py-1 text-center text-sm font-bold border-2 rounded-lg"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <OrderableList
      items={sorted}
      onReorder={() => onDelete?.()}
      reorderEndpoint="/announcements/reorder"
      getItemId={(a) => a.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="All Announcements"
      emptyState={
        <>
          <img src="/logo.png" alt="Gift Choice Logo" className="h-12 w-auto mx-auto mb-4 object-contain opacity-50" />
          <p className="text-gray-600 font-medium">No announcements yet. Create your first one above!</p>
        </>
      }
    />
  );
}
