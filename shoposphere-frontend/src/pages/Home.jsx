import { useEffect, useMemo, useState, useCallback } from "react";
import { API } from "../api";
import { Link, useNavigate } from "react-router-dom";
import BannerSlider from "../components/BannerSlider";
import { MemoReelCarousel as ReelCarousel } from "../components/ReelCarousel";
import ProductCarouselSection from "../components/ProductCarouselSection";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { useWishlist } from "../context/WishlistContext";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { shuffleArray } from "../utils/shuffle";

function landingProductImageUrl(p) {
  if (!p?.images) return null;
  let arr = [];
  if (Array.isArray(p.images)) arr = p.images;
  else {
    try {
      arr = JSON.parse(p.images);
    } catch {
      return null;
    }
  }
  return Array.isArray(arr) && arr[0] ? arr[0] : null;
}

function landingDisplayPrice(p) {
  if (p?.hasSinglePrice && p.singlePrice != null) return Number(p.singlePrice);
  if (Array.isArray(p?.sizes) && p.sizes.length > 0) {
    return Math.min(...p.sizes.map((s) => Number(s.price)));
  }
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();
  const { recentIds } = useRecentlyViewed();
  const { wishlistItems, isInWishlist, toggleWishlist, togglingId } = useWishlist();
  const { isAuthenticated } = useUserAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reels, setReels] = useState([]);
  const [topRatedProducts, setTopRatedProducts] = useState([]);
  const [buyAgainIds, setBuyAgainIds] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState({
    categories: true,
    products: true,
    reels: true,
  });
  
  // Single request for homepage data (faster: 1 round-trip instead of 5)
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/home`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) {
          setLoading((prev) => ({ ...prev, categories: false, products: false, reels: false }));
          return;
        }
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        const list = shuffleArray(Array.isArray(data.products) ? data.products : []);
        setProducts(list);
        setReels(Array.isArray(data.reels) ? data.reels : []);
        setLoading((prev) => ({ ...prev, categories: false, products: false, reels: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, categories: false, products: false, reels: false }));
      });
    return () => ac.abort();
  }, []);

  // Lazy: top-rated products
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/products/top-rated?limit=12`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => setTopRatedProducts(Array.isArray(data) ? data : []))
      .catch(() => setTopRatedProducts([]));
    return () => ac.abort();
  }, []);

  // Lazy: buy-again product IDs (authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      setBuyAgainIds([]);
      return;
    }
    const ac = new AbortController();
    fetch(`${API}/orders/my-orders`, { credentials: "include", signal: ac.signal })
      .then((res) => res.json())
      .then((orders) => {
        if (!Array.isArray(orders)) return;
        const ids = [];
        const seen = new Set();
        for (const order of orders) {
          const items = order.items || order.orderItems || [];
          for (const item of items) {
            const pid = item.productId ?? item.product?.id;
            if (pid && !seen.has(pid)) {
              seen.add(pid);
              ids.push(pid);
            }
          }
        }
        setBuyAgainIds(ids.slice(0, 12));
      })
      .catch(() => setBuyAgainIds([]));
    return () => ac.abort();
  }, [isAuthenticated]);

  const isInitialLoad = loading.categories || loading.products || loading.reels;

  const filteredProducts = useMemo(() => {
    if (!activeCategoryId) return products;
    return products.filter((p) => {
      const cats = p.categories || (p.category ? [p.category] : []);
      return cats.some((c) => Number(c.id) === Number(activeCategoryId));
    });
  }, [products, activeCategoryId]);

  const galleryProducts = useMemo(() => filteredProducts.slice(0, 24), [filteredProducts]);

  const quickAddLanding = useCallback(
    async (product) => {
      if (!product?.id) return;
      if (product.hasSinglePrice && product.singlePrice != null) {
        const ok = await addToCart(
          product,
          {
            id: 0,
            label: "Standard",
            price: parseFloat(product.singlePrice),
            originalPrice:
              product.originalPrice != null && product.originalPrice !== ""
                ? parseFloat(product.originalPrice)
                : null,
          },
          1
        );
        if (ok) toast.success("Added to cart");
        return;
      }
      if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        const chosen = product.sizes.reduce(
          (min, s) => {
            const sPrice = Number(s.price ?? Number.MAX_SAFE_INTEGER);
            const sStock = Number(s.stock ?? 0);
            if (sStock <= 0) return min;
            return sPrice < min.price ? { ...s, price: sPrice } : min;
          },
          { price: Number.MAX_SAFE_INTEGER }
        );
        if (chosen?.id != null && chosen.price !== Number.MAX_SAFE_INTEGER) {
          const ok = await addToCart(product, chosen, 1);
          if (ok) toast.success("Added to cart");
          return;
        }
        navigate(`/product/${product.id}`);
        return;
      }
      navigate(`/product/${product.id}`);
    },
    [addToCart, navigate, toast]
  );

  return (
    <div className="min-h-screen fade-in home-landing pb-24 md:pb-12">
      <>
        <main>
          <section className="px-6 sm:px-8 mb-10 max-w-7xl mx-auto pt-2 md:pt-4" aria-label="Shoposphere intro">
            <h1 className="home-headline text-3xl sm:text-5xl font-extrabold tracking-tighter text-[#2c333d] leading-none mb-2">
              Shoposphere
            </h1>
            <p className="home-headline text-lg sm:text-2xl font-bold tracking-tight text-[#5e5e5e] leading-tight">
              Curated for you — quit the clutter
            </p>
          </section>

          {categories.length > 0 ? (
            <section className="px-6 sm:px-7 mb-10 max-w-7xl mx-auto overflow-x-auto hide-scrollbar-home" aria-label="Browse by category">
              <div className="flex gap-3 whitespace-nowrap pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId(null)}
                  className={[
                    "px-7 sm:px-8 py-3 rounded-full text-sm font-medium transition-opacity shrink-0",
                    activeCategoryId == null
                      ? "bg-[#2c333d] text-white"
                      : "bg-[#e4e8f3] text-[#595f6a] hover:opacity-80",
                  ].join(" ")}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const active = Number(activeCategoryId) === Number(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={[
                        "px-7 sm:px-8 py-3 rounded-full text-sm font-medium transition-opacity shrink-0",
                        active ? "bg-[#2c333d] text-white" : "bg-[#e4e8f3] text-[#595f6a] hover:opacity-80",
                      ].join(" ")}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mb-14" aria-label="Featured products">
            <div className="px-6 sm:px-8 max-w-7xl mx-auto mb-6">
              <h2 className="home-headline text-2xl sm:text-3xl font-bold tracking-tight text-[#2c333d]">Trending</h2>
            </div>
            <div
              className="flex overflow-x-auto hide-scrollbar-home gap-2 sm:gap-2 px-6 sm:px-20 pb-2"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {isInitialLoad
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`home-skel-${i}`}
                      className="min-w-[280px] max-w-[280px] bg-white rounded-t-[45px] rounded-b-none p-4 shadow-[0_10px_40px_rgba(44,51,61,0.06)] border border-[#dce3f0]/60 animate-pulse"
                    >
                      <div className="aspect-[3/4] rounded-lg bg-[#f2f3fa] mb-6" />
                      <div className="h-4 bg-[#e4e8f3] rounded w-2/3 mb-2" />
                      <div className="h-3 bg-[#e4e8f3] rounded w-1/4" />
                    </div>
                  ))
                : galleryProducts.length === 0
                  ? (
                      <div className="min-w-full px-2 py-10 text-center">
                        <p className="text-[#595f6a] text-sm mb-4">Nothing here yet — try another category.</p>
                        <button
                          type="button"
                          onClick={() => setActiveCategoryId(null)}
                          className="text-sm font-semibold text-[#2c333d] underline underline-offset-4"
                        >
                          Show all products
                        </button>
                      </div>
                    )
                  : galleryProducts.map((p, idx) => {
                    const img = landingProductImageUrl(p);
                    const price = landingDisplayPrice(p);
                    const wishlisted = isInWishlist(p.id);
                    const toggling = togglingId === p.id;
                    return (
                      <article
                        key={p.id}
                        className={[
                          "min-w-[200px] max-w-[200px] bg-white rounded-t-[45px] rounded-b-none p-2 shadow-[0_10px_40px_rgba(44,51,61,0.06)] border border-[#dce3f0]/40 relative",
                          idx === 1 ? "opacity-95" : "",
                        ].join(" ")}
                      >
                        <Link to={`/product/${p.id}`} className="block">
                          <div className="aspect-[3/4] rounded-t-[45px] overflow-hidden mb-6 bg-[#f2f3fa]">
                            {img ? (
                              <img
                                src={img}
                                alt=""
                                className="w-full h-full object-cover rounded-t-[45px]"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <img src="/logo.png" alt="" className="h-10 w-auto object-contain opacity-40" />
                              </div>
                            )}
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(p.id)}
                          disabled={toggling}
                          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#c1000a] disabled:opacity-50"
                          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <svg
                            className="w-5 h-5"
                            fill={wishlisted ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        </button>
                        <div className="flex justify-between items-end gap-3">
                          <div className="min-w-0">
                            <Link to={`/product/${p.id}`}>
                              <h3 className="home-headline font-bold text-sm text-[#2c333d] mb-1 truncate hover:underline">
                                {p.name}
                              </h3>
                            </Link>
                            <p className="text-[#5e5e5e] text-sm font-medium">
                              {price != null ? `₹${price.toLocaleString("en-IN")}` : "View options"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => quickAddLanding(p)}
                            className="w-6 h-6 shrink-0 rounded-full bg-[#2c333d] text-white flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                            aria-label={`Add ${p.name} to cart`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </article>
                    );
                  })}
            </div>
          </section>

          {categories.length > 0 ? (
            <section className="px-4 sm:px-4 mb-6 max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-8 gap-4">
                <h2 className="home-headline text-2xl sm:text-3xl font-bold tracking-tight text-[#2c333d]">
                  New collections
                </h2>
                <Link
                  to="/categories"
                  className="text-[#5e5e5e] text-sm font-semibold uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 auto-rows-[170px] gap-3 sm:gap-4 md:hidden">
                  {categories.slice(0, 3).map((cat, idx) => {
                    const collectionNumber = String(idx + 1).padStart(2, "0");
                    return (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        className={[
                          "relative isolate overflow-hidden rounded-t-[38px] rounded-b-sm border border-[#dce3f0]/45 bg-[#eef1f8]",
                          "shadow-[0_18px_50px_rgba(44,51,61,0.12)]",
                          "transition-transform duration-300 hover:scale-105",
                          idx === 0 ? "col-span-2 row-span-2" : "",
                          idx === 1 ? "col-span-1 row-span-2" : "",
                          idx === 2 ? "col-span-1 row-span-2" : "",
                        ].join(" ")}
                      >
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                            <img src="/logo.png" alt="" className="h-11 w-auto object-contain opacity-55" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/18 to-black/5" />

                        <div className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/14 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                          </svg>
                        </div>

                        <div className="absolute inset-x-5 bottom-5 text-white">
                          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-white/85 mb-1.5">
                            {collectionNumber} / Collection
                          </p>
                          <p className="home-headline text-3xl sm:text-4xl font-extrabold tracking-tight leading-[0.9] uppercase">
                            {cat.name}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {categories.length > 3 ? (
                  <div className="grid grid-cols-2 gap-1 md:hidden">
                    {categories.slice(3).map((cat) => {
                      return (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.slug}`}
                          className="relative isolate overflow-hidden aspect-4/5 rounded-sm border border-[#dce3f0]/45 bg-[#eef1f8] shadow-[0_14px_36px_rgba(44,51,61,0.12)] transition-transform duration-300 hover:scale-105"
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                              <img src="/logo.png" alt="" className="h-10 w-auto object-contain opacity-55" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-black/0" />

                          <div className="absolute inset-x-3 bottom-3 text-white">
                            <p className="font-extrabold tracking-tight leading-none uppercase text-lg sm:text-xl">
                              {cat.name}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}

                <div className="hidden md:grid md:grid-cols-6 gap-3 sm:gap-4">
                  {categories.map((cat, idx) => {
                    const collectionNumber = String(idx + 1).padStart(2, "0");
                    return (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        className="relative isolate overflow-hidden aspect-3/4 rounded-sm border border-[#dce3f0]/45 bg-[#eef1f8] shadow-[0_14px_36px_rgba(44,51,61,0.12)] transition-transform duration-300 hover:scale-105"
                      >
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                            <img src="/logo.png" alt="" className="h-10 w-auto object-contain opacity-55" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-black/0" />

                        <div className="absolute inset-x-3 bottom-3 text-white">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 mb-1">
                            {collectionNumber} / Collection
                          </p>
                          <p className="home-headline text-xl sm:text-2xl font-extrabold leading-none uppercase">
                            {cat.name}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}
        </main>

        {!isInitialLoad && <BannerSlider bannerType="primary" />}

        {topRatedProducts.length > 0 && (
          <div className="py-4">
            <ProductCarouselSection title="Top" products={topRatedProducts} />
          </div>
        )}
        {recentIds.length > 0 && (
          <div className="py-4">
            <ProductCarouselSection title="Recently viewed" productIds={recentIds} />
          </div>
        )}
        {buyAgainIds.length > 0 && (
          <div className="py-4">
            <ProductCarouselSection title="Buy again" productIds={buyAgainIds} />
          </div>
        )}



      {/* Secondary Banner Section - Between Gifts and Reels */}
      {!isInitialLoad && <BannerSlider bannerType="secondary" />}
      
      {/* Personalized: From Your Wishlist */}
      {wishlistItems.length > 0 && (
        <div>
          <ProductCarouselSection
            title="From Your Wishlist"
            products={wishlistItems.map((item) => item.product).filter(Boolean)}
          />
        </div>
      )}

      {/* Reels Section */}
      {reels.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
          <h2 className="home-headline text-xl sm:text-2xl font-bold mb-8 text-center text-[#2c333d]">
            Follow us
          </h2>
          <ReelCarousel reels={reels} />
        </div>
      )}
      </>
    </div>
  );
}
