import { useState, useEffect } from "react";
import { API } from "../api";

const ALL_SERIES_IMAGE = "https://res.cloudinary.com/dgha7rmvi/image/upload/v1790938603/ecommerce/qgmkzkfugqwdw7clr431.jpg";

export default function AnimeCategoryRow({ selectedSeries = "All Series", onSelectSeries }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/anime-categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = [
            { id: "all", name: "All Series", slug: "all", icon: ALL_SERIES_IMAGE },
            ...data.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              icon: item.imageUrl || ALL_SERIES_IMAGE,
            })),
          ];
          setCategories(mapped);
        } else {
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load dynamic anime categories:", err);
        setCategories([]);
      });
  }, []);

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-2 lg:py-1 bg-transparent" aria-label="Anime Categories">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-4 overflow-x-auto scrollbar-hide py-1 px-1">
          {categories.map((cat) => {
            const isActive =
              (selectedSeries || "").toLowerCase().trim() === (cat.name || "").toLowerCase().trim() ||
              (selectedSeries || "").toLowerCase().trim() === (cat.slug || "").toLowerCase().trim();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectSeries && onSelectSeries(cat.name)}
                className="group flex flex-col items-center shrink-0 text-center transition-all duration-200 cursor-pointer focus:outline-none"
              >
                {/* Round circular image container */}
                <div
                  className={[
                    "w-16 h-16 sm:w-20 sm:h-20 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-white overflow-hidden",
                    "transition-all duration-300 p-2.5 lg:p-1.5 shadow-sm",
                    "group-hover:scale-105 active:scale-95",
                    isActive
                      ? "ring-2 ring-slate-900 ring-offset-2 shadow-md scale-105"
                      : "ring-1 ring-slate-200 group-hover:ring-slate-400 group-hover:shadow",
                  ].join(" ")}
                >
                  <img
                    src={cat.icon}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = ALL_SERIES_IMAGE;
                    }}
                  />
                </div>

                {/* Name of anime */}
                <span
                  className={[
                    "mt-1.5 lg:mt-1 text-xs tracking-tight transition-colors whitespace-nowrap",
                    isActive ? "font-bold text-slate-900" : "font-medium text-slate-600 group-hover:text-slate-900",
                  ].join(" ")}
                >
                  {cat.name}
                </span>

                {/* Active indicator line like reference image */}
                <div
                  className={[
                    "h-0.5 rounded-full mt-1 transition-all duration-300",
                    isActive ? "w-full bg-slate-900" : "w-0 bg-transparent group-hover:w-4 group-hover:bg-slate-300",
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
