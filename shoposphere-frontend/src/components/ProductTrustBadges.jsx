const BADGE_ICON_CLASS = "w-5 h-5 sm:w-[22px] sm:h-[22px] lg:w-6 lg:h-6 shrink-0";

function SparklesIcon({ className = BADGE_ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function GiftBoxIcon({ className = BADGE_ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function HeartIcon({ className = BADGE_ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function UsersIcon({ className = BADGE_ICON_CLASS }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

const TRUST_BADGES = [
  { label: "Personalized For You", Icon: SparklesIcon },
  { label: "Premium Quality", Icon: GiftBoxIcon },
  { label: "Handmade With Love", Icon: HeartIcon },
  { label: "Loved By 20000+ Customers", Icon: UsersIcon },
];

export default function ProductTrustBadges() {
  return (
    <section className="w-full" aria-label="Product trust badges">
      <div className="rounded-[14px] bg-[#FFF6FA] border border-[#EDDCE6]/90 shadow-[0_4px_20px_-6px_rgba(140,100,120,0.14)] overflow-hidden">
        <ul className="grid grid-cols-4 min-h-[76px] sm:min-h-[84px]">
          {TRUST_BADGES.map(({ label, Icon }, index) => (
            <li
              key={label}
              className={`flex flex-1 min-w-0 ${
                index < TRUST_BADGES.length - 1 ? "border-r border-[#EDDCE6]/80" : ""
              }`}
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2 px-1.5 py-3.5 sm:px-2 sm:py-4">
                <span className="text-[#9A7082]" aria-hidden>
                  <Icon />
                </span>
                <span className="text-center text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-semibold leading-[1.25] tracking-[0.02em] text-[#5C4A52]">
                  {label}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
