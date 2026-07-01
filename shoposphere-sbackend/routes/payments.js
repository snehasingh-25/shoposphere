import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";
import { optionalCustomerAuth } from "../utils/auth.js";
import { validateStockForItems, deductStockForOrder } from "../utils/stock.js";
import { calculateDeliveryCharges, getEstimatedDeliveryForOrder } from "./delivery.js";
import { validateCouponForSession } from "./coupons.js";

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const CART_SESSION_HEADER = "x-cart-session-id";
const CURRENCY = "INR";
const COD_ADVANCE_AMOUNT = 199;
const COD_VERIFICATION_FEE = 40;

function getSessionId(req) {
  return req.headers[CART_SESSION_HEADER]?.trim() || req.body?.sessionId?.trim() || null;
}

function getPaymentMethod(req) {
  return String(req.body?.paymentMethod || "online").trim().toLowerCase() === "cod" ? "cod" : "online";
}

function calculatePaymentBreakdown(subtotal, deliveryFee, paymentMethod, discountAmount = 0) {
  const codFee = paymentMethod === "cod" ? COD_VERIFICATION_FEE : 0;
  const prepaidDiscount = paymentMethod === "online" ? COD_VERIFICATION_FEE : 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee + codFee - prepaidDiscount);
  const advancePaidNow = paymentMethod === "cod" ? Math.min(COD_ADVANCE_AMOUNT, total) : total;
  const remainingCodAmount = paymentMethod === "cod" ? Math.max(total - advancePaidNow, 0) : 0;

  return {
    codFee,
    prepaidDiscount,
    total,
    advancePaidNow,
    remainingCodAmount,
    amountToPay: paymentMethod === "cod" ? advancePaidNow : total,
  };
}

/** GET /payments/config — return Razorpay key_id for frontend checkout (public, safe to expose) */
router.get("/config", (req, res) => {
  res.json({ razorpayKeyId: RAZORPAY_KEY_ID || "" });
});


//creating a new razor pay instance 
function getRazorpayInstance() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys not configured");
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

/**
 * POST /payments/create-order
 * Body: { sessionId?, couponCode?, paymentMethod? }
 * Validates cart server-side, applies coupon discount, creates Razorpay order.
 */
router.post("/create-order", optionalCustomerAuth, async (req, res) => {
  try {
    const sessionId = getSessionId(req) || req.body?.sessionId;
    if (!sessionId?.trim()) {
      return res.status(400).json({ error: "Cart session required" });
    }

    const items = await getCartItemsForOrder(sessionId.trim());
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const stockCheck = await validateStockForItems(items);
    if (!stockCheck.ok) {
      return res.status(400).json({ error: stockCheck.error || "Insufficient stock" });
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const { deliveryFee } = await calculateDeliveryCharges(subtotal);
    const paymentMethod = getPaymentMethod(req);
    const userId = req.customerUserId || null;

    // Coupon
    const couponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode.trim() : null;
    let discountAmount = 0;
    if (couponCode) {
      const couponResult = await validateCouponForSession(couponCode, sessionId.trim(), userId);
      if (!couponResult.valid) {
        return res.status(400).json({ error: `Coupon invalid: ${couponResult.message}` });
      }
      discountAmount = couponResult.discountAmount;
    }

    const paymentBreakdown = calculatePaymentBreakdown(subtotal, deliveryFee, paymentMethod, discountAmount);
    if (paymentBreakdown.total <= 0) {
      return res.status(400).json({ error: "Invalid cart total" });
    }

    const amountInPaise = Math.round(paymentBreakdown.amountToPay * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Minimum payment amount is 100 paise" });
    }
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (e) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: CURRENCY,
      receipt: `shoposphere_${Date.now()}_${sessionId.slice(0, 8)}`,
    });

    res.json({
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: order.currency || CURRENCY,
      subtotal,
      deliveryFee,
      discountAmount,
      codFee: paymentBreakdown.codFee,
      prepaidDiscount: paymentBreakdown.prepaidDiscount,
      advancePaidNow: paymentBreakdown.advancePaidNow,
      remainingCodAmount: paymentBreakdown.remainingCodAmount,
      total: paymentBreakdown.total,
      paymentMethod,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message || "Failed to create payment order" });
  }
});


/**
 * Verify Razorpay signature: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!RAZORPAY_KEY_SECRET) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");
  return expected === signature;
}

/**
 * POST /payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, checkoutData: { sessionId, customerDetails, deliverySlotId? } }
 * Verifies signature, then creates Order + OrderItems with delivery fee/ETA/slot. Idempotent by razorpay_payment_id.
 */
