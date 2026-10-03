import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import BeforeAfterSlider from "../../components/BeforeAfterSlider";

export default function AdminAnimeFramesPage() {
  const toast = useToast();
  const [frames, setFrames] = useState([]);
  const [animeCategories, setAnimeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState("All");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingFrame, setEditingFrame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Quick category creation inside modal
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [unmatchedSeries, setUnmatchedSeries] = useState("");

  // Form states
  const [form, setForm] = useState({
    name: "",
    animeSeries: "",
    price: "",
    originalPrice: "",
    badge: "",
    isActive: true,
    description: "",
    returnExchangeInfo: "",
    keywords: "",
    sizes: [
      { label: "A4", price: 699, originalPrice: 1299, stock: 50 },
      { label: "A3", price: 1099, originalPrice: 1699, stock: 50 },
      { label: "A2", price: 1599, originalPrice: 2199, stock: 50 },
    ],
  });

  // Product Images
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);

  // Before Image
  const [beforeFile, setBeforeFile] = useState(null);
  const [beforePreviewUrl, setBeforePreviewUrl] = useState("");
  const [removeBeforeImage, setRemoveBeforeImage] = useState(false);
  const beforeInputRef = useRef(null);

  // After Image
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreviewUrl, setAfterPreviewUrl] = useState("");
  const [removeAfterImage, setRemoveAfterImage] = useState(false);
  const afterInputRef = useRef(null);

  const [errors, setErrors] = useState({});

  // Load all anime frame products and real-time anime categories ONLY
  const loadData = async () => {
    setLoading(true);
    try {
      const [framesRes, animeCatsRes] = await Promise.all([
        fetch(`${API}/anime-frames/all`, { credentials: "include" }),
        fetch(`${API}/anime-categories/all`, { credentials: "include" }).catch(() => null),
      ]);

      if (framesRes.ok) {
        const data = await framesRes.json();
        setFrames(Array.isArray(data) ? data : []);
      } else if (framesRes.status === 401) {
        toast.error("Session expired. Please log in as admin.");
      } else {
        toast.error("Failed to load anime frame products");
      }

      let loadedAnimeCats = [];
      if (animeCatsRes && animeCatsRes.ok) {
        const catData = await animeCatsRes.json();
        if (Array.isArray(catData)) loadedAnimeCats = catData;
      } else {
        // Fallback to public endpoint if session issue or 401
        const pubCatRes = await fetch(`${API}/anime-categories`).catch(() => null);
        if (pubCatRes && pubCatRes.ok) {
          const pubCatData = await pubCatRes.json();
          if (Array.isArray(pubCatData)) loadedAnimeCats = pubCatData;
        }
      }
      setAnimeCategories(loadedAnimeCats);
    } catch (err) {
      console.error("Error loading anime frames:", err);
      toast.error("Network error while loading anime frames");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ONLY real categories created by admin in Anime Categories table
  // No random names, no product names, no store category names
  const realCategories = useMemo(() => {
    if (!Array.isArray(animeCategories) || animeCategories.length === 0) {
      return [];
    }
    const names = new Set();
    animeCategories.forEach((c) => {
      if (c?.name && c.name.trim()) {
        names.add(c.name.trim());
      }
    });
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [animeCategories]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingFrame(null);
    setForm({
      name: "",
      animeSeries: realCategories.length > 0 ? realCategories[0] : "",
      price: "699",
      originalPrice: "1299",
      badge: "NEW",
      isActive: true,
      description: "High-grade optical cast acrylic wall art frame with high-density UV-cured vibrant colors.",
      returnExchangeInfo: "7-Day Safe Delivery & Replacement Guarantee. If your frame arrives damaged or with any acrylic flaw, we provide instant free replacement.",
      keywords: "anime, frame, wall art",
      sizes: [
        { label: "A4", price: 699, originalPrice: 1299, stock: 50 },
        { label: "A3", price: 1099, originalPrice: 1699, stock: 50 },
        { label: "A2", price: 1599, originalPrice: 2199, stock: 50 },
      ],
    });
    setShowAddCatInput(false);
    setNewCatName("");
    setUnmatchedSeries("");
    setNewImageFiles([]);
    setExistingImages([]);
    setBeforeFile(null);
    setBeforePreviewUrl("");
    setRemoveBeforeImage(false);
    setAfterFile(null);
    setAfterPreviewUrl("");
    setRemoveAfterImage(false);
    setErrors({});
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (frame) => {
    setEditingFrame(frame);
    const minP = frame.minPrice || frame.price || 699;
    const origP = frame.originalPrice || "";

    const frameSizes = Array.isArray(frame.sizes) && frame.sizes.length > 0
      ? frame.sizes.map((s) => ({
          label: s.label || s.sizeLabel,
          price: s.price,
          originalPrice: s.originalPrice,
          stock: s.stock || 50,
        }))
      : [
          { label: "A4", price: minP, originalPrice: origP, stock: 50 },
          { label: "A3", price: Number(minP) + 400, originalPrice: origP ? Number(origP) + 400 : null, stock: 50 },
          { label: "A2", price: Number(minP) + 900, originalPrice: origP ? Number(origP) + 900 : null, stock: 50 },
        ];

    const currentSeries = (frame.animeSeries || "").trim();
    // Only pre-select if it exists in admin categories
    const matchingSeries = realCategories.find(
      (c) => c.toLowerCase() === currentSeries.toLowerCase()
    );

    setForm({
      name: frame.name || "",
      animeSeries: matchingSeries || "",
      price: String(minP),
      originalPrice: origP ? String(origP) : "",
      badge: frame.badge || "",
      isActive: frame.isActive !== false,
      description: frame.description || "",
      returnExchangeInfo: frame.returnExchangeInfo || "7-Day Safe Delivery & Replacement Guarantee. If your frame arrives damaged or with any acrylic flaw, we provide instant free replacement.",
      keywords: Array.isArray(frame.keywords)
        ? frame.keywords.join(", ")
        : typeof frame.keywords === "string"
        ? frame.keywords
        : "",
      sizes: frameSizes,
    });

    setUnmatchedSeries(matchingSeries || !currentSeries ? "" : currentSeries);
    setShowAddCatInput(false);
    setNewCatName("");
    setNewImageFiles([]);
    setExistingImages(Array.isArray(frame.images) ? frame.images : []);

    // Before/After previews
    setBeforeFile(null);
    setBeforePreviewUrl(frame.beforeImage || "");
    setRemoveBeforeImage(false);

    setAfterFile(null);
    setAfterPreviewUrl(frame.afterImage || "");
    setRemoveAfterImage(false);

    setErrors({});
    setShowModal(true);
  };

  // Add fresh product images
  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImageFiles((prev) => [...prev, ...files]);
    }
  };

  // Remove existing saved image
  const handleRemoveExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Remove fresh image
  const handleRemoveNewImage = (idx) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Before Image select
  const handleBeforeImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforeFile(file);
      setBeforePreviewUrl(URL.createObjectURL(file));
      setRemoveBeforeImage(false);
    }
  };

  const handleClearBeforeImage = () => {
    setBeforeFile(null);
    setBeforePreviewUrl("");
    setRemoveBeforeImage(true);
    if (beforeInputRef.current) beforeInputRef.current.value = "";
  };

  // After Image select
  const handleAfterImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterFile(file);
      setAfterPreviewUrl(URL.createObjectURL(file));
      setRemoveAfterImage(false);
    }
  };

  const handleClearAfterImage = () => {
    setAfterFile(null);
    setAfterPreviewUrl("");
    setRemoveAfterImage(true);
    if (afterInputRef.current) afterInputRef.current.value = "";
  };

  // Toggle Active/Inactive inline
  const handleToggleActive = async (frameId) => {
    try {
      const res = await fetch(`${API}/anime-frames/${frameId}/toggle-active`, {
        method: "PATCH",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setFrames((prev) =>
          prev.map((f) => (f.id === frameId ? { ...f, isActive: data.isActive } : f))
        );
        toast.success(`Product ${data.isActive ? "Activated" : "Deactivated"} successfully`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error updating status");
    }
  };

  // Delete product
  const handleDelete = async (frameId) => {
    try {
      const res = await fetch(`${API}/anime-frames/${frameId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
        toast.success("Anime frame deleted successfully");
        setDeleteConfirmId(null);
      } else {
        toast.error("Failed to delete anime frame");
      }
    } catch {
      toast.error("Network error deleting anime frame");
    }
  };

  // Create new category in AnimeCategory table in real time
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setCreatingCat(true);
    try {
      const formData = new FormData();
      formData.append("name", newCatName.trim());

      const res = await fetch(`${API}/anime-categories`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (res.ok) {
        const created = await res.json();
        toast.success(`Category "${created.name}" created and added to store!`);
        // Immediately add to animeCategories state
        setAnimeCategories((prev) => [...prev, created]);
        // Set as active selection in the form
        setForm((prev) => ({ ...prev, animeSeries: created.name }));
        setUnmatchedSeries("");
        setNewCatName("");
        setShowAddCatInput(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create category");
      }
    } catch {
      toast.error("Network error while creating category");
    } finally {
      setCreatingCat(false);
    }
  };

  // Validate form
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Product name is required";
    if (!form.price || parseFloat(form.price) <= 0) errs.price = "Valid price is required";

    if (!form.animeSeries.trim()) {
      errs.animeSeries = "Please select a category from your Admin Anime Categories";
    }

    if (existingImages.length === 0 && newImageFiles.length === 0) {
      errs.images = "At least one product gallery image is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save (Create or Edit)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("animeSeries", form.animeSeries.trim());
      formData.append("price", form.price);
      if (form.originalPrice) formData.append("originalPrice", form.originalPrice);
      formData.append("badge", (form.badge || "").trim());
      formData.append("isActive", form.isActive);
      formData.append("description", (form.description || "").trim());
      formData.append("returnExchangeInfo", (form.returnExchangeInfo || "").trim());

      const keywordsArr = (form.keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      formData.append("keywords", JSON.stringify(keywordsArr));

      // Existing images to keep
      formData.append("existingImages", JSON.stringify(existingImages));

      // New product gallery images
      newImageFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Before Image
      if (beforeFile) {
        formData.append("beforeImage", beforeFile);
      } else if (removeBeforeImage) {
        formData.append("removeBeforeImage", "true");
      } else if (beforePreviewUrl && !beforePreviewUrl.startsWith("blob:")) {
        formData.append("beforeImageUrl", beforePreviewUrl);
      }

      // After Image
      if (afterFile) {
        formData.append("afterImage", afterFile);
      } else if (removeAfterImage) {
        formData.append("removeAfterImage", "true");
      } else if (afterPreviewUrl && !afterPreviewUrl.startsWith("blob:")) {
        formData.append("afterImageUrl", afterPreviewUrl);
      }

      // Sizes / Variants
      formData.append("sizes", JSON.stringify(form.sizes));

      const isEdit = Boolean(editingFrame?.id);
      const url = isEdit ? `${API}/anime-frames/${editingFrame.id}` : `${API}/anime-frames`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (res.ok) {
        toast.success(`Anime frame ${isEdit ? "updated" : "created"} successfully!`);
        setShowModal(false);
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save anime frame");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Network error while saving anime frame");
    } finally {
      setSaving(false);
    }
  };

  // Filtered frames
  const filteredFrames = useMemo(() => {
    return frames.filter((f) => {
      const matchSearch =
        !search.trim() ||
        (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.animeSeries || "").toLowerCase().includes(search.toLowerCase());

      let matchSeries = true;
      if (selectedSeriesFilter === "All") {
        matchSeries = true;
      } else if (selectedSeriesFilter === "__uncategorized__") {
        matchSeries =
          !f.animeSeries ||
          !realCategories.some((rc) => rc.toLowerCase() === (f.animeSeries || "").toLowerCase());
      } else {
        matchSeries =
          (f.animeSeries || "").toLowerCase() === selectedSeriesFilter.toLowerCase();
      }

      return matchSearch && matchSeries;
    });
  }, [frames, search, selectedSeriesFilter, realCategories]);

  const activeCount = useMemo(() => frames.filter((f) => f.isActive).length, [frames]);
  const comparisonCount = useMemo(
    () => frames.filter((f) => f.beforeImage && f.afterImage).length,
    [frames]
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6 bg-white min-h-[calc(100vh-80px)] text-gray-900">
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
              Anime Frames
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              Dedicated Section
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Anime Frame catalog, illumination Before/After sliders, prices, and visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/anime-categories"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <span>Manage Categories</span>
            <span className="text-xs text-gray-400">→</span>
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Anime Frame</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Chips ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-1">
            Total Anime Frames
          </span>
          <span className="text-2xl font-bold text-gray-900 font-display">
            {frames.length}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-emerald-600 font-semibold block mb-1">
            Active in Store
          </span>
          <span className="text-2xl font-bold text-emerald-700 font-display">
            {activeCount}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-1">
            Inactive / Drafts
          </span>
          <span className="text-2xl font-bold text-gray-600 font-display">
            {frames.length - activeCount}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-amber-600 font-semibold block mb-1">
            With Before / After
          </span>
          <span className="text-2xl font-bold text-amber-700 font-display">
            {comparisonCount}
          </span>
        </div>
      </div>

      {/* ─── Filters & Search ──────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anime frames by name or category..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider shrink-0">
            Category Filter:
          </span>
          <select
            value={selectedSeriesFilter}
            onChange={(e) => setSelectedSeriesFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:border-black"
          >
            <option value="All">All Categories ({frames.length})</option>
            {realCategories.map((c) => {
              const count = frames.filter(
                (f) => (f.animeSeries || "").toLowerCase() === c.toLowerCase()
              ).length;
              return (
                <option key={c} value={c}>
                  {c} ({count})
                </option>
              );
            })}
            {frames.some(
              (f) =>
                !f.animeSeries ||
                !realCategories.some(
                  (rc) => rc.toLowerCase() === (f.animeSeries || "").toLowerCase()
                )
            ) && (
              <option value="__uncategorized__">
                Unlinked / Other (
                {
                  frames.filter(
                    (f) =>
                      !f.animeSeries ||
                      !realCategories.some(
                        (rc) => rc.toLowerCase() === (f.animeSeries || "").toLowerCase()
                      )
                  ).length
                }
                )
              </option>
            )}
          </select>
        </div>
      </div>

      {/* ─── Products Table ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center bg-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading Anime Frames...</p>
          </div>
        ) : filteredFrames.length === 0 ? (
          <div className="p-12 text-center bg-white">
            <div className="text-4xl mb-3">🖼️</div>
            <h3 className="font-bold text-lg text-gray-900">No Anime Frames Found</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {search || selectedSeriesFilter !== "All"
                ? "Try clearing your filters or search term."
                : "Create your first Anime Frame product to display on the Anime Frames page."}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-black text-white hover:bg-neutral-800"
            >
              Add New Frame
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-4">Frame</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Before / After Slider</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredFrames.map((frame) => {
                  const hasBeforeAfter = Boolean(frame.beforeImage && frame.afterImage);
                  const firstImg = frame.images?.[0] || "";
                  const minP = frame.minPrice || frame.price || 699;
                  const isLinkedCategory = realCategories.some(
                    (rc) => rc.toLowerCase() === (frame.animeSeries || "").toLowerCase()
                  );

                  return (
                    <tr
                      key={frame.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Product Thumbnail + Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {firstImg ? (
                              <img
                                src={firstImg}
                                alt={frame.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                No img
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                              {frame.name}
                            </div>
                            {frame.badge && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-gray-100 text-gray-800 border border-gray-200">
                                {frame.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        {isLinkedCategory ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            {frame.animeSeries}
                          </span>
                        ) : frame.animeSeries ? (
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-block"
                            title="This name is not in your Admin Anime Categories list"
                          >
                            {frame.animeSeries} (Unlinked)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No category
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div>₹{Number(minP).toLocaleString("en-IN")}</div>
                        {frame.originalPrice && (
                          <div className="text-xs text-gray-400 line-through">
                            ₹{Number(frame.originalPrice).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Before / After status */}
                      <td className="py-3 px-4">
                        {hasBeforeAfter ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Slider</span>
                          </div>
                        ) : frame.beforeImage || frame.afterImage ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <span>1 of 2 Uploaded</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-normal">
                            Not added
                          </span>
                        )}
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(frame.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            frame.isActive ? "bg-emerald-600" : "bg-gray-300"
                          }`}
                          role="switch"
                          aria-checked={frame.isActive}
                          title={frame.isActive ? "Click to Deactivate" : "Click to Activate"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              frame.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="block text-[10px] text-gray-500 font-medium mt-0.5">
                          {frame.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(frame)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(frame.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Delete Confirmation Modal ─────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 border border-gray-200 shadow-2xl text-gray-900">
            <h3 className="font-bold text-lg text-gray-900">Delete Anime Frame?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to permanently delete this anime frame product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm"
              >
                Delete Frame
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Anime Frame Modal ──────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-white p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-gray-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-display">
                  {editingFrame ? "Edit Anime Frame" : "Create New Anime Frame"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Products managed here automatically appear in the Anime Frames catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Product Name & Real-time Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Gojo Satoru — Unlimited Void"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Category *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCatInput((prev) => !prev)}
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        {showAddCatInput ? "✕ Close" : "+ Quick Add Category"}
                      </button>
                      <Link
                        to="/admin/anime-categories"
                        target="_blank"
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline font-medium"
                      >
                        Manage ↗
                      </Link>
                    </div>
                  </div>

                  {/* Inline Quick Add Category Input */}
                  {showAddCatInput && (
                    <div className="mb-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex gap-2 items-center">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="New category name (e.g. naruto, etc.)..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateCategory();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={creatingCat || !newCatName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 shrink-0"
                      >
                        {creatingCat && (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                        )}
                        <span>Save Category</span>
                      </button>
                    </div>
                  )}

                  {/* Category Select: ONLY real categories added by admin in Anime Categories */}
                  <select
                    value={form.animeSeries}
                    onChange={(e) => {
                      setForm({ ...form, animeSeries: e.target.value });
                      setUnmatchedSeries("");
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">-- Select Category --</option>
                    {realCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Previous Unmatched notice if editing old product */}
                  {unmatchedSeries && (
                    <div className="text-[11px] text-amber-800 mt-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      Previous value was <strong>&quot;{unmatchedSeries}&quot;</strong>, which is not in your Admin Anime Categories. Please select one of your real categories above or click &quot;+ Quick Add Category&quot; to add it.
                    </div>
                  )}

                  {realCategories.length === 0 && !showAddCatInput && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      No categories found in Admin Anime Categories. Click &quot;+ Quick Add Category&quot; above to create one.
                    </p>
                  )}
                  {errors.animeSeries && <p className="text-xs text-red-500 mt-1">{errors.animeSeries}</p>}
                </div>
              </div>

              {/* Price, Sale Price, Badge, Active */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="699"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Original MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                    placeholder="1299"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="HOT / BESTSELLER"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Active Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors ${
                      form.isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-gray-100 border-gray-300 text-gray-600"
                    }`}
                  >
                    {form.isActive ? "✓ Active (Visible)" : "✕ Inactive (Hidden)"}
                  </button>
                </div>
              </div>

              {/* ─── Product Images Gallery ──────────────────────────────── */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                    Product Gallery Images *
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Add Images
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddImages}
                  className="hidden"
                />

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div>
                    <span className="text-[11px] text-gray-500 block mb-1.5 font-medium">
                      Current Saved Images ({existingImages.length}):
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {existingImages.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200 bg-white">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fresh New Images */}
                {newImageFiles.length > 0 && (
                  <div>
                    <span className="text-[11px] text-emerald-600 font-medium block mb-1.5">
                      New Images to Upload ({newImageFiles.length}):
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {newImageFiles.map((file, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-emerald-400 bg-white">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {existingImages.length === 0 && newImageFiles.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-black transition-colors bg-white"
                  >
                    <div className="text-2xl mb-1">📸</div>
                    <p className="text-xs text-gray-600 font-medium">
                      Click to browse or drop images for this Anime Frame
                    </p>
                  </div>
                )}
                {errors.images && <p className="text-xs text-red-500">{errors.images}</p>}
              </div>

              {/* ─── Before & After Lighting Images (Optional) ─────────── */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Illumination Comparison Slider (Optional)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                      High Impact Feature
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1">
                    Upload &quot;Before&quot; (Lights Off / unlit) and &quot;After&quot; (LED Lit / glowing) images to automatically activate the draggable comparison slider on the Product Details page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BEFORE IMAGE BOX */}
                  <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        1. Before Image (Lights Off)
                      </span>
                      {beforePreviewUrl && (
                        <button
                          type="button"
                          onClick={handleClearBeforeImage}
                          className="text-[11px] font-semibold text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={beforeInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBeforeImageChange}
                      className="hidden"
                    />

                    {beforePreviewUrl ? (
                      <div className="relative aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={beforePreviewUrl} alt="Before" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => beforeInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Replace Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beforeInputRef.current?.click()}
                        className="w-full py-6 rounded-lg border border-dashed border-gray-300 text-center hover:border-black transition-colors bg-gray-50/50"
                      >
                        <span className="text-lg block">🌑</span>
                        <span className="text-xs font-semibold text-gray-600">
                          Upload Before Image
                        </span>
                      </button>
                    )}
                  </div>

                  {/* AFTER IMAGE BOX */}
                  <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        2. After Image (LED Glowing)
                      </span>
                      {afterPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleClearAfterImage}
                          className="text-[11px] font-semibold text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={afterInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAfterImageChange}
                      className="hidden"
                    />

                    {afterPreviewUrl ? (
                      <div className="relative aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden border border-amber-300 group">
                        <img src={afterPreviewUrl} alt="After" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => afterInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Replace Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => afterInputRef.current?.click()}
                        className="w-full py-6 rounded-lg border border-dashed border-gray-300 text-center hover:border-amber-500 transition-colors bg-gray-50/50"
                      >
                        <span className="text-lg block">💡</span>
                        <span className="text-xs font-semibold text-gray-600">
                          Upload After Image
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LIVE BEFORE/AFTER MINI PREVIEW */}
                {beforePreviewUrl && afterPreviewUrl && (
                  <div className="pt-2 border-t border-amber-200">
                    <span className="text-xs font-bold text-amber-900 block mb-2">
                      Live Admin Slider Preview:
                    </span>
                    <div className="max-w-xs mx-auto">
                      <BeforeAfterSlider
                        beforeImage={beforePreviewUrl}
                        afterImage={afterPreviewUrl}
                        productName={form.name || "Preview"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description & Return Exchange Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product details, acrylic specs, LED illumination details..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Return &amp; Exchange Information
                  </label>
                  <textarea
                    rows={4}
                    value={form.returnExchangeInfo}
                    onChange={(e) => setForm({ ...form, returnExchangeInfo: e.target.value })}
                    placeholder="e.g. 7-Day Free Replacement for transit flaws or electrical defect..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                  <span>{editingFrame ? "Save Changes" : "Create Anime Frame"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
