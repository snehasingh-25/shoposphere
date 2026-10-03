import React from "react";
import { Link } from "react-router-dom";

export default function CartBundleProgressBar({ bundleInfo }) {
  if (!bundleInfo || !bundleInfo.eligibleQuantity || bundleInfo.eligibleQuantity <= 0) {
    return null;
  }

  const {
    eligibleQuantity,
    bundleDiscount,
    currentBundle,
    nextBundle,
    remainingToNextBundle,
    progressPercentage,
  } = bundleInfo;

  const targetQuantity = nextBundle ? nextBundle.quantity : (currentBundle ? currentBundle.quantity : eligibleQuantity);
  const isMaxTierReached = !nextBundle && Boolean(currentBundle);

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 mb-6 border transition-all duration-300 shadow-sm relative overflow-hidden"
      style={{
        background: isMaxTierReached
          ? "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)"
          : "linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(236, 72, 153, 0.06) 100%)",
        borderColor: isMaxTierReached ? "rgba(234, 179, 8, 0.35)" : "var(--border)",
      }}
    >
      {/* Decorative top accent glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
        style={{
          background: isMaxTierReached ? "rgb(234, 179, 8)" : "rgb(99, 102, 241)",
        }}
      />

      <div className="relative z-10">
        {/* Header / Message */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {isMaxTierReached ? "🎉" : currentBundle ? "🎯" : "🔥"}
            </span>
            <div className="min-w-0">
              {isMaxTierReached ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-amber-500 dark:text-amber-400">
                    You&apos;ve unlocked our best Anime Frames bundle!
                  </span>
                  {bundleDiscount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      Saved ₹{Number(bundleDiscount).toFixed(0)}
                    </span>
                  )}
                </div>
              ) : currentBundle ? (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      🎉 You unlocked the {currentBundle.quantity} Frames Bundle!
                    </span>
                    {bundleDiscount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        Saved ₹{Number(bundleDiscount).toFixed(0)}
                      </span>
                    )}
                  </div>
                  {nextBundle && (
                    <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--foreground)" }}>
                      🎯 Add <span className="font-bold text-purple-600 dark:text-purple-400">{remainingToNextBundle}</span> more Anime Frame{remainingToNextBundle > 1 ? "s" : ""} to unlock the {nextBundle.quantity} Frames Bundle at ₹{nextBundle.price}!
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-medium text-xs sm:text-sm" style={{ color: "var(--foreground)" }}>
                  🔥 Add <span className="font-bold text-purple-600 dark:text-purple-400">{remainingToNextBundle}</span> more Anime Frame{remainingToNextBundle > 1 ? "s" : ""} to unlock the {nextBundle?.quantity || 3} Frames Bundle at ₹{nextBundle?.price || 999}
                </p>
              )}
            </div>
          </div>

          {/* Fractional badge indicator */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border tabular-nums"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              {eligibleQuantity} / {targetQuantity} Frames
            </span>
            <Link
              to="/anime-frames"
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Add More
            </Link>
          </div>
        </div>

        {/* Progress meter bar */}
        <div
          className="w-full h-2.5 sm:h-3 rounded-full overflow-hidden p-0.5 relative"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative"
            style={{
              width: `${Math.min(100, Math.max(5, progressPercentage))}%`,
              background: isMaxTierReached
                ? "linear-gradient(90deg, #eab308 0%, #ec4899 50%, #8b5cf6 100%)"
                : "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              boxShadow: isMaxTierReached
                ? "0 0 12px rgba(234, 179, 8, 0.5)"
                : "0 0 10px rgba(168, 85, 247, 0.4)",
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-white/25 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
