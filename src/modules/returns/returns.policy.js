// Pure return/exchange rules — no database access, so they can be unit
// tested and are the single source of truth for both eligibility checks and
// refund amounts.

export const REASONS = {
  changed_mind: "Changed my mind",
  damaged: "Arrived damaged",
  leaking: "Bottle is leaking",
  wrong_item: "Received the wrong item",
  not_as_described: "Not as described",
  other: "Other",
};

// Our mistake: the customer isn't expected to have kept the seal intact, and
// original shipping is refunded when the whole order comes back.
export const FAULT_REASONS = ["damaged", "leaking", "wrong_item"];
export const PHOTO_REASONS = ["damaged", "leaking", "wrong_item"];

// AFTER
export const OPEN_STATUSES = ["requested", "approved", "shipped_back", "received", "awaiting_payout"];
// Statuses whose items still count against what's left to return.
export const COUNTED_STATUSES = [...OPEN_STATUSES, "completed"];

// AFTER
export const RETURN_TRANSITIONS = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["shipped_back", "cancelled", "expired", "received"],
  shipped_back: ["received"],
  received: ["completed", "rejected", "awaiting_payout"],
  awaiting_payout: ["received", "rejected"],
  completed: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export const canTransition = (from, to) => Boolean(RETURN_TRANSITIONS[from]?.includes(to));

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (value) => Math.round(Number(value) * 100) / 100;

export function normalizeSettings(raw) {
  const settings = typeof raw === "string" ? JSON.parse(raw) : raw || {};
  const int = (value, fallback, min, max) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };
  return {
    windowDays: int(settings.windowDays, 30, 1, 365),
    shipByDays: int(settings.shipByDays, 14, 1, 90),
    returnAddress: String(settings.returnAddress || ""),
    instructions: String(settings.instructions || ""),
    storeCreditBonusPercent: int(settings.storeCreditBonusPercent, 0, 0, 50),
  };
}

// Whether a delivered order is still inside its return window.
export function windowInfo(order, settings, now = new Date()) {
  if (order.status !== "delivered" || !order.delivered_at) {
    return { eligible: false, message: "Returns open once your order has been delivered." };
  }
  const deadline = new Date(new Date(order.delivered_at).getTime() + settings.windowDays * DAY_MS);
  if (now > deadline) {
    return { eligible: false, deadline, daysLeft: 0, message: `The ${settings.windowDays}-day return window for this order has closed.` };
  }
  return { eligible: true, deadline, daysLeft: Math.max(1, Math.ceil((deadline - now) / DAY_MS)) };
}

// orderItems: [{id, quantity, is_returnable}]
// previous: [{order_item_id, quantity, status}] — items in earlier requests.
export function remainingQuantities(orderItems, previous = []) {
  const used = new Map();
  for (const row of previous) {
    if (!COUNTED_STATUSES.includes(row.status)) continue;
    used.set(row.order_item_id, (used.get(row.order_item_id) || 0) + Number(row.quantity));
  }
  return Object.fromEntries(
    orderItems.map((item) => [
      item.id,
      item.is_returnable === 0 || item.is_returnable === false ? 0 : Math.max(0, Number(item.quantity) - (used.get(item.id) || 0)),
    ])
  );
}

// What one unit actually cost the customer: its price minus its share of
// any order-level discount (the way Shopify prorates discounts on refunds).
export function unitRefundPrice(priceAtPurchase, order) {
  const price = Number(priceAtPurchase);
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || 0);
  if (subtotal <= 0 || discount <= 0) return round2(price);
  return round2(price * (1 - Math.min(discount, subtotal) / subtotal));
}

const fail = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};

