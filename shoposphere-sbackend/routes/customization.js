import express from "express";
import prisma from "../prisma.js";
import { optionalCustomerAuth } from "../utils/auth.js";
import { getImageUrl, uploadCustomizationImages } from "../utils/upload.js";
import { normalizeCustomizationSettings } from "../utils/customization.js";

const router = express.Router();

function getAllowedMimeTypes(settings) {
  const allowed = new Set();
  for (const type of settings?.allowedImageTypes || ["jpg", "png", "webp"]) {
    if (type === "jpg") allowed.add("image/jpeg");
    if (type === "png") allowed.add("image/png");
    if (type === "webp") allowed.add("image/webp");
  }
  return allowed;
}

router.post("/upload/:productId", optionalCustomerAuth, uploadCustomizationImages, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, customizationSettings: true, isCustomizable: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const settings = normalizeCustomizationSettings(product.customizationSettings);
    if (!settings?.enabled && !product.isCustomizable) {
      return res.status(400).json({ error: "Customization is not enabled for this product" });
    }

    const files = req.files?.customizationImages || [];
    if (!files.length) {
      return res.status(400).json({ error: "At least one customization image is required" });
    }

    const maxUploadImages = settings?.maxUploadImages || 3;
    if (files.length > maxUploadImages) {
      return res.status(400).json({ error: `You can upload at most ${maxUploadImages} image(s)` });
    }

    const maxImageSizeMb = settings?.maxImageSizeMb || 5;
    const allowedMimeTypes = getAllowedMimeTypes(settings);
    const maxSizeBytes = Math.max(1, Number(maxImageSizeMb)) * 1024 * 1024;
    for (const file of files) {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return res.status(400).json({ error: "One or more files use a disallowed image type" });
      }
      if (file.size > maxSizeBytes) {
        return res.status(400).json({ error: `Each image must be ${maxImageSizeMb}MB or smaller` });
      }
    }

    const imageUrls = [];
    for (const file of files) {
      imageUrls.push(await getImageUrl(file));
    }

    res.status(201).json({ imageUrls });
  } catch (error) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message || "Failed to upload customization images" });
  }
});

export default router;