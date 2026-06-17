/**
 * audit-product-images.js
 *
 * Scans all products and classifies their image URLs so you know what needs
 * migration before running migrate-product-images.js.
 *
 * Usage:
 *   node scripts/audit-product-images.js
 */

import dotenv from "dotenv";
dotenv.config();

import prisma from "../prisma.js";

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

function classifyUrl(url) {
  if (!url || typeof url !== "string") return "unknown";
  if (url.startsWith("https://res.cloudinary.com/")) return "cloudinary-legacy";
  if (url.startsWith("/uploads/")) return "local";
  if (url.startsWith("http://") || url.startsWith("https://")) return "external";
  return "unknown";
}

async function audit() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true, imagesMeta: true },
    orderBy: { id: "asc" },
  });

  const summary = {
    totalProducts: products.length,
    productsWithNoImages: 0,
    productsAlreadyOptimized: 0,
    productsNeedingMigration: 0,
    urlCounts: {
      "cloudinary-legacy": 0,
      "cloudinary-optimized": 0,
      local: 0,
      external: 0,
      unknown: 0,
    },
    totalImages: 0,
  };

  const needsMigration = [];

  for (const product of products) {
    const images = parseJsonSafe(product.images);
    const imagesMeta = parseJsonSafe(product.imagesMeta);

    if (images.length === 0) {
      summary.productsWithNoImages++;
      continue;
    }

    summary.totalImages += images.length;

    // A product is "fully optimized" if every image URL has a matching imagesMeta entry
    const metaPublicIds = new Set(imagesMeta.map((m) => m.publicId).filter(Boolean));
    const optimizedLargeUrls = new Set(imagesMeta.map((m) => m.variants?.large).filter(Boolean));

    const unoptimized = images.filter((url) => !optimizedLargeUrls.has(url));

    if (unoptimized.length === 0 && imagesMeta.length > 0) {
      summary.productsAlreadyOptimized++;
    } else {
      summary.productsNeedingMigration++;
      const breakdown = {};
      for (const url of unoptimized) {
        const type = classifyUrl(url);
        breakdown[type] = (breakdown[type] || 0) + 1;
        summary.urlCounts[type]++;
      }
      needsMigration.push({ id: product.id, name: product.name, unoptimized: unoptimized.length, breakdown });
    }

    // Count already-optimized cloudinary URLs
    for (const url of images) {
      if (optimizedLargeUrls.has(url)) {
        summary.urlCounts["cloudinary-optimized"]++;
      }
    }
  }

  console.log("\n=== Product Image Audit ===\n");
  console.log(`Total products scanned:    ${summary.totalProducts}`);
  console.log(`Products with no images:   ${summary.productsWithNoImages}`);
  console.log(`Already fully optimized:   ${summary.productsAlreadyOptimized}`);
  console.log(`Need migration:            ${summary.productsNeedingMigration}`);
  console.log(`Total image URLs:          ${summary.totalImages}`);
  console.log("\nURL type breakdown (unoptimized images only):");
  for (const [type, count] of Object.entries(summary.urlCounts)) {
    if (count > 0) console.log(`  ${type.padEnd(25)} ${count}`);
  }

  if (needsMigration.length > 0) {
    console.log(`\nFirst 20 products needing migration:`);
    for (const p of needsMigration.slice(0, 20)) {
      const parts = Object.entries(p.breakdown)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      console.log(`  [${p.id}] ${p.name.slice(0, 50).padEnd(50)} — ${p.unoptimized} url(s): ${parts}`);
    }
    if (needsMigration.length > 20) {
      console.log(`  ... and ${needsMigration.length - 20} more`);
    }
  } else {
    console.log("\nAll products are already fully optimized.");
  }

  console.log("");
  await prisma.$disconnect();
}

audit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
