/**
 * Hang tutorial MP4 — must exist on the storefront host as a real file (not SPA HTML).
 * Hostinger: upload to public_html/videos/hang-frame.mp4 (no spaces in folder names).
 */
export const HARDPRINT_VIDEO_URL =
  import.meta.env.VITE_HARDPRINT_VIDEO_URL || "/videos/hang-frame.mp4";

export const HARDPRINT_VIDEO_TITLE = "How to hang the frame";