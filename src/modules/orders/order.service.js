import pool from "../../config/db.js";
import crypto from "crypto";
import { sendOrderConfirmationEmail, sendNewOrderAlertEmail } from "../../utils/email.js";
import { CartService } from "../cart/cart.service.js";
import { withTransaction } from "../../utils/transaction.js";
import { computeFinalPrice } from "../../utils/discount.js";
import { jazzCashEnabled } from "../payments/jazzcash.js";
import { getOrderAlertRecipient, getSettings } from "../../utils/storeSettings.js";
import { addOrderEvent } from "../../utils/orderEvents.js";
import { assertPaidIfOnline } from "../fulfillment/fulfillment.service.js";
import { InventoryService } from "../inventory/inventory.service.js";

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

// Accepts "0300 1234567", "+92 300 1234567", "92-300-1234567" … and returns
// digits only (keeping a leading "+"), or null if it can't be a phone number.
const normalizePhone = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return (raw.startsWith("+") ? "+" : "") + digits;
};

// Allowed order status changes. Anything else is refused.
// Status changes allowed through updateStatus. Shipping and delivery go
// through the fulfillment module instead, which records the courier and
// tracking number (see modules/fulfillment).
const ORDER_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["cancelled"],
  shipped: [],
  delivered: [],
  cancelled: [],
};

// Cancels an order whose row the caller has already locked: releases its
// reserved stock, gives back the promo use, and closes the payment. Money
// already received is never silently written off — the payment becomes
// "refund due" and a refund is queued for the admin to send (Finance →
// Refunds owed). A submitted manual transfer is left for review; unpaid
// payments are simply failed.
async function releaseOrder(connection, order, note = null) {
  await InventoryService.release(connection, order.id, note);
  const [variantLines] = await connection.query(
    "SELECT product_id, selected_size, selected_color, quantity FROM order_items WHERE order_id = ?",
    [order.id]
  );
  for (const line of variantLines) {
    if (!line.selected_size && !line.selected_color) continue;
    await connection.query(
      "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE product_id = ? AND size_label = ? AND color_label = ?",
      [line.quantity, line.product_id, line.selected_size, line.selected_color]
    );
  }
  if (order.promo_code) {
    await connection.query("UPDATE promotions SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?", [order.promo_code]);
  }
  await connection.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.id]);

  const [payments] = await connection.query("SELECT id, method, amount, status FROM payments WHERE order_id = ? FOR UPDATE", [order.id]);
  for (const payment of payments) {
    if (payment.method === "exchange") {
      await connection.query("UPDATE payments SET status = 'refunded' WHERE id = ?", [payment.id]);
    } else if (["paid", "partially_refunded"].includes(payment.status)) {
      const owed = Math.round((Number(payment.amount) - Number(order.refunded_amount || 0)) * 100) / 100;
      await connection.query("UPDATE payments SET status = 'refund_due' WHERE id = ?", [payment.id]);
      if (owed > 0) {
        await connection.query("INSERT INTO refunds (order_id, amount, status) VALUES (?, ?, 'due')", [order.id, owed]);
      }
    } else if (["pending", "processing"].includes(payment.status)) {
      await connection.query("UPDATE payments SET status = 'failed' WHERE id = ?", [payment.id]);
    }
  }
}

// ─── Store owner's new-order email ───────────────────────────────────────────
// Controlled from admin → Settings → Notifications: "New order emails" turns
// it on/off, and "Send order emails to" picks the inbox. With no address
// set, it falls back to the store's support email (Settings → Store
// details). Runs after the order is committed and never affects checkout.
async function notifyStoreOfOrder(order) {
  try {
    const recipient = await getOrderAlertRecipient();
    if (!recipient) {
      console.warn(`New-order alert for #${order.orderId} not sent: no recipient set in Settings → Notifications (or Store details).`);
      return;
    }
    await sendNewOrderAlertEmail(recipient, order);
  } catch (error) {
    console.error("New-order alert failed:", error.message);
  }
}

// Keys only need to outlive client retries; clear day-old ones in small
// batches, off the request path.
async function pruneIdempotencyKeys() {
  try {
    await pool.query("DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL 1 DAY LIMIT 500");
  } catch (error) {
    console.error("Idempotency key cleanup failed:", error.message);
  }
}

