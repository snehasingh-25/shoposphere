import { useState, useEffect } from "react";
import { API } from "../api";

const FALLBACK_IMAGE =
  "https://res.cloudinary.com/dgha7rmvi/image/upload/v1790938603/ecommerce/qgmkzkfugqwdw7clr431.jpg";

/**
 * Sub-categories shown as circular icons + label (same pattern as AnimeCategoryRow).
 * api: "categories" | "anime-categories"
 */
export default function AnimeSubCategoryGrid({
  parentSlug,
  parentName,
  selectedSubSlug,
  onSelectSubCategory,
  api = "categories",
  variant = "default",
}) {
  const isPremium = variant === "premium";
  const [subCategories, setSubCategories] = useState([]);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentSlug) {
      setSubCategories([]);
      setParent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSubCategories([]);
    setParent(null);
    fetch(`${API}/${api}/subcategories/${encodeURIComponent(parentSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.subCategories)) {
          setParent(data.parent || null);
          setSubCategories(data.subCategories);
        } else {
          setParent(null);
          setSubCategories([]);
        }
      })
      .catch(() => {
        setParent(null);
        setSubCategories([]);
      })
      .finally(() => setLoading(false));
  }, [parentSlug, api]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center shrink-0 gap-2">
              <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
              <div className="h-3 w-14 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!parent) return null;

  if (!subCategories.length) {
    return (
      <section className="w-full px-4 sm:px-6 lg:px-8 py-4" aria-label={`${parentName} sub-categories`}>
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
          {parentName} — Browse by type
        </p>
        <p className="text-xs text-slate-500">
          No sub-categories yet. Add them from Admin →{" "}
          {api === "anime-categories" ? "Anime Categories" : "Categories"}.
        </p>
      </section>
    );
  }

  const sectionClass = isPremium
    ? "w-full py-3 bg-transparent"
    : "w-full py-2 lg:py-1 bg-transparent";
  const innerWrap = isPremium
    ? "mx-4 sm:mx-6 lg:mx-8 rounded-2xl border border-[#39ff14]/30 bg-black/50 px-3 py-3 shadow-[0_0_40px_rgba(57,255,20,0.08)]"
    : "px-4 sm:px-6 lg:px-8";
  const labelClass = isPremium
    ? "text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#39ff14]/80 mb-2 px-1"
    : "text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1";
  const nameActive = isPremium ? "font-bold text-[#39ff14]" : "font-bold text-slate-900";
  const nameIdle = isPremium
    ? "font-medium text-zinc-200 group-hover:text-white"
    : "font-medium text-slate-600 group-hover:text-slate-900";
  const underlineActive = isPremium ? "w-full bg-[#39ff14]" : "w-full bg-slate-900";
  const underlineHover = isPremium ? "group-hover:bg-[#39ff14]/40" : "group-hover:bg-slate-300";

  return (
    <section className={sectionClass} aria-label={`${parentName} sub-categories`}>
      <div className={innerWrap}>
        <p className={labelClass}>{parentName} — Browse by type</p>
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-4 overflow-x-auto scrollbar-hide py-1 px-1">
          <button
            type="button"
            onClick={() => onSelectSubCategory && onSelectSubCategory({ slug: "all", name: "All Series" })}
            className="group flex flex-col items-center shrink-0 text-center transition-all duration-200 cursor-pointer focus:outline-none"
            aria-pressed={!selectedSubSlug || selectedSubSlug === "all"}
          >
            <img
              src={FALLBACK_IMAGE}
              alt="All Series"
              className={[
                "w-16 h-16 sm:w-20 sm:h-20 lg:w-14 lg:h-14 rounded-full object-cover pointer-events-none select-none",
                "transition-transform duration-300 group-hover:scale-105 active:scale-95",
                !selectedSubSlug || selectedSubSlug === "all" ? `scale-105 ${isPremium ? "ring-2 ring-[#39ff14]/80 shadow-[0_0_20px_rgba(57,255,20,0.35)]" : ""}` : "",
              ].join(" ")}
              loading="lazy"
            />
            <span
              className={[
                "mt-1.5 lg:mt-1 text-xs tracking-tight transition-colors whitespace-nowrap",
                !selectedSubSlug || selectedSubSlug === "all" ? nameActive : nameIdle,
              ].join(" ")}
            >
              All Series
            </span>
            <div
              className={[
                "h-0.5 rounded-full mt-1 transition-all duration-300",
                !selectedSubSlug || selectedSubSlug === "all"
                  ? underlineActive
                  : `w-0 bg-transparent group-hover:w-4 ${underlineHover}`,
              ].join(" ")}
            />
          </button>
          {subCategories.map((sub) => {
            const isActive =
              (selectedSubSlug || "").toLowerCase().trim() === (sub.slug || "").toLowerCase().trim();
            const icon = sub.imageUrl || FALLBACK_IMAGE;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubCategory && onSelectSubCategory(sub)}
                className="group flex flex-col items-center shrink-0 text-center transition-all duration-200 cursor-pointer focus:outline-none"
                aria-pressed={isActive}
              >
                <img
                  src={icon}
                  alt={sub.name}
                  className={[
                    "w-16 h-16 sm:w-20 sm:h-20 lg:w-14 lg:h-14 rounded-full object-cover pointer-events-none select-none",
                    "transition-transform duration-300 group-hover:scale-105 active:scale-95",
                    isActive
                      ? `scale-105 ${isPremium ? "ring-2 ring-[#39ff14]/80 shadow-[0_0_20px_rgba(57,255,20,0.35)]" : ""}`
                      : "",
                  ].join(" ")}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = FALLBACK_IMAGE;
                  }}
                />
                <span
                  className={[
                    "mt-1.5 lg:mt-1 text-xs tracking-tight transition-colors whitespace-nowrap max-w-[5.5rem] sm:max-w-none truncate sm:overflow-visible",
                    isActive ? nameActive : nameIdle,
                  ].join(" ")}
                >
                  {sub.name}
                </span>
                <div
                  className={[
                    "h-0.5 rounded-full mt-1 transition-all duration-300",
                    isActive ? underlineActive : `w-0 bg-transparent group-hover:w-4 ${underlineHover}`,
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
