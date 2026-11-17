import { useRef } from "react";

/**
 * Admin before/after uploads for the PDP illumination comparison slider.
 */
export default function BeforeAfterImageFields({
  beforePreviewUrl,
  afterPreviewUrl,
  onBeforeChange,
  onAfterChange,
  onClearBefore,
  onClearAfter,
}) {
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4 md:p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-amber-950">Before &amp; after illumination slider</h3>
        <p className="text-xs text-amber-900/80 mt-1 max-w-2xl">
          Upload both images to show the draggable comparison on the product page. Lights-off = before, LED glow = after.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BeforeAfterSlot
          label="1. Before (lights off)"
          previewUrl={beforePreviewUrl}
          inputRef={beforeInputRef}
          onFileChange={onBeforeChange}
          onClear={onClearBefore}
          emptyEmoji="🌑"
        />
        <BeforeAfterSlot
          label="2. After (LED glow)"
          previewUrl={afterPreviewUrl}
          inputRef={afterInputRef}
          onFileChange={onAfterChange}
          onClear={onClearAfter}
          emptyEmoji="✨"
        />
      </div>
    </div>
  );
}

function BeforeAfterSlot({ label, previewUrl, inputRef, onFileChange, onClear, emptyEmoji }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-neutral-800">{label}</span>
        {previewUrl ? (
          <button type="button" onClick={onClear} className="text-[11px] font-semibold text-red-600 hover:underline">
            Remove
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      {previewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="block w-full aspect-square max-h-40 rounded-lg overflow-hidden border border-neutral-200"
        >
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-8 rounded-lg border border-dashed border-neutral-300 text-center hover:border-black transition-colors"
        >
          <span className="text-xl block">{emptyEmoji}</span>
          <span className="text-xs font-medium text-neutral-600">Upload image</span>
        </button>
      )}
    </div>
  );
}