import { useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

function formatDiscount(c) {
  if (c.type === "fixed") return `₹${c.discountValue} OFF`;
  let s = `${c.discountValue}% OFF`;
  if (c.maxDiscount) s += ` (max ₹${c.maxDiscount})`;
  return s;
}

function StatusBadge({ active }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background: active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
        color: active ? "#16a34a" : "#dc2626",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function UsageRow({ usage }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs" style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--foreground)", opacity: 0.7 }}>
        Order #{usage.orderId} {usage.userId ? `· User ${usage.userId}` : ""}
      </span>
      <span className="font-medium" style={{ color: "#16a34a" }}>-₹{usage.discountAmount}</span>
      <span style={{ color: "var(--foreground)", opacity: 0.5 }}>{new Date(usage.usedAt).toLocaleDateString("en-IN")}</span>
    </div>
  );
}

export default function CouponList({ coupons, onEdit, onDelete }) {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [usages, setUsages] = useState({});
  const [loadingUsage, setLoadingUsage] = useState(null);

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    try {
      const res = await fetch(`${API}/admin/coupons/${coupon.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Coupon deleted");
        onDelete?.();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const toggleUsages = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (usages[id]) return;
    setLoadingUsage(id);
    try {
      const res = await fetch(`${API}/admin/coupons/${id}/usages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsages((prev) => ({ ...prev, [id]: data }));
      }
    } catch {}
    setLoadingUsage(null);
  };

  if (!coupons?.length) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--foreground)", opacity: 0.5 }}>
        No coupons yet. Create one above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coupons.map((c) => (
        <div key={c.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center gap-3 p-4 flex-wrap">
            {/* Code + badge */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="inline-flex items-center rounded-md border-2 border-dashed px-2 py-0.5 text-sm font-bold tracking-wide"
                style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                {c.code}
              </span>
              <StatusBadge active={c.isActive} />
              {c.isFirstOrder && (
                <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: "rgba(168,85,247,0.12)", color: "#7c3aed" }}>
                  First Order
                </span>
              )}
            </div>

            {/* Discount */}
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{formatDiscount(c)}</span>

            {/* Usage counter */}
            <span className="text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
              {c.usedCount} used{c.globalLimit ? ` / ${c.globalLimit}` : ""}
            </span>

            {/* Expiry */}
            {c.expiresAt && (
              <span className="text-xs" style={{ color: "var(--foreground)", opacity: 0.5 }}>
                Exp: {new Date(c.expiresAt).toLocaleDateString("en-IN")}
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleUsages(c.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition"
                style={{ background: "var(--secondary)", color: "var(--foreground)" }}
              >
                {expandedId === c.id ? "Hide" : "Usages"}
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(c)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition"
                style={{ background: "var(--secondary)", color: "var(--foreground)" }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(c)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition"
                style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Expanded usage log */}
          {expandedId === c.id && (
            <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Usage Log</p>
              {loadingUsage === c.id ? (
                <p className="text-xs" style={{ color: "var(--foreground)", opacity: 0.5 }}>Loading…</p>
              ) : usages[c.id]?.length ? (
                usages[c.id].map((u) => <UsageRow key={u.id} usage={u} />)
              ) : (
                <p className="text-xs" style={{ color: "var(--foreground)", opacity: 0.5 }}>No usages yet.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
