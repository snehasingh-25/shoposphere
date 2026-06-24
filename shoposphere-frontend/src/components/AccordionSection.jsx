import { useEffect, useRef, useState } from "react";

export default function AccordionSection({ title, defaultOpen = false, id, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    const mo = new ResizeObserver(measure);
    mo.observe(el);
    return () => mo.disconnect();
  }, []);

  return (
    <div id={id} className="border-b border-black/10 scroll-mt-28">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm font-semibold uppercase tracking-widest text-[#1a1c1d] group-hover:text-black transition-colors">
          {title}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-[#474747] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: open ? `${height}px` : "0px" }}
        aria-hidden={!open}
      >
        <div ref={bodyRef} className="pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