const customerOrder = (order, items = []) => ({
  ...order,
  date: order.created_at,
  total: Number(order.total_amount),
  status: String(order.status || "pending").replace(/^\w/, (l) => l.toUpperCase()),
  address: typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address,
  items: items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    title: item.name,
    name: item.name,
    image: item.image_url,
    image_url: item.image_url,
    selected_size: item.selected_size || "",
    selected_color: item.selected_color || "",
    price: Number(item.price_at_purchase),
    quantity: item.quantity,
  })),
});

// Latest shipment per order plus the customer-visible timeline.
async function fulfillmentFor(orderIds) {
  const [shipments] = await pool.query(
    `SELECT order_id, courier_name AS courier, tracking_number, tracking_url, status, shipped_at, delivered_at
     FROM shipments WHERE order_id IN (?) ORDER BY id DESC`,
    [orderIds]
  );
  const [events] = await pool.query(
    `SELECT order_id, type, message, created_at FROM order_events
     WHERE order_id IN (?) AND visible_to_customer = TRUE ORDER BY created_at, id`,
    [orderIds]
  );
  return { shipments, events };
}

export class OrderService {
  // ─── Checkout ───────────────────────────────────────────────────────────────
  //
  // Concurrency model (MySQL/MariaDB InnoDB, REPEATABLE READ):
  //
  //  • Idempotency — if the client sends an Idempotency-Key, its row is
  //    inserted FIRST inside the transaction. A duplicate request with the
  //    same key blocks on that unique index until the first request commits,
  //    then hits ER_DUP_ENTRY and is answered with the stored result of the
  //    original order. If the first request fails, its key row is rolled back
  //    with everything else and the retry simply runs normally.
  //
  //  • Last-item races — every product in the cart is locked with SELECT …
  //    FOR UPDATE (always in ascending id order, so two checkouts can't lock
  //    the same products in opposite orders and deadlock). Whoever gets the
  //    lock first buys the item; the other waits, then re-reads the committed
  //    stock and is told it's sold out. The stock UPDATE is additionally
  //    guarded (`stock_quantity >= ?`) and the table has a CHECK constraint,
  //    so stock can't go negative even if a future code path forgets a lock.
  //
  //  • Deadlocks / lock timeouts are retried by withTransaction().
  static async checkout({ email, shipping_address, payment_method = "cod", promo_code, guestToken, userId, idempotencyKey }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw Object.assign(new Error("A valid email address is required"), { status: 400 });
    if (!guestToken || guestToken.length > 100) throw Object.assign(new Error("A guest cart token is required"), { status: 400 });
    if (!shipping_address || typeof shipping_address !== "object") throw Object.assign(new Error("Shipping address is required"), { status: 400 });
    if (!["cod", "jazzcash"].includes(payment_method)) throw Object.assign(new Error("Choose JazzCash or cash on delivery"), { status: 400 });
    if (payment_method === "jazzcash" && !jazzCashEnabled()) throw Object.assign(new Error("JazzCash payments are not available right now"), { status: 400 });

    // The store needs a number to reach the customer about delivery. It is
    // saved in its own column (for the admin panel) and inside the address.
    const phone = normalizePhone(shipping_address.phone);
    if (!phone) throw Object.assign(new Error("A valid phone number is required so we can reach you about your order"), { status: 400 });
    shipping_address = { ...shipping_address, phone };

    const idempotency = idempotencyKey
      ? {
          key: idempotencyKey,
          // Keys only ever match within the same customer.
          scope: userId ? `user:${userId}` : `guest:${sha256(guestToken)}`,
          requestHash: sha256(JSON.stringify({ email: normalizedEmail, shipping_address, payment_method, promo_code: promo_code || null })),
        }
      : null;

    // Logged-in shoppers have their cart keyed by user_id, not guest_token
    // (see CartService.getCartId) — look it up the same way here, or a
    // signed-in user's non-empty cart would look empty to checkout.
    const cartId = await CartService.getCartId(guestToken, userId);

    let result;
    try {
      result = await withTransaction(async (connection) => {
        // 1) Claim the idempotency key (blocks concurrent duplicates).
        let idempotencyRowId = null;
        if (idempotency) {
          const [claim] = await connection.query(
            "INSERT INTO idempotency_keys (scope, idem_key, request_hash) VALUES (?, ?, ?)",
            [idempotency.scope, idempotency.key, idempotency.requestHash]
          );
          idempotencyRowId = claim.insertId;
        }

        // 2) Lock the cart lines, then the products they reference — in a
        //    fixed (ascending id) order.
        const [lines] = await connection.query(
          "SELECT product_id, selected_size, selected_color, quantity FROM cart_items WHERE cart_id = ? ORDER BY product_id, selected_size, selected_color FOR UPDATE",
          [cartId]
        );
        if (lines.length === 0) throw Object.assign(new Error("Your bag is empty"), { status: 400 });

        const [products] = await connection.query(
          "SELECT id, name, image_url, sizes, colors, price, discount_type, discount_value, stock_quantity, status FROM products WHERE id IN (?) ORDER BY id FOR UPDATE",
          [lines.map((line) => line.product_id)]
        );
        const productById = new Map(products.map((product) => [product.id, product]));
        const [variantRows] = await connection.query(
          "SELECT product_id, size_label, color_label, stock_quantity FROM product_variants WHERE product_id IN (?) ORDER BY product_id, size_label, color_label FOR UPDATE",
          [products.map((product) => product.id)]
        );
        const variantsByProduct = new Map();
        for (const variant of variantRows) {
          if (!variantsByProduct.has(variant.product_id)) variantsByProduct.set(variant.product_id, new Map());
          variantsByProduct.get(variant.product_id).set(variant.size_label + "\\u0000" + variant.color_label, variant);
        }

        // 3) Validate against the locked, committed values. The price
        //    charged is always the live, server-computed discounted price —
        //    never trusted from the client/cart snapshot — so a discount
        //    the admin just changed takes effect on the very next checkout.
        const items = [];
        let subtotal = 0;
        for (const line of lines) {
          const product = productById.get(line.product_id);
          if (!product || product.status !== "active") {
            throw Object.assign(new Error(`"${product?.name || "An item in your bag"}" is no longer available`), { status: 409 });
          }
          if (product.stock_quantity < line.quantity) {
            const message = product.stock_quantity > 0
              ? `Only ${product.stock_quantity} left of "${product.name}" — please update your bag`
              : `"${product.name}" just sold out`;
            throw Object.assign(new Error(message), { status: 409 });
          }
          const allowedSizes = String(product.sizes || "").split(/[;,\n]/).map((value) => value.trim()).filter(Boolean);
          const allowedColors = String(product.colors || "").split(/[;,\n]/).map((value) => value.trim()).filter(Boolean);
          if ((allowedSizes.length && !allowedSizes.includes(line.selected_size)) || (allowedColors.length && !allowedColors.includes(line.selected_color))) {
            throw Object.assign(new Error(`Please update the size or color for "${product.name}" in your bag`), { status: 409 });
          }
          const productVariants = variantsByProduct.get(product.id);
          if (productVariants?.size) {
            const variantKey = (line.selected_size || "") + "\\u0000" + (line.selected_color || "");
            const variant = productVariants.get(variantKey);
            if (!variant || Number(variant.stock_quantity) < Number(line.quantity)) {
              throw Object.assign(new Error("The selected size or color for " + product.name + " is sold out"), { status: 409 });
            }
            const [updated] = await connection.query(
              "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND size_label = ? AND color_label = ? AND stock_quantity >= ?",
              [line.quantity, product.id, line.selected_size || "", line.selected_color || "", line.quantity]
            );
            if (updated.affectedRows !== 1) throw Object.assign(new Error("The selected size or color for " + product.name + " just sold out"), { status: 409 });
          }
          const unitPrice = computeFinalPrice(product.price, product.discount_type, product.discount_value);
          items.push({ product_id: product.id, name: product.name, image_url: product.image_url, selected_size: line.selected_size || "", selected_color: line.selected_color || "", quantity: line.quantity, price: unitPrice });
          subtotal += unitPrice * line.quantity;
        }

        const taxAmount = 0;
        // Shipping is server-computed from the admin-configurable settings
        // (never trusted from the client).
        const [[shippingSettingRow]] = await connection.query(
          "SELECT setting_value FROM store_settings WHERE setting_key = 'shipping'"
        );
        const rawShipping = shippingSettingRow?.setting_value;
        const shippingSettings = typeof rawShipping === "string" ? JSON.parse(rawShipping) : rawShipping || {};
        const flatRate = Number(shippingSettings.flatRate ?? 200);
        const freeThreshold = Number(shippingSettings.freeThreshold ?? 0);
        const shippingCost = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : flatRate;

        // 4) Promo — the promotion row is locked too, so a code with a usage
        //    limit can't be redeemed past that limit by simultaneous orders.
        let discountAmount = 0;
        let appliedPromo = null;
        if (promo_code) {
          const [promos] = await connection.query(
            "SELECT * FROM promotions WHERE code = ? AND is_active = TRUE FOR UPDATE",
            [String(promo_code).toUpperCase()]
          );
          const promo = promos[0];
          const now = new Date();
          const valid =
            promo &&
            (!promo.expires_at || new Date(promo.expires_at) > now) &&
            (!promo.max_uses || promo.used_count < promo.max_uses) &&
            subtotal >= parseFloat(promo.min_order_amount);
          if (valid) {
            discountAmount = promo.discount_type === "percentage"
              ? (subtotal * parseFloat(promo.discount_value)) / 100
              : parseFloat(promo.discount_value);
            discountAmount = Math.min(parseFloat(discountAmount.toFixed(2)), subtotal);
            appliedPromo = promo.code;
            await connection.query("UPDATE promotions SET used_count = used_count + 1 WHERE id = ?", [promo.id]);
          }
        }

        const totalAmount = parseFloat((subtotal + taxAmount + shippingCost - discountAmount).toFixed(2));

        const [orderRes] = await connection.query(
          `INSERT INTO orders (user_id, email, phone, total_amount, subtotal, tax_amount, shipping_cost, discount_amount, promo_code, status, shipping_address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [userId || null, normalizedEmail, phone, totalAmount, subtotal, taxAmount, shippingCost, discountAmount, appliedPromo, JSON.stringify(shipping_address)]
        );
        const orderId = orderRes.insertId;
        await addOrderEvent(connection, orderId, { actor: "customer", type: "placed", message: "Order placed." });

        await connection.query(
          "INSERT INTO order_items (order_id, product_id, selected_size, selected_color, quantity, price_at_purchase) VALUES ?",
          [items.map((item) => [orderId, item.product_id, item.selected_size, item.selected_color, item.quantity, item.price])]
        );

        // 5) Reserve the stock: it stays on the shelf, held for this order,
        //    until it ships. Guarded so it only succeeds if enough is left.
        await InventoryService.reserve(connection, items, {
          orderId,
          soldOutMessage: "An item in your bag just sold out — please review your bag",
        });

        const paymentToken = payment_method === "cod" ? null : crypto.randomBytes(32).toString("hex");
        const [paymentResult] = await connection.query(
          "INSERT INTO payments (order_id, amount, method, status, payment_token) VALUES (?, ?, ?, 'pending', ?)",
          [orderId, totalAmount, payment_method, paymentToken]
        );

        await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

        const response = {
          orderId,
          payment: { id: paymentResult.insertId, method: payment_method, token: paymentToken },
          summary: { subtotal, tax: taxAmount, shipping: shippingCost, discount: discountAmount, total: totalAmount, promo: appliedPromo },
          items: items.map((item) => ({ name: item.name, image_url: item.image_url, selected_size: item.selected_size, selected_color: item.selected_color, quantity: item.quantity, price: item.price })),
        };

        // 6) Record the outcome against the key, in the same transaction.
        if (idempotencyRowId) {
          await connection.query(
            "UPDATE idempotency_keys SET order_id = ?, response_json = ? WHERE id = ?",
            [orderId, JSON.stringify(response), idempotencyRowId]
          );
        }

        return { ...response, email: normalizedEmail, totalAmount };
      });
    } catch (error) {
      // The key already exists — this is a repeat of an earlier checkout.
      if (idempotency && error.code === "ER_DUP_ENTRY" && String(error.sqlMessage).includes("uniq_idempotency_scope_key")) {
        return OrderService.replayCheckout(idempotency);
      }
      throw error;
    }

    sendOrderConfirmationEmail(result.email, {
      orderId: result.orderId,
      items: result.items,
      summary: result.summary,
      address: shipping_address,
      paymentMethod: payment_method,
    });
    void notifyStoreOfOrder({
      orderId: result.orderId,
      customerEmail: result.email,
      items: result.items,
      summary: result.summary,
      address: shipping_address,
      paymentMethod: payment_method,
    });
    void pruneIdempotencyKeys();

    const { email: _email, totalAmount: _total, ...response } = result;
    return { ...response, replayed: false };
  }

  // Answers a repeated checkout with the order the first request created.
  static async replayCheckout({ scope, key, requestHash }) {
    const [rows] = await pool.query(
      "SELECT request_hash, order_id, response_json FROM idempotency_keys WHERE scope = ? AND idem_key = ?",
      [scope, key]
    );
    const row = rows[0];
    if (!row?.response_json) {
      // Shouldn't happen: the key and its result are written in one transaction.
      throw Object.assign(new Error("This order is still being placed. Please wait a moment."), { status: 409 });
    }
    if (row.request_hash !== requestHash) {
      throw Object.assign(
        new Error(`Your order #${row.order_id} was already placed from this checkout. Check your email or your orders.`),
        { status: 409, orderId: row.order_id }
      );
    }
    return { ...JSON.parse(row.response_json), replayed: true };
  }

  // ─── Customer order list ─────────────────────────────────────────────────────
  static async listForUser(userId) {
    const [orders] = await pool.query(
      `SELECT o.*, (SELECT method FROM payments WHERE order_id = o.id ORDER BY id LIMIT 1) AS payment_method
       FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      [userId]
    );
    if (!orders.length) return [];
    const ids = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.selected_size, oi.selected_color, oi.quantity, oi.price_at_purchase, p.name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id IN (?)`,
      [ids]
    );
    const { shipments, events } = await fulfillmentFor(ids);
    return orders.map((o) => ({
      ...customerOrder(o, items.filter((i) => i.order_id === o.id)),
      shipment: shipments.find((sh) => sh.order_id === o.id) || null,
      events: events.filter((e) => e.order_id === o.id),
    }));
  }

  // ─── Single order (customer) ─────────────────────────────────────────────────
  static async getForUser(orderId, userId) {
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, userId]);
    if (!orders.length) throw Object.assign(new Error("Order not found"), { status: 404 });
    const [items] = await pool.query(
      "SELECT oi.*, p.name, p.slug, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
      [orderId]
    );
    const [payments] = await pool.query("SELECT * FROM payments WHERE order_id = ?", [orderId]);
    const { shipments, events } = await fulfillmentFor([Number(orderId)]);
    return { ...customerOrder(orders[0], items), payment: payments[0] || null, shipment: shipments[0] || null, events };
  }

