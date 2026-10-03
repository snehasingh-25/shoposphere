import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const img1 = "/home/haru/.gemini/antigravity-ide/brain/96262a8e-ad8e-461b-af87-dd91cc53bea7/.user_uploaded/media_1789897515218.jpg";
const img2 = "/home/haru/.gemini/antigravity-ide/brain/96262a8e-ad8e-461b-af87-dd91cc53bea7/.user_uploaded/media_1789897520878.png";
const outDir = path.resolve(__dirname, "../../shoposphere-frontend/public/banners");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function convert() {
  // Check image 1 metadata
  const meta1 = await sharp(img1).metadata();
  console.log("Image 1:", meta1.width, "x", meta1.height);

  // Convert Image 1 to 1600x700 WebP
  // Using fit: "cover" with position: "center"
  await sharp(img1)
    .resize(1600, 700, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, "anime-banner-glowing.webp"));

  console.log("Saved: anime-banner-glowing.webp");

  // Check image 2 metadata
  const meta2 = await sharp(img2).metadata();
  console.log("Image 2:", meta2.width, "x", meta2.height);

  // Convert Image 2 to 1600x700 WebP
  await sharp(img2)
    .resize(1600, 700, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, "anime-banner-customizable.webp"));

  console.log("Saved: anime-banner-customizable.webp");
}

convert().catch(console.error);
