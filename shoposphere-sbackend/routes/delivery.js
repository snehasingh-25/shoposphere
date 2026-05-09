import express from "express";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";
import { haversineKm } from "../utils/distance.js";
import { publicBrowseRateLimiter, formSubmissionRateLimiter } from "../utils/rateLimit.js";
import { checkPincodeServiceability } from "../utils/delhiveryClient.js";

const router = express.Router();
const CART_SESSION_HEADER = "x-cart-session-id";

function getSessionId(req) {
  return req.headers[CART_SESSION_HEADER]?.trim() || req.query?.sessionId?.trim() || req.body?.sessionId?.trim() || null;
}

/** Get applicable delivery rule for a cart total (highest minimumOrderAmount that is <= cartTotal) */
async function getDeliveryRuleForTotal(cartTotal) {
  const rules = await prisma.deliveryRule.findMany({
    where: { minimumOrderAmount: { lte: cartTotal } },
    orderBy: { minimumOrderAmount: "desc" },
    take: 1,
  });
  return rules[0] || null;
}

/** Calculate delivery fee server-side. Returns { deliveryFee, isFreeDelivery } */
async function calculateDeliveryCharges(cartTotal) {
  if (cartTotal <= 0) {
    return { deliveryFee: 0, isFreeDelivery: true };
  }
  const rule = await getDeliveryRuleForTotal(cartTotal);
  if (!rule) {
    return { deliveryFee: 0, isFreeDelivery: false };
  }
  const freeThreshold = rule.freeDeliveryThreshold ?? Infinity;
  const isFreeDelivery = cartTotal >= freeThreshold;
  const deliveryFee = isFreeDelivery ? 0 : Number(rule.deliveryFee ?? 0);
  return { deliveryFee: Math.max(0, deliveryFee), isFreeDelivery };
}

/**
 * GET /delivery/charges
 * Query: sessionId (optional if X-Cart-Session-Id header set)
 * Backend computes cart total from session and returns delivery fee.
 */
router.get("/charges", publicBrowseRateLimiter, async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    let cartTotal = 0;
    if (sessionId) {
      const items = await getCartItemsForOrder(sessionId);
      if (items?.length) {
        cartTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      }
    }
    const result = await calculateDeliveryCharges(cartTotal);
    res.json(result);
  } catch (error) {
    console.error("Delivery charges error:", error);
    res.status(500).json({ error: error.message || "Failed to get delivery charges" });
  }
});

/** Same-day cutoff hour (e.g. 14 = 2 PM); after this, ETA is next day */
const SAME_DAY_CUTOFF_HOUR = 14;

function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatDateForETA(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);
  if (d.getTime() === today.getTime()) return "Delivered Today";
  if (d.getTime() === tomorrow.getTime()) return "Delivered by Tomorrow";
  return `Delivered by ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
}

/**
 * GET /delivery/eta
 * Query: slotId (optional), date (optional YYYY-MM-DD), orderTime (optional ISO string)
 * Returns estimatedDeliveryDate and estimatedDeliveryText.
 */
router.get("/eta", publicBrowseRateLimiter, async (req, res) => {
  try {
    const { slotId, date: slotDateParam, orderTime: orderTimeParam } = req.query || {};
    const orderTime = orderTimeParam ? new Date(orderTimeParam) : new Date();

    if (slotId) {
      const slotIdNum = Number(slotId);
      if (!Number.isInteger(slotIdNum)) {
        return res.status(400).json({ error: "Invalid slotId" });
      }
      const slot = await prisma.deliverySlot.findFirst({
        where: { id: slotIdNum, isActive: true },
      });
      if (!slot) {
        return res.status(404).json({ error: "Slot not found or inactive" });
      }
      const slotDate = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
      const estimatedDeliveryDate = slotDate.toISOString().slice(0, 10);
      res.json({
        estimatedDeliveryDate,
        estimatedDeliveryText: formatDateForETA(slotDate),
      });
      return;
    }

    if (slotDateParam) {
      const d = new Date(slotDateParam);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      const estimatedDeliveryDate = d.toISOString().slice(0, 10);
      res.json({
        estimatedDeliveryDate,
        estimatedDeliveryText: formatDateForETA(d),
      });
      return;
    }

    // Default ETA: same day if before cutoff, else next day
    const now = orderTime;
    const cutoff = new Date(now);
    cutoff.setHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
    const estimatedDate = now <= cutoff ? new Date(now) : addDays(now, 1);
    estimatedDate.setHours(0, 0, 0, 0);
    const estimatedDeliveryDate = estimatedDate.toISOString().slice(0, 10);

    res.json({
      estimatedDeliveryDate,
      estimatedDeliveryText: formatDateForETA(estimatedDate),
    });
  } catch (error) {
    console.error("Delivery ETA error:", error);
    res.status(500).json({ error: error.message || "Failed to get ETA" });
  }
});


/** Resolve estimated delivery date for order using default ETA. */
export async function getEstimatedDeliveryForOrder(orderTime = new Date()) {
  const cutoff = new Date(orderTime);
  // Keep cutoff logic consistent with the server's date boundaries.
  // We still format the resulting date as UTC date-only to avoid +/-1 day issues.
  cutoff.setUTCHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
  const estimatedDate = orderTime <= cutoff ? new Date(orderTime) : addDays(orderTime, 1);
  estimatedDate.setUTCHours(0, 0, 0, 0);
  return estimatedDate.toISOString().slice(0, 10);
}


/**
 * GET /delivery/check-pincode/:pincode — check if Delhivery services this pincode
 */
router.get("/check-pincode/:pincode", publicBrowseRateLimiter, async (req, res) => {
  const pincode = req.params.pincode;
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: "Invalid pincode" });
  }
  try {
    const result = await checkPincodeServiceability(pincode);
    res.json(result);
  } catch (e) {
    console.error("Pincode serviceability check error:", e.message);
    // Fail open — don't block checkout if Delhivery API is down
    res.json({ serviceable: true, prepaid: true, cod: true, fallback: true });
  }
});

export default router;
export { calculateDeliveryCharges, getDeliveryRuleForTotal };