router.post("/verify", optionalCustomerAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      checkoutData,
    } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "Missing payment verification fields" });
    }

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const sessionId = checkoutData?.sessionId?.trim();
    const customerDetails = checkoutData?.customerDetails;
    const paymentMethod = String(checkoutData?.paymentMethod || "online").trim().toLowerCase() === "cod" ? "cod" : "online";
    const couponCode = typeof checkoutData?.couponCode === "string" ? checkoutData.couponCode.trim() : null;
    if (!sessionId || !customerDetails || typeof customerDetails !== "object") {
      return res.status(400).json({ error: "checkoutData.sessionId and checkoutData.customerDetails required" });
    }

    const { name, phone, address, city, state, pincode, email, latitude, longitude } = customerDetails;
    if (!name?.trim() || !phone?.trim() || !address?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
      return res.status(400).json({ error: "Invalid customer details" });
    }
    const addressLat = latitude != null && Number.isFinite(Number(latitude)) ? Number(latitude) : null;
    const addressLng = longitude != null && Number.isFinite(Number(longitude)) ? Number(longitude) : null;

    const existingOrder = await prisma.order.findUnique({
      where: { razorpayPaymentId },
    });
    if (existingOrder) {
      return res.json({ orderId: existingOrder.id, success: true });
    }

    const items = await getCartItemsForOrder(sessionId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty or expired" });
    }

    const stockCheck = await validateStockForItems(items);
    if (!stockCheck.ok) {
      return res.status(400).json({ error: stockCheck.error || "Insufficient stock" });
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const { deliveryFee } = await calculateDeliveryCharges(subtotal);
    const userId = req.customerUserId || null;

    // Coupon re-validation
    let discountAmount = 0;
    let validatedCouponId = null;
    if (couponCode) {
      const couponResult = await validateCouponForSession(couponCode, sessionId, userId);
      if (!couponResult.valid) {
        return res.status(400).json({ error: `Coupon invalid: ${couponResult.message}` });
      }
      discountAmount = couponResult.discountAmount;
      validatedCouponId = couponResult.coupon.id;
    }

    const paymentBreakdown = calculatePaymentBreakdown(subtotal, deliveryFee, paymentMethod, discountAmount);

    const estimatedDeliveryDate = await getEstimatedDeliveryForOrder();

    const addressLine = [address.trim(), city.trim(), state.trim(), pincode.trim()].filter(Boolean).join(", ");
    const carrierType = "delhivery";

    const notesFromCheckout =
      (typeof checkoutData?.notes === "string" && checkoutData.notes.trim()) ||
      (typeof customerDetails?.notes === "string" && customerDetails.notes.trim()) ||
      null;

    const order = await prisma.$transaction(async (tx) => {
      await deductStockForOrder(tx, items);
      const newOrder = await tx.order.create({
        data: {
          customer: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          address: addressLine,
          addressCity: city.trim(),
          addressState: state.trim(),
          addressPincode: pincode.trim(),
          addressLatitude: addressLat,
          addressLongitude: addressLng,
          total: paymentBreakdown.total,
          status: "confirmed",
          carrierType,
          paymentMethod,
          razorpayOrderId,
          razorpayPaymentId,
          userId,
          deliveryFee,
          couponCode: couponCode || null,
          discountAmount,
          codFee: paymentBreakdown.codFee,
          codAdvancePaid: paymentBreakdown.advancePaidNow,
          codRemainingAmount: paymentBreakdown.remainingCodAmount,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
          notes: notesFromCheckout,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              productName: item.productName,
              colorName: item.colorName ?? null,
              sizeLabel: item.sizeLabel,
              quantity: item.quantity,
              price: Number(item.price),
              subtotal: Number(item.subtotal),
              isCustomized: Boolean(item.customName || item.customMessage || item.customImageUrl),
              customName: item.customName ?? null,
              customMessage: item.customMessage ?? null,
              customImageUrl: item.customImageUrl ?? null,
            })),
          },
        },
      });
      // Record coupon usage
      if (validatedCouponId && discountAmount > 0) {
        await tx.couponUsage.create({
          data: { couponId: validatedCouponId, userId, orderId: newOrder.id, discountAmount },
        });
        await tx.coupon.update({
          where: { id: validatedCouponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (cart?.items?.length) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.json({ orderId: order.id, success: true });
  } catch (error) {
    console.error("Payment verify error:", error);
    res.status(500).json({ error: error.message || "Payment verification failed" });
  }
});

export default router;
