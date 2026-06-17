import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../api";

const ICONS = {
  dispatch: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177A48.14 48.14 0 016 5.625v2.25m0 0V8.25m0-2.25h4.5m0 0V8.25" />
  ),
  gift: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125z" />
  ),
  shipping: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  ),
  cod: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25m2.25 0v.75a.75.75 0 01-.75.75H3.75m0 0h-.375a1.125 1.125 0 00-1.125 1.125v9.75m0 0h16.5" />
  ),
  return: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  ),
  limited: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  ),
};

function AnnouncementIcon({ type }) {
  const path = ICONS[type] || ICONS.gift;
  return (
    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      {path}
    </svg>
  );
}

function formatCountdown(endDate) {
  const end = new Date(endDate).getTime();
  const diff = Math.max(0, end - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function isInternalLink(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
}

function AnnouncementContent({ item, countdownText }) {
  const inner = (
    <>
      <span className="grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-full bg-white/12 text-[#f8e8ef]" aria-hidden>
        <AnnouncementIcon type={item.iconType} />
      </span>
      <span className="truncate text-[11px] sm:text-xs font-semibold tracking-wide text-white/95">{item.message}</span>
      {countdownText ? (
        <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#ffe4ef]">
          Ends in {countdownText}
        </span>
      ) : null}
      {item.linkUrl ? (
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#f5d0e0] underline-offset-2 group-hover:underline">
          View
        </span>
      ) : null}
    </>
  );

  const className =
    "group mx-auto flex max-w-6xl items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 min-h-[36px] sm:min-h-[40px]";

  if (item.linkUrl) {
    if (isInternalLink(item.linkUrl)) {
      return (
        <Link to={item.linkUrl} className={className}>
          {inner}
        </Link>
      );
    }
    return (
      <a href={item.linkUrl} className={className} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [countdownTick, setCountdownTick] = useState(0);
  const barRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/announcements`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoaded(true));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const el = barRef.current;
    const root = document.documentElement;

    const syncHeight = () => {
      const h = el && announcements.length > 0 ? el.offsetHeight : 0;
      root.style.setProperty("--announcement-bar-h", `${h}px`);
    };

    syncHeight();
    const ro = el ? new ResizeObserver(syncHeight) : null;
    if (el && ro) ro.observe(el);

    return () => {
      root.style.setProperty("--announcement-bar-h", "0px");
      ro?.disconnect();
    };
  }, [announcements.length, loaded]);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    const hasCountdown = announcements.some((a) => a.showCountdown && a.countdownEndsAt);
    if (!hasCountdown) return undefined;
    const timer = setInterval(() => setCountdownTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, [announcements]);

  const current = announcements[activeIndex] || null;

  const countdownText = useMemo(() => {
    if (!current?.showCountdown || !current?.countdownEndsAt) return null;
    void countdownTick;
    return formatCountdown(current.countdownEndsAt);
  }, [current, countdownTick]);

  if (!loaded || announcements.length === 0) return null;

  return (
    <>
    <div
      ref={barRef}
      className="announcement-bar fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-linear-to-r from-[#1a1c1d] via-[#2a2428] to-[#1a1c1d] shadow-[0_4px_20px_-6px_rgba(26,28,29,0.45)]"
      role="region"
      aria-label="Store announcements"
    >
      <div className="announcement-bar-shine pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative overflow-hidden">
        {announcements.length === 1 ? (
          <AnnouncementContent item={announcements[0]} countdownText={countdownText} />
        ) : (
          announcements.map((item, index) => {
            const active = index === activeIndex;
            const cd =
              item.showCountdown && item.countdownEndsAt ? formatCountdown(item.countdownEndsAt) : null;
            return (
              <div
                key={item.id}
                className={`announcement-slide transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active
                    ? "relative opacity-100 translate-y-0"
                    : "absolute inset-x-0 top-0 opacity-0 -translate-y-1 pointer-events-none"
                }`}
                aria-hidden={!active}
              >
                <AnnouncementContent item={item} countdownText={active ? cd : null} />
              </div>
            );
          })
        )}
      </div>
      {announcements.length > 1 ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1" aria-hidden>
          {announcements.map((item, index) => (
            <span
              key={item.id}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-3 bg-white/80" : "w-1 bg-white/30"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
    <div
      className="announcement-bar-spacer shrink-0"
      style={{ height: "var(--announcement-bar-h, 0px)" }}
      aria-hidden
    />
    </>
  );
}
