import { useState, useEffect } from "react";
import { API } from "../api";
import { CART_SESSION_KEY } from "../context/CartContext";
import { useCoupon } from "../context/CouponContext";
import { useToast } from "../context/ToastContext";
import CouponOfferCard from "./CouponOfferCard";
import CouponHorizontalStrip, { CouponStripItem } from "./CouponHorizontalStrip";
import CouponsViewAllModal from "./CouponsViewAllModal";

function getSessionId() {
  try {
    return localStorage.getItem(CART_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function CouponSection({ title, titleColor, children }) {
  if (!children) return null;
  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: titleColor }}>
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function ApplicableCoupons({ cartSubtotal, cartLoaded = true }) {
  const { appliedCoupon, isValidating, applyCode } = useCoupon();
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingCode, setApplyingCode] = useState(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);

  useEffect(() => {
    if (!cartLoaded) return;

    const sessionId = getSessionId();
    if (!sessionId) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${API}/coupons/applicable?sessionId=${encodeURIComponent(sessionId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { coupons: [] }))
      .then((data) => {
        if (cancelled) return;
        setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cartSubtotal, cartLoaded]);

  if (appliedCoupon) return null;

  const eligible = coupons.filter((c) => c.eligible);
  const unlockable = coupons.filter((c) => !c.eligible && c.amountNeeded != null && c.amountNeeded > 0);
  const allDisplay = [...eligible, ...unlockable];
  const totalCount = allDisplay.length;

  if (loading || totalCount === 0) return null;

  const handleApply = async (code, closeModal = false) => {
    setApplyingCode(code);
    const result = await applyCode(code);
    setApplyingCode(null);
    if (result.success) {
      toast.success(`Coupon ${code} applied — you save ₹${result.discountAmount.toFixed(2)}`);
      if (closeModal) setViewAllOpen(false);
    } else {
      toast.error(result.message || "Could not apply coupon");
    }
  };

  const renderCompactCard = (coupon) => {
    const isEligible = coupon.eligible;
    return (
      <CouponStripItem key={coupon.id}>
        <CouponOfferCard
          coupon={coupon}
          layout="compact"
          tone={isEligible ? "eligible" : "unlockable"}
          subtext={
            isEligible
              ? `Save ₹${coupon.discountAmount.toFixed(2)}`
              : `Add ₹${coupon.amountNeeded.toFixed(0)} more${coupon.minOrderValue ? ` (min ₹${coupon.minOrderValue.toFixed(0)})` : ""}`
          }
          onAction={isEligible ? () => handleApply(coupon.code) : undefined}
          actionLabel={isEligible ? "Apply" : undefined}
          actionLoading={applyingCode === coupon.code}
          actionDisabled={isValidating}
        />
      </CouponStripItem>
    );
  };

  const renderFullRow = (coupon, isEligible) => (
    <CouponOfferCard
      key={coupon.id}
      coupon={coupon}
      layout="full"
      tone={isEligible ? "eligible" : "unlockable"}
      subtext={
        isEligible
          ? `Save ₹${coupon.discountAmount.toFixed(2)}`
          : `Add ₹${coupon.amountNeeded.toFixed(0)} more${coupon.minOrderValue ? ` (min ₹${coupon.minOrderValue.toFixed(0)})` : ""}`
      }
      onAction={isEligible ? () => handleApply(coupon.code, true) : undefined}
      actionLabel={isEligible ? "Apply" : undefined}
      actionLoading={applyingCode === coupon.code}
      actionDisabled={isValidating}
    />
  );

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
          Available coupons
        </span>
        {totalCount >= 2 && (
          <button
            type="button"
            onClick={() => setViewAllOpen(true)}
            className="text-xs font-semibold shrink-0 transition hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            View all ({totalCount})
          </button>
        )}
      </div>

      <CouponHorizontalStrip ariaLabel="Applicable coupons">
        {allDisplay.map(renderCompactCard)}
      </CouponHorizontalStrip>

      <CouponsViewAllModal
        isOpen={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title="All coupons"
        subtitle="Offers for your cart"
      >
        {eligible.length > 0 && (
          <CouponSection title="Applicable now" titleColor="#16a34a">
            {eligible.map((c) => renderFullRow(c, true))}
          </CouponSection>
        )}
        {unlockable.length > 0 && (
          <CouponSection title="Add more to unlock" titleColor="var(--foreground)">
            {unlockable.map((c) => renderFullRow(c, false))}
          </CouponSection>
        )}
      </CouponsViewAllModal>
    </div>
  );
}
