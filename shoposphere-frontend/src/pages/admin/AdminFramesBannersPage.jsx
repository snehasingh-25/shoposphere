import { useEffect, useMemo, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import BannerForm from "../../components/admin/BannerForm";
import BannerList from "../../components/admin/BannerList";
import { FRAMES_LANDING_CATEGORY_SLUG } from "../../constants/framesBanners";

export default function AdminFramesBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [frameCategories, setFrameCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);
  const [filterSlug, setFilterSlug] = useState("");

  const loadBanners = async () => {
    try {
      const res = await fetch(`${API}/banners/all`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load banners");
      const data = await res.json();
      const list = Array.isArray(data) ? data.filter((b) => b.bannerType === "anime-frames") : [];
      setBanners(list);
    } catch (e) {
      toast.error(e.message || "Could not load frame banners");
      setBanners([]);
    }
  };

  const loadCategories = async () => {
    try {
      const [shopRes, animeRes] = await Promise.all([
        fetch(`${API}/categories?includeAnime=false`, { credentials: "include" }),
        fetch(`${API}/anime-categories/all`, { credentials: "include" }).catch(() => null),
      ]);

      const options = [{ slug: FRAMES_LANDING_CATEGORY_SLUG, name: "Frames home (no category selected)" }];

      if (shopRes.ok) {
        const shop = await shopRes.json();
        if (Array.isArray(shop)) {
          const byId = new Map(shop.map((c) => [c.id, c]));
          shop
            .filter((c) => c.isActive !== false && c.slug)
            .forEach((c) => {
              const parent = c.parentId ? byId.get(c.parentId) : null;
              const label = parent ? `Shop: ${parent.name} → ${c.name}` : `Shop type: ${c.name}`;
              options.push({ slug: c.slug, name: label });
            });
        }
      }

      if (animeRes?.ok) {
        const anime = await animeRes.json();
        if (Array.isArray(anime)) {
          const byId = new Map(anime.map((c) => [c.id, c]));
          anime
            .filter((c) => c.isActive !== false && c.slug)
            .forEach((c) => {
              const parent = c.parentId ? byId.get(c.parentId) : null;
              const label = parent ? `Series: ${parent.name} → ${c.name}` : `Series: ${c.name}`;
              options.push({ slug: c.slug, name: label });
            });
        }
      } else {
        const pub = await fetch(`${API}/anime-categories`);
        if (pub.ok) {
          const anime = await pub.json();
          if (Array.isArray(anime)) {
            anime
              .filter((c) => c.slug)
              .forEach((c) => options.push({ slug: c.slug, name: `Series: ${c.name}` }));
          }
        }
      }

      setFrameCategories(options);
    } catch {
      setFrameCategories([{ slug: FRAMES_LANDING_CATEGORY_SLUG, name: "Frames home" }]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBanners(), loadCategories()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBanners = useMemo(() => {
    if (!filterSlug) return banners;
    return banners.filter((b) => (b.framesCategorySlug || FRAMES_LANDING_CATEGORY_SLUG) === filterSlug);
  }, [banners, filterSlug]);

  const handleSave = () => {
    setEditingBanner(null);
    loadBanners();
  };

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
          Frame category banners
        </h1>
        <p className="text-sm mt-2 max-w-2xl text-muted">
          Upload hero carousels per Frames category (e.g. Glow in Dark). Banners only show on that category&apos;s page — not
          across all categories.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <BannerForm
            banner={editingBanner}
            onSave={handleSave}
            onCancel={() => setEditingBanner(null)}
            lockBannerType="anime-frames"
            frameCategoryOptions={frameCategories}
          />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Filter by category
            </label>
            <select
              value={filterSlug}
              onChange={(e) => setFilterSlug(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            >
              <option value="">All frame banners</option>
              {frameCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <BannerList banners={filteredBanners} onEdit={setEditingBanner} onDelete={handleSave} showFramesCategory />
        </>
      )}
    </div>
  );
}