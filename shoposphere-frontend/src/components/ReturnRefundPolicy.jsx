import { useId, useRef, useState, useEffect } from "react";

const ICON_CLASS = "w-5 h-5 sm:w-[22px] sm:h-[22px]";

function ReturnIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function ExchangeIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function RefundIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25m2.25 0v.75a.75.75 0 01-.75.75H3.75m0 0h-.375a1.125 1.125 0 00-1.125 1.125v9.75m0 0h16.5m-16.5 0a1.125 1.125 0 001.125 1.125h8.25a1.125 1.125 0 001.125-1.125m-10.5 0V9.375c0-.621.504-1.125 1.125-1.125h3.75m0 0V6.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v2.25m-9 3.75h9" />
    </svg>
  );
}

function ClockIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PackageIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function SupportIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

const POLICY_ITEMS = [
  {
    key: "return",
    title: "Easy Return Policy",
    summary: "Return eligible gifts within 7 days of delivery — simple and stress-free.",
    detail:
      "If your order isn't quite right, initiate a return from My Orders. We'll guide you through pickup or drop-off options. Most standard items qualify; personalized products may be excluded.",
    Icon: ReturnIcon,
    tone: "emerald",
  },
  {
    key: "exchange",
    title: "Hassle-Free Exchange",
    summary: "Wrong size or colour? Exchange for the perfect fit with minimal steps.",
    detail:
      "Request an exchange through your order details or contact our support team. Once we receive the original item, your replacement is dispatched promptly — no complicated forms.",
    Icon: ExchangeIcon,
    tone: "rose",
  },
  {
    key: "refund",
    title: "Refund Eligibility",
    summary: "Approved returns receive refunds to your original payment method.",
    detail:
      "Refunds are processed after a quick quality check. UPI, card, and wallet payments are credited within 5–7 business days. COD orders receive bank transfer refunds.",
    Icon: RefundIcon,
    tone: "neutral",
  },
  {
    key: "timeframe",
    title: "Return Timeframe",
    summary: "Submit return requests within 7 days of receiving your package.",
    detail:
      "The window starts from the delivery date shown in your order tracking. Reach out early if you need help — we're happy to assist before the deadline passes.",
    Icon: ClockIcon,
    tone: "amber",
  },
  {
    key: "condition",
    title: "Product Condition",
    summary: "Items must be unused, with tags and original packaging intact.",
    detail:
      "Gently inspect gifts before returning. Items showing wear, missing tags, or damage may not qualify. Customized or engraved products are final sale unless defective.",
    Icon: PackageIcon,
    tone: "sky",
  },
  {
    key: "support",
    title: "Customer Support",
    summary: "Our team helps you through every return, exchange, and refund step.",
    detail:
      "Contact us via WhatsApp or the Contact page for fast assistance. We respond to return queries within 24 hours and keep you updated until your case is resolved.",
    Icon: SupportIcon,
    tone: "violet",
  },
];

const TONE_STYLES = {
  emerald: { wrap: "bg-emerald-50 text-emerald-800", icon: "text-emerald-700" },
  rose: { wrap: "bg-[#FFF6FA] text-[#5C4A52]", icon: "text-[#9A7082]" },
  neutral: { wrap: "bg-[#f3f3f5] text-[#1a1c1d]", icon: "text-[#474747]" },
  amber: { wrap: "bg-amber-50 text-amber-900", icon: "text-amber-700" },
  sky: { wrap: "bg-sky-50 text-sky-900", icon: "text-sky-700" },
  violet: { wrap: "bg-violet-50 text-violet-900", icon: "text-violet-700" },
};

function PolicyCard({ item }) {
  const { Icon } = item;
  const tone = TONE_STYLES[item.tone];

  return (
    <li className="rounded-xl border border-black/8 bg-white p-3.5 sm:p-4 shadow-[0_4px_16px_-8px_rgba(26,28,29,0.08)]">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone.wrap}`} aria-hidden>
          <Icon className={`w-[18px] h-[18px] ${tone.icon}`} />
        </span>
        <div className="min-w-0">
          <h4 className="text-[12px] sm:text-[13px] font-bold text-[#1a1c1d] leading-snug">{item.title}</h4>
          <p className="mt-1 text-[11px] sm:text-xs font-medium text-[#474747] leading-relaxed">{item.summary}</p>
        </div>
      </div>
    </li>
  );
}

export default function ReturnRefundPolicy({ className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const detailsRef = useRef(null);
  const sectionId = useId();

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;

    const measure = () => setDetailsHeight(el.scrollHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <section
      className={`rounded-2xl border border-[#EDDCE6]/90 bg-[#FFF6FA] p-4 sm:p-5 shadow-[0_4px_24px_-8px_rgba(140,100,120,0.12)] ${className}`}
      aria-labelledby={`${sectionId}-title`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A7082] mb-1">Shop with confidence</p>
          <h3 id={`${sectionId}-title`} className="pd-headline text-lg sm:text-xl font-black uppercase tracking-tight text-[#1a1c1d]">
            Return & Exchange Promise
          </h3>
          <p className="mt-1.5 text-xs sm:text-[13px] font-medium text-[#474747] leading-relaxed">
            Transparent policies so you can gift worry-free.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          Trusted
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {POLICY_ITEMS.map((item) => (
          <PolicyCard key={item.key} item={item} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#1a1c1d] shadow-[0_4px_14px_-6px_rgba(26,28,29,0.1)] transition-all duration-300 hover:border-black/25 hover:bg-[#f9f9fb] active:scale-[0.99] min-h-[44px]"
        aria-expanded={expanded}
        aria-controls={`${sectionId}-details`}
      >
        <span>{expanded ? "Hide policy details" : "View full policy details"}</span>
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

      <div
        id={`${sectionId}-details`}
        className="policy-details-panel overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: expanded ? `${detailsHeight}px` : "0px" }}
        aria-hidden={!expanded}
      >
        <div ref={detailsRef} className="pt-4 space-y-3">
          {POLICY_ITEMS.map((item) => (
            <div
              key={`detail-${item.key}`}
              className="rounded-xl border border-black/6 bg-white/80 px-4 py-3.5"
            >
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#1a1c1d]">{item.title}</h4>
              <p className="mt-1.5 text-[11px] sm:text-xs text-[#474747] leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
