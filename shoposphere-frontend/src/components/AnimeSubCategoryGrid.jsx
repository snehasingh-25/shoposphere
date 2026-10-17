import { useState, useEffect } from "react";
import { API } from "../api";

/**
 * AnimeSubCategoryGrid
 * Shown on the Anime Frames page when a parent series is selected.
 * Fetches sub-categories of the parent and displays them as horizontal
 * pill buttons, letting users drill down further.
 */
export default function AnimeSubCategoryGrid({
  parentSlug,
  parentName,
  selectedSubCategory,
  onSelectSubCategory,
}) {
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
    fetch(`${API}/anime-categories/subcategories/${encodeURIComponent(parentSlug)}`)
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
  }, [parentSlug]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-8 w-24 rounded-full bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Parent category not found in DB — slug mismatch, silently hide
  if (!parent) return null;

  // Parent found but no sub-categories created yet
  if (!subCategories.length) {
    return (
      <section
        className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-transparent"
        aria-label={`${parentName} sub-categories`}
      >
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
          {parentName} — Browse by type
        </p>
        <div className="flex items-center gap-2 py-1 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 w-fit">
          <svg
            className="w-3.5 h-3.5 text-slate-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-xs text-slate-500">
            No sub-categories yet for <strong>{parentName}</strong>.
            Add them from the Admin → Anime Categories panel.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-transparent"
      aria-label={`${parentName} sub-categories`}
    >
      {/* Section label */}
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
        {parentName} — Browse by type
      </p>

      {/* Sub-category pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {subCategories.map((sub) => {
          const isActive =
            (selectedSubCategory || "").toLowerCase().trim() ===
            (sub.name || "").toLowerCase().trim();

          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubCategory && onSelectSubCategory(sub.name)}
              className={[
                "group shrink-0 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold",
                "transition-all duration-200 ease-out focus:outline-none active:scale-95",
                isActive
                  ? "bg-slate-900 text-white shadow-md scale-[1.03] ring-2 ring-slate-900 ring-offset-1"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:shadow-sm hover:scale-[1.02]",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {/* Optional sub-category icon */}
              {sub.imageUrl && (
                <span className="shrink-0 w-5 h-5 rounded-full overflow-hidden ring-1 ring-white/40">
                  <img
                    src={sub.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </span>
              )}
              {sub.name}
              {isActive && (
                <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-white/20">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
