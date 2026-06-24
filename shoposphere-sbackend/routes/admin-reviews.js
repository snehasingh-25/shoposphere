import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import upload, { getImageUrl } from "../utils/upload.js";

const router = express.Router();

/** GET /admin/reviews — Fetch all reviews with product and user association (admin only). */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    res.json(
      reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product?.name ?? null,
        userId: r.userId,
        userName: r.isManual ? (r.reviewerName ?? "Manual Review") : (r.user?.name ?? null),
        userEmail: r.isManual ? null : (r.user?.email ?? null),
        rating: r.rating,
        comment: r.comment ?? "",
        isManual: r.isManual,
        reviewImage: r.reviewImage ?? null,
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    console.error("Admin reviews GET error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/** POST /admin/reviews — Create a manual review (admin only).
 *  Body (multipart/form-data): { productId, rating, reviewerName, comment?, reviewImage? }
 */
router.post("/", requireRole("admin"), upload.single("reviewImage"), async (req, res) => {
  try {
    const { productId: rawProductId, rating: rawRating, reviewerName, comment } = req.body || {};

    const productId = Number(rawProductId);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: "productId is required" });
    }

    const rating = typeof rawRating === "number" ? rawRating : parseInt(rawRating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const trimmedName = typeof reviewerName === "string" ? reviewerName.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({ error: "reviewerName is required" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let reviewImageUrl = null;
    if (req.file) {
      reviewImageUrl = await getImageUrl(req.file);
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: null,
        rating,
        comment: typeof comment === "string" ? comment.trim() || null : null,
        isManual: true,
        reviewerName: trimmedName,
        reviewImage: reviewImageUrl,
      },
    });

    res.status(201).json({
      id: review.id,
      productId: review.productId,
      productName: product.name,
      userId: null,
      userName: review.reviewerName,
      userEmail: null,
      rating: review.rating,
      comment: review.comment ?? "",
      isManual: true,
      reviewImage: review.reviewImage ?? null,
      createdAt: review.createdAt,
    });
  } catch (error) {
    console.error("Admin manual review POST error:", error);
    res.status(500).json({ error: "Failed to create manual review" });
  }
});

export default router;
