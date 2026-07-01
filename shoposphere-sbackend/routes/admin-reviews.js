import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import upload, { getImageUrl } from "../utils/upload.js";

const router = express.Router();

function parseReviewDate(raw, wasProvided) {
  if (!wasProvided) return new Date();
  if (typeof raw !== "string" || !raw.trim()) return new Date();
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function serializeManualReview(review, productName) {
  return {
    id: review.id,
    productId: review.productId,
    productName: productName ?? null,
    userId: null,
    userName: review.reviewerName,
    userEmail: null,
    rating: review.rating,
    comment: review.comment ?? "",
    isManual: true,
    reviewImage: review.reviewImage ?? null,
    createdAt: review.createdAt,
  };
}

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
 *  Body (multipart/form-data): { productId, rating, reviewerName, comment?, reviewImage?, reviewDate? }
 */
router.post("/", requireRole("admin"), upload.single("reviewImage"), async (req, res) => {
  try {
    const { productId: rawProductId, rating: rawRating, reviewerName, comment, reviewDate } = req.body || {};

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

    const reviewDateProvided = reviewDate !== undefined && reviewDate !== null && String(reviewDate).trim() !== "";
    const createdAt = parseReviewDate(reviewDate, reviewDateProvided);
    if (createdAt === null) {
      return res.status(400).json({ error: "Invalid reviewDate" });
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
        createdAt,
      },
    });

    res.status(201).json(serializeManualReview(review, product.name));
  } catch (error) {
    console.error("Admin manual review POST error:", error);
    res.status(500).json({ error: "Failed to create manual review" });
  }
});

/** PUT /admin/reviews/:id — Update a manual review (admin only).
 *  Body (multipart/form-data): { reviewerName, rating, comment?, reviewImage?, reviewDate?, removeReviewImage? }
 */
router.put("/:id", requireRole("admin"), upload.single("reviewImage"), async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    if (!reviewId || Number.isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (!existing.isManual) {
      return res.status(403).json({ error: "Only manual reviews can be edited here" });
    }

    const { rating: rawRating, reviewerName, comment, reviewDate, removeReviewImage } = req.body || {};

    const rating = typeof rawRating === "number" ? rawRating : parseInt(rawRating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const trimmedName = typeof reviewerName === "string" ? reviewerName.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({ error: "reviewerName is required" });
    }

    const updates = {
      rating,
      reviewerName: trimmedName,
      comment: typeof comment === "string" ? comment.trim() || null : null,
    };

    const reviewDateProvided = reviewDate !== undefined && reviewDate !== null && String(reviewDate).trim() !== "";
    if (reviewDateProvided) {
      const createdAt = parseReviewDate(reviewDate, true);
      if (createdAt === null) {
        return res.status(400).json({ error: "Invalid reviewDate" });
      }
      updates.createdAt = createdAt;
    }

    const shouldRemoveImage = String(removeReviewImage).toLowerCase() === "true";
    if (req.file) {
      updates.reviewImage = await getImageUrl(req.file);
    } else if (shouldRemoveImage) {
      updates.reviewImage = null;
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: updates,
    });

    res.json(serializeManualReview(review, existing.product?.name ?? null));
  } catch (error) {
    console.error("Admin manual review PUT error:", error);
    res.status(500).json({ error: "Failed to update manual review" });
  }
});

export default router;
