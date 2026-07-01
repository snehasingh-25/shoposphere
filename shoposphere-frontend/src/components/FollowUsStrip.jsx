import { useLocation } from "react-router-dom";

const INSTAGRAM_URL = "https://www.instagram.com/shoposphere.in?igsh=MXQwMjRsNm9zamZyNQ==";

const HIDE_FOLLOW_STRIP = ["/cart", "/checkout", "/order-success"];

function shouldHideStrip(pathname) {
  return HIDE_FOLLOW_STRIP.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function FollowUsStrip() {
  const { pathname } = useLocation();

  if (shouldHideStrip(pathname)) return null;

  return (
    <section
      className="border-t border-design text-center py-8 px-4"
      style={{ background: "var(--background)" }}
      aria-label="Follow us on Instagram"
    >
      <p className="text-lg sm:text-xl tracking-wide" style={{ color: "var(--foreground)" }}>
        <span className="font-bold">Follow Us </span>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow shoposphere on Instagram"
          className="font-normal transition-opacity hover:opacity-80"
          style={{ color: "var(--primary)" }}
        >
          @shoposphere
        </a>
      </p>
    </section>
  );
}
