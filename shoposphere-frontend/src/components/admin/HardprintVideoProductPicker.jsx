import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import { HARDPRINT_VIDEO_TITLE, HARDPRINT_VIDEO_URL } from "../../constants/hardprintVideo";

function productLabel(p) {
  const base = p?.name || `Product #${p?.id}`;
  return p?.isAnimeFrame ? `${base} (Frame)` : base;
}

export default function HardprintVideoProductPicker({ defaultFilter = "all", embedded = false }) {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(defaultFilter);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/products?all=true&limit=0`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setSelectedIds(new Set(list.filter((p) => p.showHardprintVideo).map((p) => p.id)));
    } catch (e) {
      toast.error(e.message || "Could not load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "frames" && !p.isAnimeFrame) return false;
      if (filter === "shop" && p.isAnimeFrame) return false;
      if (!q) return true;
      return productLabel(p).toLowerCase().includes(q) || String(p.id).includes(q);
    });
  }, [products, search, filter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/products/hardprint-video/selection`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selectedIds] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Save failed");
      toast.success(`Hang video enabled on ${selectedIds.size} product(s)`);
      await loadProducts();
    } catch (e) {
      toast.error(e.message || "Could not save selection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={embedded ? "space-y-4" : "mb-8 rounded-2xl border-2 p-4 md:p-6 space-y-4"}
      style={embedded ? undefined : { borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              {HARDPRINT_VIDEO_TITLE} — product picker
            </h2>
            <p className="text-sm mt-1 text-muted max-w-2xl">
              Select products that should show the portrait hang tutorial in the gallery and on the product page.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selectedIds.size} selected
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Products with hang video
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selectedIds.size} selected
          </span>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--foreground)" }}>
          {HARDPRINT_VIDEO_TITLE}
        </p>
        <div
          className="mx-auto rounded-xl overflow-hidden border max-w-[11rem] aspect-[9/16] bg-black"
          style={{ borderColor: "var(--border)" }}
        >
          <video
            src={HARDPRINT_VIDEO_URL}
            className="w-full h-full object-cover"
            muted
            playsInline
            controls
            preload="metadata"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="all">All products</option>
          <option value="frames">Frames only</option>
          <option value="shop">Shop only</option>
        </select>
        <button
          type="button"
          onClick={toggleAllFiltered}
          disabled={loading || filtered.length === 0}
          className="px-3 py-2 rounded-lg text-sm font-semibold border"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {allFilteredSelected ? "Clear visible" : "Select visible"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {saving ? "Saving…" : "Save selection"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading products…</p>
      ) : (
        <div
          className="max-h-72 overflow-y-auto rounded-xl border divide-y"
          style={{ borderColor: "var(--border)" }}
        >
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted">No products match your filters.</p>
          ) : (
            filtered.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleId(p.id)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium flex-1" style={{ color: "var(--foreground)" }}>
                  {productLabel(p)}
                </span>
                <span className="text-xs text-muted tabular-nums">#{p.id}</span>
              </label>
            ))
          )}
        </div>
      )}
    </section>
  );
}
