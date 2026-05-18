import { useMemo, useRef, useState } from "react";
import { parseCustomizationImageUrls } from "../utils/customization";

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-semibold text-red-700 customization-error-shake" role="alert">
      {message}
    </p>
  );
}

export default function CustomizationSection({
  settings,
  value,
  onChange,
  errors = {},
  onFilesSelected,
  onRemoveImage,
  onClearImages,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const imageUrls = useMemo(() => parseCustomizationImageUrls(value?.customImageUrl || value?.customImageUrls), [value?.customImageUrl, value?.customImageUrls]);
  const nameRemaining = settings?.maxNameChars ? Math.max(settings.maxNameChars - (value?.customName?.length || 0), 0) : null;
  const messageRemaining = settings?.maxMessageChars ? Math.max(settings.maxMessageChars - (value?.customMessage?.length || 0), 0) : null;

  const openPicker = () => inputRef.current?.click();

  const handleFiles = async (files) => {
    const selected = Array.from(files || []).filter(Boolean);
    if (!selected.length) return;
    await onFilesSelected?.(selected);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasImageError = Boolean(errors.customImages);

  return (
    <div className="space-y-4 border-t border-black/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#1a1c1d]">Personalize Your Order</p>
          <p className="mt-1 text-xs text-[#474747]">
            {settings?.nameRequired ? "Name is required." : "Name is optional."} {settings?.messageRequired ? "Message is required." : "Message is optional."}
          </p>
        </div>
        {onClearImages && imageUrls.length > 0 ? (
          <button
            type="button"
            onClick={onClearImages}
            disabled={disabled}
            className="text-xs font-semibold underline underline-offset-4 disabled:opacity-40"
          >
            Clear images
          </button>
        ) : null}
      </div>

      <div>
        <input
          type="text"
          value={value?.customName || ""}
          onChange={(e) => onChange?.({ customName: e.target.value })}
          maxLength={settings?.maxNameChars || undefined}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          placeholder={settings?.namePlaceholder || "Enter name"}
          disabled={disabled}
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-[#474747]">
          <span>{settings?.nameRequired ? "Required" : "Optional"}</span>
          {nameRemaining != null ? <span>{nameRemaining} chars left</span> : <span>Unlimited</span>}
        </div>
        <FieldError message={errors.customName} />
      </div>

      <div>
        <textarea
          value={value?.customMessage || ""}
          onChange={(e) => onChange?.({ customMessage: e.target.value })}
          maxLength={settings?.maxMessageChars || undefined}
          rows={3}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          placeholder={settings?.messagePlaceholder || "Enter message"}
          disabled={disabled}
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-[#474747]">
          <span>{settings?.messageRequired ? "Required" : "Optional"}</span>
          {messageRemaining != null ? <span>{messageRemaining} chars left</span> : <span>Unlimited</span>}
        </div>
        <FieldError message={errors.customMessage} />
      </div>

      <div
        className={`rounded-2xl border-2 border-dashed p-4 transition ${dragActive ? "border-black bg-white" : "border-black/15 bg-white/70"} ${hasImageError ? "customization-error-shake" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragActive(false);
          await handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={(settings?.allowedImageTypes || ["jpg", "png", "webp"]).map((type) => `image/${type === "jpg" ? "jpeg" : type}`).join(",")}
          multiple
          disabled={disabled}
          onChange={async (e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="w-full rounded-xl border border-black/10 bg-[#f3f3f5] px-4 py-4 text-left text-sm font-medium disabled:opacity-50"
        >
          <span className="block font-semibold text-[#1a1c1d]">Drag and drop images here or click to upload</span>
          <span className="block text-xs text-[#474747]">
            Up to {settings?.maxUploadImages || 3} image(s), {settings?.maxImageSizeMb || 5}MB each
          </span>
        </button>
        <FieldError message={errors.customImages} />

        {imageUrls.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {imageUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-black/10 bg-white">
                <img src={url} alt={`Customization ${index + 1}`} className="h-28 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage?.(index)}
                  disabled={disabled}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-white opacity-90 transition group-hover:opacity-100 disabled:opacity-40"
                  aria-label={`Remove customization image ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}