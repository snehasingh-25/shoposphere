/**
 * Authoritative Anime Frames Bundle Pricing & Financial Calculation Helper
 * Single source of truth for Cart, Checkout, Orders, and Payments.
 */

export const ANIME_FRAMES_CATEGORY_SLUG = "anime-frames";

/**
 * Deterministic rounding to 2 decimal places.
 * Avoids raw JavaScript floating-point drift.
 */
export function roundToTwo(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Checks if a product belongs to the "Anime Frames" collection.
 * Authoritative check uses category slug 'anime-frames'.
 * Renaming the category display name will never break eligibility.
 */
export function isAnimeFrameProduct(product) {
  if (!product) return false;
  const categories = product.categories;
  if (Array.isArray(categories)) {
    return categories.some((c) => {
      const slug = c.category?.slug || c.slug;
      return slug === ANIME_FRAMES_CATEGORY_SLUG;
    });
  }
  return false;
}

/**
 * Standardized helper to determine Anime Frame eligibility from a cart item.
 * SERVER NEVER TRUSTS frontend flags like `item.isAnimeFrame`.
 * Always inspects the actual product-category relationship.
 */
export function isAnimeFrameItem(item) {
  if (!item) return false;
  const product = item.product || item;
  return isAnimeFrameProduct(product);
}

/**
 * Calculates Anime Frame bundle discount and progress metrics.
 *
 * Rules:
 * 1. Only products in the 'anime-frames' category qualify.
 * 2. Highest eligible active bundle tier is applied (no bundle stacking).
 * 3. Quantities between tiers: bundled units receive the bundle price,
 *    and remaining units are charged at normal pricing.
 * 4. Units are sorted by unit price descending so the customer receives
 *    the maximum discount on the bundled portion.
 * 5. progressPercentage always represents progress toward the NEXT higher tier.
 *    If highest tier is reached, progressPercentage = 100.
 *
 * @param {Array} items - Hydrated cart items
 * @param {Array} activeBundles - Active AnimeFrameBundle records from DB
 * @returns {Object} Helper return contract:
 *   {
 *     eligibleQuantity,
 *     normalSubtotal,
 *     bundlePrice,
 *     bundleDiscount,
 *     currentBundle,
 *     nextBundle,
 *     remainingToNextBundle,
 *     progressPercentage,
 *     finalFramePrice
 *   }
 */
export function calculateAnimeFrameBundle(items = [], activeBundles = []) {
  // Sort active bundles by quantity ascending
  const sortedBundles = [...activeBundles]
    .filter((b) => b && b.isActive !== false)
    .map((b) => ({
      ...b,
      quantity: parseInt(b.quantity, 10),
      price: roundToTwo(b.price),
    }))
    .filter((b) => Number.isInteger(b.quantity) && b.quantity > 0 && b.price > 0)
    .sort((a, b) => a.quantity - b.quantity);

  // Extract all eligible individual frame units
  const eligibleUnits = [];
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isAnimeFrameItem(item)) {
        const qty = Math.max(0, parseInt(item.quantity, 10) || 0);
        const unitPrice = roundToTwo(item.price);
        for (let i = 0; i < qty; i++) {
          eligibleUnits.push({
            itemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            unitPrice,
            productName: item.productName,
            sizeLabel: item.sizeLabel,
          });
        }
      }
    }
  }

  // Sort descending by unit price: bundled portion gets highest priced items first
  eligibleUnits.sort((a, b) => b.unitPrice - a.unitPrice);

  const eligibleQuantity = eligibleUnits.length;
  const normalSubtotal = roundToTwo(eligibleUnits.reduce((sum, u) => sum + u.unitPrice, 0));

  const firstBundle = sortedBundles[0] || null;

  if (eligibleQuantity === 0) {
    return {
      eligibleQuantity: 0,
      normalSubtotal: 0,
      bundlePrice: 0,
      bundleDiscount: 0,
      currentBundle: null,
      nextBundle: firstBundle,
      remainingToNextBundle: firstBundle ? firstBundle.quantity : 0,
      progressPercentage: 0,
      finalFramePrice: 0,
    };
  }

  // Find the single highest eligible active bundle tier
  const currentBundle =
    [...sortedBundles].filter((b) => b.quantity <= eligibleQuantity).pop() || null;

  // Find the next higher tier
  const nextBundle = sortedBundles.find((b) => b.quantity > eligibleQuantity) || null;

  const remainingToNextBundle = nextBundle ? nextBundle.quantity - eligibleQuantity : 0;

  // Progress percentage always targets the next higher bundle tier
  let progressPercentage;
  if (nextBundle) {
    progressPercentage = roundToTwo((eligibleQuantity / nextBundle.quantity) * 100);
  } else {
    // Highest bundle reached
    progressPercentage = 100;
  }

  let bundlePrice = 0;
  let bundleDiscount = 0;
  let finalFramePrice = normalSubtotal;

  if (currentBundle) {
    // Bundled portion: exactly currentBundle.quantity units
    const bundledUnits = eligibleUnits.slice(0, currentBundle.quantity);
    const bundledNormalSubtotal = roundToTwo(bundledUnits.reduce((sum, u) => sum + u.unitPrice, 0));

    bundlePrice = roundToTwo(currentBundle.price);
    // Bundle discount is the savings on the bundled portion
    bundleDiscount = Math.max(0, roundToTwo(bundledNormalSubtotal - bundlePrice));

    // Remaining units at normal pricing
    const remainingUnits = eligibleUnits.slice(currentBundle.quantity);
    const remainingNormalSubtotal = roundToTwo(remainingUnits.reduce((sum, u) => sum + u.unitPrice, 0));

    // Total price of all eligible frames after applying the bundle
    finalFramePrice = roundToTwo(bundlePrice + remainingNormalSubtotal);
  }

  return {
    eligibleQuantity,
    normalSubtotal,
    bundlePrice,
    bundleDiscount,
    currentBundle,
    nextBundle,
    remainingToNextBundle,
    progressPercentage,
    finalFramePrice,
  };
}

