import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API } from "../api";

const CouponContext = createContext(null);

const CART_SESSION_KEY = "cart_session_id";
const COUPON_SESSION_KEY = "applied_coupon";

function getStoredSessionId() {
  try { return localStorage.getItem(CART_SESSION_KEY) || null; } catch { return null; }
}

function saveApplied(coupon) {
  try { sessionStorage.setItem(COUPON_SESSION_KEY, JSON.stringify(coupon)); } catch {}
}

function clearApplied() {
  try { sessionStorage.removeItem(COUPON_SESSION_KEY); } catch {}
}

export function CouponProvider({ children }) {
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  // { code, discountAmount, type, discountValue, maxDiscount, minOrderValue }
  const [isValidating, setIsValidating] = useState(false);

  // Restore from sessionStorage on mount (survives Cart → Checkout navigation)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(COUPON_SESSION_KEY);
      if (raw) setAppliedCoupon(JSON.parse(raw));
    } catch {}
  }, []);

  const applyCode = useCallback(async (code) => {
    if (!code?.trim()) return { success: false, message: "Enter a coupon code" };
    const sessionId = getStoredSessionId();
    setIsValidating(true);
    try {
      const res = await fetch(`${API}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim().toUpperCase(), sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const coupon = { ...data.coupon, discountAmount: data.discountAmount };
        setAppliedCoupon(coupon);
        saveApplied(coupon);
        return { success: true, discountAmount: data.discountAmount };
      }
      return { success: false, message: data.message || "Invalid coupon" };
    } catch {
      return { success: false, message: "Could not validate coupon. Try again." };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const removeCode = useCallback(() => {
    setAppliedCoupon(null);
    clearApplied();
  }, []);

  return (
    <CouponContext.Provider
      value={{
        appliedCoupon,
        discountAmount: appliedCoupon?.discountAmount ?? 0,
        isValidating,
        applyCode,
        removeCode,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
}

export function useCoupon() {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error("useCoupon must be used inside CouponProvider");
  return ctx;
}
