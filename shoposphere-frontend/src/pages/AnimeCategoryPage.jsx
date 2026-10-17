import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API } from "../api";
import { optimizeCloudinaryUrl } from "../utils/imageUrl";

export default function AnimeCategoryPage() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    setNotFound(false);

    fetch(`${API}/anime-categories/by-slug/${encodeURIComponent(categorySlug)}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCategory(data);
          document.title = `${data.name} — Anime Frames | Shoposphere`;
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => { document.title = "Anime Frames | Shoposphere"; };
  }, [categorySlug]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: "var(--primary)" }} />
          <p className="text-sm text-muted">Loading category…</p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "var(--background)" }}>
        <div className="text-5xl">🎌</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Category not found</h1>
        <p className="text-muted text-sm max-w-sm">
          The category <strong>"{categorySlug}"</strong> doesn't exist or has been removed.
        </p>
        <Link
          to="/anime-frames"
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          ← Back to All Categories
        </Link>
      </div>
    );
  }

  const subCategories = category.children || [];

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--background)" }}>
      {/* ── Hero / Header ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
        {/* Background image */}
        {category.imageUrl ? (
          <>
            <img
              src={optimizeCloudinaryUrl(category.imageUrl, 1400)}
              alt={category.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900" />
        )}

        {/* Content */}
        <div className="relative px-5 sm:px-8 pt-6 pb-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to="/anime-frames" className="hover:text-white transition-colors">Anime Frames</Link>
            <span>/</span>
            <span className="text-white font-medium">{category.name}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-2">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-white/80 text-sm max-w-lg">{category.description}</p>
          )}
          <p className="text-white/55 text-xs mt-2">
            {subCategories.length} {subCategories.length === 1 ? "sub-category" : "sub-categories"}
          </p>
        </div>
      </div>

      {/* ── Subcategory Grid ── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        {subCategories.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="text-5xl">📂</div>
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              No sub-categories yet
            </h2>
            <p className="text-sm text-muted max-w-sm">
              Sub-categories for <strong>{category.name}</strong> haven't been added yet.
            </p>
            <Link
              to="/anime-frames"
              className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold border transition hover:bg-neutral-500/10"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              ← All Categories
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Browse {category.name}
              </h2>
              <Link
                to="/anime-frames"
                className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                ← All Categories
              </Link>
            </div>

            {/* Grid of subcategory cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {subCategories.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/anime-frames/${categorySlug}/${sub.slug}`}
                  className="group relative isolate overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-transparent hover:border-violet-400 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ aspectRatio: "3/4" }}
                >
                  {/* Thumbnail */}
                  {sub.imageUrl ? (
                    <img
                      src={optimizeCloudinaryUrl(sub.imageUrl, 600)}
                      alt={sub.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                      <span className="text-4xl opacity-30">🎌</span>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent group-hover:from-black/80 transition-all" />

                  {/* Arrow */}
                  <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </div>

                  {/* Name */}
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="text-white font-bold text-sm sm:text-base leading-tight uppercase tracking-tight">
                      {sub.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── View All Frames CTA ── */}
      <div className="px-4 sm:px-6 lg:px-8 mt-10">
        <div className="rounded-2xl overflow-hidden relative px-6 py-8 text-center bg-gradient-to-r from-violet-600 to-purple-700">
          <p className="text-white/80 text-xs uppercase tracking-widest mb-1">Can't decide?</p>
          <h3 className="text-xl font-black text-white mb-4">Browse all {category.name} frames</h3>
          <Link
            to={`/anime-frames?series=${encodeURIComponent(category.name)}&slug=${encodeURIComponent(category.slug)}`}
            className="inline-block px-5 py-2.5 bg-white text-violet-700 font-bold text-sm rounded-xl hover:scale-[1.02] active:scale-95 transition-transform shadow-md"
          >
            View All Frames →
          </Link>
        </div>
      </div>
    </div>
  );
}
