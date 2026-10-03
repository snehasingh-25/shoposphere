import { useState, useEffect } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function AdminAnimeCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: "",
    slug: "",
    order: 0,
    isActive: true,
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errors, setErrors] = useState({});

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/anime-categories/all`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        toast.error("Session expired. Please log in as admin.");
      } else {
        toast.error("Failed to load anime categories");
      }
    } catch {
      toast.error("Network error while loading anime categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({
      name: "",
      slug: "",
      order: categories.length + 1,
      isActive: true,
      imageUrl: "",
    });
    setImageFile(null);
    setPreviewUrl("");
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      order: cat.order || 0,
      isActive: cat.isActive,
      imageUrl: cat.imageUrl || "",
    });
    setImageFile(null);
    setPreviewUrl(cat.imageUrl || "");
    setErrors({});
    setShowModal(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    setForm((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : generatedSlug,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Category name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("slug", form.slug.trim());
      formData.append("order", form.order);
      formData.append("isActive", form.isActive);
      if (form.imageUrl && !imageFile) {
        formData.append("imageUrl", form.imageUrl.trim());
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingCategory
        ? `${API}/anime-categories/${editingCategory.id}`
        : `${API}/anime-categories`;
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        toast.success(editingCategory ? "Category updated!" : "Category created!");
        setShowModal(false);
        loadCategories();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || data.message || "Failed to save anime category");
      }
    } catch {
      toast.error("Network error while saving category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) return;

    try {
      const res = await fetch(`${API}/anime-categories/${cat.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Category deleted");
        loadCategories();
      } else {
        toast.error("Failed to delete category");
      }
    } catch {
      toast.error("Network error deleting category");
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      const formData = new FormData();
      formData.append("isActive", !cat.isActive);

      const res = await fetch(`${API}/anime-categories/${cat.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, isActive: !cat.isActive } : c))
        );
        toast.success(`Category ${!cat.isActive ? "activated" : "deactivated"}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const items = updated.map((c, idx) => ({ id: c.id, order: idx + 1 }));

    try {
      const res = await fetch(`${API}/anime-categories/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        loadCategories();
      }
    } catch {
      toast.error("Failed to reorder categories");
    }
  };

  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
              Anime Categories
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage circular anime series icons displayed between the hero banner and products grid on Anime Frames.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <span>+ Add Category</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Categories</div>
          <div className="text-2xl font-black mt-1 font-display" style={{ color: "var(--foreground)" }}>
            {categories.length}
          </div>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Active on Page</div>
          <div className="text-2xl font-black mt-1 font-display text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Hidden / Inactive</div>
          <div className="text-2xl font-black mt-1 font-display text-amber-600 dark:text-amber-400">
            {categories.length - activeCount}
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
          <p className="text-sm text-muted mt-3">Loading anime categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--background)", borderColor: "var(--border)" }}
        >
          <div className="text-4xl mb-3">🎨</div>
          <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            No Anime Categories Yet
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-1 mb-5">
            Add categories like Naruto, Bleach, Demon Slayer, or One Piece with circular photos to organize your Anime Frames collection.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Create First Category
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
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Icon / Photo</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Slug (Filter)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
                {categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-neutral-500/5 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs w-6 font-bold text-muted">
                          {cat.order || index + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, -1)}
                            className="p-1 rounded text-muted hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === categories.length - 1}
                            onClick={() => handleMove(index, 1)}
                            className="p-1 rounded text-muted hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <span
                          className={`w-full h-full items-center justify-center text-xs font-bold text-muted ${
                            cat.imageUrl ? "hidden" : "flex"
                          }`}
                        >
                          {cat.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold" style={{ color: "var(--foreground)" }}>
                      {cat.name}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-neutral-500/10 px-2 py-1 rounded font-mono text-muted">
                        {cat.slug}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          cat.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-neutral-500/15 text-neutral-500 hover:bg-neutral-500/25"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cat.isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
                        {cat.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-500/10 transition cursor-pointer"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold font-display" style={{ color: "var(--foreground)" }}>
                {editingCategory ? "Edit Anime Category" : "New Anime Category"}
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
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Naruto, Bleach, Jujutsu Kaisen"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/50 transition"
                  style={{ background: "var(--background)", borderColor: errors.name ? "#ef4444" : "var(--border)" }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Slug (Matches product search / tag) *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. naruto, bleach"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 transition"
                  style={{ background: "var(--background)", borderColor: errors.slug ? "#ef4444" : "var(--border)" }}
                />
                <p className="text-[11px] text-muted mt-1">
                  Products whose title or description contains this slug will be filtered when users tap this category.
                </p>
              </div>

              {/* Circular Photo / Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Circular Photo / Icon
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-2xl">📸</span>
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
                      placeholder="Or enter image URL / SVG path (e.g. /anime-categories/naruto.svg)"
                      className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-primary/50 transition font-mono"
                      style={{ background: "var(--background)", borderColor: "var(--border)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Display Order & Active Toggle */}
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
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                  {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
