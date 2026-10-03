import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { API } from "../api";

const GMB_PAGE_LINK = "https://share.google/6eK5jlt0kLtqc5l3B";

const HIDE_ON_PATHS = ["/checkout", "/order-success", "/cart", "/login", "/signup", "/auth/callback"];

function shouldHide(pathname) {
  return HIDE_ON_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Google "G" multicolored logo SVG
function GoogleLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

// 5 Stars SVG row
function Stars({ rating = 5, size = "w-4 h-4" }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`${size} ${i < rating ? "text-[#f59e0b] fill-[#f59e0b]" : "text-gray-300 fill-gray-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// User avatar initial badge
function ReviewerAvatar({ name = "Customer", color = "bg-slate-700", photo = null }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/80 shadow-xs"
        loading="lazy"
      />
    );
  }

  const initial = (name.trim().charAt(0) || "U").toUpperCase();
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs ring-2 ring-white/80 shrink-0 ${color}`}
    >
      {initial}
    </div>
  );
}

export default function GoogleReviewsSection() {
  const { pathname } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isTouchingRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/reviews/google`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData && !resData.error) {
          setData(resData);
        }
      })
      .catch((err) => {
        console.warn("Could not load Google reviews from backend, using fallback:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Pause helper
  const pauseAutoScroll = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    isPausedRef.current = true;
  }, []);

  // Resume helper with optional delay (when touch or tap released, or mouse leaves)
  const resumeAutoScroll = useCallback((delay = 0) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (delay > 0) {
      resumeTimerRef.current = setTimeout(() => {
        if (!isHoveredRef.current && !isTouchingRef.current) {
          isPausedRef.current = false;
        }
      }, delay);
    } else {
      if (!isHoveredRef.current && !isTouchingRef.current) {
        isPausedRef.current = false;
      }
    }
  }, []);

  const reviews = data?.reviews || [];
  const rating = data?.rating || 4.9;
  const totalReviews = data?.totalReviews || 382;

  // Triplicate reviews for infinite seamless continuous auto-slide
  const displayReviews = reviews.length > 0 ? [...reviews, ...reviews, ...reviews] : [];

  // Continuous auto-slide animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || reviews.length === 0) return;

    let animationFrameId;
    let lastTime = performance.now();
    const SPEED_PPS = 38; // px per second for silky, legible continuous sliding

    const step = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPausedRef.current && el && el.children.length >= reviews.length * 2) {
        const first = el.children[0];
        const nextSetFirst = el.children[reviews.length];
        if (first && nextSetFirst) {
          const cycleWidth = nextSetFirst.offsetLeft - first.offsetLeft;
          if (cycleWidth > 0) {
            el.scrollLeft += SPEED_PPS * delta;
            if (el.scrollLeft >= cycleWidth) {
              el.scrollLeft -= cycleWidth;
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [reviews.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || reviews.length === 0 || el.children.length < reviews.length * 2) return;

    const first = el.children[0];
    const nextSetFirst = el.children[reviews.length];
    if (first && nextSetFirst) {
      const cycleWidth = nextSetFirst.offsetLeft - first.offsetLeft;
      if (cycleWidth > 0) {
        if (el.scrollLeft >= cycleWidth * 2) {
          el.scrollLeft -= cycleWidth;
        } else if (el.scrollLeft <= 0) {
          el.scrollLeft += cycleWidth;
        }
      }
    }

    const cardWidth = el.firstElementChild?.clientWidth || 320;
    const newIdx = Math.round(el.scrollLeft / cardWidth) % reviews.length;
    setActiveIndex(newIdx);
  }, [reviews.length]);

  const scrollByCard = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth || 320;
    const offset = direction === "next" ? cardWidth + 16 : -(cardWidth + 16);
    el.scrollBy({ left: offset, behavior: "smooth" });
    pauseAutoScroll();
    resumeAutoScroll(2500);
  };

  if (shouldHide(pathname)) return null;

  const isPrecededByBanner = pathname === "/anime-frames";

  return (
    <section
      className={`relative z-10 px-4 sm:px-6 lg:px-8 overflow-hidden ${
        isPrecededByBanner ? "pt-10 pb-14 sm:pb-18" : "py-14 sm:py-18"
      }`}
      style={isPrecededByBanner ? { paddingTop: "40px" } : undefined}
      aria-label="Google Customer Reviews"
    >
      {/* ─── Ambient Glow Blobs for Glassmorphism Refraction ─── */}
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-amber-200/25 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 bg-rose-200/20 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto">
        {/* ─── Mobile View Header (Shown on mobile, hidden on tablet & desktop) ─── */}
        <div className="block md:hidden mb-6 px-1 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-black mb-1">
            Customer Love
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-black mb-1.5">
            What Our Customers Say
          </h2>
          <p className="text-sm text-black font-normal">
            Real reviews from shoppers who chose Shoposphere
          </p>
        </div>

        {/* ─── Main Glassmorphism Header Showcase Container (Desktop & Tablet only) ─── */}
        <div
          className="hidden md:block relative rounded-3xl p-6 sm:p-8 mb-8 transition-all duration-300 border border-white/60 dark:border-white/10 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.06)] backdrop-blur-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.55) 100%)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Google Header & Rating Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                <GoogleLogo className="w-8 h-8" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-widest font-bold text-slate-500">
                    Google Customer Reviews
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified Business
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {rating.toFixed(1)}
                  </span>
                  <div className="flex flex-col justify-center">
                    <Stars rating={Math.round(rating)} size="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs text-slate-600 font-medium mt-0.5">
                      Based on <strong className="text-slate-900 font-bold">{totalReviews}+</strong> genuine reviews on Google
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: GMB Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={GMB_PAGE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#1a1c1d] text-white hover:bg-black active:scale-95 transition-all shadow-md group"
              >
                <span>Write a Review</span>
                <svg
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>

              <a
                href={GMB_PAGE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-white/80 hover:bg-white text-slate-800 border border-slate-200/80 active:scale-95 transition-all shadow-xs"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>View on Google Maps</span>
              </a>

              {/* Slider Arrows */}
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <button
                  type="button"
                  onClick={() => scrollByCard("prev")}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/85 border border-white/80 shadow-xs hover:bg-white active:scale-95 transition-all"
                  aria-label="Previous review"
                >
                  <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard("next")}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/85 border border-white/80 shadow-xs hover:bg-white active:scale-95 transition-all"
                  aria-label="Next review"
                >
                  <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Horizontal Continuous Auto-Slide Cards Row ─── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseEnter={() => {
            isHoveredRef.current = true;
            pauseAutoScroll();
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false;
            resumeAutoScroll(0);
          }}
          onTouchStart={() => {
            isTouchingRef.current = true;
            pauseAutoScroll();
          }}
          onTouchEnd={() => {
            isTouchingRef.current = false;
            resumeAutoScroll(1800);
          }}
          onClick={() => {
            pauseAutoScroll();
            resumeAutoScroll(3500);
          }}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 -mx-1 scrollbar-hide select-none cursor-grab active:cursor-grabbing"
          style={{ scrollBehavior: "auto" }}
        >
          {displayReviews.map((rev, index) => (
            <div
              key={`${rev.id}-${index}`}
              className="shrink-0 w-[290px] sm:w-[350px] rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.08)] group"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.6) 100%)",
                backdropFilter: "blur(18px) saturate(160%)",
                WebkitBackdropFilter: "blur(18px) saturate(160%)",
                border: "1px solid rgba(255, 255, 255, 0.7)",
                boxShadow: "0 8px 30px -4px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div>
                {/* Header: User Info & Google G icon */}
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3">
                    <ReviewerAvatar
                      name={rev.authorName}
                      color={rev.avatarColor}
                      photo={rev.authorPhoto}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 tracking-tight leading-tight">
                          {rev.authorName}
                        </span>
                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified Review">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {rev.badge || "Verified Customer"}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 rounded-md bg-white/70 shadow-2xs border border-white/60">
                    <GoogleLogo className="w-4 h-4" />
                  </div>
                </div>

                {/* Rating & Relative Time */}
                <div className="flex items-center justify-between mb-3">
                  <Stars rating={rev.rating || 5} size="w-3.5 h-3.5" />
                  <span className="text-[11px] text-slate-400 font-medium">
                    {rev.relativeTimeDescription}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  "{rev.text}"
                </p>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Posted on Google
                </span>

                <a
                  href={GMB_PAGE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-700 hover:text-black hover:underline transition-colors"
                >
                  Read original →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Guidance Dots */}
        <div className="flex md:hidden justify-center items-center gap-1.5 mt-3">
          {reviews.slice(0, Math.min(reviews.length, 6)).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-5 bg-slate-900" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
