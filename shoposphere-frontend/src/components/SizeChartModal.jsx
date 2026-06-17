import { useEffect, useState } from "react";

export default function SizeChartModal({
  isOpen,
  onClose,
  sizeChartTab,
  onTabChange,
  sizeUnit,
  onUnitChange,
  sizeRows,
}) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

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

  const handleClose = () => onClose?.();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-70" role="dialog" aria-modal="true" aria-labelledby="size-chart-title">
      <button
        type="button"
        aria-label="Close size chart"
        onClick={handleClose}
        className={`size-chart-backdrop absolute inset-0 bg-black/50 backdrop-blur-[3px] ${closing ? "size-chart-backdrop--closing" : "size-chart-backdrop--open"}`}
      />

      <aside
        className={`size-chart-panel fixed flex flex-col bg-[#f9f9fb] text-[#1a1c1d] shadow-2xl inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:bottom-auto sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none ${closing ? "size-chart-panel--closing" : "size-chart-panel--open"}`}
      >
        <div className="flex justify-between items-center px-5 py-5 sm:p-6 border-b border-black/8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#474747] mb-1">Fit guide</p>
            <h2 id="size-chart-title" className="pd-headline text-xl sm:text-2xl font-black tracking-tight">
              Size Chart
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-[#1a1c1d] transition-all hover:border-black/25 hover:bg-[#f3f3f5] active:scale-95"
            aria-label="Close size chart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-black/8">
          <button
            type="button"
            onClick={() => onTabChange("chart")}
            className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm ${
              sizeChartTab === "chart" ? "border-b-2 border-[#2d6a3e] text-[#2d6a3e]" : "text-[#474747] hover:text-black"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
              <path d="m14.5 12.5 2-2" />
              <path d="m11.5 9.5 2-2" />
              <path d="m8.5 6.5 2-2" />
              <path d="m17.5 15.5 2-2" />
            </svg>
            Size Chart
          </button>
          <button
            type="button"
            onClick={() => onTabChange("measure")}
            className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm ${
              sizeChartTab === "measure" ? "border-b-2 border-[#2d6a3e] text-[#2d6a3e]" : "text-[#474747] hover:text-black"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            How To Measure
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {sizeChartTab === "chart" ? (
            <div className="space-y-5">
              <div className="inline-flex p-1 rounded-xl border border-black/8 bg-[#f3f3f5]">
                <button
                  type="button"
                  onClick={() => onUnitChange("in")}
                  className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${
                    sizeUnit === "in" ? "bg-white text-[#1a1c1d] shadow-sm" : "text-[#474747]"
                  }`}
                >
                  SIZE IN INCHES
                </button>
                <button
                  type="button"
                  onClick={() => onUnitChange("cm")}
                  className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${
                    sizeUnit === "cm" ? "bg-white text-[#1a1c1d] shadow-sm" : "text-[#474747]"
                  }`}
                >
                  SIZE IN CM
                </button>
              </div>

              <div className="rounded-xl border border-black/8 overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-[#f3f3f5]">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold">Size</th>
                      <th className="text-left px-4 py-3 font-bold">Chest</th>
                      <th className="text-left px-4 py-3 font-bold">Shoulder</th>
                      <th className="text-left px-4 py-3 font-bold">Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row) => (
                      <tr key={row.size} className="border-t border-black/6">
                        <td className="px-4 py-3 font-bold">{row.size}</td>
                        <td className="px-4 py-3">{row.chest}</td>
                        <td className="px-4 py-3">{row.shoulder}</td>
                        <td className="px-4 py-3">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl text-sm leading-relaxed flex gap-3 bg-[#eef2ef] text-[#2d6a3e]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p>The measurements in the size chart are based on body measurements, not the garment.</p>
              </div>

              <div className="aspect-square rounded-2xl flex items-center justify-center p-8 border-2 border-dashed border-black/10 bg-[#f3f3f5]">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#9aa0ad]" aria-hidden>
                  <path fill="currentColor" opacity="0.1" d="M20,20 L30,20 L30,10 L70,10 L70,20 L80,20 L95,40 L85,45 L80,40 L80,90 L20,90 L20,40 L15,45 L5,40 Z" />
                  <line x1="30" y1="12" x2="70" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                  <text x="50" y="8" fontSize="4" textAnchor="middle" fill="currentColor">Shoulder</text>
                  <line x1="20" y1="45" x2="80" y2="45" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                  <text x="50" y="42" fontSize="4" textAnchor="middle" fill="currentColor">Chest</text>
                  <line x1="22" y1="10" x2="22" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                  <text x="18" y="50" fontSize="4" textAnchor="middle" fill="currentColor" transform="rotate(-90 18,50)">
                    Length
                  </text>
                </svg>
              </div>

              <div className="space-y-6">
                {[
                  { n: 1, title: "Shoulder", text: "Place the measuring tape on shoulder seam and measure it edge to edge." },
                  { n: 2, title: "Chest", text: "Lift your arms slightly and measure around your body, crossing over the fullest part of your bust." },
                  { n: 3, title: "Length", text: "Measure from highest point of the shoulder to the bottom edge." },
                ].map((step) => (
                  <div key={step.n}>
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#2d6a3e] text-white flex items-center justify-center text-xs">{step.n}</span>
                      {step.title}
                    </h4>
                    <p className="text-sm pl-8 text-[#474747]">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 border-t border-black/8 bg-[#f3f3f5] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleClose}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-[#2f2f2f] transition-colors active:scale-[0.99]"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
