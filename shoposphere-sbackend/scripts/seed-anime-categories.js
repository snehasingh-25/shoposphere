import prisma from "../prisma.js";

const DEFAULT_CATEGORIES = [
  { name: "Naruto", slug: "naruto", imageUrl: "/anime-categories/naruto.svg", order: 1 },
  { name: "Demon Slayer", slug: "demon-slayer", imageUrl: "/anime-categories/demon-slayer.svg", order: 2 },
  { name: "One Piece", slug: "one-piece", imageUrl: "/anime-categories/one-piece.svg", order: 3 },
  { name: "Jujutsu Kaisen", slug: "jujutsu-kaisen", imageUrl: "/anime-categories/jujutsu-kaisen.svg", order: 4 },
  { name: "Solo Leveling", slug: "solo-leveling", imageUrl: "/anime-categories/solo-leveling.svg", order: 5 },
  { name: "Attack on Titan", slug: "attack-on-titan", imageUrl: "/anime-categories/attack-on-titan.svg", order: 6 },
  { name: "Dragon Ball", slug: "dragon-ball", imageUrl: "/anime-categories/dragon-ball.svg", order: 7 },
  { name: "Bleach", slug: "bleach", imageUrl: "/anime-categories/bleach.svg", order: 8 },
];

async function seed() {
  console.log("Seeding Anime Categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.animeCategory.findFirst({
      where: {
        OR: [{ name: cat.name }, { slug: cat.slug }],
      },
    });

    if (!existing) {
      await prisma.animeCategory.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          imageUrl: cat.imageUrl,
          order: cat.order,
          isActive: true,
        },
      });
      console.log(`Created category: ${cat.name}`);
    } else {
      console.log(`Category already exists: ${cat.name}`);
    }
  }
  console.log("Anime Categories seeding completed!");
}

seed()
  .catch((e) => {
    console.error("Error seeding anime categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
