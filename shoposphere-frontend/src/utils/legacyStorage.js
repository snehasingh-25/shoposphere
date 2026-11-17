/** One-time copy of pre-rebrand localStorage keys (Shoposphere → Descko). */
const KEY_MIGRATIONS = [
  ["shoposphere-theme", "descko-theme"],
  ["shoposphere_cart_session", "descko_cart_session"],
  ["shoposphere_recently_viewed", "descko_recently_viewed"],
  ["shoposphere_guest_wishlist", "descko_guest_wishlist"],
  ["shoposphere_last_whatsapp_product", "descko_last_whatsapp_product"],
  ["shoposphere_last_whatsapp_price", "descko_last_whatsapp_price"],
];

export function migrateLegacyStorageKeys() {
  if (typeof window === "undefined" || !window.localStorage) return;

  for (const [legacy, next] of KEY_MIGRATIONS) {
    try {
      const value = localStorage.getItem(legacy);
      if (value != null && localStorage.getItem(next) == null) {
        localStorage.setItem(next, value);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("shoposphere:catOrder:")) {
        const nextKey = key.replace(/^shoposphere:/, "descko:");
        if (localStorage.getItem(nextKey) == null) {
          const value = localStorage.getItem(key);
          if (value != null) localStorage.setItem(nextKey, value);
        }
      }
    }
  } catch {
    /* ignore */
  }
}