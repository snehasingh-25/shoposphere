import prisma from "../prisma.js";
import { ANIME_FRAMES_CATEGORY_SLUG } from "./animeFrameBundle.js";

export const CUSTOM_ANIME_FRAME_NAME = "Customize Your Own Frame";

/**
 * Ensures the 'Customize Your Own Frame' product exists in the DB under the anime-frames category,
 * with authoritative A4 (₹699) and A3 (₹1,099) variants.
 */
export async function ensureCustomAnimeFrame() {
  try {
    // 1. Ensure Anime Frames category exists
    let category = await prisma.category.findUnique({
      where: { slug: ANIME_FRAMES_CATEGORY_SLUG },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Anime Frames",
          slug: ANIME_FRAMES_CATEGORY_SLUG,
          description: "Premium Anime Wall Art & LED Backlit Frames",
          order: 1,
        },
      });
      console.log(`[ensureCustomAnimeFrame] Created category 'Anime Frames' (id: ${category.id})`);
    }

    // 2. Find or create the custom frame product
    let product = await prisma.product.findFirst({
      where: { name: CUSTOM_ANIME_FRAME_NAME },
      include: { variants: true, categories: true },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: CUSTOM_ANIME_FRAME_NAME,
          description:
            "Upload your favorite anime image and turn it into a custom anime frame. Premium optical cast acrylic with crystal-clear high-density UV-cured pigments.",
          badge: "CUSTOMIZE",
          order: -1,
          images: JSON.stringify(["/custom-anime-frame.jpg"]),
          keywords: JSON.stringify([
            "anime",
            "custom",
            "frame",
            "wall art",
            "personalized",
            "Customize Your Own Frame",
          ]),
          isCustomizable: true,
          customizationLabel: "Upload Your Photo",
          customizationSettings: JSON.stringify({
            enabled: true,
            maxUploadImages: 1,
            allowedImageTypes: ["jpg", "jpeg", "png", "webp"],
            maxImageSizeMb: 25,
            nameRequired: false,
            messageRequired: false,
          }),
          categories: {
            create: [{ categoryId: category.id }],
          },
        },
        include: { variants: true, categories: true },
      });
      console.log(`[ensureCustomAnimeFrame] Created product '${CUSTOM_ANIME_FRAME_NAME}' (id: ${product.id})`);
    } else {
      // Ensure customizable flag & category linkage
      await prisma.product.update({
        where: { id: product.id },
        data: {
          isCustomizable: true,
          customizationLabel: "Upload Your Photo",
          order: -1,
        },
      });

      const hasCat = product.categories.some((c) => c.categoryId === category.id);
      if (!hasCat) {
        await prisma.productCategory.create({
          data: { productId: product.id, categoryId: category.id },
        });
        console.log(`[ensureCustomAnimeFrame] Linked product '${CUSTOM_ANIME_FRAME_NAME}' to Anime Frames category`);
      }
    }

    // 3. Ensure required A4 and A3 variants with authoritative DB prices
    const requiredVariants = [
      { label: "A4", price: 699, originalPrice: 1299, stock: 999 },
      { label: "A3", price: 1099, originalPrice: 1749, stock: 999 },
    ];

    for (const rv of requiredVariants) {
      const existing = await prisma.productVariant.findFirst({
        where: { productId: product.id, sizeLabel: rv.label },
      });

      if (!existing) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeLabel: rv.label,
            price: rv.price,
            originalPrice: rv.originalPrice,
            stock: rv.stock,
            sku: `AF-CUSTOM-${rv.label}-${product.id}`,
            isActive: true,
          },
        });
        console.log(`[ensureCustomAnimeFrame] Created variant ${rv.label} (₹${rv.price}) for product ${product.id}`);
      } else {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: {
            price: rv.price,
            originalPrice: rv.originalPrice,
            stock: rv.stock,
            isActive: true,
          },
        });
        console.log(`[ensureCustomAnimeFrame] Verified/Updated variant ${rv.label} (₹${rv.price}) for product ${product.id}`);
      }
    }

    // 4. Report any unexpected existing variants without deleting
    const allVariants = await prisma.productVariant.findMany({
      where: { productId: product.id },
    });
    const unexpected = allVariants.filter(
      (v) => !requiredVariants.some((rv) => rv.label.toLowerCase() === v.sizeLabel.toLowerCase())
    );
    if (unexpected.length > 0) {
      console.warn(
        `[ensureCustomAnimeFrame] Notice: Found unexpected variants on custom product:`,
        unexpected.map((v) => `${v.sizeLabel} (id: ${v.id})`)
      );
    }

    console.log(`[ensureCustomAnimeFrame] Successfully verified '${CUSTOM_ANIME_FRAME_NAME}' with A4 & A3 variants.`);
    return product;
  } catch (err) {
    console.error(`[ensureCustomAnimeFrame] Error ensuring custom anime frame product:`, err);
    throw err;
  }
}
