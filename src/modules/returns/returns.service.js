import crypto from "crypto";
import fs from "fs";
import path from "path";
import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { addOrderEvent } from "../../utils/orderEvents.js";
import { computeFinalPrice } from "../../utils/discount.js";
import { getReturnSettings } from "../../utils/storeSettings.js";
import { jazzCashEnabled, refundTransaction } from "../payments/jazzcash.js";
import { lookupMatches, returnAccessToken, sha256, signOrderLookup, tokenMatches } from "./returns.access.js";
import { notifyReturn } from "./returns.notify.js";
import { InventoryService } from "../inventory/inventory.service.js";
import { recordCash, refundAccount } from "../finance/ledger.js";
// AFTER
import {
  OPEN_STATUSES,
  REASONS,
  canTransition,
  computeRefund,
  formatRma,
  remainingQuantities,
  storeCreditValue,
  unitRefundPrice,
  validatePayoutDetails,
  validateRequest,
  windowInfo,
} from "./returns.policy.js";

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });
const DAY_MS = 24 * 60 * 60 * 1000;

const parseJson = (value) => (typeof value === "string" ? JSON.parse(value) : value || null);

function maskAccount(details) {
  if (!details) return null;
  const account = String(details.account || "");
  return { ...details, account: account.length > 4 ? `${"•".repeat(account.length - 4)}${account.slice(-4)}` : account };
}

async function addEvent(connection, returnId, actor, type, message = null, visible = true) {
  await connection.query(
    "INSERT INTO return_events (return_id, actor, type, message, visible_to_customer) VALUES (?, ?, ?, ?, ?)",
    [returnId, actor, type, message, visible]
  );
}

async function loadOrder(connection, orderId, { lock = false } = {}) {
  const [[order]] = await connection.query(
    `SELECT o.*, p.method AS payment_method, p.status AS payment_status, p.gateway_reference
     FROM orders o LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ? ${lock ? "FOR UPDATE" : ""}`,
    [orderId]
  );
  if (!order) return null;
  const [items] = await connection.query(
    `SELECT oi.id, oi.product_id, oi.selected_size, oi.selected_color, oi.quantity, oi.price_at_purchase, p.name, p.image_url, p.is_returnable
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.id`,
    [orderId]
  );
  const [previous] = await connection.query(
    `SELECT ri.order_item_id, ri.quantity, rr.status
     FROM return_items ri JOIN return_requests rr ON rr.id = ri.return_id
     WHERE rr.order_id = ?`,
    [orderId]
  );
  return { order, items, previous };
}

async function exchangeCatalog(maxPrice) {
  const [rows] = await pool.query(
    "SELECT id, name, slug, image_url, price, discount_type, discount_value, stock_quantity FROM products WHERE status = 'active' AND stock_quantity > 0 ORDER BY name"
  );
  return rows
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, image_url: p.image_url, price: computeFinalPrice(p.price, p.discount_type, p.discount_value), stock: p.stock_quantity }))
    .filter((p) => p.price <= maxPrice);
}

function removeUploads(files = []) {
  for (const file of files) fs.promises.unlink(path.join(process.cwd(), "uploads", file.filename)).catch(() => {});
}

async function lockReturn(connection, returnId) {
  // Order row first, then the return — the same lock order checkout and
  // order cancellation use, so these can never deadlock each other.
  const [[ref]] = await connection.query("SELECT order_id FROM return_requests WHERE id = ?", [returnId]);
  if (!ref) throw httpError("Return not found", 404);
  await connection.query("SELECT id FROM orders WHERE id = ? FOR UPDATE", [ref.order_id]);
  const [[ret]] = await connection.query("SELECT * FROM return_requests WHERE id = ? FOR UPDATE", [returnId]);
  return ret;
}

function assertTransition(ret, to) {
  if (!canTransition(ret.status, to)) {
    throw httpError(`A return that is ${ret.status.replace("_", " ")} can't be moved to ${to.replace("_", " ")}.`, 409);
  }
}

