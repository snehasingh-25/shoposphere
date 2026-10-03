import { useState, useRef, useCallback } from "react";

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  productName = "Anime Frame",
  beforeLabel = "Lights Off",
  afterLabel = "LED Glow",
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Only render if both images are present
  if (!beforeImage || !afterImage) return null;

  return (
    <section
      className="rounded-3xl p-5 sm:p-8 border border-black/10 dark:border-white/10 bg-gradient-to-b from-neutral-50/80 to-neutral-100/60 dark:from-neutral-900/60 dark:to-neutral-950/80 backdrop-blur-xl"
      aria-label="Before and After Image Comparison"
    >
      {/* ─── Header Info ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5e5e5e] dark:text-neutral-400 block mb-1">
            Visual Experience
          </span>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1a1c1d] dark:text-white">
            Before &amp; After Illumination
          </h3>
          <p className="text-xs sm:text-sm text-[#5e5e5e] dark:text-neutral-400 mt-1 max-w-lg">
            Slide left &amp; right to see the transformative difference when the high-density LED backlighting is switched on.
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setSliderPos(0)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sliderPos === 0
                ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-black"
            }`}
          >
            {beforeLabel}
          </button>
          <button
            type="button"
            onClick={() => setSliderPos(50)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sliderPos > 20 && sliderPos < 80
                ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-black"
            }`}
          >
            50/50
          </button>
          <button
            type="button"
            onClick={() => setSliderPos(100)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sliderPos === 100
                ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-black"
            }`}
          >
            {afterLabel}
          </button>
        </div>
      </div>

      {/* ─── Interactive Draggable Comparison Box ─────────────────────── */}
      <div className="relative max-w-xl mx-auto">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl select-none cursor-ew-resize border border-black/10 dark:border-white/10 bg-neutral-900 touch-none group"
        >
          {/* Layer 1: AFTER IMAGE (Background - Full) */}
          <img
            src={afterImage}
            alt={`${productName} - ${afterLabel}`}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            loading="lazy"
            draggable="false"
          />

          {/* Layer 2: BEFORE IMAGE (Clipped overlay) */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
              WebkitClipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
            }}
          >
            <img
              src={beforeImage}
              alt={`${productName} - ${beforeLabel}`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading="lazy"
              draggable="false"
            />
          </div>

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-md">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{beforeLabel}</span>
          </div>

          <div className="absolute top-3 right-3 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/90 text-white backdrop-blur-md border border-amber-300/40 shadow-md">
            <span className="w-2 h-2 rounded-full bg-yellow-200 animate-pulse" />
            <span>{afterLabel}</span>
          </div>

          {/* Vertical Divider Line */}
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{
              left: `${sliderPos}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-[3px] h-full bg-white shadow-[0_0_14px_rgba(0,0,0,0.8)]" />

            {/* Draggable Circle Handle */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-11 h-11 rounded-full bg-white text-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center transition-transform ${
                isDragging ? "scale-115 shadow-amber-500/30" : "group-hover:scale-105"
              }`}
            >
              <svg
                className="w-5 h-5 text-neutral-800"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="8 17 3 12 8 7" />
                <polyline points="16 7 21 12 16 17" />
              </svg>
            </div>
          </div>
        </div>

        {/* Drag Hint Footer */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#5e5e5e] dark:text-neutral-400 font-medium">
          <svg className="w-3.5 h-3.5 animate-pulse text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          <span>Drag the center divider horizontally or click anywhere on the frame to compare</span>
        </div>
      </div>
    </section>
  );
}