// Validates the customer's selection. `items` are the requested lines:
// [{order_item_id, quantity, reason, condition, resolution, exchange_product_id}]
// context: { orderItems: Map(id → {name, unit_price}), remaining, photoCount,
//            exchangeProducts: Map(id → {name, price, stock, active}) }
// AFTER
// Note: payout details are no longer collected at request time — the
// admin asks for them later, once the return is received. This only
// validates that a refund method was chosen.
export function validateRequest(items, { orderItems, remaining, photoCount, exchangeProducts, refundMethod }) {
  if (!Array.isArray(items) || !items.length) fail("Choose at least one item to return.");
  const seen = new Set();
  let needsPhotos = false;
  let needsRefund = false;

  for (const line of items) {
    const orderItem = orderItems.get(Number(line.order_item_id));
    if (!orderItem) fail("One of the selected items isn't part of this order.");
    if (seen.has(orderItem.id)) fail("Each item can only be listed once.");
    seen.add(orderItem.id);

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) fail(`Choose how many of ${orderItem.name} to return.`);
    if (quantity > (remaining[orderItem.id] || 0)) {
      fail(remaining[orderItem.id] ? `You can return at most ${remaining[orderItem.id]} of ${orderItem.name}.` : `${orderItem.name} can't be returned.`);
    }
    if (!REASONS[line.reason]) fail(`Tell us why you're returning ${orderItem.name}.`);
    if (!["sealed", "opened"].includes(line.condition)) fail(`Tell us whether ${orderItem.name} is still sealed.`);
    if (line.reason === "changed_mind" && line.condition !== "sealed") {
      fail(`${orderItem.name} can only be returned for a change of mind if it's unopened and still sealed.`);
    }
    if (PHOTO_REASONS.includes(line.reason)) needsPhotos = true;

    const resolution = line.resolution || "refund";
    if (!["refund", "exchange"].includes(resolution)) fail("Choose a refund or an exchange.");
    if (resolution === "exchange") {
      const product = exchangeProducts.get(Number(line.exchange_product_id));
      if (!product || !product.active) fail(`Choose a product to exchange ${orderItem.name} for.`);
      if (Number(product.price) > Number(orderItem.unit_price)) {
        fail(`${product.name} costs more than ${orderItem.name}. Exchanges are for items of the same price or less.`);
      }
      if (Number(product.stock) < quantity) fail(`${product.name} doesn't have enough stock for this exchange right now.`);
      if (Number(product.price) < Number(orderItem.unit_price)) needsRefund = true;
    } else {
      needsRefund = true;
    }
  }

  // AFTER
  if (needsPhotos && photoCount < 1) fail("Please add at least one photo showing the problem.");
  if (!["original", "store_credit"].includes(refundMethod)) fail("Choose how you'd like to be refunded.");
  // needsRefund is still computed above (kept for future use / consistency
  // with computeRefund) but no longer gates a payout requirement here.
}

// Used when the customer submits payout details after the admin asks for
// them (the "awaiting_payout" step) — same rules that used to run inline
// inside validateRequest, now reusable on their own.
export function validatePayoutDetails(payoutDetails) {
  const kind = payoutDetails?.type;
  const account = String(payoutDetails?.account || "").replace(/\s/g, "");
  const title = String(payoutDetails?.title || "").trim();
  if (!["jazzcash", "easypaisa", "bank"].includes(kind)) fail("Choose where we should send your refund.");
  if (kind === "bank" ? !/^PK\d{2}[A-Z]{4}[0-9A-Z]{16}$/i.test(account) : !/^03\d{9}$/.test(account)) {
    fail(kind === "bank" ? "Enter a valid IBAN (starts with PK, 24 characters)." : "Enter the wallet number as 03XXXXXXXXX.");
  }
  if (title.length < 3) fail("Enter the account holder's name.");
  return { type: kind, account: account.toUpperCase(), title: title.slice(0, 120) };
}

// lines: [{quantity, unit_price, reason, resolution, exchange_price}]
// Only lines accepted at inspection should be passed when finalising.
export function computeRefund(lines, order, { allUnitsReturned = false } = {}) {
  let items = 0;
  for (const line of lines) {
    const perUnit = line.resolution === "exchange"
      ? Math.max(0, Number(line.unit_price) - Number(line.exchange_price || 0))
      : Number(line.unit_price);
    items += perUnit * Number(line.quantity);
  }
  const shipping =
    allUnitsReturned &&
    lines.length > 0 &&
    lines.every((line) => line.resolution !== "exchange" && FAULT_REASONS.includes(line.reason))
      ? Number(order.shipping_cost || 0)
      : 0;
  const cap = Math.max(0, Number(order.total_amount || 0) - Number(order.refunded_amount || 0));
  return {
    items: round2(items),
    shipping: round2(shipping),
    total: round2(Math.min(items + shipping, cap)),
  };
}

export const storeCreditValue = (amount, bonusPercent = 0) => round2(Number(amount) * (1 + Number(bonusPercent) / 100));

export const formatRma = (id) => `RMA-${String(id).padStart(5, "0")}`;
