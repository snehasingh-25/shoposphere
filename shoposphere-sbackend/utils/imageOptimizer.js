import sharp from "sharp";
import fs from "fs";
import { IMAGE_CONFIG } from "../config/images.js";

const VALID_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const QUALITY_STEPS = [88, 80, 75];

/**
 * Reads a Multer temp file, resizes if needed, encodes to WebP under the
 * maxCanonicalBytes cap using progressive quality stepping, deletes the temp
 * file, and returns the resulting buffer with metadata.
 *
 * @param {string} filePath - Absolute path to the Multer temp file
 * @param {string} [mimeType] - Optional MIME type for validation
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, sizeBytes: number }>}
 */
export async function optimizeToWebpBuffer(filePath, mimeType) {
  if (mimeType && !VALID_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Allowed: jpeg, png, webp, gif`);
  }

  let pipeline = sharp(filePath, { failOn: "truncated" });

  // Read dimensions before any transform
  const meta = await pipeline.metadata();
  const longEdge = Math.max(meta.width || 0, meta.height || 0);

  // Resize only if long edge exceeds cap; preserve aspect ratio, never upscale
  if (longEdge > IMAGE_CONFIG.maxLongEdge) {
    pipeline = pipeline.resize(IMAGE_CONFIG.maxLongEdge, IMAGE_CONFIG.maxLongEdge, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Try each quality step until we're under the cap
  let resultBuffer = null;
  let usedQuality = IMAGE_CONFIG.webp.quality;

  for (const quality of QUALITY_STEPS) {
    usedQuality = quality;
    const candidate = await pipeline
      .webp({ quality, effort: IMAGE_CONFIG.webp.effort, smartSubsample: IMAGE_CONFIG.webp.smartSubsample })
      .toBuffer();

    if (candidate.length <= IMAGE_CONFIG.maxCanonicalBytes) {
      resultBuffer = candidate;
      break;
    }
    resultBuffer = candidate; // keep last attempt even if over cap
  }

  // Always clean up the temp file
  try {
    fs.unlinkSync(filePath);
  } catch (_) {
    // non-fatal — Multer will leave the temp file but it won't block the response
  }

  if (!resultBuffer) {
    throw new Error("Image optimization produced no output");
  }

  if (resultBuffer.length > IMAGE_CONFIG.maxCanonicalBytes) {
    const kb = Math.round(resultBuffer.length / 1024);
    const capKb = Math.round(IMAGE_CONFIG.maxCanonicalBytes / 1024);
    console.warn(
      `[imageOptimizer] Image still ${kb} KB after quality ${usedQuality} (cap: ${capKb} KB). Uploading anyway.`
    );
  }

  // Re-read dimensions from the final buffer
  const finalMeta = await sharp(resultBuffer).metadata();

  console.log(
    `[imageOptimizer] Optimized: ${Math.round((meta.width || 0) * (meta.height || 0) / 1000)} MP → ` +
    `${finalMeta.width}×${finalMeta.height} WebP ${Math.round(resultBuffer.length / 1024)} KB (q${usedQuality})`
  );

  return {
    buffer: resultBuffer,
    width: finalMeta.width || 0,
    height: finalMeta.height || 0,
    sizeBytes: resultBuffer.length,
  };
}
