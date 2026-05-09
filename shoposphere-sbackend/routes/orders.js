import express from "express";
import { requireRole, requireCustomerAuth, optionalCustomerAuth } from "../utils/auth.js";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";
import { validateStockForItems, deductStockForOrder } from "../utils/stock.js";
import { calculateDeliveryCharges, getEstimatedDeliveryForOrder } from "./delivery.js";

import { formSubmissionRateLimiter, adminWriteRateLimiter } from "../utils/rateLimit.js";
import { trackShipmentByWaybill } from "../utils/delhiveryClient.js";

const router = express.Router();

function parseProductImage(product) {
  if (!product?.images) return null;
  try {
    const raw = product.images;
    const arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
    return arr.length ? arr[0] : null;
  } catch {
    return null;
  }
}


function paymentStatus(order) {
  if (order.paymentMethod === "cod") return "COD";
  if (order.razorpayPaymentId) return "Paid";
  return "Pending";
}

function orderStatusDisplay(status) {
  const map = {
    pending: "Processing",
    processing: "Processing",
    confirmed: "Confirmed",
    // UI should not show "Shipped"; treat it as the "Out for Delivery" stage.
    shipped: "Out for Delivery",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[String(status).toLowerCase()] || status;
}

// POST /orders/create — create order from cart (guest or logged-in)
// Body: { sessionId, customerDetails, paymentMethod?, deliverySlotId? }
// Delivery fee and ETA computed server-side; slot validated and booked.
router.post("/create", formSubmissionRateLimiter, optionalCustomerAuth, async (req, res) => {
  try {
    const { sessionId, customerDetails } = req.body || {};
    if (!sessionId || !customerDetails || typeof customerDetails !== "object") {
      return res.status(400).json({ error: "sessionId and customerDetails required" });
    }

    const { name, phone, address, city, state, pincode, email, latitude, longitude, notes: notesFromDetails } = customerDetails;
    if (!name?.trim()) return res.status(400).json({ error: "Full name is required" });
    if (!phone?.trim()) return res.status(400).json({ error: "Phone number is required" });
    if (!address?.trim()) return res.status(400).json({ error: "Address is required" });
    if (!city?.trim()) return res.status(400).json({ error: "City is required" });
    if (!state?.trim()) return res.status(400).json({ error: "State is required" });
    if (!pincode?.trim()) return res.status(400).json({ error: "Pincode is required" });

    const addressLat = latitude != null && Number.isFinite(Number(latitude)) ? Number(latitude) : null;
    const addressLng = longitude != null && Number.isFinite(Number(longitude)) ? Number(longitude) : null;

    const items = await getCartItemsForOrder(sessionId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const stockCheck = await validateStockForItems(items);
    if (!stockCheck.ok) {
      return res.status(400).json({ error: stockCheck.error || "Insufficient stock" });
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const { deliveryFee } = await calculateDeliveryCharges(subtotal);
    const total = Math.max(0, subtotal + deliveryFee);

    const estimatedDeliveryDate = await getEstimatedDeliveryForOrder();

    const addressLine = [address.trim(), city.trim(), state.trim(), pincode.trim()].filter(Boolean).join(", ");
    const paymentMethod = req.body.paymentMethod === "cod" ? "cod" : "online";
    const carrierType = "delhivery";
    const userId = req.customerUserId || null;
    const orderNotes =
      (typeof req.body.notes === "string" && req.body.notes.trim()) ||
      (typeof notesFromDetails === "string" && notesFromDetails.trim()) ||
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
          total,
          status: "pending",
          carrierType,
          paymentMethod,
          userId,
          deliveryFee,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
          notes: orderNotes,
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

      return newOrder;
    });

    res.json({
      orderId: order.id,
      success: true,
    });
  } catch (error) {
    console.error("Order create error:", error);
    res.status(400).json({ error: error.message || "Failed to create order" });
  }
});

// Create order (public) — legacy shape; keep for backwards compatibility
router.post("/", formSubmissionRateLimiter, async (req, res) => {
  try {
    const { customer, phone, email, address, items, notes } = req.body;

    if (!items?.length) return res.status(400).json({ error: "Items required" });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        customer,
        phone: phone || null,
        email: email || null,
        address: address || null,
        total,
        notes: notes || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/my-orders — authenticated user's orders (newest first)
router.get("/my-orders", requireCustomerAuth, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const list = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      totalAmount: order.total,
      deliveryFee: order.deliveryFee,
      estimatedDeliveryDate: order.estimatedDeliveryDate,

      paymentStatus: paymentStatus(order),
      orderStatus: orderStatusDisplay(order.status),
      carrierType: order.carrierType,
      delhiveryWaybill: order.delhiveryWaybill,
      delhiveryTrackingId: order.delhiveryTrackingId,
      delhiveryStatus: order.delhiveryStatus,
      delhiveryLabelUrl: order.delhiveryLabelUrl,
      delhiveryLastSyncedAt: order.delhiveryLastSyncedAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        sizeLabel: item.sizeLabel,
        image: parseProductImage(item.product),
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isCustomized: item.isCustomized,
        customName: item.customName,
        customMessage: item.customMessage,
        customImageUrl: item.customImageUrl,
      })),
    }));
    res.json(list);
  } catch (error) {
    console.error("My orders error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
});

