import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { createShipment, extractShipmentMeta } from "../utils/delhiveryClient.js";
import { isDelhiveryConfigured } from "../utils/delhiveryConfig.js";

const router = express.Router();

const STATUS_VALUES = ["processing", "confirmed", "shipped", "out_for_delivery", "delivered"];

/** Allowed next status from current (logical flow). */
const ALLOWED_TRANSITIONS = {
  pending: ["processing", "confirmed"],
  processing: ["confirmed"],
  confirmed: ["shipped"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
};

function normalizeStatus(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "out_for_delivery" || v === "out for delivery") return "out_for_delivery";
  if (STATUS_VALUES.includes(v)) return v;
  if (v === "pending") return "processing";
  return null;
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

/** GET /admin/orders — all orders, newest first (admin only) */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
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
      customerDetails: {
        name: order.customer,
        phone: order.phone,
        email: order.email,
        address: order.address,
      },
      carrierType: order.carrierType,
      delhiveryWaybill: order.delhiveryWaybill,
      delhiveryTrackingId: order.delhiveryTrackingId,
      delhiveryStatus: order.delhiveryStatus,
      totalAmount: order.total,
      paymentStatus: paymentStatus(order),
      orderStatus: orderStatusDisplay(order.status),
      status: order.status,
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
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
    }));
    res.json(list);
  } catch (error) {
    console.error("Admin orders list error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
});

/** GET /admin/orders/:id — full order details (admin only) */
router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerDetails: {
        name: order.customer,
        phone: order.phone,
        email: order.email,
        address: order.address,
      },
      carrierType: order.carrierType,
      delhiveryOrderId: order.delhiveryOrderId,
      delhiveryWaybill: order.delhiveryWaybill,
      delhiveryTrackingId: order.delhiveryTrackingId,
      delhiveryLabelUrl: order.delhiveryLabelUrl,
      delhiveryStatus: order.delhiveryStatus,
      delhiveryLastSyncedAt: order.delhiveryLastSyncedAt,
      totalAmount: order.total,
      paymentStatus: paymentStatus(order),
      orderStatus: orderStatusDisplay(order.status),
      status: order.status,
      paymentMethod: order.paymentMethod,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      notes: order.notes,
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
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
    console.error("Admin order detail error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch order" });
  }
});

/** PUT /admin/orders/update-status/:id — validate transition and update (admin only) */
router.put("/update-status/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rawStatus = req.body?.orderStatus ?? req.body?.status;
    const newStatus = normalizeStatus(rawStatus);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    if (!newStatus) return res.status(400).json({ error: "Valid orderStatus required" });

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const current = String(order.status).toLowerCase().replace(/\s+/g, "_");
    const allowed = ALLOWED_TRANSITIONS[current] || ALLOWED_TRANSITIONS.pending || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Cannot change status from ${orderStatusDisplay(order.status)} to ${orderStatusDisplay(newStatus)}`,
        allowedNext: allowed.map(orderStatusDisplay),
      });
    }

    const shouldCreateShipment =
      newStatus === "shipped" &&
      !order.delhiveryWaybill;

    if (shouldCreateShipment) {
      if (!isDelhiveryConfigured()) {
        return res.status(400).json({
          error: "Delhivery configuration is incomplete. Please set API token, client name, and pickup location.",
        });
      }
      const shipmentResponse = await createShipment(order);
      const meta = extractShipmentMeta(shipmentResponse);
      await prisma.order.update({
        where: { id },
        data: {
          delhiveryOrderId: meta.delhiveryOrderId,
          delhiveryWaybill: meta.delhiveryWaybill,
          delhiveryTrackingId: meta.delhiveryTrackingId,
          delhiveryLabelUrl: meta.delhiveryLabelUrl,
          delhiveryStatus: "manifested",
          delhiveryStatusRaw: JSON.stringify(shipmentResponse),
          delhiveryLastSyncedAt: new Date(),
        },
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    res.json({
      id: updated.id,
      status: updated.status,
      orderStatus: orderStatusDisplay(updated.status),
      carrierType: updated.carrierType,
      delhiveryOrderId: updated.delhiveryOrderId,
      delhiveryWaybill: updated.delhiveryWaybill,
      delhiveryTrackingId: updated.delhiveryTrackingId,
      delhiveryLabelUrl: updated.delhiveryLabelUrl,
      delhiveryStatus: updated.delhiveryStatus,
      delhiveryLastSyncedAt: updated.delhiveryLastSyncedAt,
      customerDetails: {
        name: updated.customer,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
      },
      totalAmount: updated.total,
      paymentStatus: paymentStatus(updated),
      items: (updated.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
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
    console.error("Admin update status error:", error);
    res.status(500).json({ error: error.message || "Failed to update order" });
  }
});

export default router;
