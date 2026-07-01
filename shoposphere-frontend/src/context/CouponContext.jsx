import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { API } from "../api";
import { CART_SESSION_KEY, useCart } from "./CartContext";
import { useToast } from "./ToastContext";

const CouponContext = createContext(null);

const COUPON_SESSION_KEY = "applied_coupon";

function getStoredSessionId() {
  try {
    return localStorage.getItem(CART_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

function saveApplied(coupon) {
  try {
    sessionStorage.setItem(COUPON_SESSION_KEY, JSON.stringify(coupon));
  } catch {}
}

function clearApplied() {
  try {
    sessionStorage.removeItem(COUPON_SESSION_KEY);
  } catch {}
}

export function CouponProvider({ children }) {
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const { cartItems, isLoaded } = useCart();
  const toast = useToast();
  const restoreDoneRef = useRef(false);
  const appliedCodeRef = useRef(null);
  const cartFingerprint = cartItems.map((i) => `${i.id}-${i.quantity}`).join(",");

  useEffect(() => {
    appliedCodeRef.current = appliedCoupon?.code ?? null;
  }, [appliedCoupon?.code]);

  const fetchValidation = useCallback(async (code) => {
    const sessionId = getStoredSessionId();
    const res = await fetch(`${API}/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: code.trim().toUpperCase(), sessionId }),
    });
    const data = await res.json();
    return { ok: res.ok && data.valid, data };
  }, []);

  const applyCode = useCallback(
    async (code) => {
      if (!code?.trim()) return { success: false, message: "Enter a coupon code" };
      setIsValidating(true);
      try {
        const { ok, data } = await fetchValidation(code);
        if (ok) {
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
    },
    [fetchValidation]
  );

  const removeCode = useCallback(() => {
    setAppliedCoupon(null);
    clearApplied();
  }, []);

  // Restore from sessionStorage and re-validate against current cart
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    (async () => {
      try {
        const raw = sessionStorage.getItem(COUPON_SESSION_KEY);
        if (!raw) {
          restoreDoneRef.current = true;
          return;
        }
        const stored = JSON.parse(raw);
        if (!stored?.code) {
          restoreDoneRef.current = true;
          return;
        }
        const { ok, data } = await fetchValidation(stored.code);
        if (cancelled) return;
        if (ok) {
          const coupon = { ...data.coupon, discountAmount: data.discountAmount };
          setAppliedCoupon(coupon);
          saveApplied(coupon);
        } else {
          clearApplied();
          setAppliedCoupon(null);
        }
      } catch {
        clearApplied();
        setAppliedCoupon(null);
      } finally {
        if (!cancelled) restoreDoneRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, fetchValidation]);

  // Re-validate when cart contents change (not when coupon is first applied)
  useEffect(() => {
    const code = appliedCodeRef.current;
    if (!restoreDoneRef.current || !isLoaded || !code) return;
    let cancelled = false;

    (async () => {
      const { ok, data } = await fetchValidation(code);
      if (cancelled) return;
      if (ok) {
        const coupon = { ...data.coupon, discountAmount: data.discountAmount };
        setAppliedCoupon(coupon);
        saveApplied(coupon);
      } else {
        setAppliedCoupon(null);
        clearApplied();
        toast.info(data.message || "Coupon removed — no longer valid for your cart");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cartFingerprint, isLoaded, fetchValidation, toast]);

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
