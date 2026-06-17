import { useEffect, useState } from "react";
import { API } from "../api";

const ICON_CLASS = "w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0";

function GiftIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function DiscountIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9.75h.008v.008H9.75V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ShippingIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177A48.14 48.14 0 016 5.625v2.25m0 0V8.25m0-2.25h4.5m0 0V8.25"
      />
    </svg>
  );
}

function LimitedIcon({ className = ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

const ICON_MAP = {
  gift: GiftIcon,
  discount: DiscountIcon,
  shipping: ShippingIcon,
  limited: LimitedIcon,
};

const TONE_STYLES = {
  gift: {
    card: "from-amber-50 via-[#FFF9F0] to-[#FFF6FA] border-amber-200/70",
    iconWrap: "bg-amber-100 text-amber-700",
    accent: "text-amber-800",
  },
  discount: {
    card: "from-emerald-50 via-[#F0FAF4] to-[#FFF6FA] border-emerald-200/70",
    iconWrap: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-800",
  },
  shipping: {
    card: "from-sky-50 via-[#F0F7FF] to-[#FFF6FA] border-sky-200/70",
    iconWrap: "bg-sky-100 text-sky-700",
    accent: "text-sky-800",
  },
  limited: {
    card: "from-rose-50 via-[#FFF0F3] to-[#FFF6FA] border-rose-200/70 offer-deal-card--urgent",
    iconWrap: "bg-rose-100 text-rose-700",
    accent: "text-rose-800",
  },
};

function OfferDealCard({ offer, index }) {
  const Icon = ICON_MAP[offer.iconType] || GiftIcon;
  const tone = TONE_STYLES[offer.iconType] || TONE_STYLES.gift;
  const showLimited = offer.isLimited || offer.iconType === "limited";

  return (
    <li
      className={`offer-deal-card relative overflow-hidden rounded-xl border bg-linear-to-r ${tone.card} p-3 sm:p-3.5 shadow-[0_4px_16px_-6px_rgba(26,28,29,0.1)]`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="offer-deal-shimmer pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex items-start gap-3">
        <span
          className={`grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-full ${tone.iconWrap}`}
          aria-hidden
        >
          <Icon />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[13px] sm:text-sm font-bold leading-snug ${tone.accent}`}>{offer.title}</p>
            {showLimited ? (
              <span className="offer-limited-badge inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-white">
                <LimitedIcon className="w-3 h-3" />
                Limited
              </span>
            ) : null}
          </div>
          {offer.description ? (
            <p className="mt-1 text-[11px] sm:text-xs font-medium text-[#474747]/90 leading-snug">{offer.description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function ProductOffers() {
  const [offers, setOffers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/offers`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => setOffers([]))
      .finally(() => setLoaded(true));
    return () => ac.abort();
  }, []);

  if (!loaded || offers.length === 0) return null;

  return (
    <section className="offer-deals-section" aria-label="Special offers">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="offer-deals-sparkle grid h-7 w-7 place-items-center rounded-full bg-black text-white" aria-hidden>
            <GiftIcon className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.12em] text-[#1a1c1d]">
            Special Offers
          </h3>
        </div>
        <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-amber-800">
          Deals
        </span>
      </div>

      <ul className="space-y-2">
        {offers.map((offer, index) => (
          <OfferDealCard key={offer.id} offer={offer} index={index} />
        ))}
      </ul>
    </section>
  );
}
