import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const INSTAGRAM_GLYPH_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";

const POLICIES = {
  shipping: {
    title: "Shipping Policy",
    subtitle: "Fast and reliable doorstep delivery across India",
    points: [
      {
        heading: "Processing Time",
        text: "Orders are verified and carefully prepared for shipment within 24 to 48 business hours.",
      },
      {
        heading: "Estimated Delivery",
        text: "Standard delivery generally arrives within 4 to 7 business days depending on destination pin code.",
      },
      {
        heading: "Free Shipping",
        text: "Complimentary standard shipping is provided on all prepaid orders nationwide.",
      },
      {
        heading: "Transit Protection",
        text: "All items are packed with reinforced cushioning to guarantee 100% damage-free delivery.",
      },
      {
        heading: "Order Tracking",
        text: "Real-time dispatch and tracking details are shared via SMS and WhatsApp once your order ships.",
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    subtitle: "Simple, transparent, and hassle-free returns",
    points: [
      {
        heading: "Easy 7-Day Returns",
        text: "Eligible products can be returned within 7 days of delivery through our concierge or support.",
      },
      {
        heading: "Hassle-Free Exchange",
        text: "Received a defective, damaged, or incorrect item? We will promptly arrange an exchange or replacement.",
      },
      {
        heading: "Refund Eligibility",
        text: "Approved refunds are credited directly to your original payment method within 5–7 business days.",
      },
      {
        heading: "COD Orders",
        text: "Cash on delivery refunds are transferred securely via verified UPI or direct bank account transfer.",
      },
      {
        heading: "Dedicated Support",
        text: "Our concierge team assists you every step of the way to resolve queries within 24 hours.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Your personal data is safe and protected",
    points: [
      {
        heading: "Data Privacy",
        text: "We collect only information essential to process orders, facilitate delivery, and offer support.",
      },
      {
        heading: "Secure Payments",
        text: "All payment transactions are encrypted and processed through certified, PCI-compliant payment partners.",
      },
      {
        heading: "Zero Data Sharing",
        text: "We never sell, rent, or trade your personal information with external marketing companies.",
      },
      {
        heading: "Account Security",
        text: "You retain full control over your saved addresses and profile details at all times.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "Standard guidelines for shopping with Shoposphere",
    points: [
      {
        heading: "Service Agreement",
        text: "By visiting or placing an order on Shoposphere, you agree to these terms and operating policies.",
      },
      {
        heading: "Product Accuracy",
        text: "We ensure accurate representation of artwork and items; subtle tonal variations may occur depending on screen calibration.",
      },
      {
        heading: "Pricing & Orders",
        text: "All listed pricing includes applicable taxes. We reserve the right to correct accidental listing inaccuracies.",
      },
      {
        heading: "Intellectual Property",
        text: "All original brand content, visual assets, and designs remain the exclusive property of Shoposphere.",
      },
    ],
  },
};

export default function Footer() {
  const [openSection, setOpenSection] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);

  // Close policy modal on Escape key
  useEffect(() => {
    if (!activePolicy) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActivePolicy(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePolicy]);

  const toggleSection = (sectionId) => {
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const linkMap = {
    "Home": "/",
    "Anime Frames": "/anime-frames",
    "Categories": "/categories",
    "New Arrivals": "/new",
    "About Us": "/about",
    "Contact": "/contact",
  };

  const contact = {
    phoneDisplay: "63778 02798",
    phoneE164: "+916377802798",
    email: "Shoposphere.in@gmail.com",
    address: "Near Sitaram Ji Ki Bawri, Bhilwara, Rajasthan 311001",
    instagram: "Shoposphere.in",
  };

  const categoryLinks = [
    { label: "Home", to: "/" },
    { label: "Categories", to: "/categories" },
    { label: "Anime Frames", to: "/anime-frames" },
    { label: "New Arrivals", to: "/new" },
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <footer className="mt-14 bg-design-secondary border-t border-design">
      {/* =========================================================================
          DESKTOP FOOTER (> 1024px)
          Pixel-for-pixel and functionally identical to original desktop footer.
          ========================================================================= */}
      <div className="footer-desktop-view px-2 sm:px-4 lg:px-6 py-[1.4rem]">
        {/* Brand Section - Left Side */}
        <div className="">
          <div className="flex items-start gap-2">
            <img
              src="/logo.png"
              alt="shoposphere"
              className="h-[2.1rem] w-auto"
            />
            <div className="flex flex-col">
              <h3 className="font-display text-xs font-extrabold tracking-wide mb-0.5 text-design-foreground">
                shoposphere
              </h3>
              {/* Instagram Link */}
              <a
                href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs transition-all duration-300 hover:translate-x-1 text-design-foreground hover:opacity-80"
              >
                @{contact.instagram}
              </a>
            </div>
          </div>
        </div>

        {/* 2-Column Grid - Works on Mobile Too */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-8 mb-2">
          {/* Quick Links - Left Side */}
          <div>
            <div className="space-y-1 text-xs">
              {Object.entries(linkMap).map(([label, path]) => (
                <Link
                  key={label}
                  to={path}
                  className="block transition-all duration-300 hover:translate-x-1 text-design-foreground hover:opacity-80"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect With Us - Right Side */}
          <div>
            <h4 className="font-display font-bold mb-2 text-base text-design-foreground">Connect With Us</h4>

            <div className="space-y-1 text-xs text-design-foreground">
              <p className="flex items-start gap-2">
                <span className="mt-0.5">📍</span>
                <span>{contact.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <span>📱</span>
                <a 
                  href={`tel:${contact.phoneE164}`}
                  className="hover:underline transition-all duration-300 text-design-foreground hover:opacity-80"
                >
                  {contact.phoneDisplay}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span>📧</span>
                <a 
                  href={`mailto:${contact.email}`}
                  className="hover:underline transition-all duration-300 text-design-foreground hover:opacity-80"
                >
                  {contact.email}
                </a>
              </p>
            </div>

            {/* Social Icons */}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-design pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-design-foreground/80">
          <p className="font-medium text-xs text-design-foreground/75">
            Giftchoice is Parental firm of Shoposphere
          </p>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <a
              href="https://www.instagram.com/qyverra.it?igsh=MTV5a2pzdGNxNjIzdg=="
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-all duration-300 hover:underline hover:opacity-80"
            >
              Qyverra
            </a>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE & TABLET FOOTER (<= 1024px)
          Compact accordion layout inspired by reference image.
          ========================================================================= */}
      <div className="footer-mobile-tablet-view w-full px-4 sm:px-6 md:px-8 py-5 sm:py-6">
        <div className="w-full border-t border-design">
          {/* SECTION 1: CATEGORIES */}
          <div className="border-b border-design">
            <button
              type="button"
              onClick={() => toggleSection("categories")}
              aria-expanded={openSection === "categories"}
              aria-controls="footer-accordion-categories"
              id="footer-trigger-categories"
              className="w-full flex items-center justify-between py-3.5 sm:py-4 text-left transition-colors duration-200 select-none cursor-pointer"
            >
              <span className="font-display text-[13px] sm:text-sm font-bold tracking-wider uppercase text-design-foreground">
                CATEGORIES
              </span>
              <span
                className={`ml-4 text-design-foreground transition-transform duration-300 ease-out flex items-center justify-center ${
                  openSection === "categories" ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden
              >
                <svg
                  className="w-4 h-4 text-design-foreground/75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            <div
              id="footer-accordion-categories"
              role="region"
              aria-labelledby="footer-trigger-categories"
              className={`footer-accordion-content ${openSection === "categories" ? "is-open" : ""}`}
            >
              <div className="footer-accordion-inner">
                <ul className="space-y-2.5 text-xs sm:text-[13px] pt-1 pb-4">
                  {categoryLinks.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        className="text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 2: INFORMATION */}
          <div className="border-b border-design">
            <button
              type="button"
              onClick={() => toggleSection("information")}
              aria-expanded={openSection === "information"}
              aria-controls="footer-accordion-information"
              id="footer-trigger-information"
              className="w-full flex items-center justify-between py-3.5 sm:py-4 text-left transition-colors duration-200 select-none cursor-pointer"
            >
              <span className="font-display text-[13px] sm:text-sm font-bold tracking-wider uppercase text-design-foreground">
                INFORMATION
              </span>
              <span
                className={`ml-4 text-design-foreground transition-transform duration-300 ease-out flex items-center justify-center ${
                  openSection === "information" ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden
              >
                <svg
                  className="w-4 h-4 text-design-foreground/75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            <div
              id="footer-accordion-information"
              role="region"
              aria-labelledby="footer-trigger-information"
              className={`footer-accordion-content ${openSection === "information" ? "is-open" : ""}`}
            >
              <div className="footer-accordion-inner">
                <ul className="space-y-2.5 text-xs sm:text-[13px] pt-1 pb-4">
                  <li>
                    <Link
                      to="/about"
                      className="text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1"
                    >
                      About Us
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("shipping")}
                      className="text-left text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1 cursor-pointer"
                    >
                      Shipping Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("refund")}
                      className="text-left text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1 cursor-pointer"
                    >
                      Refund Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("privacy")}
                      className="text-left text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1 cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy("terms")}
                      className="text-left text-design-foreground/80 hover:text-design-foreground transition-all duration-200 inline-block py-0.5 hover:translate-x-1 cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT US */}
          <div className="border-b border-design">
            <button
              type="button"
              onClick={() => toggleSection("contact")}
              aria-expanded={openSection === "contact"}
              aria-controls="footer-accordion-contact"
              id="footer-trigger-contact"
              className="w-full flex items-center justify-between py-3.5 sm:py-4 text-left transition-colors duration-200 select-none cursor-pointer"
            >
              <span className="font-display text-[13px] sm:text-sm font-bold tracking-wider uppercase text-design-foreground">
                CONTACT US
              </span>
              <span
                className={`ml-4 text-design-foreground transition-transform duration-300 ease-out flex items-center justify-center ${
                  openSection === "contact" ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden
              >
                <svg
                  className="w-4 h-4 text-design-foreground/75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            <div
              id="footer-accordion-contact"
              role="region"
              aria-labelledby="footer-trigger-contact"
              className={`footer-accordion-content ${openSection === "contact" ? "is-open" : ""}`}
            >
              <div className="footer-accordion-inner">
                <div className="space-y-2.5 text-xs sm:text-[13px] text-design-foreground pt-1 pb-4">
                  <p className="flex items-start gap-2.5 leading-relaxed text-design-foreground/85">
                    <span className="shrink-0 mt-0.5 text-sm" aria-hidden>📍</span>
                    <span>{contact.address}</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <span className="shrink-0 text-sm" aria-hidden>📱</span>
                    <a
                      href={`tel:${contact.phoneE164}`}
                      className="text-design-foreground/85 hover:text-design-foreground hover:underline transition-colors"
                    >
                      {contact.phoneDisplay}
                    </a>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <span className="shrink-0 text-sm" aria-hidden>📧</span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-design-foreground/85 hover:text-design-foreground hover:underline transition-colors break-all"
                    >
                      {contact.email}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: FOLLOW US */}
          <div className="border-b border-design">
            <button
              type="button"
              onClick={() => toggleSection("follow")}
              aria-expanded={openSection === "follow"}
              aria-controls="footer-accordion-follow"
              id="footer-trigger-follow"
              className="w-full flex items-center justify-between py-3.5 sm:py-4 text-left transition-colors duration-200 select-none cursor-pointer"
            >
              <span className="font-display text-[13px] sm:text-sm font-bold tracking-wider uppercase text-design-foreground">
                FOLLOW US
              </span>
              <span
                className={`ml-4 text-design-foreground transition-transform duration-300 ease-out flex items-center justify-center ${
                  openSection === "follow" ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden
              >
                <svg
                  className="w-4 h-4 text-design-foreground/75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            <div
              id="footer-accordion-follow"
              role="region"
              aria-labelledby="footer-trigger-follow"
              className={`footer-accordion-content ${openSection === "follow" ? "is-open" : ""}`}
            >
              <div className="footer-accordion-inner">
                <div className="flex flex-col gap-2.5 text-xs sm:text-[13px] pt-1 pb-4">
                  <a
                    href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-design-foreground/85 hover:text-design-foreground transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="w-6 h-6 rounded-full bg-design-foreground/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 fill-current text-design-foreground" viewBox="0 0 24 24" aria-hidden>
                        <path d={INSTAGRAM_GLYPH_PATH} />
                      </svg>
                    </span>
                    <span className="font-medium">@{contact.instagram}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM AREA (Mobile + Tablet) */}
        <div className="pt-6 pb-2 text-center flex flex-col items-center justify-center gap-1.5 text-xs text-design-foreground/80 leading-relaxed">
          <p className="font-medium text-xs text-design-foreground/75">
            Giftchoice is Parental firm of Shoposphere
          </p>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <a
              href="https://www.instagram.com/qyverra.it?igsh=MTV5a2pzdGNxNjIzdg=="
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-all duration-300 hover:underline hover:opacity-80"
            >
              Qyverra
            </a>
          </div>
        </div>
      </div>

      {/* POLICY INFORMATION MODAL (Accessible Dialog) */}
      {activePolicy && POLICIES[activePolicy] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-dialog-title"
          onClick={() => setActivePolicy(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-design p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ backgroundColor: "var(--background)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-design">
              <div>
                <h3
                  id="policy-dialog-title"
                  className="font-display text-base sm:text-lg font-bold text-design-foreground"
                >
                  {POLICIES[activePolicy].title}
                </h3>
                <p className="text-xs text-design-foreground/70 mt-0.5">
                  {POLICIES[activePolicy].subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-design-foreground/70 hover:text-design-foreground hover:bg-design-foreground/10 transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-3.5 text-xs sm:text-[13px] leading-relaxed pr-1">
              {POLICIES[activePolicy].points.map((pt) => (
                <div
                  key={pt.heading}
                  className="p-3 rounded-xl border border-design/70 bg-design-secondary/40"
                >
                  <h4 className="font-semibold text-design-foreground mb-1 text-[12px] sm:text-[13px]">
                    {pt.heading}
                  </h4>
                  <p className="text-design-foreground/80">{pt.text}</p>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-design flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}