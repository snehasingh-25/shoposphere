/**
 * Central image URL helper for product images.
 *
 * Handles two image formats:
 *   - Legacy: plain URL string (from Product.images[])
 *   - Optimized: ImageMeta object (from Product.imagesMeta[])
 *
 * All functions gracefully fall back to the plain URL string if no ImageMeta
 * is available, so legacy products keep working without any DB migration.
 */

const VARIANT_WIDTHS = {
  thumb: 320,
  medium: 800,
  large: 1200,
  original: null,
};

/** Default delivery transforms: WebP/AVIF, auto quality, optional resize + crop. */
function buildTransformString({ width, crop = "fill" } = {}) {
  const parts = ["f_auto", "q_auto"];
  if (width) parts.push(`w_${width}`, `c_${crop}`);
  return parts.join(",");
}

/**
 * Adds Cloudinary delivery transforms to a raw URL (legacy DB entries).
 *
 * @param {string | null | undefined} url
 * @param {number | null} [width=600]
 * @returns {string}
 */
export function optimizeCloudinaryUrl(url, width = 600) {
  if (!url || typeof url !== "string") return url || "";
  if (!url.includes("res.cloudinary.com")) return url;

  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);
  const firstSlash = rest.indexOf("/");
  const firstSegment = firstSlash === -1 ? rest : rest.slice(0, firstSlash);

  if (/^[a-z0-9_]+(?:,[a-z0-9_]+)*$/i.test(firstSegment) && firstSegment.includes("_")) {
    return url;
  }

  const transforms = buildTransformString(width ? { width } : {});
  return `${prefix}${transforms}/${rest}`;
}

/**
 * Returns true if the value looks like an ImageMeta object (has .variants).
 * @param {string | object} image
 * @returns {boolean}
 */
export function isImageMeta(image) {
  return image != null && typeof image === "object" && image.variants != null;
}

/**
 * Resolves the best available URL for a given variant.
 * Falls back to the plain string URL if no ImageMeta is present.
 *
 * @param {string | object | null} image - ImageMeta object or plain URL string
 * @param {"thumb" | "medium" | "large" | "original"} [variant="medium"]
 * @returns {string}
 */
export function getImageSrc(image, variant = "medium") {
  if (!image) return "/logo.png";
  if (isImageMeta(image)) {
    return image.variants[variant] || image.variants.large || "/logo.png";
  }
  const url = String(image) || "/logo.png";
  if (url === "/logo.png") return url;
  return optimizeCloudinaryUrl(url, VARIANT_WIDTHS[variant] ?? 600);
}

/**
 * Builds a srcSet string from an ImageMeta object's variant URLs.
 * Returns undefined for legacy plain-URL images (browser uses src= alone).
 *
 * @param {string | object | null} image
 * @returns {string | undefined}
 */
export function getImageSrcSet(image) {
  if (!isImageMeta(image)) return undefined;
  const { thumb, medium, large } = image.variants;
  const parts = [];
  if (thumb) parts.push(`${thumb} 320w`);
  if (medium) parts.push(`${medium} 800w`);
  if (large) parts.push(`${large} 1200w`);
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Returns a `sizes` attribute value appropriate for the rendering context.
 *
 * @param {"card" | "gallery-main" | "gallery-thumb" | "cart"} context
 * @returns {string}
 */
export function getImageSizes(context) {
  switch (context) {
    case "card":
      return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px";
    case "gallery-main":
      return "(max-width: 1024px) 100vw, 60vw";
    case "gallery-thumb":
      return "96px";
    case "cart":
      return "80px";
    default:
      return "100vw";
  }
}

/**
 * Given a product's imagesMeta array and images array, returns the first
 * ImageMeta object if available, otherwise the first plain URL string.
 * Useful in list/card contexts where you only need one representative image.
 *
 * @param {object[] | null} imagesMeta - parsed imagesMeta array (or null)
 * @param {string[]} images - parsed images array (compat URLs)
 * @returns {object | string | null}
 */
export function getPrimaryImage(imagesMeta, images) {
  if (Array.isArray(imagesMeta) && imagesMeta.length > 0) {
    return imagesMeta[0];
  }
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }
  return null;
}

/**
 * Parses the `imagesMeta` field from a product API response.
 * Returns null if the field is absent, null, or malformed.
 *
 * @param {string | object[] | null} raw
 * @returns {object[] | null}
 */
export function parseImagesMeta(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length ? raw : null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}
