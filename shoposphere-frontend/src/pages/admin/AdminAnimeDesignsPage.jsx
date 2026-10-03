import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function AdminAnimeDesignsPage() {
  const toast = useToast();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDesign, setEditingDesign] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    priceOffset: 0,
    badge: "",
    description: "",
    isActive: true,
    displayOrder: 0,
  });
  const [errors, setErrors] = useState({});

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/anime-frame-designs`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDesigns(Array.isArray(data) ? data : []);
      } else {
        toast.error("Failed to load frame designs");
      }
    } catch {
      toast.error("Network error while loading designs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  const openCreateModal = () => {
    setEditingDesign(null);
    setForm({
      name: "",
      priceOffset: 0,
      badge: "",
      description: "",
      isActive: true,
      displayOrder: designs.length,
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (design) => {
    setEditingDesign(design);
    setForm({
      name: design.name || "",
      priceOffset: design.priceOffset || 0,
      badge: design.badge || "",
      description: design.description || "",
      isActive: design.isActive !== false,
      displayOrder: design.displayOrder || 0,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Design name is required" });
      return;
    }

    setSaving(true);
    try {
      const url = editingDesign
        ? `${API}/admin/anime-frame-designs/${editingDesign.id}`
        : `${API}/admin/anime-frame-designs`;
      const method = editingDesign ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save design");
      }

      toast.success(editingDesign ? "Design updated!" : "New design created!");
      setShowModal(false);
      loadDesigns();
    } catch (err) {
      toast.error(err.message || "Failed to save design");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (design) => {
    try {
      const res = await fetch(`${API}/admin/anime-frame-designs/${design.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !design.isActive }),
      });
      if (res.ok) {
        toast.success(`Design ${design.isActive ? "disabled" : "activated"}`);
        loadDesigns();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (design) => {
    if (!window.confirm(`Are you sure you want to delete "${design.name}"?`)) return;
    try {
      const res = await fetch(`${API}/admin/anime-frame-designs/${design.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Design deleted successfully");
        loadDesigns();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete design");
      }
    } catch {
      toast.error("Network error while deleting");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Custom Frame Designs & Pricing
          </h1>
          <p className="text-sm mt-1 text-slate-500">
            Create and configure customizable anime frame designs (Neon Glow, 3D, etc.) and set their additional prices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add New Design
        </button>
      </div>

      {/* Designs List Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading frame designs...</div>
      ) : designs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-2xl p-8" style={{ borderColor: "var(--border)" }}>
          <p className="text-slate-500 font-medium">No frame designs found.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white"
          >
            Create First Design
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--card, #fff)" }}>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500" style={{ borderColor: "var(--border)" }}>
              <tr>
                <th className="px-5 py-3.5">Design Name</th>
                <th className="px-5 py-3.5">Additional Price</th>
                <th className="px-5 py-3.5">Badge</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {designs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">
                    {d.name}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">
                    {d.priceOffset > 0 ? (
                      <span className="text-emerald-700 font-bold">+₹{Number(d.priceOffset).toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="text-slate-400">Included (+₹0)</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {d.badge ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                        {d.badge}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate">
                    {d.description || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(d)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                        d.isActive
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {d.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(d)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 hover:bg-slate-100 transition text-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-black/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDesign ? "Edit Frame Design" : "Create New Frame Design"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Design Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neon Glow, 3D, Wood Gallery"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Additional Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 450"
                    value={form.priceOffset}
                    onChange={(e) => setForm({ ...form, priceOffset: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Set to 0 if no extra charge.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Otaku Favorite, 3D Pop"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of this frame design (materials, lighting, look and feel)..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Active in Store
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingDesign ? "Update Design" : "Create Design"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
