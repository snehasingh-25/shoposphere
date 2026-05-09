const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getDelhiveryConfig() {
  return {
    apiToken: process.env.DELHIVERY_API_TOKEN || "",
    baseUrl: (process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com").replace(/\/$/, ""),
    clientName: process.env.DELHIVERY_CLIENT_NAME || "",
    pickupLocationName: process.env.DELHIVERY_PICKUP_LOCATION_NAME || "",
    requestTimeoutMs: toInt(process.env.DELHIVERY_REQUEST_TIMEOUT_MS, 10000),
  };
}

export function isDelhiveryConfigured(config = getDelhiveryConfig()) {
  return Boolean(config.apiToken && config.baseUrl && config.clientName && config.pickupLocationName);
}
