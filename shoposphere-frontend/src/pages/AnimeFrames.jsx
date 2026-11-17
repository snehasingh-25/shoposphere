import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { API } from "../api";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import CustomFrameCard from "../components/CustomFrameCard";
import AnimeFramesBottomWidget from "../components/AnimeFramesBottomWidget";
import HeroPromoCarousel from "../components/HeroPromoCarousel";
import AnimeCategoryRow from "../components/AnimeCategoryRow";
import AnimeSubCategoryGrid from "../components/AnimeSubCategoryGrid";
import { FRAMES_LANDING_CATEGORY_SLUG } from "../constants/framesBanners";

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Neon dark UI only for the Glow in Dark shop category (slug-based, not hardcoded product names). */
function isGlowInDarkCategory(parent) {
  if (!parent?.slug) return false;
  const slug = String(parent.slug).toLowerCase().trim();
  return slug === "glow" || slug === "glow-in-dark" || slug === "glow-in-the-dark";
}

function filterProductsForParentAll(products, mainParent) {
  if (!mainParent) return products;

  if (mainParent.type === "shop") {
    const slugs = new Set(
      [mainParent.slug, ...(mainParent.children || []).map((c) => c.slug)]
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    );
    return products.filter((p) =>
      (p.categories || []).some((cat) => {
        const c = cat.category || cat;
        return slugs.has((c.slug || "").toLowerCase());
      })
    );
  }

  const children = mainParent.children || [];
  if (!children.length) {
    return filterProductsByTerm(products, mainParent.name, mainParent.slug);
  }

  const seen = new Set();
  const out = [];
  for (const p of products) {
    const matchesParent = filterProductsByTerm([p], mainParent.name, mainParent.slug).length > 0;
    const matchesChild = children.some(
      (sub) => filterProductsByTerm([p], sub.name, sub.slug).length > 0
    );
    if ((matchesParent || matchesChild) && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

function filterProductsByTerm(products, term, termSlug) {
  const target = term.toLowerCase().trim();
  const targetSlug = (termSlug || target).replace(/\s+/g, "-");
  return products.filter((p) => {
    const pSeries = (p.animeSeries || p.series || "").toLowerCase();
    const pName = (p.name || "").toLowerCase();
    const pTags = (p.tags || "").toLowerCase();
    const pDesc = (p.description || "").toLowerCase();
    const pKeywords = (Array.isArray(p.keywords) ? p.keywords.join(" ") : String(p.keywords || "")).toLowerCase();
    return (
      pSeries.includes(target) ||
      pSeries.includes(targetSlug) ||
      pName.includes(target) ||
      pName.includes(targetSlug) ||
      pTags.includes(target) ||
      pTags.includes(targetSlug) ||
      pDesc.includes(target) ||
      pDesc.includes(targetSlug) ||
      pKeywords.includes(target) ||
      pKeywords.includes(targetSlug)
    );
  });
}

export default function AnimeFrames() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug, subSlug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState("All Series");
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState("");
  const [selectedSubSlug, setSelectedSubSlug] = useState("");
  const [selectedSubName, setSelectedSubName] = useState("");
  const [mainParent, setMainParent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug) {
      setMainParent(null);
      setSelectedSubSlug("");
      setSelectedSubName("");
      const seriesParam = searchParams.get("series") || searchParams.get("category");
      const slugParam = searchParams.get("slug");
      if (seriesParam) {
        setSelectedSeries(seriesParam);
        setSelectedSeriesSlug(slugParam || seriesParam.toLowerCase().trim().replace(/\s+/g, "-"));
      } else {
        setSelectedSeries("All Series");
        setSelectedSeriesSlug("");
      }
      return;
    }

    let cancelled = false;

    (async () => {
      const shopRes = await fetch(`${API}/categories/by-slug/${encodeURIComponent(categorySlug)}`);
      if (shopRes.ok) {
        const data = await shopRes.json();
        if (!cancelled && data?.id) {
          setMainParent({
            type: "shop",
            slug: data.slug,
            name: data.name,
            imageUrl: data.imageUrl,
            children: data.children || [],
          });
          setSelectedSeries(data.name);
          setSelectedSeriesSlug(data.slug);
          if (subSlug) {
            setSelectedSubSlug(subSlug);
            const match = (data.children || []).find(
              (c) => (c.slug || "").toLowerCase() === subSlug.toLowerCase()
            );
            setSelectedSubName(match?.name || slugToTitle(subSlug));
          } else {
            setSelectedSubSlug("");
            setSelectedSubName("");
          }
          return;
        }
      }

      const animeRes = await fetch(`${API}/anime-categories/by-slug/${encodeURIComponent(categorySlug)}`);
      if (animeRes.ok) {
        const data = await animeRes.json();
        if (!cancelled && data?.id) {
          setMainParent({
            type: "anime",
            slug: data.slug,
            name: data.name,
            imageUrl: data.imageUrl,
            children: data.children || [],
          });
          setSelectedSeries(data.name);
          setSelectedSeriesSlug(data.slug);
          if (subSlug) {
            setSelectedSubSlug(subSlug);
            const match = (data.children || []).find(
              (c) => (c.slug || "").toLowerCase() === subSlug.toLowerCase()
            );
            setSelectedSubName(match?.name || slugToTitle(subSlug));
          } else {
            setSelectedSubSlug("");
            setSelectedSubName("");
          }
          return;
        }
      }

      if (!cancelled) {
        setMainParent(null);
        setSelectedSeriesSlug(categorySlug);
        setSelectedSeries(slugToTitle(categorySlug));
        if (subSlug) {
          setSelectedSubSlug(subSlug);
          setSelectedSubName(slugToTitle(subSlug));
        } else {
          setSelectedSubSlug("");
          setSelectedSubName("");
        }
      }
    })().catch(() => {
      if (!cancelled) setMainParent(null);
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, categorySlug, subSlug]);

  useEffect(() => {
    document.title = "Frames | Descko";
    fetch(`${API}/anime-frames`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load frames:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));

    return () => {
      document.title = "Descko | Premium Gifts & Merchandise";
    };
  }, []);

  const bannerCategorySlug = categorySlug || FRAMES_LANDING_CATEGORY_SLUG;

  useEffect(() => {
    const params = new URLSearchParams({ type: "anime-frames", category: bannerCategorySlug });
    fetch(`${API}/banners?${params}`)
      .then((res) => res.json())
      .then((data) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => setBanners([]));
  }, [bannerCategorySlug]);

  const handleSelectSeries = (seriesName, seriesSlug) => {
    setSelectedSubSlug("");
    setSelectedSubName("");
    if (!seriesName || seriesName === "All Series") {
      setSelectedSeries("All Series");
      setSelectedSeriesSlug("");
      setMainParent(null);
      navigate("/anime-frames");
      setSearchParams({});
    } else {
      setSelectedSeries(seriesName);
      const slug = seriesSlug || seriesName.toLowerCase().trim().replace(/\s+/g, "-");
      setSelectedSeriesSlug(slug);
      navigate(`/anime-frames/${encodeURIComponent(slug)}`);
    }
  };

  const handleSelectSubCategory = (sub) => {
    if (!sub?.slug || !mainParent?.slug) return;
    if (sub.slug === "all" || sub.slug === selectedSubSlug) {
      setSelectedSubSlug("");
      setSelectedSubName("");
      navigate(`/anime-frames/${encodeURIComponent(mainParent.slug)}`);
      return;
    }
    setSelectedSubSlug(sub.slug);
    setSelectedSubName(sub.name);
    navigate(
      `/anime-frames/${encodeURIComponent(mainParent.slug)}/${encodeURIComponent(sub.slug)}`
    );
  };

  const customProduct = useMemo(() => {
    return products.find(
      (p) =>
        (p.name || "").trim().toLowerCase() === "customize your own frame" ||
        p.isCustomizable === true
    );
  }, [products]);

  const readyMadeProducts = useMemo(() => {
    if (!customProduct) return products;
    return products.filter((p) => p.id !== customProduct.id);
  }, [products, customProduct]);

  const filteredReadyMadeProducts = useMemo(() => {
    if (mainParent && selectedSubSlug) {
      if (mainParent.type === "shop") {
        const slug = selectedSubSlug.toLowerCase();
        return readyMadeProducts.filter((p) =>
          (p.categories || []).some((cat) => {
            const c = cat.category || cat;
            return (c.slug || "").toLowerCase() === slug;
          })
        );
      }
      const sub = (mainParent.children || []).find(
        (c) => (c.slug || "").toLowerCase() === selectedSubSlug.toLowerCase()
      );
      const term = sub?.name || selectedSubName || selectedSubSlug;
      return filterProductsByTerm(readyMadeProducts, term, selectedSubSlug);
    }

    if (mainParent && !selectedSubSlug) {
      return filterProductsForParentAll(readyMadeProducts, mainParent);
    }

    if (selectedSeries === "All Series") return readyMadeProducts;

    return filterProductsByTerm(readyMadeProducts, selectedSeries, selectedSeriesSlug);
  }, [
    readyMadeProducts,
    selectedSeries,
    selectedSeriesSlug,
    mainParent,
    selectedSubSlug,
    selectedSubName,
  ]);

  const displayLabel = useMemo(() => {
    if (selectedSubName) return selectedSubName;
    if (mainParent) return `${mainParent.name} — All Series`;
    if (selectedSeries !== "All Series") return `${selectedSeries} Frames`;
    return "Frames Collection";
  }, [selectedSeries, selectedSubName, mainParent]);

  const hasActiveFilter =
    selectedSeries !== "All Series" || Boolean(selectedSubSlug) || Boolean(mainParent);

  const showSubGrid = Boolean(mainParent);
  const showAnimeSeriesRow = !mainParent;
  const premiumMode = Boolean(mainParent) && isGlowInDarkCategory(mainParent);

  return (
    <div
      className={`min-h-screen pb-0 mb-0 ${premiumMode ? "bg-[#0a0a0a]" : ""}`}
      style={{ paddingBottom: 0, marginBottom: 0 }}
    >
      <HeroPromoCarousel banners={banners} className={premiumMode ? "border-b border-[#39ff14]/20" : ""} />

      {showAnimeSeriesRow && (
        <AnimeCategoryRow selectedSeries={selectedSeries} onSelectSeries={handleSelectSeries} />
      )}

      {showSubGrid && (
        <div className={premiumMode ? "pt-1" : "pt-2"}>
          {!premiumMode && (
            <div className="px-4 sm:px-6 lg:px-8 pb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectSeries("All Series")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
              >
                <svg
                  className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                All Frames
              </button>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-800">{mainParent.name}</span>
              {selectedSubName ? (
                <>
                  <span className="text-xs text-slate-300">/</span>
                  <span className="text-xs font-semibold text-slate-600">{selectedSubName}</span>
                </>
              ) : null}
            </div>
          )}

          <AnimeSubCategoryGrid
            parentSlug={mainParent.slug}
            parentName={mainParent.name}
            selectedSubSlug={selectedSubSlug}
            onSelectSubCategory={handleSelectSubCategory}
            api={mainParent.type === "anime" ? "anime-categories" : "categories"}
            variant={premiumMode ? "premium" : "default"}
          />
        </div>
      )}

      <div className={`px-6 sm:px-8 pt-3 lg:pt-2 ${premiumMode ? "text-white" : ""}`}>
        {!premiumMode ? (
          <div className="mb-2 lg:mb-1 flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{displayLabel}</h1>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => handleSelectSeries("All Series")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Clear filter ({filteredReadyMadeProducts.length})
              </button>
            )}
          </div>
        ) : (
          hasActiveFilter && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSelectSeries("All Series")}
                className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                Clear filter ({filteredReadyMadeProducts.length})
              </button>
            </div>
          )
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} showAddToCart={false} borderless={true} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <CustomFrameCard product={customProduct} onDarkBg={premiumMode} />
            {filteredReadyMadeProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                showAddToCart={false}
                showDispatchBadge={false}
                borderless={true}
                onDarkBg={premiumMode}
              />
            ))}
          </div>
        )}
      </div>

      <AnimeFramesBottomWidget />
    </div>
  );
}
