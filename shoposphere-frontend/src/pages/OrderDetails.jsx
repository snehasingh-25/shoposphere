import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import { API } from "../api";

const STEPS = ["Processing", "Confirmed", "Out for Delivery", "Delivered"];

function stepIndex(status) {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled") return -1;
  if (["pending", "processing"].includes(s)) return 0;
  if (s === "confirmed") return 1;
  if (["shipped", "out_for_delivery"].includes(s)) return 2;
  if (s === "delivered") return 3;
  return 0;
}

function StatusBadge({ status }) {
  const config = {
    Processing: { bg: "var(--muted)", color: "var(--foreground)" },
    Confirmed: { bg: "var(--primary)", color: "var(--primary-foreground)" },
    "Out for Delivery": { bg: "var(--accent)", color: "var(--foreground)" },
    Delivered: { bg: "var(--success)", color: "white" },
    Cancelled: { bg: "var(--destructive)", color: "white" },
    Paid: { bg: "var(--success)", color: "white" },
    Pending: { bg: "var(--muted)", color: "var(--foreground)" },
    COD: { bg: "var(--muted)", color: "var(--foreground)" },
  };
  const c = config[status] || config.Processing;
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function OrderDetails() {
  const { id } = useParams();
  const { isAuthenticated, loading: authLoading } = useUserAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  const loadOrder = async () => {
    const res = await fetch(`${API}/orders/${id}`, { credentials: "include" });
    if (res.status === 401) {
      navigate("/login", { replace: true });
      return null;
    }
    if (res.status === 404) return null;
    return res.json();
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAuthenticated || !id) return;

    loadOrder()
      .then((data) => {
        setOrder(data);
      })
      .catch(() => {
        toast.error("Could not load order");
      })
      .finally(() => setLoading(false));
  }, [id, authLoading, isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (!order || order.carrierType !== "delhivery") return;
    const doneStatuses = new Set(["delivered"]);
    const current = String(order.status || "").toLowerCase();
    if (doneStatuses.has(current)) return;
    if (!order.delhiveryWaybill) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API}/orders/${id}/track`, { credentials: "include" });
        if (res.ok) {
          const trackData = await res.json();
          if (trackData.delhiveryStatus) {
            setOrder((prev) => prev ? { ...prev, delhiveryStatus: trackData.delhiveryStatus, delhiveryLastSyncedAt: trackData.delhiveryLastSyncedAt } : null);
          }
        }
      } catch {
        // Ignore silent poll errors.
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [order, id]);



  const handleReorder = async () => {
    if (!order?.items?.length || reordering) return;
    setReordering(true);
    let added = 0;
    for (const item of order.items) {
      try {
        const productRes = await fetch(`${API}/products/${item.productId}`);
        if (!productRes.ok) continue;
        const product = await productRes.json();
        const sizes = product.sizes || [];
        const size = sizes[0] ? { id: sizes[0].id, label: sizes[0].label, price: sizes[0].price } : null;
        if (size && (await addToCart(product, size, item.quantity))) added += 1;
      } catch {
        // Skip product if fetch or add fails
      }
    }
    setReordering(false);
    if (added > 0) {
      toast.success(`Added ${added} item(s) to cart`);
      navigate("/cart");
    } else {
      toast.error("Could not add items to cart");
    }
  };

  if (authLoading || (isAuthenticated && loading && !order)) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "var(--muted)" }} />
          <div className="rounded-xl border p-6 animate-pulse h-64" style={{ borderColor: "var(--border)", background: "var(--muted)" }} />
          <div className="rounded-xl border p-6 animate-pulse h-48" style={{ borderColor: "var(--border)", background: "var(--muted)" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!order) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <p className="text-lg font-medium mb-4" style={{ color: "var(--foreground)" }}>Order not found</p>
          <Link to="/profile/orders" className="underline" style={{ color: "var(--primary)" }}>Back to My Orders</Link>
        </div>
      </div>
    );
  }

  const currentStep = stepIndex(order.status);
  const isCancelled = String(order.status).toLowerCase() === "cancelled";

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto">
        <Link to="/profile/orders" className="inline-flex items-center gap-1 text-sm font-medium mb-6" style={{ color: "var(--primary)" }}>
          ← Back to My Orders
        </Link>

        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold font-display" style={{ color: "var(--foreground)" }}>
              Order #{order.id}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.paymentStatus} />
            <StatusBadge status={order.orderStatus} />
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="rounded-xl border p-6 mb-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-6" style={{ color: "var(--foreground)" }}>
              Order status
            </h2>
            <div className="flex justify-between relative pt-1">
              <div className="absolute top-5 left-0 right-0 h-0.5" style={{ background: "var(--border)" }} />
              <div
                className="absolute top-5 left-0 h-0.5 transition-all duration-500"
                style={{
                  width: `${(currentStep / Math.max(STEPS.length - 1, 1)) * 100}%`,
                  background: "var(--primary)",
                }}
              />
              {STEPS.map((label, idx) => {
                const done = currentStep > idx;
                const active = currentStep === idx;
                return (
                  <div key={label} className="flex flex-col items-center relative z-10">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: done || active ? "var(--primary)" : "var(--border)",
                        background: done ? "var(--primary)" : "var(--background)",
                        color: done ? "var(--primary-foreground)" : active ? "var(--primary)" : "var(--muted)",
                      }}
                    >
                      {(done || active) ? "✓" : idx + 1}
                    </div>
                    <span className="text-xs font-medium mt-2 text-center" style={{ color: active || done ? "var(--foreground)" : "var(--muted)" }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="rounded-xl border p-4 mb-8" style={{ borderColor: "var(--destructive)", background: "var(--secondary)" }}>
            <p className="font-medium" style={{ color: "var(--destructive)" }}>This order has been cancelled.</p>
          </div>
        )}

        {/* Delivery ETA */}
        {order.estimatedDeliveryMinutes != null && (
          <div className="rounded-xl p-5 mb-8" style={{ background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  Estimated delivery: ~{order.estimatedDeliveryMinutes} mins
                </p>
                {order.nearestShopName && (
                  <p className="text-xs text-white/70 mt-1">
                    Shipping from {order.nearestShopName}{order.distanceKm != null ? ` (${order.distanceKm.toFixed(1)} km away)` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>Delivery address</h2>
          <p className="font-medium" style={{ color: "var(--foreground)" }}>{order.customer}</p>
          {order.phone && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{order.phone}</p>}
          {order.email && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{order.email}</p>}
          <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>{order.address}</p>
        </div>

        {order.carrierType === "delhivery" && (
          <div className="rounded-xl border p-6 mb-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>Shipment tracking</h2>
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              Carrier: <span className="font-medium">Delhivery</span>
            </p>
            {order.delhiveryWaybill && (
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                Waybill: <span className="font-mono">{order.delhiveryWaybill}</span>
              </p>
            )}
            {order.delhiveryTrackingId && (
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                Tracking ID: <span className="font-mono">{order.delhiveryTrackingId}</span>
              </p>
            )}
            {order.delhiveryStatus && (
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                Latest carrier status: <span className="font-medium">{String(order.delhiveryStatus).replace(/_/g, " ")}</span>
              </p>
            )}
            {order.delhiveryLastSyncedAt && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Last synced: {formatDate(order.delhiveryLastSyncedAt)}
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>Items</h2>
          <ul className="space-y-4">
            {order.items?.map((item, idx) => (
              <li key={idx} className="flex gap-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <div className="w-16 h-16 rounded-lg shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "var(--muted)" }}>
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-xs" style={{ color: "var(--foreground)" }}>—</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" style={{ color: "var(--foreground)" }}>{item.name}</p>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>{item.sizeLabel} × {item.quantity}</p>
                </div>
                <p className="font-semibold" style={{ color: "var(--primary)" }}>₹{Number(item.subtotal).toFixed(2)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            <span>Total</span>
            <span style={{ color: "var(--primary)" }}>₹{Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment details */}
        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--foreground)" }}>Payment</h2>
          <p style={{ color: "var(--foreground)" }}>{order.paymentStatus} {order.paymentMethod === "cod" ? "(Cash on Delivery)" : ""}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4">
          {!isCancelled && order.items?.length > 0 && (
            <button
              type="button"
              disabled={reordering}
              onClick={handleReorder}
              className="px-6 py-3 rounded-xl font-semibold transition-all border-2"
              style={{ borderColor: "var(--primary)", color: "var(--primary)", borderRadius: "var(--radius-lg)" }}
            >
              {reordering ? "Adding…" : "Reorder"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