  // ─── Cancel order (customer) ─────────────────────────────────────────────────
  static async cancel(orderId, userId) {
    await withTransaction(async (connection) => {
      // Lock the order first: a customer cancelling while an admin changes
      // the status (or verifies payment) is serialised on this row.
      const [orders] = await connection.query("SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE", [orderId, userId]);
      if (!orders.length) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (orders[0].status !== "pending") throw Object.assign(new Error("Only pending orders can be cancelled"), { status: 400 });
      const [inFlight] = await connection.query(
        "SELECT id FROM payments WHERE order_id = ? AND status = 'processing' FOR UPDATE",
        [orderId]
      );
      if (inFlight.length) throw Object.assign(new Error("A payment for this order is being confirmed. Please try again in a few minutes."), { status: 409 });
      await releaseOrder(connection, orders[0]);
      await addOrderEvent(connection, orderId, { actor: "customer", type: "cancelled", message: "Order cancelled by you." });
    });
  }

  // ─── Admin: all orders ────────────────────────────────────────────────────────
  static async adminList() {
    const [orders] = await pool.query(`
      SELECT o.*, COALESCE(o.email, u.email) AS email, u.first_name, u.last_name,
             COALESCE(o.phone, MAX(cp.phone)) AS phone,
             COUNT(oi.id) AS item_count, MAX(p.method) AS payment_method, MAX(p.status) AS payment_status,
             (SELECT CONCAT_WS(' · ', courier_name, tracking_number) FROM shipments s WHERE s.order_id = o.id ORDER BY s.id DESC LIMIT 1) AS tracking,
             (SELECT s.receipt_url FROM shipments s WHERE s.order_id = o.id AND s.status <> 'failed' ORDER BY s.id DESC LIMIT 1) AS receipt_url
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN customer_profiles cp ON cp.user_id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN payments p ON p.order_id = o.id
      GROUP BY o.id ORDER BY o.created_at DESC
    `);
    return orders;
  }

