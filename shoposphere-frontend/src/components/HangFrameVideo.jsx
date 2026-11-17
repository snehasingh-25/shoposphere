import { useState } from "react";
import { HARDPRINT_VIDEO_URL } from "../constants/hardprintVideo";

export default function HangFrameVideo({ videoRef, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-left text-sm text-amber-950 ${className}`}
      >
        <p className="font-semibold mb-1">Video could not be loaded</p>
        <p className="text-amber-900/90 leading-relaxed">
          Upload <code className="text-xs bg-white/80 px-1 rounded">hang-frame.mp4</code> to{" "}
          <code className="text-xs bg-white/80 px-1 rounded">public_html/videos/</code> on Hostinger, then open{" "}
          <a href={HARDPRINT_VIDEO_URL} className="underline font-medium" target="_blank" rel="noopener noreferrer">
            {HARDPRINT_VIDEO_URL}
          </a>{" "}
          in the browser — it must play the video file, not the shop homepage.
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={HARDPRINT_VIDEO_URL}
      className={className}
      controls
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}