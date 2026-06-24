import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { API } from "../../api";
import StarRating from "../../components/StarRating";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const EMPTY_FORM = { productId: "", reviewerName: "", rating: 5, comment: "", imageFile: null, imagePreview: null };

export default function AdminReviewsPage() {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Manual review form state
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const fetchReviews = () => {
    fetch(`${API}/admin/reviews`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          logout();
          navigate("/admin/login", { replace: true });
          return [];
        }
        return res.json();
      })
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load reviews"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [navigate, logout]);

  // Fetch product list when form opens
  useEffect(() => {
    if (!formOpen || products.length > 0) return;
    setLoadingProducts(true);
    fetch(`${API}/products`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.products ?? []);
        setProducts(list);
      })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoadingProducts(false));
  }, [formOpen]);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      toast.error("Please select a product");
      return;
    }
    if (!form.reviewerName.trim()) {
      toast.error("Reviewer name is required");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("productId", Number(form.productId));
      fd.append("reviewerName", form.reviewerName.trim());
      fd.append("rating", form.rating);
      if (form.comment.trim()) fd.append("comment", form.comment.trim());
      if (form.imageFile) fd.append("reviewImage", form.imageFile);

      const res = await fetch(`${API}/admin/reviews`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Manual review added");
        setReviews((prev) => [data, ...prev]);
        setForm(EMPTY_FORM);
        setProductSearch("");
        setFormOpen(false);
      } else {
        toast.error(data.error || "Failed to add review");
      }
    } catch {
      toast.error("Failed to add review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/reviews/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Review deleted");
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(data.error || "Failed to delete review");
      }
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="h-8 w-48 rounded animate-pulse mb-6" style={{ background: "var(--muted)" }} />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--muted)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold font-display" style={{ color: "var(--foreground)" }}>
          Reviews
        </h1>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {formOpen ? "Cancel" : "+ Add Manual Review"}
        </button>
      </div>

      {/* Manual review form */}
      {formOpen && (
        <div
          className="rounded-2xl border p-5 mb-6 space-y-4"
          style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            New Manual Review
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product selector */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Product <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm mb-1"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
              <div
                className="max-h-40 overflow-y-auto rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              >
                {loadingProducts ? (
                  <p className="p-3 text-xs" style={{ color: "var(--foreground)" }}>Loading…</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="p-3 text-xs" style={{ color: "var(--foreground)" }}>No products found</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, productId: String(p.id) })); setProductSearch(p.name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition"
                      style={{
                        background: form.productId === String(p.id) ? "var(--primary)" : "transparent",
                        color: form.productId === String(p.id) ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Reviewer name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Reviewer Name <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Priya S."
                value={form.reviewerName}
                onChange={(e) => setForm((f) => ({ ...f, reviewerName: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Rating <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <StarRating
                value={form.rating}
                onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                size="md"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Comment <span className="text-xs font-normal" style={{ color: "var(--foreground)" }}>(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Write the review text…"
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>

            {/* Review photo */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Review Photo <span className="text-xs font-normal" style={{ color: "var(--foreground)" }}>(optional)</span>
              </label>
              <div className="flex items-start gap-3">
                <label
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed cursor-pointer transition hover:opacity-70 shrink-0"
                  style={{ borderColor: "var(--border)", background: "var(--background)" }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setForm((f) => ({
                        ...f,
                        imageFile: file,
                        imagePreview: URL.createObjectURL(file),
                      }));
                    }}
                  />
                  {form.imagePreview ? (
                    <img src={form.imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-2xl" style={{ color: "var(--foreground)" }}>+</span>
                  )}
                </label>
                {form.imagePreview && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageFile: null, imagePreview: null }))}
                    className="text-xs px-2 py-1 rounded-lg transition"
                    style={{ background: "var(--destructive)", color: "white" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); setProductSearch(""); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {submitting ? "Adding…" : "Add Review"}
              </button>
            </div>
          </form>
        </div>
      )}

      {reviews.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
        >
          <p className="text-sm" style={{ color: "var(--foreground)" }}>
            No reviews yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border p-4 flex flex-wrap items-start justify-between gap-4"
              style={{ borderColor: "var(--border)", background: "var(--background)", boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Link
                    to={`/product/${r.productId}`}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {r.productName || `Product #${r.productId}`}
                  </Link>
                  <span className="text-xs" style={{ color: "var(--foreground)" }}>
                    #{r.productId}
                  </span>
                  {r.isManual && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                      Manual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating value={r.rating} readonly size="sm" />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {r.userName || "Anonymous"}
                  </span>
                  {r.userEmail ? (
                    <span className="text-xs" style={{ color: "var(--foreground)" }}>
                      ({r.userEmail})
                    </span>
                  ) : null}
                </div>
                {r.comment ? (
                  <p className="text-sm mt-2" style={{ color: "var(--foreground)" }}>
                    {r.comment}
                  </p>
                ) : null}
                {r.reviewImage ? (
                  <img
                    src={r.reviewImage}
                    alt="Review"
                    className="mt-2 h-16 w-16 rounded-lg object-cover border"
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : null}
                <p className="text-xs mt-2" style={{ color: "var(--foreground)" }}>
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition-opacity"
                style={{ background: "var(--destructive)", color: "white" }}
              >
                {deletingId === r.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
