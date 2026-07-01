import { v2 as cloudinary } from "cloudinary";
import { IMAGE_CONFIG } from "../config/images.js";

/**
 * Uploads a WebP buffer to Cloudinary using upload_stream (no temp file needed).
 *
 * @param {Buffer} buffer - WebP image buffer
 * @param {string} publicId - Cloudinary public_id (e.g. "ecommerce/products/12-1234567890")
 * @returns {Promise<{ public_id: string, secure_url: string, width: number, height: number, bytes: number }>}
 */
export async function uploadWebpBuffer(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        format: "webp",
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/** Default delivery transforms: WebP/AVIF, auto quality, resize + crop. */
export function buildTransformString({ width, crop = "fill" } = {}) {
  const parts = ["f_auto", "q_auto"];
  if (width) parts.push(`w_${width}`, `c_${crop}`);
  return parts.join(",");
}

/**
 * Inserts delivery transforms into a Cloudinary URL if not already present.
 *
 * @param {string} url
 * @param {string} transforms - e.g. "f_auto,q_auto,w_600,c_fill"
 * @returns {string}
 */
export function withCloudinaryTransforms(url, transforms) {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);
  const firstSlash = rest.indexOf("/");
  const firstSegment = firstSlash === -1 ? rest : rest.slice(0, firstSlash);

  // Skip if transforms are already in the URL (e.g. f_auto,q_auto,w_600,c_fill)
  if (/^[a-z0-9_]+(?:,[a-z0-9_]+)*$/i.test(firstSegment) && firstSegment.includes("_")) {
    return url;
  }

  const normalized = transforms.endsWith("/") ? transforms : `${transforms}/`;
  return `${prefix}${normalized}${rest}`;
}

/**
 * Builds Cloudinary delivery URLs for each variant width using URL transforms.
 * No extra uploads — one stored asset, multiple delivery sizes.
 *
 * @param {string} publicId - Cloudinary public_id of the stored asset
 * @param {string} cloudName - Cloudinary cloud name
 * @returns {{ thumb: string, medium: string, large: string, original: string }}
 */
export function buildVariantUrls(publicId, cloudName) {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;

  const makeUrl = (width) =>
    `${base}/${buildTransformString({ width })}/${publicId}`;

  return {
    thumb: makeUrl(IMAGE_CONFIG.variants.thumb),
    medium: makeUrl(IMAGE_CONFIG.variants.medium),
    large: makeUrl(IMAGE_CONFIG.variants.large),
    original: `${base}/${buildTransformString()}/${publicId}`,
  };
}

/**
 * Deletes a Cloudinary asset by public_id.
 * Used when an image is removed from a product or a product is deleted.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
export async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error(`[cloudinaryStorage] Failed to delete ${publicId}:`, error.message);
  }
}
