import { Link } from "react-router-dom";
import { memo } from "react";

function AnimeFramesBottomWidget() {
  return (
    <section
      className="px-4 sm:px-6 lg:px-8"
      style={{ paddingTop: "40px", marginTop: 0, marginBottom: 0, paddingBottom: 0 }}
      aria-label="Create Your Own Anime Frame"
    >
      <Link
        to="/anime-frames/customize"
        className="group relative block w-full overflow-hidden rounded-2xl border border-black/10 shadow-[0_15px_45px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_25px_60px_rgba(249,115,22,0.22)]"
      >
        {/* Cinematic Anime Desk Customization Banner */}
        <div className="relative w-full aspect-[1024/374] bg-[#0c0d10] overflow-hidden">
          <img
            src="/banners/custom-frame-promo-banner.png"
            alt="Create Your Own Anime Frame - Upload your favorite image and turn it into a custom anime frame"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            loading="lazy"
          />

          {/* Interactive hotspot / hover glow over the button area */}
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-300 group-hover:ring-2 group-hover:ring-orange-400/50 group-hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]"
            style={{
              left: "13.2%",
              top: "72.4%",
              width: "26.1%",
              height: "11.6%",
            }}
          />

          {/* Subtle edge ambient gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-black/20 via-transparent to-transparent"
          />
        </div>

        {/* Accessible screen-reader text */}
        <div className="sr-only">
          <h2>Create Your Own Anime Frame</h2>
          <p>Upload your favorite image and turn it into a custom anime frame.</p>
          <span>Customize Your Frame →</span>
        </div>
      </Link>
    </section>
  );
}

export default memo(AnimeFramesBottomWidget);