// Shared shape for the customer page and the admin drawer.
async function describe(returnId, { admin = false } = {}) {
  const [[ret]] = await pool.query(
    `SELECT rr.*, o.total_amount, (SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE order_id = o.id) AS refunded_amount, o.shipping_cost, o.subtotal, o.discount_amount, o.created_at AS order_date,
            o.delivered_at, o.shipping_address, o.phone, p.method AS payment_method
     FROM return_requests rr JOIN orders o ON o.id = rr.order_id LEFT JOIN payments p ON p.order_id = o.id
     WHERE rr.id = ?`,
    [returnId]
  );
  if (!ret) throw httpError("Return not found", 404);
  const [items] = await pool.query(
    `SELECT ri.*, oi.product_id, oi.selected_size, oi.selected_color, oi.quantity AS ordered_quantity, p.name, p.image_url,
            xp.name AS exchange_name, xp.image_url AS exchange_image
     FROM return_items ri
     JOIN order_items oi ON oi.id = ri.order_item_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN products xp ON xp.id = ri.exchange_product_id
     WHERE ri.return_id = ? ORDER BY ri.id`,
    [returnId]
  );
  const [photos] = await pool.query("SELECT id, path FROM return_photos WHERE return_id = ?", [returnId]);
  const [events] = await pool.query(
    `SELECT id, actor, type, message, visible_to_customer, created_at FROM return_events
     WHERE return_id = ? ${admin ? "" : "AND visible_to_customer = TRUE"} ORDER BY created_at, id`,
    [returnId]
  );
  const settings = await getReturnSettings();
  const approvedOrLater = ["approved", "shipped_back", "received", "completed"].includes(ret.status);
  const estimate = computeRefund(
    items.filter((i) => i.inspection !== "rejected").map((i) => ({ ...i, exchange_price: i.exchange_unit_price })),
    ret
  );

  const base = {
    id: ret.id,
    rma: ret.rma_number,
    order_id: ret.order_id,
    email: ret.email,
    status: ret.status,
    refund_method: ret.refund_method,
    payment_method: ret.payment_method,
    customer_note: ret.customer_note,
    decision_message: ret.decision_message,
    return_courier: ret.return_courier,
    return_tracking: ret.return_tracking,
    refund_amount: ret.refund_amount != null ? Number(ret.refund_amount) : null,
    store_credit_code: ret.store_credit_code,
    exchange_order_id: ret.exchange_order_id,
    requested_at: ret.requested_at,
    approved_at: ret.approved_at,
    ship_by: ret.ship_by,
    shipped_back_at: ret.shipped_back_at,
    received_at: ret.received_at,
    resolved_at: ret.resolved_at,
    estimate,
    store_credit_bonus_percent: settings.storeCreditBonusPercent,
    return_address: approvedOrLater ? settings.returnAddress : null,
    instructions: approvedOrLater ? settings.instructions : null,
    items: items.map((i) => ({
      id: i.id,
      order_item_id: i.order_item_id,
      name: i.name,
      image_url: i.image_url,
      selected_size: i.selected_size,
      selected_color: i.selected_color,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      reason: i.reason,
      reason_label: REASONS[i.reason],
      condition: i.item_condition,
      resolution: i.resolution,
      exchange_product_id: i.exchange_product_id,
      exchange_name: i.exchange_name,
      exchange_image: i.exchange_image,
      exchange_unit_price: i.exchange_unit_price != null ? Number(i.exchange_unit_price) : null,
      inspection: i.inspection,
      restock: Boolean(i.restock),
      restocked: Boolean(i.restocked),
    })),
    photos,
    events,
  };

  if (!admin) return { ...base, payout_details: maskAccount(parseJson(ret.payout_details)) };
  const [[refund]] = await pool.query("SELECT * FROM refunds WHERE return_id = ?", [returnId]);
  return {
    ...base,
    user_id: ret.user_id,
    internal_note: ret.internal_note,
    payout_details: parseJson(ret.payout_details),
    refund,
    order: {
      total_amount: Number(ret.total_amount),
      refunded_amount: Number(ret.refunded_amount),
      shipping_cost: Number(ret.shipping_cost),
      discount_amount: Number(ret.discount_amount),
      created_at: ret.order_date,
      delivered_at: ret.delivered_at,
      phone: ret.phone,
      shipping_address: parseJson(ret.shipping_address),
    },
    jazzcash_refund_available: ret.payment_method === "jazzcash" && jazzCashEnabled(),
  };
}

export class ReturnsService {
  // ─── Customer ─────────────────────────────────────────────────────────────

  // Proves the visitor knows the order number and its email. Always the same
  // error either way, so it can't be used to discover orders.
  static async lookup({ orderId, email }) {
    const id = Number(String(orderId || "").replace(/\D/g, ""));
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const [[order]] = id
      ? await pool.query("SELECT id, email FROM orders WHERE id = ?", [id])
      : [[null]];
    if (!order || String(order.email || "").toLowerCase() !== normalizedEmail) {
      throw httpError("We couldn't find an order with that number and email.", 404);
    }
    return { orderId: order.id, token: signOrderLookup(order.id) };
  }

  static async assertOrderAccess(orderId, { user, lookupToken }) {
    const [[order]] = await pool.query("SELECT id, user_id FROM orders WHERE id = ?", [orderId]);
    const owner = order && user?.id && Number(order.user_id) === Number(user.id);
    if (!order || !(owner || lookupMatches(orderId, lookupToken))) throw httpError("Order not found", 404);
  }

