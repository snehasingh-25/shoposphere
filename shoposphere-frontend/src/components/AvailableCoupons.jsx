import { useState, useEffect } from "react";
import { API } from "../api";
import { useToast } from "../context/ToastContext";
import { formatCondition } from "../utils/couponFormat";
import CouponOfferCard from "./CouponOfferCard";
import CouponHorizontalStrip, { CouponStripItem } from "./CouponHorizontalStrip";
import CouponsViewAllModal from "./CouponsViewAllModal";

export default function AvailableCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [copied, setCopied] = useState(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);
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

  const renderCompactCard = (coupon) => (
    <CouponStripItem key={coupon.id}>
      <CouponOfferCard
        coupon={coupon}
        layout="compact"
        tone="neutral"
        subtext={formatCondition(coupon) || undefined}
        onAction={() => handleCopy(coupon.code)}
        actionLabel="Copy"
        actionSuccess={copied === coupon.code}
      />
    </CouponStripItem>
  );

  const renderFullRow = (coupon) => (
    <CouponOfferCard
      key={coupon.id}
      coupon={coupon}
      layout="full"
      tone="neutral"
      onAction={() => handleCopy(coupon.code)}
      actionLabel="Copy"
      actionSuccess={copied === coupon.code}
    />
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4.5 19.5h15a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25h-.75a.75.75 0 01-.75-.75v-.75a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v.75a.75.75 0 01-.75.75H4.5A2.25 2.25 0 002.25 11.25v6A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
            Available Offers
          </span>
        </div>
        {coupons.length >= 2 && (
          <button
            type="button"
            onClick={() => setViewAllOpen(true)}
            className="text-xs font-semibold shrink-0 transition hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            View all ({coupons.length})
          </button>
        )}
      </div>

      <CouponHorizontalStrip ariaLabel="Available offers">
        {coupons.map(renderCompactCard)}
      </CouponHorizontalStrip>

      <CouponsViewAllModal
        isOpen={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title="All offers"
        subtitle="Available coupons"
      >
        <div className="space-y-2">
          {coupons.map(renderFullRow)}
        </div>
      </CouponsViewAllModal>
    </div>
  );
}
