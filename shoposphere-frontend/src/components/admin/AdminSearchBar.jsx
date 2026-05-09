import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../api";
import { searchAdminCatalog } from "../../utils/adminCatalogSearch";

function toArrayOrEmpty(data) {
  return Array.isArray(data) ? data : [];
}

function readFirstImage(product) {
  if (!product?.images) return "";
  if (Array.isArray(product.images)) return product.images[0] || "";
  try {
    const parsed = JSON.parse(product.images || "[]");
    return Array.isArray(parsed) ? parsed[0] || "" : "";
  } catch {
    return "";
  }
}

/**
 * @param {Object} props
 * @param {(product: Object) => void} [props.onSelectProduct]
 * @param {(category: Object) => void} [props.onSelectCategory]
 * @param {(query: string) => void} [props.onViewAllResults] — optional hook after navigation
 * @param {string} [props.initialQuery] — seed input (remount with key={q} when URL query changes)
 * @param {boolean} [props.preserveQueryOnDismiss] — if true, do not clear input when picking a suggestion
 */
export default function AdminSearchBar({
  onSelectProduct,
  onSelectCategory,
  onViewAllResults,
  initialQuery = "",
  preserveQueryOnDismiss = false,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`${API}/products`)
        .then((r) => r.json())
        .then((d) => toArrayOrEmpty(d))
        .catch(() => []),
      fetch(`${API}/categories`)
        .then((r) => r.json())
        .then((d) => toArrayOrEmpty(d))
        .catch(() => []),
    ]).then(([products, categories]) => {
      if (cancelled) return;
      setAllProducts(products);
      setAllCategories(categories);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      return { products: [], categories: [] };
    }
    const { products, categories } = searchAdminCatalog(allProducts, allCategories, q);
    return {
      products: products.slice(0, 4),
      categories: categories.slice(0, 3),
    };
  }, [searchQuery, allProducts, allCategories]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setSuggestionsDismissed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasAnySuggestions = suggestions.products.length > 0 || suggestions.categories.length > 0;

  const showSuggestions = hasAnySuggestions && !suggestionsDismissed;

  const dismissSuggestions = () => {
    setSuggestionsDismissed(true);
    if (!preserveQueryOnDismiss) {
      setSearchQuery("");
    }
  };

  const handleSelectProduct = (product) => {
    dismissSuggestions();
    onSelectProduct?.(product);
  };

  const handleSelectCategory = (category) => {
    dismissSuggestions();
    onSelectCategory?.(category);
  };

  const handleViewAllResults = () => {
    const q = searchQuery.trim();
    setSuggestionsDismissed(true);
    if (q.length >= 2) {
      navigate(`/admin/search?q=${encodeURIComponent(q)}`);
    }
    onViewAllResults?.(q);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSuggestionsDismissed(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim().length >= 2) {
              e.preventDefault();
              handleViewAllResults();
            } else if (e.key === "Escape") {
              setSuggestionsDismissed(true);
            }
          }}
          onFocus={() => {
            if (hasAnySuggestions) setSuggestionsDismissed(false);
          }}
          onBlur={(e) => {
            if (e.relatedTarget && suggestionsRef.current?.contains(e.relatedTarget)) return;
            setTimeout(() => setSuggestionsDismissed(true), 200);
          }}
          placeholder="Search products, categories..."
          className="w-full rounded-lg border py-2.5 pl-4 pr-10 text-sm transition focus:outline-none"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      </div>

      {showSuggestions && hasAnySuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-lg border shadow-xl"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
        >
          <div className="max-h-96 overflow-y-auto p-2">
            {suggestions.products.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Products</div>
                {suggestions.products.map((product) => {
                  const firstImage = readFirstImage(product);
                  return (
                    <button
                      key={`p-${product.id}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProduct(product);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--secondary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {firstImage ? (
                        <img src={firstImage} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--secondary)" }}>
                          <img src="/logo.png" alt="" className="h-6 w-6 object-contain opacity-50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {product.name}
                        </div>
                        {(product.categories?.length || product.category) && (
                          <div className="truncate text-xs text-muted">
                            {product.categories?.length
                              ? product.categories.map((c) => c.name || c.category?.name).join(", ")
                              : product.category?.name}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {suggestions.categories.length > 0 && (
              <>
                <div className="mt-1 border-t px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted" style={{ borderColor: "var(--border)" }}>
                  Categories
                </div>
                {suggestions.categories.map((category) => (
                  <button
                    key={`c-${category.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCategory(category);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--secondary)" }}>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {category.name}
                      </div>
                      {category.slug && <div className="truncate text-xs text-muted">{category.slug}</div>}
                    </div>
                  </button>
                ))}
              </>
            )}

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (searchQuery.trim().length >= 2) handleViewAllResults();
              }}
              disabled={searchQuery.trim().length < 2}
              className="mt-2 block w-full rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
            >
              View all results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
