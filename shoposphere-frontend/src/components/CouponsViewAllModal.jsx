import { useEffect, useState } from "react";

export default function CouponsViewAllModal({ isOpen, onClose, title, subtitle, children }) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const titleId = "coupons-view-all-title";

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setClosing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && show) {
      setClosing(true);
      const timer = setTimeout(() => {
        setShow(false);
        setClosing(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen, show]);

  useEffect(() => {
    if (!show) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [show]);

  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-70" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label="Close coupons list"
        onClick={onClose}
        className={`size-chart-backdrop absolute inset-0 bg-black/50 backdrop-blur-[3px] ${closing ? "size-chart-backdrop--closing" : "size-chart-backdrop--open"}`}
      />

      <aside
        className={`size-chart-panel fixed flex flex-col shadow-2xl inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:bottom-auto sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none ${closing ? "size-chart-panel--closing" : "size-chart-panel--open"}`}
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <div
          className="flex justify-between items-center px-5 py-4 sm:p-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            {subtitle && (
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "var(--foreground)", opacity: 0.55 }}>
                {subtitle}
              </p>
            )}
            <h2 id={titleId} className="text-lg sm:text-xl font-bold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border transition-all active:scale-95"
            style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {children}
        </div>
      </aside>
    </div>
  );
}
