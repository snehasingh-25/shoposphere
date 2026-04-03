import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API } from "../api";
import { shuffleArray } from "../utils/shuffle";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

export default function CategoriesPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const trendingFilter = searchParams.get("trending") === "true";
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`${API}/categories`)
      .then((res) => res.json())
      .then((categoriesData) => {
        setCategories(categoriesData);
        if (slug) {
          const category = categoriesData.find(cat => cat.slug === slug);
          if (category) {
            setSelectedCategory(category);
          } else if (categoriesData.length > 0) {
            setSelectedCategory(categoriesData[0]);
          }
        } else if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (slug && selectedCategory) {
      fetchCategoryProducts(selectedCategory.slug, trendingFilter);
      return;
    }

    // No slug (e.g. /categories): show all products (optionally filtered by trending)
    if (!slug) {
      fetchAllProducts(trendingFilter);
      return;
    }

    setProducts([]);
    setLoading(false);
  }, [selectedCategory, slug, trendingFilter]);

  const fetchCategoryProducts = async (categorySlug, trending = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", categorySlug);
      if (trending) {
        params.append("trending", "true");
      }
      const res = await fetch(`${API}/products?${params.toString()}`);
      const data = await res.json();
      // If backend doesn't support trending filter, filter on frontend
      const filteredData = trending 
        ? (Array.isArray(data) ? data.filter(p => p.isTrending) : [])
        : (Array.isArray(data) ? data : []);
      setProducts(shuffleArray(filteredData));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async (trending = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (trending) {
        params.append("trending", "true");
      }
      const qs = params.toString();
      const res = await fetch(`${API}/products${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      // If backend doesn't support trending filter, filter on frontend
      const filteredData = trending 
        ? (Array.isArray(data) ? data.filter(p => p.isTrending) : [])
        : (Array.isArray(data) ? data : []);
      setProducts(shuffleArray(filteredData));
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed getCategoryEmoji - all categories use logo as fallback

  if (loading && !selectedCategory) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div
          className="animate-spin rounded-full w-10 h-10 border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)" }}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-page-products">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Shop by Category
          </h2>
        </div>

        {/* Categories Bento Grid */}
        <div className="mb-12 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 auto-rows-[170px] gap-1 sm:gap-2 md:hidden">
            {categories.slice(0, 3).map((category, idx) => {
              const collectionNumber = String(idx + 1).padStart(2, "0");
              const isActive = selectedCategory?.id === category.id && Boolean(slug);
              return (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className={[
                    "relative isolate overflow-hidden rounded-t-[38px] rounded-b-sm border bg-[#eef1f8]",
                    "shadow-[0_18px_50px_rgba(44,51,61,0.12)]",
                    "transition-transform duration-300 hover:-scale-105",
                    isActive ? "border-[#2c333d]/80" : "border-[#dce3f0]/45",
                    idx === 0 ? "col-span-2 row-span-2" : "",
                    idx === 1 ? "col-span-1 row-span-2" : "",
                    idx === 2 ? "col-span-1 row-span-2" : "",
                  ].join(" ")}
                >
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                      <img src="/logo.png" alt="shoposphere" className="h-11 w-auto object-contain opacity-55" />
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
                    <p className="font-extrabold tracking-tight leading-[0.9] uppercase text-3xl sm:text-4xl">
                      {category.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {categories.length > 3 ? (
            <div className="grid grid-cols-2 gap-1 md:hidden">
              {categories.slice(3).map((category) => {
                const isActive = selectedCategory?.id === category.id && Boolean(slug);
                return (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    className={[
                      "relative isolate overflow-hidden aspect-4/5 rounded-sm border bg-[#eef1f8]",
                      "shadow-[0_14px_36px_rgba(44,51,61,0.12)]",
                      "transition-transform duration-300 hover:-scale-105",
                      isActive ? "border-[#2c333d]/80" : "border-[#dce3f0]/45",
                    ].join(" ")}
                  >
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                        <img src="/logo.png" alt="shoposphere" className="h-10 w-auto object-contain opacity-55" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-black/0" />

                    <div className="absolute inset-x-3 bottom-3 text-white">
                      <p className="font-extrabold tracking-tight leading-none uppercase text-lg sm:text-xl">
                        {category.name}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="hidden md:grid md:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((category, idx) => {
              const collectionNumber = String(idx + 1).padStart(2, "0");
              const isActive = selectedCategory?.id === category.id && Boolean(slug);
              return (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className={[
                    "relative isolate overflow-hidden aspect-3/4 rounded-sm border bg-[#eef1f8]",
                    "shadow-[0_14px_36px_rgba(44,51,61,0.12)]",
                    "transition-transform duration-300 hover:scale-105",
                    isActive ? "border-[#2c333d]/80" : "border-[#dce3f0]/45",
                  ].join(" ")}
                >
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                      <img src="/logo.png" alt="shoposphere" className="h-10 w-auto object-contain opacity-55" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-black/0" />

                  <div className="absolute inset-x-3 bottom-3 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 mb-1">
                      {collectionNumber} / Collection
                    </p>
                    <p className="font-extrabold tracking-tight leading-none uppercase text-xl sm:text-2xl">
                      {category.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Products for Selected Category */}
        {selectedCategory && slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                {selectedCategory.name}
              </h3>
              {selectedCategory.description && (
                <p className="text-lg mb-4" style={{ color: "var(--foreground-muted)" }}>
                  {selectedCategory.description}
                </p>
              )}

            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <img src="/logo.png" alt="shoposphere" className="h-10 w-auto object-contain" />
                </div>
                <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
                  No products available in this category yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* All products when no category slug is selected (e.g. /categories) */}
        {!slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                {trendingFilter ? "Trending Products" : "All Products"}
              </h3>

            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <img src="/logo.png" alt="shoposphere" className="h-10 w-auto object-contain" />
                </div>
                <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
                  No products available yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Show all categories if none selected */}
        {!selectedCategory && categories.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--muted)" }}>
              <img src="/logo.png" alt="shoposphere" className="h-10 w-auto object-contain" />
            </div>
            <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
              No categories available yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
