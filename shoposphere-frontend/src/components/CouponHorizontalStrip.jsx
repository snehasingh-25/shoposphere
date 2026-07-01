export default function CouponHorizontalStrip({ children, ariaLabel = "Available coupons" }) {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-hide pb-1 -mx-1 px-1"
    >
      {children}
    </div>
  );
}

export function CouponStripItem({ children }) {
  return (
    <div role="listitem" className="shrink-0 w-[172px]">
      {children}
    </div>
  );
}
