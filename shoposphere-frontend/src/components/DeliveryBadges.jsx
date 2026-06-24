function WalletIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 12a2 2 0 100 4h5v-4h-5z"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375A1.125 1.125 0 012.25 17.625V11.25m15.75 7.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177A48.14 48.14 0 016 5.625v2.25m0 0V8.25m0-2.25h4.5"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
      />
    </svg>
  );
}

const BASE_CARD =
  "flex flex-col items-center justify-center gap-1.5 px-1.5 py-3.5 rounded-xl min-h-[68px] border transition-all duration-200 text-[#2d6a3e]";

const STATIC_CARD =
  `${BASE_CARD} bg-[#eef2ef] border-[#c8dbd0] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(45,106,62,0.18)] hover:border-[#a0c4ae]`;

const OFFERS_CARD =
  `${BASE_CARD} bg-[#eef2ef] border-[#2d6a3e]/40 cursor-pointer hover:-translate-y-0.5 hover:bg-[#e4ebe6] hover:shadow-[0_4px_12px_-2px_rgba(45,106,62,0.22)] hover:border-[#2d6a3e]/70 active:scale-[0.97]`;

const LABEL = "text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-[#1a1c1d]";

function handleScrollToOffers() {
  const el = document.getElementById("available-offers");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DeliveryBadges() {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Delivery and offer highlights">
      <div className={STATIC_CARD} role="img" aria-label="Cash on delivery available">
        <WalletIcon />
        <span className={LABEL}>COD<br />Available</span>
      </div>

      <div className={STATIC_CARD} role="img" aria-label="Next day dispatch">
        <TruckIcon />
        <span className={LABEL}>Next Day<br />Dispatch</span>
      </div>

      <button
        type="button"
        className={OFFERS_CARD}
        onClick={handleScrollToOffers}
        aria-label="View available offers"
      >
        <TicketIcon />
        <span className={LABEL}>Offers<br />Available</span>
      </button>
    </div>
  );
}
