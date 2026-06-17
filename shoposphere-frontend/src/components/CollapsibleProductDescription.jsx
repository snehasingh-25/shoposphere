import { useEffect, useId, useRef, useState } from "react";

const COLLAPSED_MAX_HEIGHT = 96; // ~3–4 lines at base size

export default function CollapsibleProductDescription({ paragraphs = [], className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const innerRef = useRef(null);
  const toggleId = useId();

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.scrollHeight;
      setContentHeight(height);
      setNeedsCollapse(height > COLLAPSED_MAX_HEIGHT + 4);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paragraphs]);

  if (!paragraphs.length) return null;

  const collapsed = needsCollapse && !expanded;
  const targetHeight = collapsed ? COLLAPSED_MAX_HEIGHT : contentHeight;

  return (
    <section className={`space-y-4 lg:space-y-5 ${className}`} aria-labelledby={`${toggleId}-heading`}>
      <h2
        id={`${toggleId}-heading`}
        className="pd-headline text-2xl sm:text-3xl font-black uppercase tracking-tighter text-[#1a1c1d]"
      >
        About this item
      </h2>

      <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100 p-6 md:p-8 max-w-2xl">
        <div className="relative">
          <div
            className="product-description-panel overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ maxHeight: needsCollapse ? `${targetHeight}px` : undefined }}
            id={`${toggleId}-panel`}
            aria-expanded={needsCollapse ? expanded : true}
          >
            <div
              ref={innerRef}
              className="space-y-6 text-neutral-700 leading-relaxed text-base sm:text-lg"
            >
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {collapsed ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-neutral-100 via-neutral-100/80 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>

        {needsCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#1a1c1d] shadow-[0_4px_14px_-6px_rgba(26,28,29,0.12)] transition-all duration-300 hover:border-black/25 hover:bg-[#f9f9fb] active:scale-[0.98] min-h-[44px]"
            aria-expanded={expanded}
            aria-controls={`${toggleId}-panel`}
          >
            <span>{expanded ? "Show less" : "Read more"}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : null}
      </div>
    </section>
  );
}
