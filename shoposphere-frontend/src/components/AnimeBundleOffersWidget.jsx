import { useState, useEffect } from "react";
import { API } from "../api";

export default function AnimeBundleOffersWidget({ currentQuantity = 1 }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${API}/bundles/anime-frames`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted) {
          setBundles(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (mounted) setBundles([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !bundles.length) {
    return null;
  }

  // Find unlocked and next bundle based on selected quantity
  const sorted = [...bundles].sort((a, b) => a.quantity - b.quantity);
  const unlockedBundle = [...sorted].filter((b) => b.quantity <= currentQuantity).pop() || null;
  const nextBundle = sorted.find((b) => b.quantity > currentQuantity) || null;
  const remainingNeeded = nextBundle ? nextBundle.quantity - currentQuantity : 0;

  return (
    <div
      className="rounded-2xl p-4 my-4 border transition-all duration-300 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)",
        borderColor: "rgba(147, 51, 234, 0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 font-bold text-sm font-display" style={{ color: "var(--foreground)" }}>
          <span className="text-base" aria-hidden>🔥</span>
          <span>Anime Frame Bundle Offers</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          Save More
        </span>
      </div>

      {/* Bundle tier grid / list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {sorted.map((b) => {
          const isUnlocked = currentQuantity >= b.quantity;
          const isTarget = nextBundle && nextBundle.id === b.id;

          return (
            <div
              key={b.id}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isUnlocked
                  ? "ring-2 ring-emerald-500/50 bg-emerald-500/10 border-emerald-500/30"
                  : isTarget
                  ? "ring-1 ring-purple-500/50 bg-purple-500/10 border-purple-500/30"
                  : "border-[var(--border)] bg-[var(--background)] opacity-80"
              }`}
            >
              <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                Buy {b.quantity} Frames
              </div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                ₹{Number(b.price).toFixed(0)}
              </div>
              {b.offerLabel && (
                <div className="text-[10px] text-muted truncate mt-0.5">
                  {b.offerLabel}
                </div>
              )}
              {isUnlocked && (
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">
                  ✓ Unlocked
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic helper prompt based on quantity */}
      <div
        className="rounded-xl p-2.5 text-xs flex items-center gap-2 border"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        {nextBundle ? (
          <>
            <span className="text-sm">🎯</span>
            <div>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                Add {remainingNeeded} more
              </span>{" "}
              to unlock the {nextBundle.quantity} Frames Bundle at ₹{nextBundle.price}!
            </div>
          </>
        ) : unlockedBundle ? (
          <>
            <span className="text-sm">🎉</span>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              You unlocked our highest {unlockedBundle.quantity} Frames Bundle!
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
