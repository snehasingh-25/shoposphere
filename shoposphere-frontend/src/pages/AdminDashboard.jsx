import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API } from "../api";
import { useToast } from "../context/ToastContext";
import ProductForm from "../components/admin/ProductForm";
import CategoryForm from "../components/admin/CategoryForm";
import ProductList from "../components/admin/ProductList";
import CategoryList from "../components/admin/CategoryList";
import MessageList from "../components/admin/MessageList";
import ReelForm from "../components/admin/ReelForm";
import ReelList from "../components/admin/ReelList";
import BannerForm from "../components/admin/BannerForm";
import BannerList from "../components/admin/BannerList";

const DASHBOARD_TABS = ["products", "categories", "banners", "reels", "messages"];

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const tabFromUrl = searchParams.get("tab") || "products";
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.includes(tabFromUrl) ? tabFromUrl : "products");

  useEffect(() => {
    const t = searchParams.get("tab") || "products";
    if (DASHBOARD_TABS.includes(t)) {
      setActiveTab(t);
      return;
    }
    setActiveTab("products");
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reels, setReels] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingReel, setEditingReel] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  /** Reels admin: manage homepage vs About Us placements separately */
  const [reelPlacementTab, setReelPlacementTab] = useState("home");

  const reelsForPlacementTab = useMemo(
    () => reels.filter((r) => (r.placement || "home") === reelPlacementTab),
    [reels, reelPlacementTab]
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "products") {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`${API}/products`), // Public endpoint, no auth needed
          fetch(`${API}/categories`), // Public endpoint, no auth needed
        ]);
        
        if (!productsRes.ok) {
          const errorData = await productsRes.json();
          console.error("Error fetching products:", errorData);
          toast.error(`Error loading products: ${errorData.error || productsRes.statusText}`);
          setProducts([]);
        } else {
          const productsData = await productsRes.json();
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } else if (activeTab === "categories") {
        const res = await fetch(`${API}/categories`); // Public endpoint
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } else if (activeTab === "messages") {
        const res = await fetch(`${API}/contact`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "reels") {
        const res = await fetch(`${API}/reels/all`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setReels(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "banners") {
        const res = await fetch(`${API}/banners/all`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBanners(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data. Please try again.");
    } finally {
      setLoading(false);
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

  const handleReelSave = () => {
    setEditingReel(null);
    loadData();
  };

  const handleBannerSave = () => {
    setEditingBanner(null);
    loadData();
  };

  const tabs = [
    { id: "products", label: "Products", icon: null },
    { id: "categories", label: "Categories", icon: null },
    { id: "banners", label: "Banners", icon: null },
    { id: "reels", label: "Reels", icon: null },
    { id: "orders", label: "Orders", icon: null },
    { id: "analytics", label: "Analytics", icon: null },
    { id: "inventory", label: "Inventory", icon: null },
    { id: "reviews", label: "Reviews", icon: null },
    { id: "messages", label: "Messages", icon: null },
  ];

  const setTab = (tabId) => {
    setActiveTab(tabId);
    setEditingProduct(null);
    setEditingCategory(null);
    setEditingReel(null);
    setEditingBanner(null);
    setReelPlacementTab("home");
    if (DASHBOARD_TABS.includes(tabId)) {
      setSearchParams(tabId === "products" ? {} : { tab: tabId });
    }
  };

  return (
    <>
      {/* Mobile-only: horizontal tabs (desktop uses AdminLayout sidebar) */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) =>
            ["orders", "analytics", "inventory", "reviews"].includes(tab.id) ? (
              <Link
                key={tab.id}
                to={tab.id === "orders" ? "/admin/orders" : `/admin/${tab.id}`}
                className="shrink-0 px-4 py-2.5 rounded-full font-semibold transition-all"
                style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
              >
                {tab.label}
              </Link>
            ) : (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className="shrink-0 px-4 py-2.5 rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? "var(--primary)" : "var(--secondary)",
                  color: activeTab === tab.id ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {tab.label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ">
          {/* Content */}
          {loading ? (
            <div className="rounded-lg shadow p-12 text-center" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--primary)" }}></div>
              <p style={{ color: "var(--muted)" }}>Loading...</p>
            </div>
          ) : (
            <>
            {activeTab === "products" && (
              <div>
                <ProductForm
                  product={editingProduct}
                  categories={categories}
                  onSave={handleProductSave}
                  onCancel={() => setEditingProduct(null)}
                />
                <ProductList
                  products={products}
                  onEdit={setEditingProduct}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <CategoryForm
                  category={editingCategory}
                  onSave={handleCategorySave}
                  onCancel={() => setEditingCategory(null)}
                />
                <CategoryList
                  categories={categories}
                  onEdit={setEditingCategory}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "banners" && (
              <div>
                <BannerForm
                  banner={editingBanner}
                  onSave={handleBannerSave}
                  onCancel={() => setEditingBanner(null)}
                />
                <BannerList
                  banners={banners}
                  onEdit={setEditingBanner}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "reels" && (
              <div>
                <div className="flex flex-wrap gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setReelPlacementTab("home");
                      setEditingReel(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                      reelPlacementTab === "home"
                        ? "border-pink-500 bg-pink-50 text-pink-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Homepage reels
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReelPlacementTab("about");
                      setEditingReel(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                      reelPlacementTab === "about"
                        ? "border-pink-500 bg-pink-50 text-pink-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    About page reels
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {reelPlacementTab === "home"
                    ? "These appear in the main reel carousel on the home page."
                    : "These appear in “Our Story in Motion” on the About Us page. Add a thumbnail and title; visitors tap to open the video."}
                </p>
                <ReelForm
                  reel={editingReel}
                  defaultPlacement={reelPlacementTab}
                  onSave={handleReelSave}
                  onCancel={() => setEditingReel(null)}
                />
                <ReelList
                  reels={reelsForPlacementTab}
                  title={reelPlacementTab === "about" ? "About page reels" : "Homepage reels"}
                  onEdit={setEditingReel}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "messages" && (
              <MessageList messages={messages} onUpdate={loadData} />
            )}
            </>
          )}
      </div>
    </>
  );
}
