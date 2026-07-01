import express from "express";
import prisma from "../prisma.js";
import { requireRole, optionalCustomerAuth } from "../utils/auth.js";
import { getCartItemsForOrder } from "./cart.js";

const router = express.Router();

// ─── Shared validation helper ────────────────────────────────────────────────

/**
 * Validates a coupon code against the current cart and user context.
 * Returns { valid, discountAmount, coupon, message }.
 * This is also exported so orders.js / payments.js can re-validate server-side.
 */
export async function validateCouponForSession(code, sessionId, userId) {
  if (!code || typeof code !== "string") {
    return { valid: false, message: "Coupon code is required" };
  }

  const normalizedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon) return { valid: false, message: "Coupon code not found" };
  if (!coupon.isActive) return { valid: false, message: "This coupon is no longer active" };

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, message: "This coupon is not yet valid" };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, message: "This coupon has expired" };
  }
  if (coupon.globalLimit != null && coupon.usedCount >= coupon.globalLimit) {
    return { valid: false, message: "This coupon has reached its usage limit" };
  }

  // Get cart items
  const items = sessionId ? (await getCartItemsForOrder(sessionId)) ?? [] : [];
  const subtotal = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);

  if (coupon.minOrderValue != null && subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value of ₹${coupon.minOrderValue.toFixed(0)} required`,
    };
  }

  // Product/category restrictions
  if (coupon.productIds) {
    try {
      const allowed = JSON.parse(coupon.productIds);
      if (Array.isArray(allowed) && allowed.length > 0) {
        const cartProductIds = items.map((i) => i.productId);
        const hasMatch = cartProductIds.some((id) => allowed.includes(id));
        if (!hasMatch) {
          return { valid: false, message: "This coupon is not valid for the items in your cart" };
        }
      }
    } catch {}
  }

  if (coupon.categoryIds) {
    try {
      const allowed = JSON.parse(coupon.categoryIds);
      if (Array.isArray(allowed) && allowed.length > 0) {
        const productIds = items.map((i) => i.productId);
        const productCategories = await prisma.productCategory.findMany({
          where: { productId: { in: productIds }, categoryId: { in: allowed } },
          select: { productId: true },
        });
        if (productCategories.length === 0) {
          return { valid: false, message: "This coupon is not valid for the categories in your cart" };
        }
      }
    } catch {}
  }

  // User-specific coupon
  if (coupon.userId != null) {
    if (!userId) return { valid: false, message: "Please log in to use this coupon" };
    if (coupon.userId !== userId) return { valid: false, message: "This coupon is not valid for your account" };
  }

  // First-order check
  if (coupon.isFirstOrder) {
    if (!userId) return { valid: false, message: "Please log in to use this first-order coupon" };
    const orderCount = await prisma.order.count({ where: { userId } });
    if (orderCount > 0) return { valid: false, message: "This coupon is only valid on your first order" };
  }

  // Per-user usage limit
  if (coupon.perUserLimit != null && userId) {
    const userUsages = await prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsages >= coupon.perUserLimit) {
      return { valid: false, message: "You have already used this coupon the maximum number of times" };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === "fixed") {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  } else if (coupon.type === "percentage") {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    return { valid: false, message: "Invalid coupon configuration" };
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    discountAmount,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount ?? null,
      minOrderValue: coupon.minOrderValue ?? null,
    },
  };
}

// ─── Public routes (mounted at /coupons) ─────────────────────────────────────

/** GET /coupons/public — Active non-user-specific coupons for display */
router.get("/public", async (req, res) => {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        userId: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        type: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
        expiresAt: true,
      },
    });
    res.json(coupons);
  } catch (error) {
    console.error("Public coupons GET error:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

/** GET /coupons/applicable — Coupons eligible or near-eligible for the current cart */
router.get("/applicable", optionalCustomerAuth, async (req, res) => {
  try {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : null;
    const userId = req.customerUserId || null;

    const items = sessionId ? (await getCartItemsForOrder(sessionId)) ?? [] : [];
    const cartSubtotal = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);

    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          userId
            ? { OR: [{ userId: null }, { userId }] }
            : { userId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        type: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
      },
    });

    const results = [];
    for (const c of coupons) {
      try {
        const result = await validateCouponForSession(c.code, sessionId, userId);
        const entry = {
          id: c.id,
          code: c.code,
          type: c.type,
          discountValue: c.discountValue,
          maxDiscount: c.maxDiscount,
          minOrderValue: c.minOrderValue,
          eligible: result.valid,
          discountAmount: result.valid ? result.discountAmount : 0,
          message: result.valid ? null : result.message,
          amountNeeded: null,
        };
        if (!result.valid && c.minOrderValue != null && cartSubtotal < c.minOrderValue) {
          entry.amountNeeded = Math.round((c.minOrderValue - cartSubtotal) * 100) / 100;
        }
        results.push(entry);
      } catch (err) {
        console.error(`Applicable coupon check failed for ${c.code}:`, err);
      }
    }

    results.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (a.eligible && b.eligible) return b.discountAmount - a.discountAmount;
      if (a.amountNeeded != null && b.amountNeeded != null) return a.amountNeeded - b.amountNeeded;
      return 0;
    });

    res.json({ cartSubtotal, coupons: results });
  } catch (error) {
    console.error("Applicable coupons GET error:", error);
    res.status(500).json({ error: "Failed to fetch applicable coupons" });
  }
});

/** POST /coupons/validate — Validate a coupon against the current cart */
router.post("/validate", optionalCustomerAuth, async (req, res) => {
  try {
    const { code, sessionId } = req.body || {};
    const userId = req.customerUserId || null;
    const result = await validateCouponForSession(code, sessionId, userId);
    if (!result.valid) {
      return res.status(400).json({ valid: false, message: result.message });
    }
    res.json(result);
  } catch (error) {
    console.error("Coupon validate error:", error);
    res.status(500).json({ valid: false, message: "Validation failed" });
  }
});

// ─── Admin routes (mounted at /admin/coupons) ─────────────────────────────────

/** GET /admin/coupons — List all coupons */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(coupons);
  } catch (error) {
    console.error("Admin coupons GET error:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

/** POST /admin/coupons — Create a coupon */
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const {
      code, type, discountValue, maxDiscount, minOrderValue,
      isActive, isFirstOrder, perUserLimit, globalLimit, stackable,
      userId, productIds, categoryIds, startsAt, expiresAt,
    } = req.body || {};

    if (!code?.trim()) return res.status(400).json({ error: "code is required" });
    if (!["fixed", "percentage"].includes(type)) return res.status(400).json({ error: "type must be fixed or percentage" });
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: "discountValue must be > 0" });
    if (type === "percentage" && value > 100) return res.status(400).json({ error: "percentage cannot exceed 100" });

    const upperCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: upperCode } });
    if (existing) return res.status(409).json({ error: "Coupon code already exists" });

    const coupon = await prisma.coupon.create({
      data: {
        code: upperCode,
        type,
        discountValue: value,
        maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
        minOrderValue: minOrderValue != null ? Number(minOrderValue) : null,
        isActive: isActive !== false,
        isFirstOrder: Boolean(isFirstOrder),
        perUserLimit: perUserLimit != null ? Number(perUserLimit) : null,
        globalLimit: globalLimit != null ? Number(globalLimit) : null,
        stackable: Boolean(stackable),
        userId: userId != null ? Number(userId) : null,
        productIds: productIds ? JSON.stringify(productIds) : null,
        categoryIds: categoryIds ? JSON.stringify(categoryIds) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    console.error("Admin coupon POST error:", error);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

/** PUT /admin/coupons/:id — Update a coupon */
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const {
      code, type, discountValue, maxDiscount, minOrderValue,
      isActive, isFirstOrder, perUserLimit, globalLimit, stackable,
      userId, productIds, categoryIds, startsAt, expiresAt,
    } = req.body || {};

    const updates = {};
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (type !== undefined) {
      if (!["fixed", "percentage"].includes(type)) return res.status(400).json({ error: "Invalid type" });
      updates.type = type;
    }
    if (discountValue !== undefined) updates.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) updates.maxDiscount = maxDiscount != null ? Number(maxDiscount) : null;
    if (minOrderValue !== undefined) updates.minOrderValue = minOrderValue != null ? Number(minOrderValue) : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isFirstOrder !== undefined) updates.isFirstOrder = Boolean(isFirstOrder);
    if (perUserLimit !== undefined) updates.perUserLimit = perUserLimit != null ? Number(perUserLimit) : null;
    if (globalLimit !== undefined) updates.globalLimit = globalLimit != null ? Number(globalLimit) : null;
    if (stackable !== undefined) updates.stackable = Boolean(stackable);
    if (userId !== undefined) updates.userId = userId != null ? Number(userId) : null;
    if (productIds !== undefined) updates.productIds = productIds ? JSON.stringify(productIds) : null;
    if (categoryIds !== undefined) updates.categoryIds = categoryIds ? JSON.stringify(categoryIds) : null;
    if (startsAt !== undefined) updates.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const coupon = await prisma.coupon.update({ where: { id }, data: updates });
    res.json(coupon);
  } catch (error) {
    console.error("Admin coupon PUT error:", error);
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

/** DELETE /admin/coupons/:id — Delete a coupon */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    await prisma.coupon.delete({ where: { id } });
    res.json({ message: "Coupon deleted" });
  } catch (error) {
    console.error("Admin coupon DELETE error:", error);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

/** GET /admin/coupons/:id/usages — Usage log for a coupon */
router.get("/:id/usages", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const usages = await prisma.couponUsage.findMany({
      where: { couponId: id },
      orderBy: { usedAt: "desc" },
      include: {
        coupon: { select: { code: true } },
      },
    });
    res.json(usages);
  } catch (error) {
    console.error("Admin coupon usages GET error:", error);
    res.status(500).json({ error: "Failed to fetch usages" });
  }
});

export default router;