  // ─── Admin: order items ───────────────────────────────────────────────────────
  static async adminGetItems(orderId) {
    const [items] = await pool.query(
      `SELECT oi.id, oi.selected_size, oi.selected_color, oi.quantity AS qty, oi.price_at_purchase AS price, p.name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
      [orderId]
    );
    return items;
  }

  // ─── Admin: update status ────────────────────────────────────────────────────
  // Orders only move forward. Cancelling puts the stock (and any promo use)
  // back exactly once; a cancelled or delivered order is final, so stock can
  // never be restored twice or silently double-counted.
  static async updateStatus(orderId, status) {
    if (status === "shipped" || status === "delivered") {
      throw Object.assign(new Error("Use Fulfill to add tracking and ship the order, then Mark as delivered."), { status: 400 });
    }
    if (!ORDER_TRANSITIONS[status]) throw Object.assign(new Error("Invalid status"), { status: 400 });

    await withTransaction(async (connection) => {
      const [orders] = await connection.query(
        "SELECT o.*, p.method AS payment_method, p.status AS payment_status FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.id = ? FOR UPDATE",
        [orderId]
      );
      const order = orders[0];
      if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (order.status === status) return; // already there — nothing to do

      if (!ORDER_TRANSITIONS[order.status].includes(status)) {
        throw Object.assign(
          new Error(`A ${order.status} order can't be moved to ${status}.`),
          { status: 409 }
        );
      }

