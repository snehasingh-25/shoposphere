import prisma from "../prisma.js";
import { ANIME_FRAMES_CATEGORY_SLUG } from "../utils/animeFrameBundle.js";

const ALL_ANIME_PRODUCTS = [
  {
    name: "Gojo Satoru — Unlimited Void",
    slug: "gojo-satoru-unlimited-void-frame",
    series: "Jujutsu Kaisen",
    character: "Satoru Gojo",
    badge: "BESTSELLER",
    basePrice: 699,
    originalPrice: 1299,
    images: [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Capturing the ethereal moment Gojo lowers his blindfold to unleash the Infinite Void. Printed on optical-grade 4mm cast acrylic with high-density UV-cured pigments, producing deepest obsidian blacks and luminous cerulean blues.",
    keywords: ["anime", "frame", "wall art", "Jujutsu Kaisen", "Satoru Gojo", "Unlimited Void"]
  },
  {
    name: "Roronoa Zoro — Nine-Sword Style Asura",
    slug: "roronoa-zoro-asura-frame",
    series: "One Piece",
    character: "Roronoa Zoro",
    badge: "HOT",
    basePrice: 699,
    originalPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Witness the terrifying demonic aura of the Straw Hat swordsman in his Nine-Sword Style Asura formation. Emerald spirit energy cuts through shadow, highlighted with metallic sheen and crisp edges.",
    keywords: ["anime", "frame", "wall art", "One Piece", "Roronoa Zoro", "Asura"]
  },
  {
    name: "Luffy — Gear 5 Sun God Nika",
    slug: "monkey-d-luffy-gear-5-sun-god",
    series: "One Piece",
    character: "Monkey D. Luffy",
    badge: "TRENDING",
    basePrice: 749,
    originalPrice: 1399,
    images: [
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80"
    ],
    description: "The Warrior of Liberation awakens! Featuring the radiant white clouds, laughing face, and golden sunbeams of Luffy's Gear 5 form. High dynamic range color gamut brings joyful chaos to any wall.",
    keywords: ["anime", "frame", "wall art", "One Piece", "Luffy", "Gear 5", "Sun God Nika"]
  },
  {
    name: "Tanjiro & Nezuko — Hinokami Kagura",
    slug: "tanjiro-nezuko-hinokami-kagura",
    series: "Demon Slayer",
    character: "Tanjiro & Nezuko Kamado",
    badge: "STAFF PICK",
    basePrice: 699,
    originalPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&auto=format&fit=crop&q=80"
    ],
    description: "The bond that cannot be severed. Blazing sun dragon flames and exploding pink blood demon art coalesce in an intense, dramatic composition. The glossy acrylic depth makes the flames appear three-dimensional.",
    keywords: ["anime", "frame", "wall art", "Demon Slayer", "Tanjiro", "Nezuko", "Hinokami Kagura"]
  },
  {
    name: "Itachi Uchiha — Moonlit Tsukuyomi",
    slug: "itachi-uchiha-moonlit-raven",
    series: "Naruto",
    character: "Itachi Uchiha",
    badge: "ICONIC",
    basePrice: 699,
    originalPrice: 1249,
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Perched on the telephone pole under the blood moon, cloaked in Akatsuki clouds with scattered crows. The ultimate tribute to the tragic hero of Konohagakure.",
    keywords: ["anime", "frame", "wall art", "Naruto", "Itachi Uchiha", "Sharingan", "Tsukuyomi"]
  },
  {
    name: "Sung Jin-Woo — Arise (Shadow Monarch)",
    slug: "sung-jin-woo-shadow-monarch-arise",
    series: "Solo Leveling",
    character: "Sung Jin-Woo",
    badge: "NEW DROP",
    basePrice: 749,
    originalPrice: 1349,
    images: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900&auto=format&fit=crop&q=80"
    ],
    description: "\"ARISE.\" The Shadow Monarch commands his invincible shadow army with glowing cerulean-violet eyes and dark mana wisps. High contrast webtoon artwork mastered for premium physical display.",
    keywords: ["anime", "frame", "wall art", "Solo Leveling", "Sung Jin-Woo", "Arise", "Shadow Monarch"]
  },
  {
    name: "Levi Ackerman — Thunder Spear Attack",
    slug: "levi-ackerman-beast-titan-clash",
    series: "Attack on Titan",
    character: "Captain Levi Ackerman",
    badge: "FAN FAVORITE",
    basePrice: 699,
    originalPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Humanity's Strongest Soldier in mid-air ODM slice manoeuvre with billowing green Scout Regiment cape and smoke trails. Dramatic motion blur and razor-sharp blade details.",
    keywords: ["anime", "frame", "wall art", "Attack on Titan", "Levi Ackerman", "Thunder Spear"]
  },
  {
    name: "Ryomen Sukuna — Malevolent Shrine",
    slug: "ryomen-sukuna-malevolent-shrine",
    series: "Jujutsu Kaisen",
    character: "Ryomen Sukuna",
    badge: "LIMITED",
    basePrice: 749,
    originalPrice: 1399,
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80"
    ],
    description: "The King of Curses reigning from his throne of skulls. Menacing crimson lighting, tattoo markings, and cursed technique domain geometry captured in breathtaking depth.",
    keywords: ["anime", "frame", "wall art", "Jujutsu Kaisen", "Sukuna", "Malevolent Shrine"]
  },
  {
    name: "Naruto & Sasuke — The Final Valley",
    slug: "naruto-sasuke-final-valley",
    series: "Naruto",
    character: "Naruto Uzumaki & Sasuke Uchiha",
    badge: "CLASSIC",
    basePrice: 699,
    originalPrice: 1299,
    images: [
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Rasengan meets Chidori in the legendary clash of destiny at the Valley of the End. Dual orange Nine-Tails chakra and purple Susanoo lightning split across the composition.",
    keywords: ["anime", "frame", "wall art", "Naruto", "Sasuke", "Final Valley", "Rasengan", "Chidori"]
  },
  {
    name: "Goku — Mastered Ultra Instinct",
    slug: "son-goku-mastered-ultra-instinct",
    series: "Dragon Ball",
    character: "Son Goku",
    badge: "LEGEND",
    basePrice: 699,
    originalPrice: 1249,
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Transcending mortal limits with silver hair and godly heat vapor. The shimmering galactic particles around Goku radiate power, looking mesmerizing behind glossy optical acrylic.",
    keywords: ["anime", "frame", "wall art", "Dragon Ball", "Goku", "Ultra Instinct"]
  },
  {
    name: "Eren Yeager — The Rumbling",
    slug: "eren-yeager-the-rumbling",
    series: "Attack on Titan",
    character: "Eren Yeager",
    badge: "EPIC",
    basePrice: 749,
    originalPrice: 1349,
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80"
    ],
    description: "\"If someone is willing to take my freedom... I won't hesitate to take theirs.\" Massive colossal titan silhouettes advancing under smoke and ash with the skeletal Founding Titan.",
    keywords: ["anime", "frame", "wall art", "Attack on Titan", "Eren Yeager", "The Rumbling"]
  },
  {
    name: "Ichigo Kurosaki — Bankai Getsuga Tenshou",
    slug: "ichigo-kurosaki-bankai-getsuga",
    series: "Bleach",
    character: "Ichigo Kurosaki",
    badge: "CLASSIC",
    basePrice: 699,
    originalPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80"
    ],
    description: "Tensa Zangetsu unleashed. Pitch-black blade surrounded by swirling black and red spiritual pressure (Reiatsu). Clean, razor-sharp anime silhouette framed with elegance.",
    keywords: ["anime", "frame", "wall art", "Bleach", "Ichigo Kurosaki", "Bankai", "Getsuga Tenshou"]
  }
];

