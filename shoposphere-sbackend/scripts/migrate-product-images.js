/**
 * migrate-product-images.js
 *
 * Migrates existing product images to the new optimized pipeline:
 *   - Downloads each unoptimized image (from Cloudinary or local disk)
 *   - Runs the Sharp WebP optimization pipeline
 *   - Uploads to Cloudinary under ecommerce/products/
 *   - Updates Product.imagesMeta and Product.images (compat)
 *   - Logs all changes to migration-log.json for rollback
 *
 * Usage:
 *   node scripts/migrate-product-images.js             # dry-run (default)
 *   node scripts/migrate-product-images.js --execute   # apply changes
 *   node scripts/migrate-product-images.js --execute --batch=5
 *   node scripts/migrate-product-images.js --product=42  # single product
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import os from "os";
import { v2 as cloudinary } from "cloudinary";

import prisma from "../prisma.js";
import { optimizeToWebpBuffer } from "../utils/imageOptimizer.js";
import { uploadWebpBuffer, buildVariantUrls } from "../utils/cloudinaryStorage.js";
import { IMAGE_CONFIG } from "../config/images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const BATCH_SIZE = Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] || 10);
const SINGLE_PRODUCT = Number(args.find((a) => a.startsWith("--product="))?.split("=")[1] || 0) || null;
const LOG_FILE = path.join(__dirname, "../migration-log.json");

// --- Cloudinary setup ---
let cloudName = null;
if (process.env.CLOUDINARY_URL) {
  const m = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (m) {
    cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3] });
    cloudName = m[3];
  }
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudName = process.env.CLOUDINARY_CLOUD_NAME;
}

if (!cloudName) {
  console.error("ERROR: CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME must be set.");
  process.exit(1);
}

// --- Helpers ---
function parseJsonSafe(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `migrate-img-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    const file = fs.createWriteStream(tmpFile);
    const proto = url.startsWith("https://") ? https : http;
    proto
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tmpFile);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(tmpFile)));
      })
      .on("error", (err) => {
        file.close();
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        reject(err);
      });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLog(entries) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
}

// --- Core migration for a single image URL ---
async function migrateImageUrl(url, productId) {
  let tmpFile = null;
  try {
    // Download remote URL or map local path
    if (url.startsWith("http://") || url.startsWith("https://")) {
      tmpFile = await downloadToTemp(url);
    } else if (url.startsWith("/uploads/")) {
      const localPath = path.join(__dirname, "../uploads", url.replace(/^\/uploads\//, ""));
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
      }
      // Copy to temp so optimizer can safely delete it
      tmpFile = path.join(os.tmpdir(), `migrate-img-${Date.now()}.tmp`);
      fs.copyFileSync(localPath, tmpFile);
    } else {
      throw new Error(`Unsupported URL scheme: ${url}`);
    }

    const { buffer, width, height, sizeBytes } = await optimizeToWebpBuffer(tmpFile);

    const imageId = `${productId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const publicId = `${IMAGE_CONFIG.cloudinaryFolder}/${imageId}`;

    if (!DRY_RUN) {
      await uploadWebpBuffer(buffer, publicId);
    }

    const variants = buildVariantUrls(publicId, cloudName);

    return {
      id: imageId,
      publicId,
      variants,
      width,
      height,
      sizeBytes,
      format: "webp",
      storage: "cloudinary",
    };
  } finally {
    // Cleanup temp file if optimizer didn't already delete it
    if (tmpFile && fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
  }
}

// --- Main ---
async function migrate() {
  const logEntries = loadLog();

  const where = SINGLE_PRODUCT ? { id: SINGLE_PRODUCT } : {};
  const products = await prisma.product.findMany({
    where,
    select: { id: true, name: true, images: true, imagesMeta: true },
    orderBy: { id: "asc" },
  });

  const toProcess = products.filter((p) => {
    const images = parseJsonSafe(p.images);
    if (images.length === 0) return false;
    const imagesMeta = parseJsonSafe(p.imagesMeta);
    const optimizedLargeUrls = new Set(imagesMeta.map((m) => m.variants?.large).filter(Boolean));
    return images.some((url) => !optimizedLargeUrls.has(url));
  });

  console.log(`\n=== Product Image Migration ===`);
  console.log(`Mode:          ${DRY_RUN ? "DRY-RUN (no changes will be made)" : "EXECUTE"}`);
  console.log(`Batch size:    ${BATCH_SIZE}`);
  console.log(`Products:      ${toProcess.length} need migration (of ${products.length} scanned)`);
  if (SINGLE_PRODUCT) console.log(`Single:        product ${SINGLE_PRODUCT}`);
  console.log("");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let batchStart = 0; batchStart < toProcess.length; batchStart += BATCH_SIZE) {
    const batch = toProcess.slice(batchStart, batchStart + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (products ${batchStart + 1}–${batchStart + batch.length})...`);

    for (const product of batch) {
      const images = parseJsonSafe(product.images);
      const existingMetas = parseJsonSafe(product.imagesMeta);
      const optimizedLargeUrls = new Set(existingMetas.map((m) => m.variants?.large).filter(Boolean));

      const newMetas = [...existingMetas];
      const newImages = [];
      let changed = false;

      for (const url of images) {
        if (optimizedLargeUrls.has(url)) {
          // Already optimized — keep as-is
          newImages.push(url);
          continue;
        }

        try {
          const meta = await migrateImageUrl(url, product.id);
          newMetas.push(meta);
          newImages.push(meta.variants.large);
          changed = true;

          const savedKb = Math.round((1 - meta.sizeBytes / (200 * 1024)) * 100);
          console.log(`  ✓ [${product.id}] ${url.slice(-50).padStart(50)} → ${meta.variants.large.slice(-40)} (${Math.round(meta.sizeBytes / 1024)} KB)`);

          logEntries.push({
            productId: product.id,
            productName: product.name,
            oldUrl: url,
            newPublicId: meta.publicId,
            newLargeUrl: meta.variants.large,
            sizeBytes: meta.sizeBytes,
            dryRun: DRY_RUN,
            migratedAt: new Date().toISOString(),
          });
          successCount++;
        } catch (err) {
          console.error(`  ✗ [${product.id}] ${url.slice(-60)}: ${err.message}`);
          newImages.push(url); // keep original URL on error
          errorCount++;
        }
      }

      if (changed && !DRY_RUN) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            images: JSON.stringify(newImages),
            imagesMeta: newMetas.length > 0 ? JSON.stringify(newMetas) : null,
          },
        });
      } else if (!changed) {
        skipCount++;
      }
    }

    // Save log after each batch
    saveLog(logEntries);

    // Pause between batches to respect Cloudinary API rate limits
    if (batchStart + BATCH_SIZE < toProcess.length) {
      console.log("  Pausing 1s between batches...");
      await sleep(1000);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Migrated:  ${successCount}`);
  console.log(`Skipped:   ${skipCount}`);
  console.log(`Errors:    ${errorCount}`);
  console.log(`Log:       ${LOG_FILE}`);
  if (DRY_RUN) {
    console.log(`\nDry-run complete. Re-run with --execute to apply changes.`);
  }

  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
