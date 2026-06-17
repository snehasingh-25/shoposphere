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
    `${base}/c_limit,w_${width},f_webp,q_auto/${publicId}`;

  return {
    thumb: makeUrl(IMAGE_CONFIG.variants.thumb),
    medium: makeUrl(IMAGE_CONFIG.variants.medium),
    large: makeUrl(IMAGE_CONFIG.variants.large),
    original: `${base}/${publicId}`,
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
