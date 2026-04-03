import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useWishlist } from "../context/WishlistContext";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";

export default function Wishlist() {
  const { loading: authLoading } = useUserAuth();
  const { wishlistItems, loading: wishlistLoading, refreshWishlist } = useWishlist();

  useEffect(() => {
    if (!authLoading) refreshWishlist();
  }, [authLoading, refreshWishlist]);

  if (authLoading || (wishlistLoading && wishlistItems.length === 0)) {
    return (
      <div className="min-h-screen py-8 px-6 sm:px-8" style={{ background: "var(--background)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="h-9 w-40 rounded-lg animate-pulse mb-8" style={{ background: "var(--muted)" }} />
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold font-display mb-8" style={{ color: "var(--foreground)" }}>
          Wishlist
        </h1>

        {wishlistItems.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-12 sm:p-16 text-center"
            style={{
              borderColor: "var(--border)",
              background: "var(--secondary)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: "var(--muted)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <svg
                className="w-10 h-10 wishlist-heart-outline"
                style={{ color: "var(--destructive)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <p className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Your wishlist is empty
            </p>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--muted)" }}>
              Save your favourite products and add them to cart when you&apos;re ready.
            </p>
            <Link
              to="/categories"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              Start Exploring Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {wishlistItems.map((item) => {
              const product = item.product;
              if (!product) return null;
              return <ProductCard key={item.id} product={product} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
