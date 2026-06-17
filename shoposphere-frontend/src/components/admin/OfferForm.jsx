import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

const ICON_OPTIONS = [
  { value: "gift", label: "Gift / Bundle", hint: "Buy 2 Get 1 Free" },
  { value: "discount", label: "Discount", hint: "Flat ₹200 Off" },
  { value: "shipping", label: "Free Shipping", hint: "Delivery perks" },
  { value: "limited", label: "Limited Time", hint: "Urgency deals" },
];

function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OfferForm({ offer, onSave, onCancel }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    iconType: "gift",
    isActive: true,
    isLimited: false,
    order: 0,
    startsAt: "",
    endsAt: "",
  });
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const initialSnapshotRef = useRef("");

  const snapshot = useMemo(() => JSON.stringify(formData), [formData]);
  const isDirty = initialSnapshotRef.current !== "" && snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (offer) {
      const next = {
        title: offer.title || "",
        description: offer.description || "",
        iconType: offer.iconType || "gift",
        isActive: offer.isActive !== undefined ? offer.isActive : true,
        isLimited: offer.isLimited !== undefined ? offer.isLimited : false,
        order: offer.order || 0,
        startsAt: toDatetimeLocal(offer.startsAt),
        endsAt: toDatetimeLocal(offer.endsAt),
      };
      setFormData(next);
      setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify(next);
      }, 0);
    } else {
      const empty = {
        title: "",
        description: "",
        iconType: "gift",
        isActive: true,
        isLimited: false,
        order: 0,
        startsAt: "",
        endsAt: "",
      };
      setFormData(empty);
      setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify(empty);
      }, 0);
    }
  }, [offer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!formData.title.trim()) {
      toast.error("Offer title is required");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const payload = {
        ...formData,
        order: Number(formData.order) || 0,
        startsAt: formData.startsAt || null,
        endsAt: formData.endsAt || null,
      };

      const url = offer ? `${API}/offers/${offer.id}` : `${API}/offers`;
      const res = await fetch(url, {
        method: offer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save offer");
      }

      toast.success(offer ? "Offer updated" : "Offer created");
      initialSnapshotRef.current = JSON.stringify(formData);
      onSave?.();
    } catch (error) {
      toast.error(error.message || "Failed to save offer");
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg shadow p-6 mb-6"
      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {offer ? "Edit Offer" : "Create Offer"}
        </h2>
        {isDirty && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "var(--secondary)" }}>
            Unsaved changes
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Offer Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Buy 2 Get 1 Free"
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
            maxLength={255}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Description (optional)
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. Add any 3 items to your cart"
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Icon Style
          </label>
          <select
            value={formData.iconType}
            onChange={(e) => setFormData({ ...formData, iconType: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.hint}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Display Order
          </label>
          <input
            type="number"
            min="0"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Starts At (optional)
          </label>
          <input
            type="datetime-local"
            value={formData.startsAt}
            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Ends At (optional)
          </label>
          <input
            type="datetime-local"
            value={formData.endsAt}
            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Active
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isLimited}
              onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Show &quot;Limited Time&quot; urgency badge
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {loading ? "Saving..." : offer ? "Update Offer" : "Create Offer"}
        </button>
        {offer && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg font-semibold transition"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
