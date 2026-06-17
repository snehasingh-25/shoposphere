function BoltIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

export default function BuyNowButton({
  onClick,
  disabled = false,
  variant = "default",
  className = "",
  children = "Buy now",
}) {
  const isSticky = variant === "sticky";

  return (
    <div
      className={`buy-now-cta-wrap ${isSticky ? "buy-now-cta-wrap--sticky" : ""} ${disabled ? "buy-now-cta-wrap--disabled" : ""} ${className}`}
    >
      {!disabled ? <span className="buy-now-cta-glow" aria-hidden /> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`buy-now-cta relative z-1 w-full overflow-hidden rounded-full font-black uppercase tracking-[0.14em] text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:animate-none ${
          isSticky
            ? "min-h-[48px] px-5 py-3.5 text-[11px] sm:min-h-[52px] sm:px-6 sm:py-4 sm:text-xs"
            : "min-h-[56px] px-6 py-5 text-sm sm:min-h-[60px] sm:py-5 sm:text-base"
        }`}
        style={{
          background: disabled
            ? "var(--muted)"
            : "linear-gradient(135deg, #1a1c1d 0%, #2d2f30 45%, #1a1c1d 100%)",
          color: disabled ? "var(--foreground-muted)" : "#f8f8f8",
        }}
      >
        <span className="relative z-1 flex items-center justify-center gap-2.5">
          {!disabled ? <BoltIcon className={isSticky ? "w-4 h-4" : "w-5 h-5"} /> : null}
          <span>{children}</span>
        </span>
        {!disabled ? <span className="buy-now-cta-shine pointer-events-none absolute inset-0" aria-hidden /> : null}
      </button>
    </div>
  );
}