      if (status === "cancelled") {
        const [inFlight] = await connection.query("SELECT id FROM payments WHERE order_id = ? AND status = 'processing' FOR UPDATE", [orderId]);
        if (inFlight.length) throw Object.assign(new Error("A JazzCash payment for this order is waiting for the customer's approval. Try again in a few minutes."), { status: 409 });
        await releaseOrder(connection, order);
        await addOrderEvent(connection, orderId, { actor: "admin", type: "cancelled", message: "Order cancelled by the store." });
      } else {
        assertPaidIfOnline(order);
        await connection.query("UPDATE orders SET status = 'processing', confirmed_at = NOW() WHERE id = ?", [orderId]);
        await addOrderEvent(connection, orderId, { actor: "admin", type: "confirmed", message: "Order confirmed — we're preparing it for shipping." });
      }
    });
  }

  // ─── Housekeeping: unpaid online orders ──────────────────────────────────────
  // An online order that is still unpaid after the hold time (admin →
  // Settings → Inventory) is cancelled so its reserved stock goes back on
  // sale. A charge waiting on the customer's MPIN ('processing') or a
  // submitted transfer is never touched.
  static async autoCancelUnpaid() {
    const settings = await getSettings(["inventory"]);
    const minutes = Math.max(10, Number(settings.inventory?.unpaidHoldMinutes ?? 60));
    const [due] = await pool.query(
      `SELECT o.id FROM orders o JOIN payments p ON p.order_id = o.id
       WHERE o.status = 'pending' AND p.method <> 'cod' AND p.method <> 'exchange' AND p.status = 'pending'
         AND o.created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [minutes]
    );
    for (const { id } of due) {
      await withTransaction(async (connection) => {
        const [[order]] = await connection.query("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
        const [[payment]] = await connection.query("SELECT status FROM payments WHERE order_id = ? ORDER BY id LIMIT 1 FOR UPDATE", [id]);
        if (order?.status !== "pending" || payment?.status !== "pending") return;
        await releaseOrder(connection, order, "Unpaid — cancelled automatically");
        await addOrderEvent(connection, id, {
          actor: "system",
          type: "cancelled",
          message: `Order cancelled automatically — payment wasn't completed within ${minutes} minutes.`,
        });
      }).catch((error) => console.error(`[orders] auto-cancel of #${id} failed:`, error.message));
    }
    return due.length;
  }
}
