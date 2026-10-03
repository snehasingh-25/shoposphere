import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function AdminAnimeBundlesPage() {
  const toast = useToast();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: "",
    quantity: 3,
    price: 999,
    offerLabel: "",
    isActive: true,
    displayOrder: 0,
  });
  const [errors, setErrors] = useState({});

  const loadBundles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/bundles/anime-frames`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBundles(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        toast.error("Session expired");
      } else {
        toast.error("Failed to load bundle offers");
      }
    } catch {
      toast.error("Failed to load bundle offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

  const openCreateModal = () => {
    setEditingBundle(null);
    setForm({
      name: "",
      quantity: 3,
      price: 999,
      offerLabel: "",
      isActive: true,
      displayOrder: bundles.length + 1,
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (bundle) => {
    setEditingBundle(bundle);
    setForm({
      name: bundle.name,
      quantity: bundle.quantity,
      price: bundle.price,
      offerLabel: bundle.offerLabel || "",
      isActive: bundle.isActive,
      displayOrder: bundle.displayOrder || 0,
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Bundle name is required";
    const qty = parseInt(form.quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      errs.quantity = "Quantity must be an integer greater than 0";
    } else {
      const duplicate = bundles.find(
        (b) => b.quantity === qty && (!editingBundle || b.id !== editingBundle.id)
      );
      if (duplicate) {
        errs.quantity = `A bundle with quantity ${qty} already exists ("${duplicate.name}")`;
      }
    }
    const prc = parseFloat(form.price);
    if (isNaN(prc) || prc <= 0) {
      errs.price = "Price must be greater than 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const url = editingBundle
        ? `${API}/admin/bundles/anime-frames/${editingBundle.id}`
        : `${API}/admin/bundles/anime-frames`;
      const method = editingBundle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save bundle");
        return;
      }

      toast.success(editingBundle ? "Bundle updated successfully" : "Bundle created successfully");
      setShowModal(false);
      setEditingBundle(null);
      loadBundles();
    } catch {
      toast.error("Failed to save bundle");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (bundle) => {
    try {
      const res = await fetch(`${API}/admin/bundles/anime-frames/${bundle.id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        toast.success(`Bundle ${bundle.isActive ? "disabled" : "enabled"}`);
        loadBundles();
      } else {
        toast.error("Failed to update bundle status");
      }
    } catch {
      toast.error("Failed to update bundle status");
    }
  };

  const handleDelete = async (bundle) => {
    if (!window.confirm(`Are you sure you want to delete "${bundle.name}"?`)) return;

    try {
      const res = await fetch(`${API}/admin/bundles/anime-frames/${bundle.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Bundle deleted");
        loadBundles();
      } else {
        toast.error("Failed to delete bundle");
      }
    } catch {
      toast.error("Failed to delete bundle");
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= bundles.length) return;

    const updated = [...bundles];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const orders = updated.map((b, idx) => ({ id: b.id, displayOrder: idx + 1 }));

    try {
      const res = await fetch(`${API}/admin/bundles/anime-frames/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orders }),
      });
      if (res.ok) {
        const data = await res.json();
        setBundles(data);
      }
    } catch {
      toast.error("Failed to reorder bundles");
    }
  };

  const activeCount = bundles.filter((b) => b.isActive).length;

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🖼️</span>
            <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
              Anime Frames → Bundle Offers
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Configure quantity-based bundle pricing exclusively for the Anime Frames collection.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <span>+ Create Bundle</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Bundles</div>
          <div className="text-2xl font-black mt-1 font-display" style={{ color: "var(--foreground)" }}>
            {bundles.length}
          </div>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Active Offers</div>
          <div className="text-2xl font-black mt-1 font-display text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Highest Tier</div>
          <div className="text-2xl font-black mt-1 font-display text-purple-600 dark:text-purple-400">
            {bundles.length > 0 ? `${Math.max(...bundles.map((b) => b.quantity))} Frames` : "None"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="text-center py-16">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto"
            style={{ borderColor: "var(--primary)" }}
          />
          <p className="text-xs text-muted mt-3">Loading bundle offers...</p>
        </div>
      ) : bundles.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center border"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <span className="text-4xl">🎁</span>
          <h3 className="text-lg font-bold mt-3 font-display" style={{ color: "var(--foreground)" }}>
            No bundle offers created yet
          </h3>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Create bundle tiers (e.g. Buy 3 Frames for ₹999, Buy 5 for ₹1499) to encourage higher cart sizes.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + Create First Bundle
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold text-muted uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
                  <th className="py-3.5 px-4 w-12 text-center">Order</th>
                  <th className="py-3.5 px-4">Bundle Name</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Bundle Price</th>
                  <th className="py-3.5 px-4">Offer Label</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {bundles.map((bundle, idx) => (
                  <tr
                    key={bundle.id}
                    className="hover:bg-[var(--secondary)]/40 transition-colors"
                  >
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-[var(--secondary)] disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <span className="text-xs font-mono font-semibold text-muted">
                          {bundle.displayOrder || idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 1)}
                          disabled={idx === bundles.length - 1}
                          className="p-1 rounded hover:bg-[var(--secondary)] disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold font-display text-base" style={{ color: "var(--foreground)" }}>
                        {bundle.name}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {bundle.quantity} Frames
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-black text-base" style={{ color: "var(--foreground)" }}>
                        ₹{Number(bundle.price).toFixed(2)}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {bundle.offerLabel ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium border" style={{ background: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                          {bundle.offerLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(bundle)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          bundle.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-500/15 text-zinc-500 border border-zinc-500/30"
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            bundle.isActive ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        {bundle.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(bundle)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer hover:bg-[var(--secondary)]"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bundle)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-red-600 hover:bg-red-500/10 border border-red-500/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-xl font-bold font-display" style={{ color: "var(--foreground)" }}>
                {editingBundle ? "Edit Bundle Offer" : "Create Bundle Offer"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xl leading-none px-2 py-1 rounded text-muted hover:text-[var(--foreground)] cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Bundle Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                  Bundle Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 3 Frame Combo"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: "var(--secondary)",
                    borderColor: errors.name ? "red" : "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                    Bundle Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g. 3"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                    style={{
                      background: "var(--secondary)",
                      borderColor: errors.quantity ? "red" : "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                    Bundle Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g. 999"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                    style={{
                      background: "var(--secondary)",
                      borderColor: errors.price ? "red" : "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>

              {/* Offer Label */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                  Offer Label (Optional)
                </label>
                <input
                  type="text"
                  value={form.offerLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, offerLabel: e.target.value }))}
                  placeholder="e.g. Buy 3 & Save, Bestseller Tier"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: "var(--secondary)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.displayOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                    style={{
                      background: "var(--secondary)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--foreground)" }}>
                    Offer Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      form.isActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${form.isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                    <span>{form.isActive ? "Active (Customers can use)" : "Inactive (Hidden)"}</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition hover:bg-[var(--secondary)] cursor-pointer"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {saving ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
