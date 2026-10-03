import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "../api";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

const SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "webp"];
const ACCEPT_STRING = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const DEFAULT_DESIGNS = [
  {
    id: 1,
    name: "Standard Acrylic",
    priceOffset: 0,
    badge: "Classic",
    description: "Ultra-sleek frameless cast optical acrylic with polished beveled edges.",
  },
  {
    id: 2,
    name: "Neon Glow",
    priceOffset: 450,
    badge: "Otaku Favorite",
    description: "USB ambient neon backlight that illuminates the anime artwork in the dark.",
  },
  {
    id: 3,
    name: "3D",
    priceOffset: 350,
    badge: "Trending",
    description: "Multi-layered depth dimensional acrylic framing with floating pop-out visual effect.",
  },
];

export default function CustomAnimeFramePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Product and variants from backend DB
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // Frame designs from backend DB (Admin configurable)
  const [frameDesigns, setFrameDesigns] = useState(DEFAULT_DESIGNS);
  const [selectedDesignId, setSelectedDesignId] = useState(1);

  // Customization state
  const [selectedSizeLabel, setSelectedSizeLabel] = useState("A4");
  const [quantity, setQuantity] = useState(1);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSizeText, setFileSizeText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    document.title = "Customize Your Own Frame | Shoposphere";
    window.scrollTo(0, 0);

    // 1. Fetch products in anime-frames to retrieve authoritative DB prices & variants
    fetch(`${API}/products?category=anime-frames`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const found = data.find(
            (p) =>
              (p.name || "").trim().toLowerCase() === "customize your own frame" ||
              p.isCustomizable === true
          );
          if (found) {
            setProduct(found);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load custom frame product details:", err);
      })
      .finally(() => setLoadingProduct(false));

    // 2. Fetch available frame designs configured by admin
    fetch(`${API}/anime-frame-designs`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFrameDesigns(data);
          setSelectedDesignId(data[0].id);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_DESIGNS
      });

    return () => {
      document.title = "Shoposphere | Premium Gifts & Merchandise";
    };
  }, []);

  // Selected design helper
  const selectedDesign = useMemo(() => {
    return frameDesigns.find((d) => d.id === selectedDesignId) || frameDesigns[0] || DEFAULT_DESIGNS[0];
  }, [frameDesigns, selectedDesignId]);

  // Extract variants for A4 and A3 from backend product
  const variantsMap = useMemo(() => {
    const map = {
      A4: { id: null, label: "A4", price: 699, originalPrice: 1299, dimensions: "21 × 29.7 cm (8.3 × 11.7 in)", bestFor: "Desk, shelf & compact wall display" },
      A3: { id: null, label: "A3", price: 1099, originalPrice: 1749, dimensions: "29.7 × 42 cm (11.7 × 16.5 in)", bestFor: "Feature wall & bedroom statement piece" },
    };

    if (Array.isArray(product?.variants)) {
      for (const v of product.variants) {
        const lbl = String(v.sizeLabel || "").trim().toUpperCase();
        if (lbl === "A4" || lbl === "A3") {
          map[lbl] = {
            ...map[lbl],
            id: v.id,
            price: Number(v.price ?? map[lbl].price),
            originalPrice: v.originalPrice != null ? Number(v.originalPrice) : map[lbl].originalPrice,
          };
        }
      }
    }
    return map;
  }, [product?.variants]);

  const activeVariant = variantsMap[selectedSizeLabel] || variantsMap.A4;
  const baseSizePrice = activeVariant.price;
  const designPriceOffset = Number(selectedDesign?.priceOffset || 0);
  const currentPrice = baseSizePrice + designPriceOffset;
  const originalPrice = (activeVariant.originalPrice || 1299) + designPriceOffset;
  const discountPct =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : null;

  // Validate format
  const isValidFormat = (file) => {
    if (!file) return false;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();
    const matchesExt = SUPPORTED_FORMATS.includes(ext);
    const matchesMime =
      mime === "image/jpeg" ||
      mime === "image/png" ||
      mime === "image/webp" ||
      mime.startsWith("image/");
    return matchesExt || matchesMime;
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!isValidFormat(file)) {
      setUploadError("Please upload a JPG, JPEG, PNG, or WEBP image.");
      toast.error("Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }

    setUploadError("");
    setFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSizeText(`${sizeMb} MB`);

    // Immediate local preview so customer sees the thumbnail instantly
    const localUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("customImage", file);

      const res = await fetch(`${API}/cart/customization-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setUploadedImageUrl(data.imageUrl);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImageUrl("");
    setLocalPreviewUrl("");
    setFileName("");
    setFileSizeText("");
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReplaceImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddToCart = async () => {
    if (!uploadedImageUrl && !localPreviewUrl) {
      setUploadError("Please upload your image before adding to cart.");
      toast.error("Please upload your image first.");
      const uploaderElem = document.getElementById("custom-image-uploader");
      if (uploaderElem) {
        uploaderElem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (uploading) {
      toast.info("Image is still uploading, please wait a moment...");
      return;
    }

    const effectiveImageUrl = uploadedImageUrl || localPreviewUrl;
    if (!effectiveImageUrl) {
      toast.error("Please upload an image to continue.");
      return;
    }

    setIsAddingToCart(true);

    try {
      const cartProduct = product || {
        id: 938,
        name: "Customize Your Own Frame",
        price: currentPrice,
        images: ["/custom-anime-frame.jpg"],
        isCustomizable: true,
      };

      const selectedVariant = {
        id: activeVariant.id,
        sizeLabel: selectedSizeLabel,
        price: currentPrice,
        originalPrice,
      };

      // Pass selected design name in customMessage for cart and order persistence
      const ok = await addToCart(
        cartProduct,
        selectedVariant,
        quantity,
        {
          customImageUrl: effectiveImageUrl,
          customImageUrls: [effectiveImageUrl],
          customMessage: `Design: ${selectedDesign.name}`,
        }
      );

      if (ok) {
        toast.success(`Added ${selectedSizeLabel} Frame (${selectedDesign.name}) to cart!`);
        navigate("/cart");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      toast.error("Failed to add custom frame to cart.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-900 pb-20">
      {/* ─── BREADCRUMB ────────────────────────────────────────────────── */}
      <div className="border-b border-black/5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/anime-frames" className="hover:text-slate-900 transition-colors">
              Anime Frames
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Customize Your Own Frame</span>
          </nav>

          <Link
            to="/anime-frames"
            className="hidden sm:inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-black transition-colors"
          >
            ← Back to Anime Frames
          </Link>
        </div>
      </div>

      {/* ─── MAIN PRODUCT CUSTOMIZER ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ─── LEFT COLUMN: PRODUCT VISUALS (NO LIVE PREVIEW) ─────────── */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-black/10 shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
              <img
                src="/custom-anime-frame.jpg"
                alt="Customize Your Own Frame sample preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-black/90 text-white shadow-md backdrop-blur-sm flex items-center gap-1.5 border border-white/20">
                  <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                  Custom Made For You
                </span>
                {selectedDesign && (
                  <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-indigo-600 text-white shadow-md flex items-center gap-1">
                    Design: {selectedDesign.name}
                  </span>
                )}
              </div>
            </div>

            {/* Quality assurances strip */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Material</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">4mm Cast Acrylic</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Design Style</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedDesign.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dispatch</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Next Day</p>
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: CUSTOMIZATION STEPS & ADD TO CART ────────── */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] space-y-7">
            {/* Header info */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Custom Order Available
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Customize Your Own Frame
              </h1>

              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Upload your favorite anime image, select your size and frame design ({frameDesigns.map((d) => d.name).join(", ")}). Printed with crystal-clear high-density UV pigments.
              </p>

              {/* Dynamic Price Display */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900">
                  ₹{Number(currentPrice).toLocaleString("en-IN")}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-base text-slate-400 line-through">
                    ₹{Number(originalPrice).toLocaleString("en-IN")}
                  </span>
                )}
                {discountPct && (
                  <span className="px-2 py-0.5 text-xs font-black rounded bg-emerald-100 text-emerald-800">
                    {discountPct}% OFF
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  (Includes {selectedSizeLabel} + {selectedDesign.name})
                </span>
              </div>
            </div>

            <hr className="border-black/5" />

            {/* ─── STEP 1: UPLOAD IMAGE ───────────────────────────────── */}
            <div id="custom-image-uploader" className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    1
                  </span>
                  Upload Your Image
                  <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs font-semibold text-slate-500">
                  JPG, JPEG, PNG, WEBP
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              {/* Image Preview Thumbnail if uploaded */}
              {localPreviewUrl ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Simple Confirmation Thumbnail */}
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-black/15 bg-white shadow-sm">
                      <img
                        src={localPreviewUrl}
                        alt="Uploaded artwork thumbnail"
                        className="w-full h-full object-cover"
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 grid place-items-center">
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{uploading ? "Uploading image..." : "Image Selected"}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 truncate mt-0.5">{fileName || "custom-image"}</p>
                      {fileSizeText && <p className="text-[11px] text-slate-500">{fileSizeText}</p>}
                    </div>
                  </div>

                  {/* Actions: Replace / Remove */}
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                    <button
                      type="button"
                      onClick={handleReplaceImage}
                      disabled={uploading}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Dropzone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    dragActive
                      ? "border-black bg-slate-100"
                      : "border-black/20 hover:border-black/50 bg-[#fafafa]"
                  }`}
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">
                    Click to browse or drag & drop your image
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Supported: JPG, JPEG, PNG, WEBP (up to 25MB)
                  </p>
                </div>
              )}

              {uploadError && (
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {uploadError}
                </p>
              )}
            </div>

            <hr className="border-black/5" />

            {/* ─── STEP 2: SELECT SIZE (A4 & A3) ─────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    2
                  </span>
                  Select Frame Size
                </label>
                <span className="text-xs text-slate-500">A4 & A3 Available</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* A4 Option */}
                <button
                  type="button"
                  onClick={() => setSelectedSizeLabel("A4")}
                  className={`relative p-4 rounded-xl text-left border-2 transition-all ${
                    selectedSizeLabel === "A4"
                      ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                      : "border-black/10 hover:border-black/30 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">A4 Size</span>
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(variantsMap.A4.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{variantsMap.A4.dimensions}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{variantsMap.A4.bestFor}</p>

                  {selectedSizeLabel === "A4" && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </button>

                {/* A3 Option */}
                <button
                  type="button"
                  onClick={() => setSelectedSizeLabel("A3")}
                  className={`relative p-4 rounded-xl text-left border-2 transition-all ${
                    selectedSizeLabel === "A3"
                      ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                      : "border-black/10 hover:border-black/30 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">A3 Size</span>
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(variantsMap.A3.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{variantsMap.A3.dimensions}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{variantsMap.A3.bestFor}</p>

                  {selectedSizeLabel === "A3" && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </button>
              </div>
            </div>

            <hr className="border-black/5" />

            {/* ─── STEP 3: SELECT FRAME DESIGN ────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    3
                  </span>
                  Select Frame Design
                </label>
                <span className="text-xs text-slate-500">
                  {frameDesigns.length} Styles Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {frameDesigns.map((d) => {
                  const isSelected = selectedDesignId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDesignId(d.id)}
                      className={`relative p-3.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                          : "border-black/10 hover:border-black/30 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-black text-slate-900">{d.name}</span>
                          {d.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                              {d.badge}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {d.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {d.priceOffset > 0 ? `+₹${Number(d.priceOffset).toLocaleString("en-IN")}` : "Included"}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                            <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-black/5" />

            {/* ─── QUANTITY & ADD TO CART ─────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Quantity
                </span>
                <div className="inline-flex items-center rounded-lg border border-black/15 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-black text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal preview */}
              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="font-semibold text-slate-600">Total Price</span>
                <span className="text-lg font-black text-slate-900">
                  ₹{Number(currentPrice * quantity).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Primary Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart || uploading}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-none font-bold text-sm tracking-wide text-white bg-[#1a1c1d] hover:brightness-110 active:scale-[0.99] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Add to Cart • ₹{Number(currentPrice * quantity).toLocaleString("en-IN")}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                🔒 Safe & encrypted checkout • Next Day Dispatch
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
