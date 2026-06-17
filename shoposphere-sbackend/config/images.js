export const IMAGE_CONFIG = {
  // Pre-Sharp Multer limit (raw upload from browser)
  maxUploadBytes: 10 * 1024 * 1024, // 10 MB

  // Post-Sharp canonical WebP stored on Cloudinary
  maxCanonicalBytes: 800 * 1024, // 800 KB

  // Thumbnail cap (Cloudinary transform handles delivery; this is a soft advisory)
  maxThumbBytes: 150 * 1024, // 150 KB

  // Long-edge resize ceiling before encoding
  maxLongEdge: 2000,

  // Cloudinary delivery variant widths (used for transform URL construction)
  variants: {
    thumb: 320,
    medium: 800,
    large: 1200,
  },

  // Sharp WebP encoding — quality stepped down (88 → 80 → 75) if over cap
  webp: {
    quality: 88,
    effort: 4,
    smartSubsample: true,
  },

  // Cloudinary folder for product images (separate from the generic "ecommerce" folder)
  cloudinaryFolder: "ecommerce/products",
};
