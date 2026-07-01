import { formatDiscount, formatCondition } from "../utils/couponFormat";

const TONE_STYLES = {
  eligible: {
    border: "rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.06)",
    badgeBorder: "#16a34a",
    badgeColor: "#16a34a",
    subtextColor: "#16a34a",
    actionBg: "#16a34a",
    actionColor: "#fff",
  },
  unlockable: {
    border: "var(--border)",
    background: "var(--secondary)",
    badgeBorder: "var(--border)",
    badgeColor: "var(--foreground)",
    subtextColor: "var(--foreground)",
    actionBg: null,
    actionColor: null,
  },
  neutral: {
    border: "var(--border)",
    background: "var(--secondary)",
    badgeBorder: "var(--primary)",
    badgeColor: "var(--primary)",
    subtextColor: "var(--foreground)",
    actionBg: "var(--primary)",
    actionColor: "var(--primary-foreground)",
  },
};

export default function CouponOfferCard({
  coupon,
  layout = "compact",
  tone = "neutral",
  subtext,
  onAction,
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  actionSuccess = false,
}) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const isCompact = layout === "compact";
  const condition = formatCondition(coupon);

  return (
    <div
      className={`flex ${isCompact ? "flex-col h-full min-h-[108px]" : "items-center justify-between gap-3"} rounded-xl border p-2.5 ${isCompact ? "" : "p-3"}`}
      style={{
        borderColor: styles.border,
        background: styles.background,
        opacity: tone === "unlockable" ? 0.9 : 1,
      }}
    >
      <div className={`min-w-0 ${isCompact ? "flex-1" : "flex-1"}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-md border-2 border-dashed px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${onAction && tone === "neutral" ? "cursor-pointer select-none" : ""}`}
            style={{ borderColor: styles.badgeBorder, color: styles.badgeColor }}
            onClick={onAction && tone === "neutral" ? onAction : undefined}
            onKeyDown={onAction && tone === "neutral" ? (e) => e.key === "Enter" && onAction() : undefined}
            role={onAction && tone === "neutral" ? "button" : undefined}
            tabIndex={onAction && tone === "neutral" ? 0 : undefined}
          >
            {coupon.code}
          </span>
          <span className={`font-semibold ${isCompact ? "text-[10px]" : "text-xs"}`} style={{ color: "var(--foreground)" }}>
            {formatDiscount(coupon)}
          </span>
        </div>

        {subtext && (
          <p
            className={`mt-1 font-medium ${isCompact ? "text-[10px] line-clamp-2" : "text-xs"}`}
            style={{ color: styles.subtextColor, opacity: tone === "unlockable" ? 0.55 : tone === "neutral" && !subtext.includes("Save") ? 0.6 : 1 }}
          >
            {subtext}
          </p>
        )}

        {!subtext && condition && !isCompact && (
          <p className="text-xs mt-0.5" style={{ color: "var(--foreground)", opacity: 0.6 }}>
            {condition}
          </p>
        )}
      </div>

      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
          className={`shrink-0 text-xs font-semibold rounded-lg transition disabled:opacity-50 ${
            isCompact ? "w-full mt-2 py-1.5" : "px-3 py-1.5"
          }`}
          style={{
            background: actionSuccess ? "rgba(34,197,94,0.15)" : styles.actionBg,
            color: actionSuccess ? "#16a34a" : styles.actionColor,
          }}
        >
          {actionLoading ? "…" : actionSuccess ? "Copied!" : actionLabel}
        </button>
      )}
    </div>
  );
}
