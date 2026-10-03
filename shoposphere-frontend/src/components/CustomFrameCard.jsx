import { Link } from "react-router-dom";
import { memo, useMemo } from "react";
import { useWishlist } from "../context/WishlistContext";

function CustomFrameCard({ product }) {
  const { isInWishlist, toggleWishlist, togglingId } = useWishlist();
  const isWishlisted = product?.id ? isInWishlist(product.id) : false;
  const isToggling = product?.id ? togglingId === product.id : false;

  // Extract variants and prices from DB product or fallback to authoritative defaults
  const normalizedSizes = useMemo(() => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return product.variants
        .filter((v) => ["a4", "a3"].includes(String(v.sizeLabel || "").trim().toLowerCase()))
        .map((v) => ({
          id: v.id,
          label: String(v.sizeLabel || "").trim().toUpperCase(),
          price: Number(v.price ?? 699),
          originalPrice: v.originalPrice != null ? Number(v.originalPrice) : 1299,
        }));
    }
    return [
      { id: null, label: "A4", price: 699, originalPrice: 1299 },
      { id: null, label: "A3", price: 1099, originalPrice: 1749 },
    ];
  }, [product?.variants]);

  const priceInfo = useMemo(() => {
    if (!normalizedSizes.length) return { selling: 699, mrp: 1299 };
    const minSelling = Math.min(...normalizedSizes.map((s) => s.price));
    const matching = normalizedSizes.find((s) => s.price === minSelling);
    return {
      selling: minSelling,
      mrp: matching?.originalPrice ?? null,
    };
  }, [normalizedSizes]);

  const displayPrice = priceInfo.selling;
  const displayMrp = priceInfo.mrp;
  const discountPct =
    displayMrp != null && displayMrp > displayPrice
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : null;

  return (
    <div className="group overflow-hidden rounded-none bg-transparent transition-all duration-300 hover:-translate-y-1 border-0 shadow-none">
      {/* Clickable Image Area */}
      <Link
        to="/anime-frames/customize"
        className="block hover:opacity-95 transition-opacity duration-200"
        aria-label="Customize Your Own Frame"
      >
        <div
          className="relative bg-transparent aspect-square w-full overflow-hidden"
          style={{ aspectRatio: "1 / 1" }}
        >
          <img
            src="/custom-anime-frame.jpg"
            alt="Customize Your Own Frame"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />

          {/* Micro lift gradient overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.18) 100%)",
            }}
          />

          {/* Wishlist Heart */}
          {product?.id && (
            <button
              type="button"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              disabled={isToggling}
              className="absolute right-3 top-3 grid h-[2.025rem] w-[2.025rem] place-items-center rounded-full bg-white/95 text-black shadow-[0_6px_20px_rgba(17,24,39,0.12)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {isWishlisted ? (
                <svg className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          )}

          {/* Badges - Top Left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className="px-[0.45rem] py-[0.1125rem] text-[9.9px] rounded-full font-semibold shadow-sm backdrop-blur-sm flex items-center gap-1 bg-[#1a1c1d] text-white border border-white/20">
              <svg className="w-[0.675rem] h-[0.675rem] text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
              </svg>
              CUSTOMIZE
            </span>
          </div>
        </div>
      </Link>

      {/* Card Info */}
      <div className="px-0.5 pt-2 pb-1">
        <Link to="/anime-frames/customize">
          <h3
            className="font-medium tracking-tight text-slate-900 transition-colors group-hover:text-black truncate text-[13.5px] leading-[1.35rem]"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            Customize Your Own Frame
          </h3>
        </Link>

        {/* Price display derived from backend variants */}
        {displayPrice != null && (
          <div className="mt-[0.35rem] text-[0.9rem]">
            <div className="flex flex-wrap items-center gap-[0.225rem]">
              <span className="font-bold text-[1.0125rem] text-slate-900">
                ₹{Number(displayPrice).toLocaleString("en-IN")}
              </span>
              {displayMrp != null && displayMrp > displayPrice && (
                <>
                  <span className="text-[0.7875rem] text-slate-400 line-through">
                    ₹{Number(displayMrp).toLocaleString("en-IN")}
                  </span>
                  {discountPct != null && discountPct > 0 && (
                    <span className="text-[0.675rem] font-bold text-emerald-600">{discountPct}% OFF</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CustomFrameCard);
