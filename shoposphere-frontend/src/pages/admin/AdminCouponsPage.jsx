import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import CouponForm from "../../components/admin/CouponForm";
import CouponList from "../../components/admin/CouponList";

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/coupons`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCoupons(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        toast.error("Session expired");
      }
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleSave = () => {
    setEditingCoupon(null);
    setShowForm(false);
    loadCoupons();
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingCoupon(null);
    setShowForm(false);
  };

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
          Coupons
        </h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setEditingCoupon(null); setShowForm(true); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + New Coupon
          </button>
        )}
      </div>

      {showForm && (
        <CouponForm coupon={editingCoupon} onSave={handleSave} onCancel={handleCancel} />
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: "var(--primary)" }} />
        </div>
      ) : (
        <CouponList coupons={coupons} onEdit={handleEdit} onDelete={loadCoupons} />
      )}
    </div>
  );
}
