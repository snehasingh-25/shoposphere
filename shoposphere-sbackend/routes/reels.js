import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
import { uploadReelFiles, getVideoUrl, getImageUrl } from "../utils/upload.js";
const router = express.Router();

// Get active reels (public) — optional ?placement=home|about (default home). Cached 5 minutes.
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const placementRaw = req.query.placement;
    const placement =
      placementRaw === "about" ? "about" : "home";

    const reels = await prisma.reel.findMany({
      where: { isActive: true, placement },
      orderBy: { order: "asc" },
      include: {
        product: {
          include: {
            variants: true,
            colors: true,
            categories: {
              include: {
                category: true,
              }
            },
          },
        },
      },
    });
    res.json(reels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reels (Admin only)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const reels = await prisma.reel.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        product: {
          include: {
            variants: true,
            colors: true,
            categories: {
              include: {
                category: true,
              }
            },
          },
        },
      },
    });
    res.json(reels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create reel (Admin only)
router.post("/", requireRole("admin"), uploadReelFiles.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    // Invalidate reels + homepage bundle cache on create
    invalidateCache("/reels");
    invalidateCache("/home");

    const {
      title,
      url,
      videoUrl,
      thumbnail,
      platform,
      isActive,
      order,
      productId,
      isTrending,
      isFeatured,
      discountPct,
      placement: placementBody,
      caption,
    } = req.body;

    const placement = placementBody === "about" ? "about" : "home";

    // Featured applies per placement (homepage carousel only uses home reels)
    if (isFeatured === "true" || isFeatured === true) {
      await prisma.reel.updateMany({
        where: { isFeatured: true, placement },
        data: { isFeatured: false },
      });
    }

    // Handle video file upload
    let finalVideoUrl = videoUrl || url || null;
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      finalVideoUrl = await getVideoUrl(videoFile);
    }

    // Handle thumbnail file upload
    let finalThumbnail = thumbnail || null;
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];
      finalThumbnail = await getImageUrl(thumbnailFile);
    }

    const reel = await prisma.reel.create({
      data: {
        title: title || null,
        url: finalVideoUrl || null,
        videoUrl: finalVideoUrl || null,
        thumbnail: finalThumbnail || null,
        platform: platform || "native",
        productId: productId ? Number(productId) : null,
        isTrending: isTrending === "true" || isTrending === true,
        isFeatured: isFeatured === "true" || isFeatured === true,
        discountPct: discountPct !== undefined && discountPct !== null && discountPct !== "" ? Number(discountPct) : null,
        isActive: isActive === "true" || isActive === true || (isActive === undefined ? true : false),
        order: order !== undefined && order !== null && order !== "" ? Number(order) : 0,
        placement,
        caption: caption !== undefined && caption !== null && String(caption).trim() !== "" ? String(caption).trim().slice(0, 160) : null,
      },
    });

    res.json(reel);
  } catch (error) {
    console.error("Create reel error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update reel (Admin only)
router.put("/:id", requireRole("admin"), uploadReelFiles.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    // Invalidate reels + homepage bundle cache on update
    invalidateCache("/reels");
    invalidateCache("/home");

    const {
      title,
      url,
      videoUrl,
      thumbnail,
      platform,
      isActive,
      order,
      productId,
      isTrending,
      isFeatured,
      discountPct,
      placement: placementBody,
      caption,
      existingVideoUrl,
      existingThumbnail,
    } = req.body;

    const existing = await prisma.reel.findUnique({
      where: { id: Number(req.params.id) },
      select: { placement: true },
    });
    const placement =
      placementBody === "about"
        ? "about"
        : placementBody === "home"
          ? "home"
          : existing?.placement || "home";

    // Featured applies per placement
    if (isFeatured === "true" || isFeatured === true) {
      await prisma.reel.updateMany({
        where: {
          isFeatured: true,
          placement,
          id: { not: Number(req.params.id) },
        },
        data: { isFeatured: false },
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    
    // Handle video file upload or URL
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const uploadedUrl = await getVideoUrl(videoFile);
      updateData.url = uploadedUrl;
      updateData.videoUrl = uploadedUrl;
    } else if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl || url || null;
      updateData.url = videoUrl || url || null;
    } else if (url !== undefined) {
      updateData.url = url || null;
      updateData.videoUrl = url || null;
    } else if (existingVideoUrl !== undefined) {
      // Keep existing video if no new one provided
      updateData.url = existingVideoUrl || null;
      updateData.videoUrl = existingVideoUrl || null;
    }
    
    // Handle thumbnail file upload or URL
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];
      updateData.thumbnail = await getImageUrl(thumbnailFile);
    } else if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail || null;
    } else if (existingThumbnail !== undefined) {
      // Keep existing thumbnail if no new one provided
      updateData.thumbnail = existingThumbnail || null;
    }
    
    if (platform !== undefined) updateData.platform = platform;
    if (productId !== undefined) updateData.productId = productId ? Number(productId) : null;
    if (isTrending !== undefined) updateData.isTrending = isTrending === "true" || isTrending === true;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === "true" || isFeatured === true;
    if (discountPct !== undefined) {
      updateData.discountPct = discountPct !== null && discountPct !== "" ? Number(discountPct) : null;
    }
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (order !== undefined) updateData.order = order !== null && order !== "" ? Number(order) : 0;
    if (placementBody === "about" || placementBody === "home") updateData.placement = placement;
    if (caption !== undefined) {
      updateData.caption =
        caption !== null && String(caption).trim() !== ""
          ? String(caption).trim().slice(0, 160)
          : null;
    }

    const reel = await prisma.reel.update({
      where: { id: Number(req.params.id) },
      data: updateData,
    });

    res.json(reel);
  } catch (error) {
    console.error("Update reel error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Increment view count (public)
router.post("/:id/view", async (req, res) => {
  try {
    const reel = await prisma.reel.update({
      where: { id: Number(req.params.id) },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
    res.json(reel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order for multiple reels (Admin only)
router.post("/reorder", requireRole("admin"), async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    invalidateCache("/reels");
    invalidateCache("/home");

    // Update all reels in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.reel.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder reels error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reel (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    invalidateCache("/reels");
    invalidateCache("/home");

    await prisma.reel.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Reel deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
