import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import AdminSearchBar from "../../components/admin/AdminSearchBar";
import ProductForm from "../../components/admin/ProductForm";
import CategoryForm from "../../components/admin/CategoryForm";
import AdminProductListRow from "../../components/admin/AdminProductListRow";
import AdminCategoryListRow from "../../components/admin/AdminCategoryListRow";
import { searchAdminCatalog } from "../../utils/adminCatalogSearch";
import { cloneProductForDuplicate } from "../../utils/cloneProductForDuplicate";

function SectionCard({ title, count, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-md border overflow-hidden mb-6" style={{ borderColor: "oklch(92% .04 340)" }}>
      <div className="p-4 sm:p-6 border-b" style={{ borderColor: "oklch(92% .04 340)" }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "oklch(20% .02 340)" }}>
          {title} ({count})
        </h2>
        {subtitle ? (
          <p className="text-sm mt-1" style={{ color: "oklch(50% .02 340)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function AdminSearchResultsPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API}/products`),
        fetch(`${API}/categories`),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
        toast.error("Could not load products");
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        setCategories([]);
      }
    } catch {
      toast.error("Could not load catalog");
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial catalog load only
  }, []);

  const { products: matchedProducts, categories: matchedCategories } = useMemo(
    () => searchAdminCatalog(products, categories, q),
    [products, categories, q]
  );

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`${API}/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Product deleted");
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete product");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`${API}/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Category deleted");
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete category");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  const handleProductSave = () => {
    setEditingProduct(null);
    loadData();
  };

  const handleCategorySave = () => {
    setEditingCategory(null);
    loadData();
  };

  const queryOk = q.trim().length >= 2;

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/admin/dashboard"
            className="text-sm font-semibold text-muted hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold font-display" style={{ color: "var(--foreground)" }}>
            Search results
          </h1>
          {queryOk ? (
            <p className="text-sm text-muted mt-1">
              Showing matches for &quot;{q.trim()}&quot;
            </p>
          ) : (
            <p className="text-sm text-muted mt-1">Use at least 2 characters in the search box, then press Enter or choose View all results.</p>
          )}
        </div>
        <AdminSearchBar
          key={q || "_empty"}
          initialQuery={q}
          preserveQueryOnDismiss
          onSelectProduct={(p) => {
            setEditingCategory(null);
            setEditingProduct(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onSelectCategory={(c) => {
            setEditingProduct(null);
            setEditingCategory(c);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      {editingProduct !== null && (
        <div className="mb-6">
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSave={handleProductSave}
            onCancel={() => setEditingProduct(null)}
          />
        </div>
      )}

      {editingCategory !== null && (
        <div className="mb-6">
          <CategoryForm category={editingCategory} onSave={handleCategorySave} onCancel={() => setEditingCategory(null)} />
        </div>
      )}

      {loading ? (
        <div className="rounded-lg shadow p-12 text-center" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--primary)" }} />
          <p style={{ color: "var(--foreground)" }}>Loading catalog…</p>
        </div>
      ) : !queryOk ? null : (
        <>
          <SectionCard
            title="Products"
            count={matchedProducts.length}
            subtitle="Categories and keywords/tags show how each product is linked and discoverable."
          >
            {matchedProducts.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No products match this search.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "oklch(92% .04 340)" }}>
                {matchedProducts.map((product) => (
                  <AdminProductListRow
                    key={product.id}
                    product={product}
                    onEdit={setEditingProduct}
                    onDuplicate={() => setEditingProduct(cloneProductForDuplicate(product))}
                    onDelete={handleDeleteProduct}
                    showKeywordTags
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Categories" count={matchedCategories.length} subtitle="Edit or delete categories that matched your query.">
            {matchedCategories.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No categories match this search.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "oklch(92% .04 340)" }}>
                {matchedCategories.map((category) => (
                  <AdminCategoryListRow
                    key={category.id}
                    category={category}
                    onEdit={setEditingCategory}
                    onDelete={handleDeleteCategory}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
