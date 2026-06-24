import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

const EMPTY = {
  code: "",
  type: "fixed",
  discountValue: "",
  maxDiscount: "",
  minOrderValue: "",
  isActive: true,
  isFirstOrder: false,
  perUserLimit: "",
  globalLimit: "",
  stackable: false,
  userId: "",
  startsAt: "",
  expiresAt: "",
};

export default function CouponForm({ coupon, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code || "",
        type: coupon.type || "fixed",
        discountValue: coupon.discountValue ?? "",
        maxDiscount: coupon.maxDiscount ?? "",
        minOrderValue: coupon.minOrderValue ?? "",
        isActive: coupon.isActive !== false,
        isFirstOrder: Boolean(coupon.isFirstOrder),
        perUserLimit: coupon.perUserLimit ?? "",
        globalLimit: coupon.globalLimit ?? "",
        stackable: Boolean(coupon.stackable),
        userId: coupon.userId ?? "",
        startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : "",
        expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [coupon]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    const val = Number(form.discountValue);
    if (!val || val <= 0) { toast.error("Discount value must be > 0"); return; }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        discountValue: val,
        maxDiscount: form.maxDiscount !== "" ? Number(form.maxDiscount) : null,
        minOrderValue: form.minOrderValue !== "" ? Number(form.minOrderValue) : null,
        isActive: form.isActive,
        isFirstOrder: form.isFirstOrder,
        perUserLimit: form.perUserLimit !== "" ? Number(form.perUserLimit) : null,
        globalLimit: form.globalLimit !== "" ? Number(form.globalLimit) : null,
        stackable: form.stackable,
        userId: form.userId !== "" ? Number(form.userId) : null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };

      const url = coupon ? `${API}/admin/coupons/${coupon.id}` : `${API}/admin/coupons`;
      const method = coupon ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save coupon"); return; }
      toast.success(coupon ? "Coupon updated" : "Coupon created");
      onSave?.();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none";
  const inputStyle = { background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" };
  const labelCls = "block text-xs font-semibold mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-5 mb-6"
      style={{ background: "var(--background)", borderColor: "var(--border)" }}
    >
      <h3 className="text-base font-bold mb-4" style={{ color: "var(--foreground)" }}>
        {coupon ? "Edit Coupon" : "Create Coupon"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Code *</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="SAVE20"
            required
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Type *</label>
          <select
            className={inputCls}
            style={inputStyle}
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="fixed">Fixed (₹)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>
            {form.type === "fixed" ? "Discount Amount (₹) *" : "Discount % *"}
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="0.01"
            step="0.01"
            value={form.discountValue}
            onChange={(e) => set("discountValue", e.target.value)}
            placeholder={form.type === "fixed" ? "50" : "10"}
            required
          />
        </div>

        {form.type === "percentage" && (
          <div>
            <label className={labelCls} style={{ color: "var(--foreground)" }}>Max Discount Cap (₹)</label>
            <input
              className={inputCls}
              style={inputStyle}
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="500"
            />
          </div>
        )}

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Min Order Value (₹)</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="0"
            value={form.minOrderValue}
            onChange={(e) => set("minOrderValue", e.target.value)}
            placeholder="499"
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Global Usage Limit</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="1"
            value={form.globalLimit}
            onChange={(e) => set("globalLimit", e.target.value)}
            placeholder="Unlimited"
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Per-User Limit</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="1"
            value={form.perUserLimit}
            onChange={(e) => set("perUserLimit", e.target.value)}
            placeholder="Unlimited"
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Restrict to User ID</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="1"
            value={form.userId}
            onChange={(e) => set("userId", e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Valid From</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--foreground)" }}>Expires At</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm" style={{ color: "var(--foreground)" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm" style={{ color: "var(--foreground)" }}>
            <input
              type="checkbox"
              checked={form.isFirstOrder}
              onChange={(e) => set("isFirstOrder", e.target.checked)}
              className="h-4 w-4"
            />
            First order only
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {saving ? "Saving…" : coupon ? "Update" : "Create Coupon"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--muted)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
