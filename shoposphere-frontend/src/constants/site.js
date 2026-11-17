/** Public storefront origin (no trailing slash) */
export const SITE_ORIGIN =
  (import.meta.env.VITE_PUBLIC_SITE_ORIGIN || "https://descko.in").replace(/\/$/, "");

export const SITE_HOST = (() => {
  try {
    return new URL(SITE_ORIGIN).host;
  } catch {
    return "descko.in";
  }
})();

export const API_BASE =
  (import.meta.env.VITE_API_URL || "https://api.descko.in").replace(/\/$/, "");

export const INSTAGRAM_HANDLE = import.meta.env.VITE_INSTAGRAM_HANDLE || "descko.in";