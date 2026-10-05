import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import CarouselArrow from "./CarouselArrow";

const BANNER_ASPECT = "1600 / 700";

function usePerView() {
  return 1;
}

// ─── Static fallback carousel (used when no CMS banners are configured) ───────
function StaticBannerCarousel({ banners, className = "" }) {
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const total = banners.length;

  useEffect(() => {
    if (total <= 1 || hovered) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % total), 3500);
    return () => clearInterval(id);
  }, [total, hovered]);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <section
      className={`w-full bg-[#0c0c0c] ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Slides */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b, i) => (
            <div
              key={i}
              className="relative w-full shrink-0 aspect-[1024/447] md:aspect-[1024/224] bg-[#0a0a0a]"
              style={{ flex: "0 0 100%" }}
            >
              <img
                src={b.src}
                alt={b.alt}
                className="absolute inset-0 w-full h-full object-contain object-center"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
              />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={[
                  "h-2 rounded-full transition-all duration-300 shadow-sm",
                  i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75",
                ].join(" ")}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Arrows */}
        {total > 1 && (
          <>
            <CarouselArrow direction="left" onClick={prev} ariaLabel="Previous" size="md" hideOnMobile={true} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 shadow-lg" />
            <CarouselArrow direction="right" onClick={next} ariaLabel="Next" size="md" hideOnMobile={true} className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 shadow-lg" />
          </>
        )}
      </div>
    </section>
  );
}

export default function HeroPromoCarousel({ banners, className = "" }) {
  const list = Array.isArray(banners) ? banners : [];
  const perView = usePerView();
  const viewportRef = useRef(null);
  const rafRef = useRef(0);
  const [page, setPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const pages = useMemo(
    () => (list.length <= 0 ? 0 : Math.max(1, Math.ceil(list.length / perView))),
    [list.length, perView]
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pages - 1)));
  }, [pages]);

  const scrollToPage = (nextPage) => {
    const el = viewportRef.current;
    if (!el) return;
    const target = (nextPage + pages) % pages;
    el.scrollTo({ left: el.clientWidth * target, behavior: "smooth" });
    setPage(target);
  };

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setPage((p) => (p === next ? p : next));
    });
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // 3-second Auto-advance (pauses on hover or touch)
  useEffect(() => {
    if (pages <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setPage((curr) => {
        const next = (curr + 1) % pages;
        const el = viewportRef.current;
        if (el) {
          el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [pages, isHovered]);

  // Static fallback banners shown when no CMS banners have been configured
  const STATIC_BANNERS = [
    { src: "/banners/anime-frames-banner.png",   alt: "Shoposphere — Glow in the Dark Frames" },
    { src: "/banners/anime-frames-banner-2.png",  alt: "Shoposphere — Layered Art Frames" },
  ];

  if (list.length === 0) {
    return <StaticBannerCarousel banners={STATIC_BANNERS} className={className} />;
  }

  return (
    <section className={`w-full bg-white ${className}`}>
      <div className="relative w-full max-w-[1600px] mx-auto">
        <div
          className="relative w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {/* Scrollable track */}
          <div
            ref={viewportRef}
            onScroll={onScroll}
            className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
            aria-label="Promotional carousel"
          >
            <div className="flex w-full">
              {list.map((b, idx) => {
                const title = (b?.title || "").toString();
                const ctaText = (b?.ctaText || "Shop Now").toString();
                const ctaLink = (b?.ctaLink || "/categories").toString();
                const background = (b?.imageUrl || "").toString();
                return (
                  <article
                    key={b?.id ?? `${idx}-${title}`}
                    className="snap-start shrink-0 w-full"
                    style={{ flex: "0 0 100%" }}
                  >
                    <Link
                      to={ctaLink}
                      className="relative block overflow-hidden bg-[#0a0a0a] w-full aspect-[1024/447] md:aspect-[1024/224]"
                      aria-label={title ? `${title} — ${ctaText}` : ctaText}
                    >
                      {background ? (
                        <img
                          src={background}
                          alt={title || "Promotional banner"}
                          className="absolute inset-0 h-full w-full object-contain object-center"
                          decoding="async"
                          loading={idx === 0 ? "eager" : "lazy"}
                          fetchPriority={idx === 0 ? "high" : "auto"}
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(75% .20 330), oklch(78% .16 250), oklch(92% .04 340))",
                          }}
                        />
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Indicator Dots */}
          {pages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center gap-2">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToPage(i)}
                  className={[
                    "h-2 rounded-full transition-all duration-300 shadow-sm",
                    i === page ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75",
                  ].join(" ")}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Left / Right Floating Arrows */}
          {pages > 1 && (
            <>
              <CarouselArrow
                direction="left"
                onClick={() => scrollToPage(page - 1)}
                ariaLabel="Previous"
                size="md"
                hideOnMobile={true}
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 shadow-lg"
              />
              <CarouselArrow
                direction="right"
                onClick={() => scrollToPage(page + 1)}
                ariaLabel="Next"
                size="md"
                hideOnMobile={true}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 shadow-lg"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
