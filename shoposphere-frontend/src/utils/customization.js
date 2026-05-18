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

function createDefaultCustomizationSettings() {
  return {
    ...DEFAULT_CUSTOMIZATION_SETTINGS,
    allowedImageTypes: [...DEFAULT_CUSTOMIZATION_SETTINGS.allowedImageTypes],
  };
}

function normalizeOptionalInt(value) {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
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

  const allowedImageTypes = Array.isArray(input.allowedImageTypes)
    ? input.allowedImageTypes
    : typeof input.allowedImageTypes === "string"
      ? input.allowedImageTypes.split(",")
      : DEFAULT_CUSTOMIZATION_SETTINGS.allowedImageTypes;

  const cleanedTypes = [...new Set(
    allowedImageTypes
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => ["jpg", "png", "webp"].includes(item))
  )];

  return {
    enabled: Boolean(input.enabled),
    maxNameChars: normalizeOptionalInt(input.maxNameChars),
    maxMessageChars: normalizeOptionalInt(input.maxMessageChars),
    maxUploadImages: Math.min(Math.max(Number.parseInt(input.maxUploadImages, 10) || 3, 1), 10),
    allowedImageTypes: cleanedTypes.length > 0 ? cleanedTypes : [...DEFAULT_CUSTOMIZATION_SETTINGS.allowedImageTypes],
    maxImageSizeMb: Math.min(Math.max(Number.parseInt(input.maxImageSizeMb, 10) || 5, 1), 50),
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
  createDefaultCustomizationSettings,
  getCustomizationPreviewUrl,
  normalizeCustomizationSettings,
  parseCustomizationImageUrls,
};