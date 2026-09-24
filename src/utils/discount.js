// Single source of truth for turning a product's base price + admin-set
// discount into the price a customer actually pays. Used by the product
// listing/detail endpoints (for display) and by cart/checkout (for the
// price that is actually charged), so the number shown in the shop is
// always the number the customer is billed.

// discount_type: 'percentage' | 'fixed' | null/undefined (no discount)
// discount_value: number (percentage 0-100, or a flat PKR amount)
export function computeFinalPrice(price, discount_type, discount_value) {
  const base = Number(price) || 0;
  const value = Number(discount_value);

  if (!discount_type || !Number.isFinite(value) || value <= 0) return base;

  let final = discount_type === "percentage" ? base - (base * value) / 100 : base - value;

  // Never go negative, never exceed the original price.
  final = Math.min(base, Math.max(0, final));
  return Math.round(final * 100) / 100;
}

// Normalizes whatever came in from a request body (strings, empty strings,
// "none", etc.) into either a valid { discount_type, discount_value } pair
// or { discount_type: null, discount_value: null } (= no discount / clear it).
export function normalizeDiscountInput(body = {}) {
  const type = body.discount_type;
  const rawValue = body.discount_value;

  if (!type || type === "none" || rawValue === "" || rawValue === undefined || rawValue === null) {
    return { discount_type: null, discount_value: null };
  }
  if (type !== "percentage" && type !== "fixed") {
    const err = new Error("discount_type must be 'percentage' or 'fixed'");
    err.status = 400;
    throw err;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return { discount_type: null, discount_value: null };
  }
  if (type === "percentage" && value > 100) {
    const err = new Error("Percentage discount can't exceed 100%");
    err.status = 400;
    throw err;
  }
  return { discount_type: type, discount_value: Math.round(value * 100) / 100 };
}

// Decorates a single product row with final_price / original_price /
// discount_percent / has_discount, without mutating the base `price` field
// (admin edit forms and every price-based calculation still read the true
// base price from `price`).
export function withDiscount(product) {
  const price = Number(product.price) || 0;
  const finalPrice = computeFinalPrice(price, product.discount_type, product.discount_value);
  const hasDiscount = finalPrice < price;
  return {
    ...product,
    discount_type: product.discount_type || null,
    discount_value: product.discount_value != null ? Number(product.discount_value) : null,
    original_price: price,
    final_price: finalPrice,
    has_discount: hasDiscount,
    discount_percent: hasDiscount ? Math.round(((price - finalPrice) / price) * 100) : 0,
  };
}

export function withDiscountList(products) {
  return (products || []).map(withDiscount);
}
