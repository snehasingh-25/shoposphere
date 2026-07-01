export function formatDiscount(coupon) {
  if (coupon.type === "fixed") return `₹${coupon.discountValue.toFixed(0)} OFF`;
  let label = `${coupon.discountValue}% OFF`;
  if (coupon.maxDiscount) label += ` up to ₹${coupon.maxDiscount.toFixed(0)}`;
  return label;
}

export function formatCondition(coupon) {
  const parts = [];
  if (coupon.minOrderValue) parts.push(`on orders above ₹${coupon.minOrderValue.toFixed(0)}`);
  if (coupon.expiresAt) {
    const d = new Date(coupon.expiresAt);
    parts.push(`valid till ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`);
  }
  return parts.join(" · ");
}