// GET /orders/:id — single order (must own it)
router.get("/:id", requireCustomerAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    const userId = req.customerUserId;
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      email: order.email,
      address: order.address,
      total: order.total,
      deliveryFee: order.deliveryFee,
      estimatedDeliveryDate: order.estimatedDeliveryDate,

      status: order.status,
      orderStatus: orderStatusDisplay(order.status),
      paymentMethod: order.paymentMethod,
      paymentStatus: paymentStatus(order),
      carrierType: order.carrierType,
      delhiveryWaybill: order.delhiveryWaybill,
      delhiveryTrackingId: order.delhiveryTrackingId,
      delhiveryStatus: order.delhiveryStatus,
      delhiveryLabelUrl: order.delhiveryLabelUrl,
      delhiveryLastSyncedAt: order.delhiveryLastSyncedAt,
      razorpayOrderId: order.razorpayOrderId,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        image: parseProductImage(item.product),
        isCustomized: item.isCustomized,
        customName: item.customName,
        customMessage: item.customMessage,
        customImageUrl: item.customImageUrl,
      })),
    });
  } catch (error) {
    console.error("Order details error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch order" });
  }
});

// Get all orders (Admin only)
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/:id/track — poll Delhivery for latest tracking status
router.get("/:id/track", requireCustomerAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.customerUserId;
    const order = await prisma.order.findFirst({
      where: { id, userId },
      select: { id: true, delhiveryWaybill: true, delhiveryStatus: true, delhiveryLastSyncedAt: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!order.delhiveryWaybill) {
      return res.json({ delhiveryStatus: null, message: "Shipment not yet created" });
    }

    const trackingData = await trackShipmentByWaybill(order.delhiveryWaybill);
    const status = trackingData?.ShipmentData?.[0]?.Shipment?.Status?.Status || null;
    const normalized = status ? String(status).trim().toLowerCase().replace(/\s+/g, "_") : null;

    await prisma.order.update({
      where: { id },
      data: {
        delhiveryStatus: normalized,
        delhiveryStatusRaw: JSON.stringify(trackingData),
        delhiveryLastSyncedAt: new Date(),
      },
    });

    res.json({
      delhiveryStatus: normalized,
      delhiveryLastSyncedAt: new Date(),
    });
  } catch (e) {
    console.error("Tracking poll error:", e.message);
    res.status(500).json({ error: "Could not fetch tracking data" });
  }
});

// Update order status (Admin only)
router.patch("/:id/status", requireRole("admin"), adminWriteRateLimiter, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });



    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
