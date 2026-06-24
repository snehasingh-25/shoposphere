import { useState } from "react";
import { useCoupon } from "../context/CouponContext";

export default function CouponInput() {
  const { appliedCoupon, discountAmount, isValidating, applyCode, removeCode } = useCoupon();
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!inputCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }
    setError("");
    const result = await applyCode(inputCode.trim());
    if (result.success) {
      setInputCode("");
    } else {
      setError(result.message);
    }
  };

  const handleRemove = () => {
    removeCode();
    setInputCode("");
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleApply();
  };

  if (appliedCoupon) {
    return (
      <div
        className="rounded-xl border p-3 flex items-center justify-between gap-3"
        style={{ borderColor: "var(--success, #22c55e)", background: "rgba(34,197,94,0.06)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-700 truncate">{appliedCoupon.code}</p>
            <p className="text-xs text-emerald-600">
              You save{" "}
              <span className="font-semibold">
                ₹{Number(discountAmount).toFixed(2)}
              </span>{" "}
              with this coupon
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          style={{ background: "rgba(239,68,68,0.1)", color: "var(--destructive, #ef4444)" }}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--foreground)", opacity: 0.4 }}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4.5 19.5h15a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25h-.75a.75.75 0 01-.75-.75v-.75a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v.75a.75.75 0 01-.75.75H4.5A2.25 2.25 0 002.25 11.25v6A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="Enter coupon code"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-medium tracking-wide"
            style={{
              borderColor: error ? "var(--destructive, #ef4444)" : "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={isValidating || !inputCode.trim()}
          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {isValidating ? "…" : "Apply"}
        </button>
      </div>
      {error && (
        <p className="text-xs font-medium" style={{ color: "var(--destructive, #ef4444)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
