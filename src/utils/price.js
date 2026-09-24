// NOTE: this file already exists in the project (referenced by the original
// AdminDashboard.jsx). Included here only so this delivery runs standalone —
// do NOT overwrite your real implementation with this stub.
export const parsePrice = (value) =>
  typeof value === "number" ? value : parseFloat(String(value || "").replace(/[^0-9.]/g, "")) || 0;

export const formatPrice = (amount) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(amount || 0));

// Reads a product's discount info. Prefers the fields the backend already
// computed (final_price/original_price/has_discount/discount_percent);
// falls back to computing it locally if a caller only has the raw
// discount_type/discount_value (or an older cached product shape).
export const getDiscountInfo = (product) => {
  const original = parsePrice(product?.original_price ?? product?.price);
  let final = product?.final_price != null ? parsePrice(product.final_price) : original;

  if (product?.final_price == null && product?.discount_type && product?.discount_value) {
    const value = Number(product.discount_value) || 0;
    final = product.discount_type === "percentage" ? original - (original * value) / 100 : original - value;
    final = Math.min(original, Math.max(0, Math.round(final * 100) / 100));
  }

  const hasDiscount = product?.has_discount ?? final < original;
  const percent = product?.discount_percent ?? (hasDiscount && original > 0 ? Math.round(((original - final) / original) * 100) : 0);
  return { original, final, hasDiscount, percent };
};
