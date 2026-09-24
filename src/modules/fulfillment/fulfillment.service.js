import fs from "fs";
import path from "path";
import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { addOrderEvent } from "../../utils/orderEvents.js";
import { notifyOrderStatus } from "../orders/order.notify.js";
import { InventoryService } from "../inventory/inventory.service.js";

// Couriers commonly used for domestic delivery in Pakistan. "Own delivery"
// covers the store's own rider, where there's no tracking number.
export const COURIERS = ["TCS", "Leopards", "M&P", "PostEx", "Trax", "Call Courier", "BlueEx", "Rider", "Pakistan Post", "Own delivery"];
const NO_TRACKING = "Own delivery";

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

// FormData sends every value as a string, so "false" must not read as truthy.
function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "on", "yes"].includes(String(value).toLowerCase());
}

// Receipts live in /uploads and are stored as "/uploads/<name>". Only files
// this feature created ("receipt_*") are ever deleted.
const removeReceiptFile = async (url) => {
  const name = path.basename(String(url || ""));
  if (!url || !name.startsWith("receipt_")) return;
  await fs.promises.unlink(path.join(process.cwd(), "uploads", name)).catch(() => {});
};
const receiptUrlFor = (file) => (file ? `/uploads/${file.filename}` : null);

// Handover date ("YYYY-MM-DD") + time ("HH:MM") → "YYYY-MM-DD HH:MM:00" for a
// DATETIME column. Kept as plain text so no timezone shifting can happen.
function cleanHandover({ handover_date, handover_time }) {
  const date = String(handover_date || "").trim();
  const time = String(handover_time || "").trim().slice(0, 5);
  if (!date || !time) throw httpError("Enter the date and time the parcel was handed to the courier.");
  const parsed = new Date(`${date}T00:00:00Z`);
  const year = Number(date.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || year < 2000 || year > new Date().getFullYear() + 1) {
    throw httpError("The handover date isn't valid.");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw httpError("The handover time isn't valid.");
  return `${date} ${time}:00`;
}

function cleanShipment({ courier, tracking_number, tracking_url, note, courier_branch, handover_date, handover_time }) {
  const cleanCourier = String(courier || "").trim().slice(0, 60);
  const tracking = String(tracking_number || "").trim().slice(0, 100);
  const url = String(tracking_url || "").trim().slice(0, 500);
  if (!cleanCourier) throw httpError("Choose the courier.");
  if (cleanCourier !== NO_TRACKING && tracking.length < 3) throw httpError("Enter the tracking number from the courier's receipt.");
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw httpError("The tracking link must start with http:// or https://");
  const branch = String(courier_branch || "").trim().slice(0, 100);
  if (!branch) throw httpError("Enter the courier branch that took the parcel.");
  const handoverAt = cleanHandover({ handover_date, handover_time });
  return { courier: cleanCourier, tracking: tracking || null, url: url || null, note: String(note || "").trim().slice(0, 500) || null, branch, handoverAt };
}

const describeShipment = ({ courier, tracking }) =>
  tracking ? `Shipped with ${courier} — tracking ${tracking}.` : `Out for delivery with ${courier}.`;

async function lockOrder(connection, orderId) {
  const [[order]] = await connection.query(
    `SELECT o.*, p.method AS payment_method, p.status AS payment_status
     FROM orders o LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ? FOR UPDATE`,
    [orderId]
  );
  if (!order) throw httpError("Order not found", 404);
  return order;
}

// An online payment must have arrived before an order is confirmed or
// shipped; cash on delivery is collected by the courier.
export function assertPaidIfOnline(order) {
  if (order.payment_method === "jazzcash" && !["paid", "partially_refunded"].includes(order.payment_status)) {
    throw httpError("This order's JazzCash payment hasn't been received yet, so it can't be confirmed or shipped.", 409);
  }
}

export class FulfillmentService {
  static async detail(orderId) {
    const [[order]] = await pool.query(
      `SELECT o.id, o.status, o.created_at, o.confirmed_at, o.shipped_at, o.delivered_at,
              p.method AS payment_method, p.status AS payment_status
       FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.id = ?`,
      [orderId]
    );
    if (!order) throw httpError("Order not found", 404);
    const [shipments] = await pool.query(
      `SELECT id, courier_name AS courier, courier_branch, tracking_number, tracking_url, note, status, customer_notified, shipped_at, delivered_at,
              DATE_FORMAT(handover_at, '%Y-%m-%dT%H:%i:%s') AS handover_at,
              DATE_FORMAT(handover_at, '%Y-%m-%d') AS handover_date,
              DATE_FORMAT(handover_at, '%H:%i') AS handover_time,
              receipt_url
       FROM shipments WHERE order_id = ? ORDER BY id DESC`,
      [orderId]
    );
    const [events] = await pool.query(
      "SELECT id, actor, type, message, visible_to_customer, created_at FROM order_events WHERE order_id = ? ORDER BY created_at DESC, id DESC",
      [orderId]
    );
    return { order, shipment: shipments[0] || null, shipments, events, couriers: COURIERS };
  }

  // Creates the shipment and marks the order shipped — the "Fulfill items"
  // step. Confirms the order too if it was still pending.
  static async fulfill(orderId, body = {}, file = null) {
    const receiptUrl = receiptUrlFor(file);
    try {
      const shipment = cleanShipment(body);
      if (!receiptUrl) throw httpError("Attach the courier's receipt (photo or PDF).");
      const notify = toBoolean(body.notify, true);
      // Stock: InventoryService.ship() moves the reserved units out of stock
      // inside this same transaction, so the shipment, the order status and
      // the stock ledger commit (or roll back) together. It only runs on this
      // pending/processing → shipped transition, never on tracking edits.
      await withTransaction(async (connection) => {
        const order = await lockOrder(connection, orderId);
        if (!["pending", "processing"].includes(order.status)) {
          throw httpError(order.status === "cancelled" ? "A cancelled order can't be shipped." : "This order has already been shipped.", 409);
        }
        assertPaidIfOnline(order);

        if (order.status === "pending") {
          await addOrderEvent(connection, orderId, { actor: "admin", type: "confirmed", message: "Order confirmed." });
        }
        await connection.query(
          `INSERT INTO shipments (order_id, courier_name, courier_branch, handover_at, receipt_url, tracking_number, tracking_url, note, customer_notified, status, shipped_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_transit', NOW())`,
          [orderId, shipment.courier, shipment.branch, shipment.handoverAt, receiptUrl, shipment.tracking, shipment.url, shipment.note, notify]
        );
        await connection.query(
          "UPDATE orders SET status = 'shipped', confirmed_at = COALESCE(confirmed_at, NOW()), shipped_at = NOW() WHERE id = ?",
          [orderId]
        );
        // The reserved units leave stock now, at today's average cost.
        await InventoryService.ship(connection, orderId);
        await addOrderEvent(connection, orderId, { actor: "admin", type: "fulfilled", message: describeShipment(shipment) });
        if (shipment.note) await addOrderEvent(connection, orderId, { actor: "admin", type: "note", message: shipment.note, visible: false });
      });
      if (notify) void notifyOrderStatus(orderId, "shipped");
    } catch (error) {
      await removeReceiptFile(receiptUrl); // nothing was saved, so don't keep the upload
      throw error;
    }
    return FulfillmentService.detail(orderId);
  }

  // Fixes a typo'd tracking number or courier after shipping.
  static async updateTracking(orderId, body = {}, file = null) {
    const newReceiptUrl = receiptUrlFor(file);
    let oldReceiptUrl = null;
    try {
      const shipment = cleanShipment(body);
      const notify = toBoolean(body.notify, false);
      await withTransaction(async (connection) => {
        const order = await lockOrder(connection, orderId);
        if (order.status !== "shipped") throw httpError("Tracking can only be changed while the order is on its way.", 409);
        const [[current]] = await connection.query("SELECT id, receipt_url FROM shipments WHERE order_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE", [orderId]);
        if (!current) throw httpError("This order has no shipment yet.", 409);
        // Keep the current receipt unless a new one was uploaded; an order
        // that somehow has none still needs one.
        if (!newReceiptUrl && !current.receipt_url) throw httpError("Attach the courier's receipt (photo or PDF).");
        oldReceiptUrl = current.receipt_url;
        await connection.query(
          `UPDATE shipments SET courier_name = ?, courier_branch = ?, handover_at = ?, receipt_url = ?, tracking_number = ?, tracking_url = ?, note = ?,
                  customer_notified = customer_notified OR ? WHERE id = ?`,
          [shipment.courier, shipment.branch, shipment.handoverAt, newReceiptUrl || current.receipt_url, shipment.tracking, shipment.url, shipment.note, notify, current.id]
        );
        await addOrderEvent(connection, orderId, {
          actor: "admin",
          type: "tracking_updated",
          message: `Tracking updated: ${describeShipment(shipment)}`,
          visible: notify,
        });
      });
      if (notify) void notifyOrderStatus(orderId, "tracking_updated");
    } catch (error) {
      await removeReceiptFile(newReceiptUrl);
      throw error;
    }
    // The replaced receipt is only deleted once the new one is committed.
    if (newReceiptUrl && oldReceiptUrl && oldReceiptUrl !== newReceiptUrl) await removeReceiptFile(oldReceiptUrl);
    return FulfillmentService.detail(orderId);
  }

  static async markDelivered(orderId) {
    await withTransaction(async (connection) => {
      const order = await lockOrder(connection, orderId);
      if (order.status !== "shipped") throw httpError("Only an order that has been shipped can be marked delivered.", 409);
      await connection.query("UPDATE shipments SET status = 'delivered', delivered_at = NOW() WHERE order_id = ? AND status = 'in_transit'", [orderId]);
      await connection.query("UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?", [orderId]);
      // Cash on delivery: the courier has collected the payment. It becomes
      // cash for the store only when the courier pays it over (Finance → COD
      // settlements); until then it is a receivable.
      if (order.payment_method === "cod") {
        await connection.query("UPDATE payments SET status = 'paid' WHERE order_id = ? AND status = 'pending'", [orderId]);
      }
      await addOrderEvent(connection, orderId, { actor: "admin", type: "delivered", message: "Delivered to the customer." });
    });
    void notifyOrderStatus(orderId, "delivered");
    return FulfillmentService.detail(orderId);
  }

  // A parcel the courier couldn't deliver comes back to the store; the
  // order returns to "processing" so it can be re-shipped or cancelled.
  static async markReturnedToSender(orderId, { note }) {
    await withTransaction(async (connection) => {
      const order = await lockOrder(connection, orderId);
      if (order.status !== "shipped") throw httpError("Only an order on its way can be marked as returned by the courier.", 409);
      await connection.query("UPDATE shipments SET status = 'failed' WHERE order_id = ? AND status = 'in_transit'", [orderId]);
      await connection.query("UPDATE orders SET status = 'processing', shipped_at = NULL WHERE id = ?", [orderId]);
      // The parcel is back on the shelf, still held for this order.
      await InventoryService.unship(connection, orderId);
      await addOrderEvent(connection, orderId, {
        actor: "admin",
        type: "delivery_failed",
        message: String(note || "").trim().slice(0, 500) || "The courier couldn't deliver the parcel and returned it to us.",
      });
    });
    return FulfillmentService.detail(orderId);
  }
}