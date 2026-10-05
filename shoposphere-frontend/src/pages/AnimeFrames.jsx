import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { API } from "../api";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import CustomFrameCard from "../components/CustomFrameCard";
import AnimeFramesBottomWidget from "../components/AnimeFramesBottomWidget";
import HeroPromoCarousel from "../components/HeroPromoCarousel";
import AnimeCategoryRow from "../components/AnimeCategoryRow";

export default function AnimeFrames() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState("All Series");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seriesParam = searchParams.get("series") || searchParams.get("category");
    if (seriesParam) {
      setSelectedSeries(seriesParam);
    }
  }, [searchParams]);

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
    if (!selectedSeries || selectedSeries === "All Series") {
      return readyMadeProducts;
    }
    const target = selectedSeries.toLowerCase().trim();
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
  }, [readyMadeProducts, selectedSeries]);

  return (
    <div className="min-h-screen pb-0 mb-0" style={{ paddingBottom: 0, marginBottom: 0 }}>
      {/* ─── HERO BANNERS SECTION ───────────────────────────────────────── */}
      <HeroPromoCarousel banners={banners} />

      {/* ─── ANIME SERIES CIRCULAR CATEGORIES ─────────────────────────── */}
      <AnimeCategoryRow
        selectedSeries={selectedSeries}
        onSelectSeries={setSelectedSeries}
      />

      {/* ─── CATALOG SECTION (NEW ARRIVALS UI/UX) ─────────────────────────── */}
      <div className="px-6 sm:px-8 pt-3 lg:pt-2">
        <div className="mb-2 lg:mb-1 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {selectedSeries === "All Series" ? "Anime Frames Collection" : `${selectedSeries} Frames`}
          </h1>
          {selectedSeries !== "All Series" && (
            <button
              type="button"
              onClick={() => setSelectedSeries("All Series")}
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

            {/* Existing ready-made products continue appearing after it */}
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

      {/* ─── BOTTOM PROMOTIONAL CUSTOMIZATION WIDGET (IMMEDIATELY BEFORE FOOTER) ─── */}
      <AnimeFramesBottomWidget />
    </div>
  );
}

