import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

const ICON_OPTIONS = [
  { value: "dispatch", label: "Next Day Dispatch" },
  { value: "gift", label: "Exclusive Offers" },
  { value: "shipping", label: "Free Shipping" },
  { value: "cod", label: "COD Available" },
  { value: "return", label: "Easy Return & Exchange" },
  { value: "limited", label: "Limited Time Sale" },
];

function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AnnouncementForm({ announcement, onSave, onCancel }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    message: "",
    iconType: "gift",
    linkUrl: "",
    isActive: true,
    order: 0,
    startsAt: "",
    endsAt: "",
    showCountdown: false,
    countdownEndsAt: "",
  });
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const initialSnapshotRef = useRef("");

  const snapshot = useMemo(() => JSON.stringify(formData), [formData]);
  const isDirty = initialSnapshotRef.current !== "" && snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    const next = announcement
      ? {
          message: announcement.message || "",
          iconType: announcement.iconType || "gift",
          linkUrl: announcement.linkUrl || "",
          isActive: announcement.isActive !== undefined ? announcement.isActive : true,
          order: announcement.order || 0,
          startsAt: toDatetimeLocal(announcement.startsAt),
          endsAt: toDatetimeLocal(announcement.endsAt),
          showCountdown: announcement.showCountdown || false,
          countdownEndsAt: toDatetimeLocal(announcement.countdownEndsAt),
        }
      : {
          message: "",
          iconType: "gift",
          linkUrl: "",
          isActive: true,
          order: 0,
          startsAt: "",
          endsAt: "",
          showCountdown: false,
          countdownEndsAt: "",
        };

    setFormData(next);
    setTimeout(() => {
      initialSnapshotRef.current = JSON.stringify(next);
    }, 0);
  }, [announcement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!formData.message.trim()) {
      toast.error("Announcement message is required");
      return;
    }
    if (formData.showCountdown && !formData.countdownEndsAt) {
      toast.error("Countdown end date is required");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const payload = {
        ...formData,
        order: Number(formData.order) || 0,
        linkUrl: formData.linkUrl?.trim() || null,
        startsAt: formData.startsAt || null,
        endsAt: formData.endsAt || null,
        countdownEndsAt: formData.showCountdown ? formData.countdownEndsAt || null : null,
      };

      const url = announcement ? `${API}/announcements/${announcement.id}` : `${API}/announcements`;
      const res = await fetch(url, {
        method: announcement ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to save announcement");

      toast.success(announcement ? "Announcement updated" : "Announcement created");
      initialSnapshotRef.current = JSON.stringify(formData);
      onSave?.();
    } catch (error) {
      toast.error(error.message || "Failed to save announcement");
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
          {announcement ? "Edit Announcement" : "Create Announcement"}
        </h2>
        {isDirty ? (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "var(--secondary)" }}>
            Unsaved changes
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Message *
          </label>
          <input
            type="text"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="e.g. Free Shipping on all orders"
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
            maxLength={500}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Icon
          </label>
          <select
            value={formData.iconType}
            onChange={(e) => setFormData({ ...formData, iconType: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Link URL (optional)
          </label>
          <input
            type="text"
            value={formData.linkUrl}
            onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
            placeholder="/categories or https://..."
            className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Starts At
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
            Ends At
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
              checked={formData.showCountdown}
              onChange={(e) => setFormData({ ...formData, showCountdown: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Show countdown timer
            </span>
          </label>
        </div>

        {formData.showCountdown ? (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Countdown Ends At *
            </label>
            <input
              type="datetime-local"
              value={formData.countdownEndsAt}
              onChange={(e) => setFormData({ ...formData, countdownEndsAt: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {loading ? "Saving..." : announcement ? "Update" : "Create"}
        </button>
        {announcement && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg font-semibold transition"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