  static async eligibility(orderId, access) {
    await ReturnsService.assertOrderAccess(orderId, access);
    const settings = await getReturnSettings();
    const { order, items, previous } = await loadOrder(pool, orderId);
    const window = windowInfo(order, settings);
    const remaining = remainingQuantities(items, previous);

    const [returns] = await pool.query(
      "SELECT id, rma_number, status, requested_at FROM return_requests WHERE order_id = ? ORDER BY id DESC",
      [orderId]
    );
    const open = returns.find((r) => OPEN_STATUSES.includes(r.status));
    const lines = items.map((item) => ({
      order_item_id: item.id,
      product_id: item.product_id,
      name: item.name,
      image_url: item.image_url,
      selected_size: item.selected_size,
      selected_color: item.selected_color,
      quantity: item.quantity,
      remaining: remaining[item.id],
      returnable: Boolean(item.is_returnable),
      unit_price: unitRefundPrice(item.price_at_purchase, order),
    }));
    const maxUnit = Math.max(0, ...lines.filter((l) => l.remaining > 0).map((l) => l.unit_price));

    let message = window.message;
    if (window.eligible && open) message = `You already have an open return (${open.rma_number}) for this order.`;
    else if (window.eligible && !lines.some((l) => l.remaining > 0)) message = "Everything in this order has already been returned or isn't returnable.";

    return {
      order: {
        id: order.id,
        created_at: order.created_at,
        delivered_at: order.delivered_at,
        payment_method: order.payment_method,
        deadline: window.deadline || null,
        days_left: window.daysLeft ?? null,
      },
      can_request: Boolean(window.eligible && !open && lines.some((l) => l.remaining > 0)),
      message: message || null,
      items: lines,
      exchange_products: maxUnit > 0 ? await exchangeCatalog(maxUnit) : [],
      returns: returns.map((r) => ({
        rma: r.rma_number,
        status: r.status,
        requested_at: r.requested_at,
        link: `/returns/${r.rma_number}?token=${returnAccessToken(r.id)}`,
      })),
      policy: { window_days: settings.windowDays, store_credit_bonus_percent: settings.storeCreditBonusPercent, reasons: REASONS },
    };
  }

  // AFTER
  static async create(orderId, access, body, files = []) {
    try {
      await ReturnsService.assertOrderAccess(orderId, access);
      let items;
      try {
        items = typeof body.items === "string" ? JSON.parse(body.items) : body.items;
      } catch {
        throw httpError("Invalid return details");
      }
      const refundMethod = body.refund_method || "original";
      const settings = await getReturnSettings();

      const created = await withTransaction(async (connection) => {
        // Locking the order serialises requests for it, so two tabs can't
        // both claim the same remaining quantity.
        const { order, items: orderItems, previous } = await loadOrder(connection, orderId, { lock: true });
        const window = windowInfo(order, settings);
        if (!window.eligible) throw httpError(window.message);
        if (previous.some((p) => OPEN_STATUSES.includes(p.status))) throw httpError("You already have an open return for this order.", 409);

        const remaining = remainingQuantities(orderItems, previous);
        const byId = new Map(orderItems.map((i) => [i.id, { id: i.id, name: i.name, unit_price: unitRefundPrice(i.price_at_purchase, order) }]));
        const exchangeIds = (items || []).filter((l) => l?.resolution === "exchange").map((l) => Number(l.exchange_product_id)).filter(Boolean);
        const exchangeProducts = new Map();
        if (exchangeIds.length) {
          const [rows] = await connection.query(
            "SELECT id, name, price, discount_type, discount_value, stock_quantity, status FROM products WHERE id IN (?)",
            [exchangeIds]
          );
          for (const p of rows) {
            exchangeProducts.set(p.id, { name: p.name, price: computeFinalPrice(p.price, p.discount_type, p.discount_value), stock: p.stock_quantity, active: p.status === "active" });
          }
        }
// AFTER
        validateRequest(items, {
          orderItems: byId,
          remaining,
          photoCount: files.length,
          exchangeProducts,
          refundMethod,
        });

        // payout_details starts NULL — collected later, once the return is
        // received, via ReturnsService.requestPayout / submitPayout.
        const [result] = await connection.query(
          `INSERT INTO return_requests (order_id, user_id, email, refund_method, payout_details, customer_note, access_token_hash)
           VALUES (?, ?, ?, ?, NULL, ?, '')`,
          [
            order.id,
            order.user_id || null,
            order.email,
            refundMethod,
            String(body.note || "").trim().slice(0, 1000) || null,
          ]
        );
        const returnId = result.insertId;
        const rma = formatRma(returnId);
        await connection.query("UPDATE return_requests SET rma_number = ?, access_token_hash = ? WHERE id = ?", [rma, sha256(returnAccessToken(returnId)), returnId]);

        await connection.query(
          `INSERT INTO return_items (return_id, order_item_id, quantity, unit_price, reason, item_condition, resolution, exchange_product_id, exchange_unit_price, restock)
           VALUES ?`,
          [
            items.map((line) => {
              const exchange = line.resolution === "exchange" ? exchangeProducts.get(Number(line.exchange_product_id)) : null;
              return [
                returnId,
                Number(line.order_item_id),
                Number(line.quantity),
                byId.get(Number(line.order_item_id)).unit_price,
                line.reason,
                line.condition,
                exchange ? "exchange" : "refund",
                exchange ? Number(line.exchange_product_id) : null,
                exchange ? exchange.price : null,
                // A damaged or leaking bottle shouldn't go back on the shelf unless the admin says so.
                !["damaged", "leaking"].includes(line.reason),
              ];
            }),
          ]
        );
        if (files.length) {
          await connection.query("INSERT INTO return_photos (return_id, path) VALUES ?", [files.map((f) => [returnId, `/uploads/${f.filename}`])]);
        }
        await addEvent(connection, returnId, "customer", "requested", "Return requested.");
        return { returnId, rma };
      });

      void notifyReturn(created.returnId, "requested");
      return { rma: created.rma, token: returnAccessToken(created.returnId) };
    } catch (error) {
      removeUploads(files);
      throw error;
    }
  }

