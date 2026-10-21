import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function CategoryForm({ category, onSave, onCancel, mainCategories = [], defaultParentId = "" }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    order: 0,
    parentId: "",
    isActive: true,
  });
  const [image, setImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const initialSnapshotRef = useRef("");

  const snapshot = useMemo(() => {
    return JSON.stringify({
      formData,
      existingImageUrl,
      imageSelected: !!image,
      imagePreview: !!imagePreview,
    });
  }, [formData, existingImageUrl, image, imagePreview]);

  const isDirty = initialSnapshotRef.current !== "" && snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        slug: category.slug || "",
        description: category.description || "",
        order: category.order ?? 0,
        parentId: category.parentId ? String(category.parentId) : "",
        isActive: category.isActive !== false,
      });
      setExistingImageUrl(category.imageUrl || null);
      setImagePreview(category.imageUrl || null);
      setImage(null);
    } else if (defaultParentId) {
      setFormData((prev) => ({
        ...prev,
        parentId: String(defaultParentId),
      }));
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        order: 0,
        parentId: "",
        isActive: true,
      });
      setExistingImageUrl(null);
      setImagePreview(null);
      setImage(null);
    }

    setTimeout(() => {
      initialSnapshotRef.current = JSON.stringify({
        formData: category
          ? {
              name: category.name || "",
              slug: category.slug || "",
              description: category.description || "",
              order: category.order ?? 0,
              parentId: category.parentId ? String(category.parentId) : "",
              isActive: category.isActive !== false,
            }
          : {
              name: "",
              slug: "",
              description: "",
              order: 0,
              parentId: defaultParentId ? String(defaultParentId) : "",
              isActive: true,
            },
        existingImageUrl: category?.imageUrl || null,
        imageSelected: false,
        imagePreview: !!category?.imageUrl,
      });
    }, 0);
  }, [category, defaultParentId]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const isEdit = category?.id != null;
      const effectiveParentId = String(formData.parentId || defaultParentId || "").trim();

      if (defaultParentId && !effectiveParentId) {
        toast.error("Select a parent category for this subcategory.");
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const url = isEdit ? `${API}/categories/${category.id}` : `${API}/categories`;
      const method = isEdit ? "PUT" : "POST";

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("slug", formData.slug);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("order", String(formData.order ?? 0));
      formDataToSend.append("parentId", effectiveParentId);
      formDataToSend.append("isActive", String(formData.isActive));

      if (image) {
        formDataToSend.append("image", image);
      }
      
      if (existingImageUrl && !image) {
        formDataToSend.append("existingImageUrl", existingImageUrl);
      }

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formDataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        const isSub = Boolean(effectiveParentId);
        toast.success(
          category
            ? isSub
              ? "Subcategory updated"
              : "Category updated"
            : isSub
              ? "Subcategory created"
              : "Category created"
        );
        onSave();
        setFormData({ name: "", slug: "", description: "", order: 0, parentId: "", isActive: true });
        setImage(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        initialSnapshotRef.current = "";
      } else {
        toast.error(data.error || data.message || "Failed to save category");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!ok) return;
    }
    setFormData({ name: "", slug: "", description: "", order: 0, parentId: "", isActive: true });
    setImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    initialSnapshotRef.current = "";
    onCancel?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
      return;
    }
    if (e.key === "Enter") {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA") return;
      if (loading) return;
      e.preventDefault();
      formRef.current?.requestSubmit?.();
    }
  };

  return (
    <div className="rounded-xl shadow-md p-6 mb-6 border" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {category
            ? category.parentId
              ? "Edit Subcategory"
              : "Edit Category"
            : formData.parentId
              ? "Add Subcategory"
              : "Add New Category"}
        </h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit?.()}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {category ? "Update" : "Save"}
          </button>
        </div>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: formData.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
              });
            }}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Slug (URL-friendly)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            placeholder="auto-generated"
          />
        </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Parent category
          </label>
          <select
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            disabled={Boolean(category?.id) && (category._count?.children > 0)}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
          >
            {!defaultParentId && !formData.parentId ? (
              <option value="">None (main category)</option>
            ) : null}
            {mainCategories
              .filter((c) => !c.parentId && (!category?.id || c.id !== category.id))
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Subcategories appear under their parent on the Anime Frames page.
          </p>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Active / visible
            </span>
          </label>
        </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            rows="2"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Order</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            min="0"
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Lower order shows first on the website.</p>
        </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Image</label>
          <div className="space-y-4">
            {(imagePreview || existingImageUrl) && (
              <div className="relative inline-block">
                <img
                  src={imagePreview || existingImageUrl}
                  alt="Category preview"
                  className="w-32 h-32 object-cover rounded-lg border-2"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 border-2 border-dashed rounded-lg text-sm font-semibold transition w-full"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {imagePreview || existingImageUrl ? "Change Image" : "Upload Image"}
              </button>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 pt-4 pb-2 border-t flex gap-4" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {category ? "Update" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