/**
 * Authoritative financial breakdown helper.
 * Calculates everything on the server:
 *
 *   Product Subtotal
 *           ↓
 *   - Anime Frame Bundle Discount
 *           ↓
 *   - Coupon Discount
 *           ↓
 *   + Delivery Fee
 *           ↓
 *   + COD Fee (if applicable)
 *           ↓
 *   - Prepaid Discount (if applicable)
 *           ↓
 *   Final Total
 *
 * @param {Object} params
 * @param {Array} params.items - Hydrated cart items with product & category data
 * @param {Array} params.activeBundles - Active bundles from DB
 * @param {number} [params.couponDiscount=0] - Pre-validated server-calculated coupon discount
 * @param {number} [params.deliveryFee=0] - Server-calculated delivery fee
 * @param {string} [params.paymentMethod='online'] - 'online' | 'cod' | 'unspecified'
 * @returns {Object}
 */
export function calculateAuthoritativeFinancialBreakdown({
  items = [],
  activeBundles = [],
  couponDiscount = 0,
  deliveryFee = 0,
  paymentMethod = "unspecified",
  codFeeAmount = 40,
  prepaidDiscountAmount = 40,
}) {
  const bundleInfo = calculateAnimeFrameBundle(items, activeBundles);

  const subtotal = roundToTwo(
    items.reduce((sum, item) => sum + roundToTwo(Number(item.subtotal ?? (item.price * item.quantity) ?? 0)), 0)
  );

  const bundleDiscount = roundToTwo(bundleInfo.bundleDiscount || 0);

  // Coupon discount cannot exceed the remaining subtotal after bundle discount
  const maxCouponApplicable = Math.max(0, roundToTwo(subtotal - bundleDiscount));
  const safeCouponDiscount = Math.min(maxCouponApplicable, roundToTwo(couponDiscount || 0));

  const safeDeliveryFee = roundToTwo(deliveryFee || 0);

  // Payment method adjustments
  const normalizedMethod = String(paymentMethod || "").trim().toLowerCase();
  let codFee = 0;
  let prepaidDiscount = 0;

  if (normalizedMethod === "cod") {
    codFee = roundToTwo(codFeeAmount);
  } else if (normalizedMethod === "online") {
    prepaidDiscount = roundToTwo(prepaidDiscountAmount);
  }

  const finalTotal = roundToTwo(
    Math.max(0, subtotal - bundleDiscount - safeCouponDiscount + safeDeliveryFee + codFee - prepaidDiscount)
  );

  return {
    subtotal,
    bundleDiscount,
    couponDiscount: safeCouponDiscount,
    deliveryFee: safeDeliveryFee,
    codFee,
    prepaidDiscount,
    finalTotal,
    bundleInfo,
  };
}
