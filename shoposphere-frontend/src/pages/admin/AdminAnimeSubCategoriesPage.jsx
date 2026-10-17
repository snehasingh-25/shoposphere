import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function AdminAnimeSubCategoriesPage() {
  const toast = useToast();

  // All top-level categories (used for "Parent" dropdown)
  const [parentCategories, setParentCategories] = useState([]);
  // The currently selected parent ID (string)
  const [selectedParentId, setSelectedParentId] = useState("");
  // Sub-categories of the selected parent
  const [subCategories, setSubCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  // Form — parentId is always kept in sync with selectedParentId
  const [form, setForm] = useState({
    name: "",
    slug: "",
    order: 0,
    isActive: true,
    imageUrl: "",
    parentId: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errors, setErrors] = useState({});

  /* ───────────── Load parent categories ───────────── */
  const loadParents = async () => {
    try {
      const res = await fetch(`${API}/anime-categories/all`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // Only top-level (no parentId)
        const topLevel = Array.isArray(data) ? data.filter((c) => !c.parentId) : [];
        setParentCategories(topLevel);
        // Default to first parent if none selected
        if (topLevel.length > 0 && !selectedParentId) {
          setSelectedParentId(String(topLevel[0].id));
        }
      }
    } catch {
      toast.error("Failed to load anime categories");
    }
  };

  /* ───────────── Load sub-categories for selected parent ───────────── */
  const loadSubCategories = async (parentId) => {
    if (!parentId) {
      setSubCategories([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/anime-categories/all`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const subs = Array.isArray(data)
          ? data.filter((c) => String(c.parentId) === String(parentId))
          : [];
        setSubCategories(subs);
      }
    } catch {
      toast.error("Failed to load sub-categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    if (selectedParentId) {
      loadSubCategories(selectedParentId);
    }
  }, [selectedParentId]);

  /* ───────────── Slug helper ───────────── */
  const slugify = (text) =>
    text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: editingSub ? f.slug : slugify(name) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /* ───────────── Select parent ───────────── */
  const handleSelectParent = (id) => {
    setSelectedParentId(String(id));
  };

  /* ───────────── Validation ───────────── */
  const validate = (currentParentId) => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Sub-category name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    if (!currentParentId) errs.parent = "No parent category selected";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ───────────── Open Modals ───────────── */
  const openCreateModal = () => {
    setEditingSub(null);
    setForm({
      name: "",
      slug: "",
      order: subCategories.length + 1,
      isActive: true,
      imageUrl: "",
      parentId: selectedParentId, // always set from current selection
    });
    setImageFile(null);
    setPreviewUrl("");
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (sub) => {
    setEditingSub(sub);
    setForm({
      name: sub.name,
      slug: sub.slug,
      order: sub.order || 0,
      isActive: sub.isActive,
      imageUrl: sub.imageUrl || "",
      parentId: String(sub.parentId || selectedParentId), // use sub's parentId
    });
    setImageFile(null);
    setPreviewUrl(sub.imageUrl || "");
    setErrors({});
    setShowModal(true);
  };

  /* ───────────── Save ───────────── */
  const handleSave = async (e) => {
    e.preventDefault();

    // parentId comes directly from form state — single source of truth
    const activeParentId = form.parentId || selectedParentId;

    if (!validate(activeParentId)) return;

    if (!activeParentId) {
      toast.error("Please select a parent category first.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("slug", form.slug.trim());
      formData.append("order", String(form.order));
      formData.append("isActive", String(form.isActive));
      // Always explicitly append parentId
      formData.append("parentId", String(activeParentId));

      if (form.imageUrl && !imageFile) formData.append("imageUrl", form.imageUrl.trim());
      if (imageFile) formData.append("image", imageFile);

      const url = editingSub
        ? `${API}/anime-categories/${editingSub.id}`
        : `${API}/anime-categories`;
      const method = editingSub ? "PUT" : "POST";

      const res = await fetch(url, { method, credentials: "include", body: formData });
      if (res.ok) {
        toast.success(editingSub ? "Sub-category updated!" : "Sub-category created!");
        setShowModal(false);
        loadSubCategories(selectedParentId);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || data.message || "Failed to save sub-category");
      }
    } catch {
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  /* ───────────── Delete ───────────── */
  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete sub-category "${sub.name}"?`)) return;
    try {
      const res = await fetch(`${API}/anime-categories/${sub.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Sub-category deleted");
        loadSubCategories(selectedParentId);
      } else {
        toast.error("Failed to delete sub-category");
      }
    } catch {
      toast.error("Network error deleting sub-category");
    }
  };

  /* ───────────── Toggle Active ───────────── */
  const handleToggleActive = async (sub) => {
    try {
      const formData = new FormData();
      formData.append("isActive", String(!sub.isActive));
      // Always send parentId so it's preserved on update
      formData.append("parentId", String(sub.parentId || ""));
      const res = await fetch(`${API}/anime-categories/${sub.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        setSubCategories((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, isActive: !sub.isActive } : s))
        );
        toast.success(`Sub-category ${!sub.isActive ? "activated" : "deactivated"}`);
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const selectedParent = parentCategories.find((p) => String(p.id) === String(selectedParentId));

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📂</span>
            <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
              Anime Sub-Categories
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Create sub-categories under a parent anime series. They appear as filter pills on the Anime Frames page.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!selectedParentId}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <span>+ Add Sub-Category</span>
        </button>
      </div>

      {/* ── Parent Selector ── */}
      <div
        className="rounded-2xl border p-4 mb-6"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Select Parent Category
        </label>
        {parentCategories.length === 0 ? (
          <p className="text-sm text-muted">
            No anime categories found.{" "}
            <a href="/admin/anime-categories" className="underline" style={{ color: "var(--primary)" }}>
              Create one first →
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {parentCategories.map((p) => {
              const active = String(p.id) === String(selectedParentId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectParent(p.id)}
                  className={[
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                    active
                      ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-sm"
                      : "hover:bg-neutral-500/10",
                  ].join(" ")}
                  style={active ? {} : { borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  )}
                  {p.name}
                  {active && (
                    <span className="ml-1 text-[10px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full">
                      selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      {selectedParent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Parent</div>
            <div className="text-lg font-black mt-1 font-display" style={{ color: "var(--foreground)" }}>
              {selectedParent.name}
            </div>
          </div>
          <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Sub-Categories</div>
            <div className="text-2xl font-black mt-1 font-display" style={{ color: "var(--foreground)" }}>
              {subCategories.length}
            </div>
          </div>
          <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Active</div>
            <div className="text-2xl font-black mt-1 font-display text-emerald-600 dark:text-emerald-400">
              {subCategories.filter((s) => s.isActive).length}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-categories Table ── */}
      {!selectedParentId ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="text-4xl mb-3">☝️</div>
          <p className="text-sm text-muted">Select a parent category above to manage its sub-categories.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: "var(--primary)" }} />
          <p className="text-sm text-muted mt-3">Loading sub-categories...</p>
        </div>
      ) : subCategories.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="text-4xl mb-3">📂</div>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
            No Sub-Categories Yet
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-5">
            Create sub-categories under <strong>{selectedParent?.name}</strong>. They'll appear as filter pills when a user selects this series on the Anime Frames page.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Create First Sub-Category
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider text-muted" style={{ borderColor: "var(--border)" }}>
                  <th className="py-3.5 px-4">Icon</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
                {subCategories.map((sub) => (
                  <tr key={sub.id} className="hover:bg-neutral-500/5 transition">
                    <td className="py-3 px-4">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-dashed border-violet-300 bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                        {sub.imageUrl ? (
                          <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-xs font-bold text-violet-400">
                            {sub.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold" style={{ color: "var(--foreground)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          SUB
                        </span>
                        {sub.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-neutral-500/10 px-2 py-1 rounded font-mono text-muted">
                        {sub.slug}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-muted font-mono text-xs">{sub.order}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(sub)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          sub.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-neutral-500/15 text-neutral-500 hover:bg-neutral-500/25"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sub.isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
                        {sub.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-500/10 transition cursor-pointer"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition cursor-pointer"
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

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold font-display" style={{ color: "var(--foreground)" }}>
                {editingSub ? "Edit Sub-Category" : "New Sub-Category"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground text-xl p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Parent Category — read-only display, but also a hidden field */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Creating Under
                </label>
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border"
                  style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
                >
                  {selectedParent?.imageUrl && (
                    <img
                      src={selectedParent.imageUrl}
                      alt={selectedParent.name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  )}
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {selectedParent?.name || "—"}
                  </span>
                  <span className="ml-auto text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold px-2 py-0.5 rounded-full">
                    Parent
                  </span>
                </div>
                {/* Hidden field to confirm parentId in the form */}
                <p className="text-[11px] text-muted mt-1">
                  Parent ID: <code className="font-mono">{form.parentId || "⚠️ not set"}</code>
                </p>
                {errors.parent && <p className="text-xs text-red-500 mt-1">{errors.parent}</p>}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Sub-Category Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Posters, Keychains, Glow Frames"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/50 transition"
                  style={{ background: "var(--background)", borderColor: errors.name ? "#ef4444" : "var(--border)" }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. posters, keychains"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 transition"
                  style={{ background: "var(--background)", borderColor: errors.slug ? "#ef4444" : "var(--border)" }}
                />
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Icon / Photo (optional)
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-violet-300 bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-xl">📸</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-500/10 file:text-foreground hover:file:bg-neutral-500/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) => {
                        setForm({ ...form, imageUrl: e.target.value });
                        if (!imageFile) setPreviewUrl(e.target.value);
                      }}
                      placeholder="Or paste image URL"
                      className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-primary/50 transition font-mono"
                      style={{ background: "var(--background)", borderColor: "var(--border)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Order + Active */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/50 transition"
                    style={{ background: "var(--background)", borderColor: "var(--border)" }}
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      Active / Visible
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t mt-6" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border hover:bg-neutral-500/10 transition cursor-pointer"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {saving ? "Saving..." : editingSub ? "Save Changes" : "Create Sub-Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
