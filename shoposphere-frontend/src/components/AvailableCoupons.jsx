import { useState, useEffect } from "react";
import { API } from "../api";
import { useToast } from "../context/ToastContext";

function formatDiscount(coupon) {
  if (coupon.type === "fixed") return `₹${coupon.discountValue.toFixed(0)} OFF`;
  let label = `${coupon.discountValue}% OFF`;
  if (coupon.maxDiscount) label += ` up to ₹${coupon.maxDiscount.toFixed(0)}`;
  return label;
}

function formatCondition(coupon) {
  const parts = [];
  if (coupon.minOrderValue) parts.push(`on orders above ₹${coupon.minOrderValue.toFixed(0)}`);
  if (coupon.expiresAt) {
    const d = new Date(coupon.expiresAt);
    parts.push(`valid till ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`);
  }
  return parts.join(" · ");
}

export default function AvailableCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [copied, setCopied] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetch(`${API}/coupons/public`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  if (coupons.length === 0) return null;

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      toast.success(`Copied ${code}`);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      toast.error("Could not copy code");
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4.5 19.5h15a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25h-.75a.75.75 0 01-.75-.75v-.75a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v.75a.75.75 0 01-.75.75H4.5A2.25 2.25 0 002.25 11.25v6A2.25 2.25 0 004.5 19.5z" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Available Offers
        </span>
      </div>
      <div className="space-y-2">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="flex items-start justify-between gap-3 rounded-xl border p-3"
            style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center rounded-md border-2 border-dashed px-2 py-0.5 text-xs font-bold tracking-wide cursor-pointer select-none"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                  onClick={() => handleCopy(coupon.code)}
                >
                  {coupon.code}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {formatDiscount(coupon)}
                </span>
              </div>
              {formatCondition(coupon) && (
                <p className="text-xs mt-0.5" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                  {formatCondition(coupon)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(coupon.code)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              style={{
                background: copied === coupon.code ? "rgba(34,197,94,0.15)" : "var(--primary)",
                color: copied === coupon.code ? "#16a34a" : "var(--primary-foreground)",
              }}
            >
              {copied === coupon.code ? "Copied!" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
