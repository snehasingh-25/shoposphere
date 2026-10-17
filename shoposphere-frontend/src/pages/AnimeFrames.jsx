import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { API } from "../api";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import CustomFrameCard from "../components/CustomFrameCard";
import AnimeFramesBottomWidget from "../components/AnimeFramesBottomWidget";
import HeroPromoCarousel from "../components/HeroPromoCarousel";
import AnimeCategoryRow from "../components/AnimeCategoryRow";
import AnimeSubCategoryGrid from "../components/AnimeSubCategoryGrid";

export default function AnimeFrames() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug, subSlug } = useParams(); // from /anime-frames/:categorySlug/:subSlug
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState("All Series");
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  // Whether we're on a clean path-param URL (vs query-param approach)
  const isPathRoute = Boolean(categorySlug);

  useEffect(() => {
    // Priority 1: URL path params (clean URL route /anime-frames/:categorySlug/:subSlug)
    if (categorySlug) {
      setSelectedSeriesSlug(categorySlug);
      // Convert slug to readable display name: "glow-in-dark" → "Glow In Dark"
      const readableName = categorySlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      setSelectedSeries(readableName);
      if (subSlug) setSelectedSubCategory(subSlug);
      return;
    }
    // Priority 2: query params (?series=...&slug=...&sub=...)
    const seriesParam = searchParams.get("series") || searchParams.get("category");
    const slugParam = searchParams.get("slug");
    const subParam = searchParams.get("sub");
    if (seriesParam) {
      setSelectedSeries(seriesParam);
      setSelectedSeriesSlug(slugParam || seriesParam.toLowerCase().trim().replace(/\s+/g, "-"));
    } else {
      setSelectedSeries("All Series");
      setSelectedSeriesSlug("");
    }
    if (subParam) {
      setSelectedSubCategory(subParam);
    } else {
      setSelectedSubCategory(null);
    }
  }, [searchParams, categorySlug, subSlug]);

  useEffect(() => {
    document.title = "Anime Frames | Shoposphere";
    fetch(`${API}/anime-frames`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load anime frames:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));

    // Dynamic CMS banners fetch — shows only user-added banners
    fetch(`${API}/banners?type=anime-frames`)
      .then((res) => res.json())
      .then((data) => {
        setBanners(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setBanners([]);
      });

    return () => {
      document.title = "Shoposphere | Premium Gifts & Merchandise";
    };
  }, []);

  // Handle series change from the AnimeCategoryRow (receives name + slug)
  const handleSelectSeries = (seriesName, seriesSlug) => {
    setSelectedSubCategory(null);
    if (!seriesName || seriesName === "All Series") {
      setSelectedSeries("All Series");
      setSelectedSeriesSlug("");
      if (isPathRoute) {
        navigate("/anime-frames"); // go back to the base page for path-based routes
      } else {
        setSearchParams({});
      }
    } else {
      setSelectedSeries(seriesName);
      const slug = seriesSlug || seriesName.toLowerCase().trim().replace(/\s+/g, "-");
      setSelectedSeriesSlug(slug);
      navigate(`/anime-frames/${encodeURIComponent(slug)}`);
    }
  };

  // Handle sub-category selection
  const handleSelectSubCategory = (subName) => {
    if (!subName || subName === selectedSubCategory) {
      setSelectedSubCategory(null);
      if (selectedSeries !== "All Series") {
        setSearchParams({ series: selectedSeries });
      } else {
        setSearchParams({});
      }
    } else {
      setSelectedSubCategory(subName);
      const params = { sub: subName };
      if (selectedSeries !== "All Series") params.series = selectedSeries;
      setSearchParams(params);
    }
  };

  // Separate custom frame product from ready-made products to ensure no duplicates
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
    // Determine the active filter term
    const activeFilter = selectedSubCategory || (selectedSeries !== "All Series" ? selectedSeries : null);

    if (!activeFilter) return readyMadeProducts;

    const target = activeFilter.toLowerCase().trim();
    const targetSlug = target.replace(/\s+/g, "-");
    return readyMadeProducts.filter((p) => {
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
  }, [readyMadeProducts, selectedSeries, selectedSubCategory]);

  const displayLabel = useMemo(() => {
    if (selectedSubCategory) return `${selectedSubCategory} Frames`;
    if (selectedSeries !== "All Series") return `${selectedSeries} Frames`;
    return "Anime Frames Collection";
  }, [selectedSeries, selectedSubCategory]);

  const hasActiveFilter = selectedSeries !== "All Series" || selectedSubCategory;

  return (
    <div className="min-h-screen pb-0 mb-0" style={{ paddingBottom: 0, marginBottom: 0 }}>
      {/* ─── HERO BANNERS SECTION ───────────────────────────────────────── */}
      <HeroPromoCarousel banners={banners} />

      {selectedSeries === "All Series" ? (
        /* ─── NO SERIES SELECTED: show the full category row so user can pick ─ */
        <AnimeCategoryRow
          selectedSeries={selectedSeries}
          onSelectSeries={handleSelectSeries}
        />
      ) : (
        /* ─── SERIES SELECTED: hide category row, show ONLY sub-categories ──── */
        <div>
          {/* Breadcrumb / back button */}
          <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-1 flex items-center gap-2">
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
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              All Series
            </button>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {selectedSeries}
            </span>
          </div>

          {/* Sub-categories of the selected series */}
          <AnimeSubCategoryGrid
            parentSlug={selectedSeriesSlug}
            parentName={selectedSeries}
            selectedSubCategory={selectedSubCategory}
            onSelectSubCategory={handleSelectSubCategory}
          />
        </div>
      )}

      {/* ─── CATALOG SECTION ─────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 pt-3 lg:pt-2">
        <div className="mb-2 lg:mb-1 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {displayLabel}
          </h1>
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

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} showAddToCart={false} borderless={true} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* FIRST PRODUCT CARD: Customize Your Own Frame */}
            <CustomFrameCard product={customProduct} />

            {/* Ready-made products filtered by selected series / sub-category */}
            {filteredReadyMadeProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                showAddToCart={false}
                showDispatchBadge={false}
                borderless={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── BOTTOM PROMOTIONAL CUSTOMIZATION WIDGET ─────────────────────── */}
      <AnimeFramesBottomWidget />
    </div>
  );
}
