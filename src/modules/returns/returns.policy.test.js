import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  computeRefund,
  normalizeSettings,
  remainingQuantities,
  storeCreditValue,
  unitRefundPrice,
  validateRequest,
  windowInfo,
} from "./returns.policy.js";

const settings = normalizeSettings({ windowDays: 30 });
const DAY = 24 * 60 * 60 * 1000;

test("return window closes after the configured days", () => {
  const delivered = new Date("2026-09-01T10:00:00Z");
  const order = { status: "delivered", delivered_at: delivered };
  assert.equal(windowInfo(order, settings, new Date(delivered.getTime() + 30 * DAY - 1000)).eligible, true);
  assert.equal(windowInfo(order, settings, new Date(delivered.getTime() + 30 * DAY + 1000)).eligible, false);
  assert.equal(windowInfo({ status: "shipped", delivered_at: null }, settings).eligible, false);
});

test("remaining quantity ignores rejected and cancelled requests", () => {
  const remaining = remainingQuantities(
    [{ id: 1, quantity: 3, is_returnable: 1 }, { id: 2, quantity: 1, is_returnable: 0 }],
    [
      { order_item_id: 1, quantity: 1, status: "completed" },
      { order_item_id: 1, quantity: 2, status: "rejected" },
      { order_item_id: 1, quantity: 1, status: "requested" },
    ]
  );
  assert.deepEqual(remaining, { 1: 1, 2: 0 });
});

test("order discounts are prorated into the unit refund", () => {
  assert.equal(unitRefundPrice(100, { subtotal: 400, discount_amount: 40 }), 90);
  assert.equal(unitRefundPrice(100, { subtotal: 400, discount_amount: 0 }), 100);
});

const context = (overrides = {}) => ({
  orderItems: new Map([[1, { id: 1, name: "Noir Oud", unit_price: 100 }]]),
  remaining: { 1: 2 },
  photoCount: 0,
  exchangeProducts: new Map([
    [7, { name: "Citrus Bloom", price: 80, stock: 5, active: true }],
    [8, { name: "Velvet Rose", price: 150, stock: 5, active: true }],
  ]),
  refundMethod: "store_credit",
  paymentMethod: "cod",
  ...overrides,
});

test("change of mind requires a sealed item", () => {
  assert.throws(() => validateRequest([{ order_item_id: 1, quantity: 1, reason: "changed_mind", condition: "opened" }], context()), /sealed/);
  assert.doesNotThrow(() => validateRequest([{ order_item_id: 1, quantity: 1, reason: "changed_mind", condition: "sealed" }], context()));
});

test("damage needs a photo and quantity can't exceed what's left", () => {
  assert.throws(() => validateRequest([{ order_item_id: 1, quantity: 1, reason: "damaged", condition: "opened" }], context()), /photo/);
  assert.throws(() => validateRequest([{ order_item_id: 1, quantity: 3, reason: "damaged", condition: "opened" }], context({ photoCount: 1 })), /at most 2/);
});

test("exchanges must be the same price or less", () => {
  const line = { order_item_id: 1, quantity: 1, reason: "changed_mind", condition: "sealed", resolution: "exchange" };
  assert.throws(() => validateRequest([{ ...line, exchange_product_id: 8 }], context()), /costs more/);
  assert.doesNotThrow(() => validateRequest([{ ...line, exchange_product_id: 7 }], context()));
});

test("COD refunds to the original method need valid payout details", () => {
  const line = [{ order_item_id: 1, quantity: 1, reason: "changed_mind", condition: "sealed" }];
  assert.throws(() => validateRequest(line, context({ refundMethod: "original" })), /where we should send/);
  assert.throws(() => validateRequest(line, context({ refundMethod: "original", payoutDetails: { type: "jazzcash", account: "123", title: "Ali" } })), /03XXXXXXXXX/);
  assert.doesNotThrow(() => validateRequest(line, context({ refundMethod: "original", payoutDetails: { type: "jazzcash", account: "03001234567", title: "Ali Raza" } })));
  assert.doesNotThrow(() => validateRequest(line, context({ refundMethod: "original", paymentMethod: "jazzcash" })));
});

test("refund totals: exchange difference, fault shipping, and cap", () => {
  const order = { shipping_cost: 200, total_amount: 500, refunded_amount: 0 };
  assert.deepEqual(computeRefund([{ quantity: 1, unit_price: 100, resolution: "exchange", exchange_price: 80 }], order), { items: 20, shipping: 0, total: 20 });
  assert.deepEqual(computeRefund([{ quantity: 3, unit_price: 100, reason: "damaged", resolution: "refund" }], order, { allUnitsReturned: true }), { items: 300, shipping: 200, total: 500 });
  assert.equal(computeRefund([{ quantity: 3, unit_price: 100, reason: "changed_mind", resolution: "refund" }], order, { allUnitsReturned: true }).shipping, 0);
  assert.equal(computeRefund([{ quantity: 3, unit_price: 100, reason: "changed_mind" }], { ...order, refunded_amount: 450 }).total, 50);
});

test("state machine and store credit bonus", () => {
  assert.equal(canTransition("requested", "approved"), true);
  assert.equal(canTransition("completed", "approved"), false);
  assert.equal(canTransition("shipped_back", "completed"), false);
  assert.equal(storeCreditValue(200, 10), 220);
});
