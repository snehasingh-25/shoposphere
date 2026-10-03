/**
 * Seed script to:
 * 1. Ensure the "Anime Frames" category exists with slug 'anime-frames'.
 * 2. Ensure products from animeFramesData exist in DB under 'anime-frames' category with variants (A4, A3, A2) and stock.
 * 3. Ensure default bundles exist: 3 -> ₹999, 5 -> ₹1499, 10 -> ₹2499.
 */

import prisma from "../prisma.js";
import { ANIME_FRAMES_CATEGORY_SLUG } from "../utils/animeFrameBundle.js";

const DEFAULT_BUNDLES = [
  { name: "3 Frame Combo", quantity: 3, price: 999, offerLabel: "Buy 3 & Save", displayOrder: 1, isActive: true },
  { name: "5 Frame Combo", quantity: 5, price: 1499, offerLabel: "Buy 5 & Save", displayOrder: 2, isActive: true },
  { name: "10 Frame Combo", quantity: 10, price: 2499, offerLabel: "Buy 10 & Save", displayOrder: 3, isActive: true },
];

const SEED_PRODUCTS = [
  {
    slug: "gojo-satoru-unlimited-void-frame",
    name: "Gojo Satoru — Unlimited Void",
    basePrice: 699,
    originalPrice: 1299,
    description: "Capturing the ethereal moment Gojo lowers his blindfold to unleash the Infinite Void. Printed on optical-grade 4mm cast acrylic with high-density UV-cured pigments.",
    images: ["https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900&auto=format&fit=crop&q=80"],
    badge: "BESTSELLER",
  },
  {
    slug: "roronoa-zoro-asura-frame",
    name: "Roronoa Zoro — Nine-Sword Style Asura",
    basePrice: 699,
    originalPrice: 1199,
    description: "Witness the terrifying demonic aura of the Straw Hat swordsman in his Nine-Sword Style Asura formation. Emerald spirit energy cuts through shadow.",
    images: ["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80"],
    badge: "HOT",
  },
  {
    slug: "monkey-d-luffy-gear-5-sun-god",
    name: "Luffy — Gear 5 Sun God Nika",
    basePrice: 749,
    originalPrice: 1399,
    description: "The Warrior of Liberation awakens! Featuring the radiant white clouds, laughing face, and golden sunbeams of Luffy's Gear 5 form.",
    images: ["https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&auto=format&fit=crop&q=80"],
    badge: "TRENDING",
  },
  {
    slug: "naruto-uzumaki-sage-mode-kurama",
    name: "Naruto — Kurama Link Sage Mode",
    basePrice: 699,
    originalPrice: 1299,
    description: "The Seventh Hokage enveloped in golden Kurama chakra flame with piercing toad-sage pupils.",
    images: ["https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80"],
    badge: "POPULAR",
  },
  {
    slug: "itachi-uchiha-crow-genjutsu",
    name: "Itachi Uchiha — Crow Genjutsu",
    basePrice: 749,
    originalPrice: 1349,
    description: "The tragic prodigy amidst a murder of crimson-eyed spectral crows dissolved into shadow and Tsukuyomi.",
    images: ["https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80"],
    badge: "STAFF PICK",
  },
  {
    slug: "tanjiro-kamado-sun-breathing",
    name: "Tanjiro Kamado — Hinokami Kagura",
    basePrice: 699,
    originalPrice: 1249,
    description: "Dragon sun-halo dance ignited. Roaring crimson flames erupt across the Nichirin blade against falling mountain snow.",
    images: ["https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&auto=format&fit=crop&q=80"],
    badge: "HOT",
  },
];

async function seed() {
  console.log("Seeding Anime Frames category, products, and default bundles...");

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
    console.log("Created category 'Anime Frames' (id:", category.id, ")");
  } else {
    console.log("Category 'Anime Frames' exists (id:", category.id, ")");
  }

  // 2. Ensure default bundles exist
  for (const b of DEFAULT_BUNDLES) {
    const existing = await prisma.animeFrameBundle.findUnique({
      where: { quantity: b.quantity },
    });
    if (!existing) {
      await prisma.animeFrameBundle.create({ data: b });
      console.log(`Created bundle: ${b.quantity} Frames -> ₹${b.price}`);
    } else {
      console.log(`Bundle ${b.quantity} Frames already exists (₹${existing.price})`);
    }
  }

  // 3. Ensure products and variants exist
  for (const sp of SEED_PRODUCTS) {
    let product = await prisma.product.findFirst({
      where: { name: sp.name },
      include: { categories: true, variants: true },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: sp.name,
          description: sp.description,
          badge: sp.badge,
          images: JSON.stringify(sp.images),
          keywords: JSON.stringify(["anime", "frame", "wall art", sp.name]),
          categories: {
            create: [{ categoryId: category.id }],
          },
        },
        include: { categories: true, variants: true },
      });
      console.log(`Created product '${sp.name}' (id: ${product.id})`);
    } else {
      // Ensure category link exists
      const hasCat = product.categories.some((pc) => pc.categoryId === category.id);
      if (!hasCat) {
        await prisma.productCategory.create({
          data: { productId: product.id, categoryId: category.id },
        });
        console.log(`Linked product '${sp.name}' to Anime Frames category`);
      }
    }

    // Ensure size variants (A4, A3, A2) exist
    const sizes = [
      { label: "A4", price: sp.basePrice, originalPrice: sp.originalPrice, stock: 50 },
      { label: "A3", price: sp.basePrice + 450, originalPrice: sp.originalPrice + 450, stock: 50 },
      { label: "A2", price: sp.basePrice + 900, originalPrice: sp.originalPrice + 900, stock: 50 },
    ];

    for (const sz of sizes) {
      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: product.id, sizeLabel: sz.label },
      });
      if (!existingVariant) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeLabel: sz.label,
            price: sz.price,
            originalPrice: sz.originalPrice,
            stock: sz.stock,
            sku: `AF-${product.id}-${sz.label}`,
            isActive: true,
          },
        });
      }
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