  static async findForCustomer(rma, { user, token }) {
    const [[ret]] = await pool.query(
      "SELECT rr.id, rr.user_id, o.user_id AS order_user_id FROM return_requests rr JOIN orders o ON o.id = rr.order_id WHERE rr.rma_number = ?",
      [String(rma || "").toUpperCase()]
    );
    const owner = ret && user?.id && [ret.user_id, ret.order_user_id].map(Number).includes(Number(user.id));
    if (!ret || !(owner || tokenMatches(ret.id, token))) throw httpError("Return not found", 404);
    return ret.id;
  }

  static async getForCustomer(rma, access) {
    const returnId = await ReturnsService.findForCustomer(rma, access);
    await ReturnsService.expireIfStale(returnId);
    return describe(returnId);
  }

  static async addTracking(rma, access, { courier, tracking }) {
    const returnId = await ReturnsService.findForCustomer(rma, access);
    const cleanCourier = String(courier || "").trim().slice(0, 100);
    const cleanTracking = String(tracking || "").trim().slice(0, 100);
    if (cleanCourier.length < 2 || cleanTracking.length < 3) throw httpError("Enter the courier name and tracking number.");
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "shipped_back");
      await connection.query(
        "UPDATE return_requests SET status = 'shipped_back', return_courier = ?, return_tracking = ?, shipped_back_at = NOW() WHERE id = ?",
        [cleanCourier, cleanTracking, returnId]
      );
      await addEvent(connection, returnId, "customer", "shipped_back", `Shipped with ${cleanCourier} — tracking ${cleanTracking}.`);
    });
    void notifyReturn(returnId, "shipped_back");
    return describe(returnId);
  }

  static async cancelByCustomer(rma, access) {
    const returnId = await ReturnsService.findForCustomer(rma, access);
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      if (!["requested", "approved"].includes(ret.status)) throw httpError("This return can no longer be cancelled.", 409);
      await connection.query("UPDATE return_requests SET status = 'cancelled', resolved_at = NOW() WHERE id = ?", [returnId]);
      await addEvent(connection, returnId, "customer", "cancelled", "Return cancelled by you.");
    });
    void notifyReturn(returnId, "cancelled");
    return describe(returnId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  static async adminList() {
    const [rows] = await pool.query(
      `SELECT rr.id, rr.rma_number AS rma, rr.order_id, rr.email, rr.status, rr.refund_method, rr.requested_at, rr.ship_by,
              rr.return_tracking, rr.refund_amount, p.method AS payment_method,
              COALESCE(SUM(ri.quantity), 0) AS item_count,
              SUM(ri.resolution = 'exchange') > 0 AS has_exchange,
              MAX(ri.reason IN ('damaged', 'leaking', 'wrong_item')) AS is_fault
       FROM return_requests rr
       JOIN return_items ri ON ri.return_id = rr.id
       LEFT JOIN payments p ON p.order_id = rr.order_id
       GROUP BY rr.id ORDER BY rr.requested_at DESC`
    );
    return rows.map((r) => ({ ...r, item_count: Number(r.item_count), has_exchange: Boolean(r.has_exchange), is_fault: Boolean(r.is_fault) }));
  }

  static async adminListForOrder(orderId) {
    const [rows] = await pool.query(
      "SELECT id, rma_number AS rma, status, requested_at, refund_amount FROM return_requests WHERE order_id = ? ORDER BY id DESC",
      [orderId]
    );
    return rows;
  }

  static adminGet(returnId) {
    return describe(returnId, { admin: true });
  }

  static async approve(returnId, { message }) {
    const settings = await getReturnSettings();
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "approved");
      const text = String(message || "").trim().slice(0, 1000) || null;
      await connection.query(
        "UPDATE return_requests SET status = 'approved', decision_message = ?, approved_at = NOW(), ship_by = ? WHERE id = ?",
        [text, new Date(Date.now() + settings.shipByDays * DAY_MS), returnId]
      );
      await addEvent(connection, returnId, "admin", "approved", text || "Return approved.");
    });
    void notifyReturn(returnId, "approved");
    return describe(returnId, { admin: true });
  }

  static async reject(returnId, { message }) {
    const text = String(message || "").trim().slice(0, 1000);
    if (text.length < 5) throw httpError("Tell the customer why the return can't be accepted.");
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "rejected");
      await connection.query("UPDATE return_requests SET status = 'rejected', decision_message = ?, resolved_at = NOW() WHERE id = ?", [text, returnId]);
      await addEvent(connection, returnId, "admin", "rejected", text);
    });
    void notifyReturn(returnId, "rejected");
    return describe(returnId, { admin: true });
  }

  static async markReceived(returnId) {
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "received");
      await connection.query("UPDATE return_requests SET status = 'received', received_at = NOW() WHERE id = ?", [returnId]);
      await addEvent(connection, returnId, "admin", "received", "Parcel received — inspection in progress.");
    });
    void notifyReturn(returnId, "received");
    return describe(returnId, { admin: true });
  }


    // Admin explicitly asks the customer where to send the refund. Only
  // makes sense once the parcel is received (so it can be inspected/
  // completed right after) and before it's already been asked for.
  static async requestPayout(returnId, { message } = {}) {
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "awaiting_payout");
      const text = String(message || "").trim().slice(0, 1000) || null;
      await connection.query(
        "UPDATE return_requests SET status = 'awaiting_payout', decision_message = COALESCE(?, decision_message), payout_requested_at = NOW() WHERE id = ?",
        [text, returnId]
      );
      await addEvent(connection, returnId, "admin", "payout_requested", text || "Asked the customer where to send the refund.");
    });
    void notifyReturn(returnId, "payout_requested");
    return describe(returnId, { admin: true });
  }

  // Customer submits the account to refund to. Moves the return back to
  // "received" so the admin can complete it right away.
  static async submitPayout(rma, access, payoutDetails) {
    const returnId = await ReturnsService.findForCustomer(rma, access);
    const clean = validatePayoutDetails(payoutDetails);
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "received");
      await connection.query(
        "UPDATE return_requests SET status = 'received', payout_details = ? WHERE id = ?",
        [JSON.stringify(clean), returnId]
      );
      await addEvent(connection, returnId, "customer", "payout_submitted", "Submitted payout details.");
    });
    void notifyReturn(returnId, "payout_submitted");
    return describe(returnId);
  }

  // items: [{id, accepted, restock, resolution?}] — resolution lets the admin
  // turn an exchange into a refund when the exchange product ran out.
  static async inspect(returnId, { items }) {
    if (!Array.isArray(items) || !items.length) throw httpError("Inspect at least one item.");
    const converted = [];
    await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      if (ret.status !== "received") throw httpError("Items can be inspected once the parcel is received.", 409);
      const [rows] = await connection.query("SELECT id, resolution FROM return_items WHERE return_id = ?", [returnId]);
      const known = new Map(rows.map((r) => [r.id, r]));
      for (const line of items) {
        const row = known.get(Number(line.id));
        if (!row) throw httpError("Unknown item in this return.");
        const inspection = line.accepted ? "accepted" : "rejected";
        await connection.query("UPDATE return_items SET inspection = ?, restock = ? WHERE id = ?", [inspection, Boolean(line.restock), row.id]);
        if (line.resolution === "refund" && row.resolution === "exchange") {
          await connection.query(
            "UPDATE return_items SET resolution = 'refund', exchange_product_id = NULL, exchange_unit_price = NULL WHERE id = ?",
            [row.id]
          );
          converted.push(row.id);
        }
      }
      await addEvent(connection, returnId, "admin", "inspected", "Items inspected.", false);
      if (converted.length) {
        await addEvent(connection, returnId, "admin", "exchange_converted", "The item you chose for your exchange is no longer available, so we'll refund it instead.");
      }
    });
    return describe(returnId, { admin: true });
  }

  static async message(returnId, { text }) {
    const clean = String(text || "").trim().slice(0, 2000);
    if (!clean) throw httpError("Write a message first.");
    await withTransaction(async (connection) => {
      await lockReturn(connection, returnId);
      await addEvent(connection, returnId, "admin", "message", clean);
    });
    void notifyReturn(returnId, "message", { text: clean });
    return describe(returnId, { admin: true });
  }

  static async saveNote(returnId, { note }) {
    await pool.query("UPDATE return_requests SET internal_note = ? WHERE id = ?", [String(note || "").slice(0, 2000) || null, returnId]);
    return describe(returnId, { admin: true });
  }

  // Resolves a received, inspected return: restocks, creates the exchange
  // order, issues the refund or store credit, and records it — once.
  static async complete(returnId, adminId, { refundAmount, method, reference, account, message }) {
    // A named lock stops two admins (or a double click) completing the same
    // return at once — important because a JazzCash refund can't be undone.
    const lockConnection = await pool.getConnection();
    try {
      const [[{ locked }]] = await lockConnection.query("SELECT GET_LOCK(?, 5) AS locked", [`return-complete-${returnId}`]);
      if (!locked) throw httpError("This return is already being completed.", 409);

      const plan = await ReturnsService.planCompletion(returnId, { refundAmount, method, reference, account });

      let gatewayReference = null;
      if (plan.amount > 0 && plan.method === "jazzcash_api") {
        const refund = await refundTransaction({ txnRef: plan.gatewayReference, amount: plan.amount }).catch((error) => ({ ok: false, message: error.message }));
        if (!refund.ok) throw httpError(`JazzCash refund failed: ${refund.message || "no response"}. Try again or refund manually.`, 502);
        gatewayReference = refund.reference;
      }

      let result;
      try {
        result = await ReturnsService.applyCompletion(returnId, adminId, plan, { gatewayReference, message });
      } catch (error) {
        if (gatewayReference) {
          console.error(`[returns] JazzCash refund ${gatewayReference} succeeded for return ${returnId} but recording it failed:`, error);
        }
        throw error;
      }
      void notifyReturn(returnId, "completed", result.notice);
      return describe(returnId, { admin: true });
    } finally {
      await lockConnection.query("SELECT RELEASE_LOCK(?)", [`return-complete-${returnId}`]).catch(() => {});
      lockConnection.release();
    }
  }

  static async planCompletion(returnId, { refundAmount, method, reference, account }) {
    const ret = (await pool.query("SELECT * FROM return_requests WHERE id = ?", [returnId]))[0][0];
    if (!ret) throw httpError("Return not found", 404);
    if (ret.status !== "received") throw httpError("A return can be completed once the parcel is received and inspected.", 409);
    const [items] = await pool.query("SELECT * FROM return_items WHERE return_id = ?", [returnId]);
    if (items.some((i) => i.inspection === "pending")) throw httpError("Inspect every item before completing the return.");
    const accepted = items.filter((i) => i.inspection === "accepted");
    if (!accepted.length) throw httpError("No items passed inspection — reject the return instead.");

    const { order, items: orderItems, previous } = await loadOrder(pool, ret.order_id);
    // Store credit counts too: an order can't be credited and refunded beyond what was paid.
    const [[{ issued }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS issued FROM refunds WHERE order_id = ?", [ret.order_id]);
    order.refunded_amount = Number(issued);
    const orderUnits = orderItems.reduce((sum, i) => sum + Number(i.quantity), 0);
    const doneUnits = previous.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.quantity), 0);
    const acceptedUnits = accepted.reduce((sum, i) => sum + Number(i.quantity), 0);
    const estimate = computeRefund(
      accepted.map((i) => ({ ...i, exchange_price: i.exchange_unit_price })),
      order,
      { allUnitsReturned: doneUnits + acceptedUnits >= orderUnits }
    );
    const cap = Math.max(0, Number(order.total_amount) - Number(order.refunded_amount));
    const amount = refundAmount === undefined || refundAmount === null || refundAmount === ""
      ? estimate.total
      : Math.round(Number(refundAmount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 0 || amount > cap) throw httpError(`The refund must be between Rs 0 and Rs ${cap.toLocaleString()}.`);

    let refundMethod = null;
    if (amount > 0) {
      if (ret.refund_method === "store_credit") refundMethod = "store_credit";
      else if (method === "jazzcash_api") {
        if (order.payment_method !== "jazzcash" || !order.gateway_reference || !jazzCashEnabled()) {
          throw httpError("This order wasn't paid through JazzCash online, so refund it manually.");
        }
        refundMethod = "jazzcash_api";
      } else {
        refundMethod = "manual_transfer";
        if (String(reference || "").trim().length < 3) throw httpError("Enter the transfer reference for the manual refund.");
      }
    }
    return {
      amount,
      method: refundMethod,
      account,
      reference: String(reference || "").trim().slice(0, 120) || null,
      gatewayReference: order.gateway_reference,
      paymentMethod: order.payment_method,
    };
  }

  static async applyCompletion(returnId, adminId, plan, { gatewayReference, message }) {
    const settings = await getReturnSettings();
    return withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      assertTransition(ret, "completed");
      const [[order]] = await connection.query("SELECT * FROM orders WHERE id = ?", [ret.order_id]);
      const [items] = await connection.query(
        `SELECT ri.*, oi.product_id, oi.selected_size, oi.selected_color, oi.unit_cost FROM return_items ri JOIN order_items oi ON oi.id = ri.order_item_id WHERE ri.return_id = ?`,
        [returnId]
      );
      const accepted = items.filter((i) => i.inspection === "accepted");
      const exchanges = accepted.filter((i) => i.resolution === "exchange");

      // Every product touched here, locked in ascending id order (the same
      // order checkout uses) before any stock changes.
      const productIds = [...new Set([...accepted.map((i) => i.product_id), ...exchanges.map((i) => i.exchange_product_id)])].sort((a, b) => a - b);
      const [products] = productIds.length
        ? await connection.query("SELECT id, name, status, stock_quantity FROM products WHERE id IN (?) ORDER BY id FOR UPDATE", [productIds])
        : [[]];
      const productById = new Map(products.map((p) => [p.id, p]));

      for (const line of exchanges) {
        const product = productById.get(line.exchange_product_id);
        if (!product || product.status !== "active" || product.stock_quantity < line.quantity) {
          throw httpError(`${product?.name || "The exchange product"} is out of stock. Switch that item to a refund in the inspection step, then complete again.`, 409);
        }
      }

      // Restockable items go back on sale at the cost they shipped at; the
      // rest are written off on the stock card.
      const toProcess = accepted.filter((line) => !line.restocked);
      await InventoryService.processReturn(connection, returnId, toProcess.map((line) => ({
        product_id: line.product_id,
        selected_size: line.selected_size,
        selected_color: line.selected_color,
        quantity: line.quantity,
        unit_cost: line.unit_cost === null ? null : Number(line.unit_cost),
        restock: Boolean(line.restock),
      })));
      const restockedIds = toProcess.filter((line) => line.restock).map((line) => line.id);
      if (restockedIds.length) await connection.query("UPDATE return_items SET restocked = TRUE WHERE id IN (?)", [restockedIds]);

      let exchangeOrderId = null;
      if (exchanges.length) {
        const value = exchanges.reduce((sum, l) => sum + Number(l.exchange_unit_price) * l.quantity, 0);
        const [created] = await connection.query(
          `INSERT INTO orders (user_id, email, phone, total_amount, subtotal, tax_amount, shipping_cost, discount_amount, promo_code, status, shipping_address)
           VALUES (?, ?, ?, 0, ?, 0, 0, ?, NULL, 'processing', ?)`,
          [order.user_id, order.email, order.phone, value, value, typeof order.shipping_address === "string" ? order.shipping_address : JSON.stringify(order.shipping_address)]
        );
        exchangeOrderId = created.insertId;
        await addOrderEvent(connection, exchangeOrderId, { actor: "system", type: "placed", message: `Exchange order for return ${ret.rma_number}.` });
        await connection.query("UPDATE orders SET confirmed_at = NOW() WHERE id = ?", [exchangeOrderId]);
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ?",
          [exchanges.map((l) => [exchangeOrderId, l.exchange_product_id, l.quantity, l.exchange_unit_price])]
        );
        // The replacement is reserved like any order and leaves stock when it ships.
        await InventoryService.reserve(
          connection,
          exchanges.map((l) => ({ product_id: l.exchange_product_id, quantity: l.quantity })),
          { orderId: exchangeOrderId, soldOutMessage: "An exchange product just sold out. Please try again." }
        );
        await connection.query(
          "INSERT INTO payments (order_id, amount, method, status) VALUES (?, 0, 'exchange', 'paid')",
          [exchangeOrderId]
        );
      }

      let creditCode = null;
      let creditValue = 0;
      let refundReference = plan.reference;
      if (plan.amount > 0) {
        if (plan.method === "store_credit") {
          creditValue = storeCreditValue(plan.amount, settings.storeCreditBonusPercent);
          creditCode = `CR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
          await connection.query(
            `INSERT INTO promotions (code, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at)
             VALUES (?, 'fixed', ?, 0, 1, 0, TRUE, DATE_ADD(NOW(), INTERVAL 1 YEAR))`,
            [creditCode, creditValue]
          );
          refundReference = creditCode;
        } else if (plan.method === "jazzcash_api") {
          refundReference = gatewayReference;
        }

        const [refundRow] = await connection.query(
          "INSERT INTO refunds (order_id, return_id, amount, method, status, reference, created_by, completed_at) VALUES (?, ?, ?, ?, 'completed', ?, ?, NOW())",
          [order.id, returnId, plan.amount, plan.method, refundReference, adminId || null]
        );
        if (plan.method !== "store_credit") {
          await recordCash(connection, {
            type: "refund", direction: "out", amount: plan.amount,
            account: refundAccount({ method: plan.method, payout: parseJson(ret.payout_details), paymentMethod: plan.paymentMethod, account: plan.account }),
            refType: "refund", refId: refundRow.insertId, orderId: order.id, note: `Refund for return ${ret.rma_number}`, createdBy: adminId,
          });
          await connection.query("UPDATE orders SET refunded_amount = refunded_amount + ? WHERE id = ?", [plan.amount, order.id]);
          await connection.query(
            `UPDATE payments p JOIN orders o ON o.id = p.order_id
             SET p.status = IF(o.refunded_amount >= o.total_amount, 'refunded', 'partially_refunded')
             WHERE p.order_id = ? AND p.method <> 'exchange' AND p.status IN ('pending', 'paid', 'partially_refunded')`,
            [order.id]
          );
        }
      }

      const text = String(message || "").trim().slice(0, 1000) || null;
      await connection.query(
        `UPDATE return_requests SET status = 'completed', refund_amount = ?, store_credit_code = ?, exchange_order_id = ?,
           decision_message = ?, resolved_at = NOW()
         WHERE id = ?`,
        [plan.amount, creditCode, exchangeOrderId, text, returnId]
      );

      const summary = [];
      if (plan.amount > 0) {
        summary.push(plan.method === "store_credit" ? `Store credit of Rs ${creditValue.toLocaleString()} issued (code ${creditCode}).` : `Refund of Rs ${plan.amount.toLocaleString()} sent.`);
      }
      if (exchangeOrderId) summary.push(`Exchange order #${exchangeOrderId} created.`);
      if (items.some((i) => i.inspection === "rejected")) summary.push("Some items didn't pass inspection.");
      await addEvent(connection, returnId, "admin", "completed", summary.join(" ") || "Return completed.");

      const payout = parseJson(ret.payout_details);
      return {
        notice: {
          creditValue,
          reference: refundReference,
          refundDestination:
            plan.method === "jazzcash_api" || (plan.paymentMethod === "jazzcash" && !payout)
              ? "your JazzCash wallet"
              : payout
                ? `your ${payout.type === "bank" ? "bank account" : payout.type === "easypaisa" ? "Easypaisa wallet" : "JazzCash wallet"} ending ${String(payout.account).slice(-4)}`
                : "your original payment method",
        },
      };
    });
  }

  // ─── Housekeeping ─────────────────────────────────────────────────────────

  static async expireIfStale(returnId) {
    const expired = await withTransaction(async (connection) => {
      const ret = await lockReturn(connection, returnId);
      if (ret.status !== "approved" || !ret.ship_by || new Date(ret.ship_by) > new Date()) return false;
      await connection.query("UPDATE return_requests SET status = 'expired', resolved_at = NOW() WHERE id = ?", [returnId]);
      await addEvent(connection, returnId, "system", "expired", "Return expired — no tracking details before the ship-by date.");
      return true;
    });
    if (expired) void notifyReturn(returnId, "expired");
  }

  // Hourly: remind customers 3 days before ship-by, expire overdue returns.
  static async runHousekeeping() {
    const [due] = await pool.query(
      "SELECT id FROM return_requests WHERE status = 'approved' AND reminder_sent_at IS NULL AND ship_by BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)"
    );
    for (const { id } of due) {
      const [claim] = await pool.query("UPDATE return_requests SET reminder_sent_at = NOW() WHERE id = ? AND reminder_sent_at IS NULL", [id]);
      if (claim.affectedRows === 1) void notifyReturn(id, "reminder");
    }
    const [overdue] = await pool.query("SELECT id FROM return_requests WHERE status = 'approved' AND ship_by < NOW()");
    for (const { id } of overdue) await ReturnsService.expireIfStale(id).catch((e) => console.error("[returns] expiry failed:", e.message));
  }
}