async function seedAll() {
  console.log("Seeding all 12 Anime Frames into DB...");

  // 1. Ensure category exists
  let category = await prisma.category.findUnique({
    where: { slug: ANIME_FRAMES_CATEGORY_SLUG }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Anime Frames",
        slug: ANIME_FRAMES_CATEGORY_SLUG,
        description: "Premium Anime Wall Art & LED Backlit Frames",
        order: 1
      }
    });
    console.log("Created category 'Anime Frames' (id:", category.id, ")");
  } else {
    console.log("Category 'Anime Frames' exists (id:", category.id, ")");
  }

  // 2. Loop through each product
  for (let i = 0; i < ALL_ANIME_PRODUCTS.length; i++) {
    const pData = ALL_ANIME_PRODUCTS[i];

    let product = await prisma.product.findFirst({
      where: { name: pData.name },
      include: { categories: true, variants: true }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: pData.name,
          description: pData.description,
          badge: pData.badge,
          images: JSON.stringify(pData.images),
          keywords: JSON.stringify(pData.keywords),
          order: i + 1,
          isTrending: i < 4,
          isNew: i >= 8,
          categories: {
            create: [{ categoryId: category.id }]
          }
        },
        include: { categories: true, variants: true }
      });
      console.log(`[+] Created product '${pData.name}' (id: ${product.id})`);
    } else {
      console.log(`[~] Found existing product '${pData.name}' (id: ${product.id})`);
      // Ensure category link exists
      const hasCat = product.categories.some(pc => pc.categoryId === category.id);
      if (!hasCat) {
        await prisma.productCategory.create({
          data: { productId: product.id, categoryId: category.id }
        });
        console.log(`  -> Linked to category 'Anime Frames'`);
      }
    }

    // Ensure variants exist: A4, A3, A2
    const variantsToEnsure = [
      { label: "A4", price: pData.basePrice, originalPrice: pData.originalPrice, stock: 50 },
      { label: "A3", price: pData.basePrice + 400, originalPrice: pData.originalPrice + 400, stock: 50 },
      { label: "A2", price: pData.basePrice + 900, originalPrice: pData.originalPrice + 900, stock: 50 }
    ];

    for (const v of variantsToEnsure) {
      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: product.id, sizeLabel: v.label }
      });

      if (!existingVariant) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeLabel: v.label,
            price: v.price,
            originalPrice: v.originalPrice,
            stock: v.stock,
            sku: `AF-${product.id}-${v.label}`,
            isActive: true
          }
        });
        console.log(`  -> Created variant ${v.label} (₹${v.price})`);
      } else {
        // Update price/stock
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            price: v.price,
            originalPrice: v.originalPrice,
            stock: 50,
            isActive: true
          }
        });
      }
    }
  }

  // 3. Invalidate product cache if needed
  try {
    const { invalidateCache } = await import("../utils/cache.js");
    invalidateCache();
    console.log("Cleared product cache.");
  } catch (e) {
    // ignore
  }

  console.log("All 12 Anime Frame products successfully seeded into DB!");
  process.exit(0);
}

seedAll().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
