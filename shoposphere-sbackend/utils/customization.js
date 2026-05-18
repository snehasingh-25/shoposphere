const ALLOWED_IMAGE_TYPES = new Set(["jpg", "png", "webp"]);

const DEFAULT_CUSTOMIZATION_SETTINGS = {
  enabled: false,
  maxNameChars: 10,
  maxMessageChars: 10,
  maxUploadImages: 3,
  allowedImageTypes: ["jpg", "png", "webp"],
  maxImageSizeMb: 5,
  namePlaceholder: "Enter name",
  messagePlaceholder: "Enter message",
  nameRequired: false,
  messageRequired: false,
  imageRequired: false,
};

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeOptionalCharLimit(value) {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 5000);
}

function normalizeAllowedImageTypes(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const cleaned = [...new Set(list.map((item) => String(item || "").trim().toLowerCase()).filter((item) => ALLOWED_IMAGE_TYPES.has(item)))];
  return cleaned.length > 0 ? cleaned : [...DEFAULT_CUSTOMIZATION_SETTINGS.allowedImageTypes];
}

function normalizeCustomizationSettings(raw) {
  if (raw == null || raw === "") return null;

  let input = raw;
  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!input || typeof input !== "object") return null;

  return {
    enabled: Boolean(input.enabled),
    maxNameChars: normalizeOptionalCharLimit(input.maxNameChars),
    maxMessageChars: normalizeOptionalCharLimit(input.maxMessageChars),
    maxUploadImages: clampInt(input.maxUploadImages, 1, 10, DEFAULT_CUSTOMIZATION_SETTINGS.maxUploadImages),
    allowedImageTypes: normalizeAllowedImageTypes(input.allowedImageTypes),
    maxImageSizeMb: clampInt(input.maxImageSizeMb, 1, 50, DEFAULT_CUSTOMIZATION_SETTINGS.maxImageSizeMb),
    namePlaceholder: String(input.namePlaceholder || DEFAULT_CUSTOMIZATION_SETTINGS.namePlaceholder).trim() || DEFAULT_CUSTOMIZATION_SETTINGS.namePlaceholder,
    messagePlaceholder: String(input.messagePlaceholder || DEFAULT_CUSTOMIZATION_SETTINGS.messagePlaceholder).trim() || DEFAULT_CUSTOMIZATION_SETTINGS.messagePlaceholder,
    nameRequired: Boolean(input.nameRequired),
    messageRequired: Boolean(input.messageRequired),
    imageRequired: Boolean(input.imageRequired),
  };
}

function parseCustomizationImageUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // legacy single URL string
  }
  return [trimmed];
}

function getCustomizationPreviewUrl(raw) {
  return parseCustomizationImageUrls(raw)[0] || null;
}

export {
  DEFAULT_CUSTOMIZATION_SETTINGS,
  getCustomizationPreviewUrl,
  normalizeCustomizationSettings,
  parseCustomizationImageUrls,
};