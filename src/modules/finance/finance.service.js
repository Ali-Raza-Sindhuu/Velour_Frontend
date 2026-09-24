import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { addOrderEvent } from "../../utils/orderEvents.js";
import { refundTransaction, jazzCashEnabled } from "../payments/jazzcash.js";
import { recordCash, refundAccount, ACCOUNTS } from "./ledger.js";
import { round2 } from "../inventory/inventory.math.js";

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });
const num = (value) => Number(value || 0);

// "YYYY-MM-DD" range, inclusive; defaults to the last 30 days.
function range({ from, to } = {}) {
  const valid = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
  const today = new Date();
  const end = valid(to) ? to : today.toISOString().slice(0, 10);
  const start = valid(from) ? from : new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
}

// Orders created by a return exchange carry no sale of their own.
const NOT_EXCHANGE = "NOT EXISTS (SELECT 1 FROM payments px WHERE px.order_id = o.id AND px.method = 'exchange')";

// COD orders the courier has collected but not yet paid over.
const RECEIVABLE_WHERE = "p.method = 'cod' AND o.status = 'delivered' AND p.remittance_id IS NULL AND p.amount > 0";
const LATEST_SHIPMENT = "LEFT JOIN shipments s ON s.id = (SELECT MAX(id) FROM shipments WHERE order_id = o.id)";

export class FinanceService {
  static async summary(query) {
    const { from, to } = range(query);
    const window = [from, to];

    const [cashRows] = await pool.query(
      `SELECT type, direction, SUM(amount) AS amount FROM cash_entries
       WHERE occurred_at >= ? AND occurred_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY type, direction`,
      window
    );
    const byType = Object.fromEntries(cashRows.map((r) => [r.type, num(r.amount)]));
    const cashIn = cashRows.filter((r) => r.direction === "in").reduce((s, r) => s + num(r.amount), 0);
    const cashOut = cashRows.filter((r) => r.direction === "out").reduce((s, r) => s + num(r.amount), 0);

    const [receivable] = await pool.query(
      `SELECT COALESCE(s.courier_name, 'Unknown') AS courier, COUNT(*) AS orders, SUM(p.amount) AS amount
       FROM payments p JOIN orders o ON o.id = p.order_id ${LATEST_SHIPMENT}
       WHERE ${RECEIVABLE_WHERE} GROUP BY courier ORDER BY amount DESC`
    );
    const [[inTransit]] = await pool.query(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(p.amount), 0) AS amount
       FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.method = 'cod' AND o.status = 'shipped'`
    );
    const [[owed]] = await pool.query("SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM refunds WHERE status = 'due'");

    const [[credit]] = await pool.query(
      `SELECT COALESCE(SUM(discount_value), 0) AS outstanding FROM promotions
       WHERE code LIKE 'CR-%' AND is_active = TRUE AND (max_uses IS NULL OR used_count < max_uses) AND (expires_at IS NULL OR expires_at > NOW())`
    );
    const [[issued]] = await pool.query(
      `SELECT COALESCE(SUM(pr.discount_value), 0) AS amount FROM refunds r JOIN promotions pr ON pr.code = r.reference
       WHERE r.method = 'store_credit' AND r.status = 'completed' AND r.completed_at >= ? AND r.completed_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      window
    );
    const [[redeemed]] = await pool.query(
      `SELECT COALESCE(SUM(o.discount_amount), 0) AS amount FROM orders o
       WHERE o.promo_code LIKE 'CR-%' AND o.status <> 'cancelled' AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      window
    );

    // Sales are recognised when the order ships — the same moment its cost
    // of goods is recorded.
    const [[sales]] = await pool.query(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS gross, COALESCE(SUM(o.shipping_cost), 0) AS shipping
       FROM orders o WHERE o.status IN ('shipped', 'delivered') AND o.shipped_at >= ? AND o.shipped_at < DATE_ADD(?, INTERVAL 1 DAY) AND ${NOT_EXCHANGE}`,
      window
    );
    const [[salesReturns]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS amount FROM refunds
       WHERE return_id IS NOT NULL AND status = 'completed' AND completed_at >= ? AND completed_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      window
    );

    const [[stockCost]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE type WHEN 'ship' THEN quantity * unit_cost WHEN 'unship' THEN -quantity * unit_cost WHEN 'return_restock' THEN -quantity * unit_cost ELSE 0 END), 0) AS cogs,
         COALESCE(SUM(CASE WHEN type = 'adjustment' AND available_change < 0 THEN quantity * unit_cost ELSE 0 END), 0) AS write_offs,
         COALESCE(SUM(CASE WHEN type = 'adjustment' AND available_change > 0 THEN quantity * unit_cost ELSE 0 END), 0) AS found,
         COALESCE(SUM(CASE WHEN type = 'return_scrap' THEN quantity * unit_cost ELSE 0 END), 0) AS scrapped
       FROM inventory_movements WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      window
    );
    const [[inventory]] = await pool.query(
      `SELECT COALESCE(SUM((stock_quantity + reserved_quantity) * avg_cost), 0) AS value,
              COALESCE(SUM(stock_quantity + reserved_quantity), 0) AS units,
              COALESCE(SUM(reserved_quantity), 0) AS reserved,
              SUM(avg_cost = 0 AND stock_quantity + reserved_quantity > 0) AS uncosted
       FROM products`
    );
    const [[payables]] = await pool.query("SELECT COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS amount FROM stock_purchases WHERE payment_status = 'unpaid'");
    const [[purchased]] = await pool.query(
      "SELECT COALESCE(SUM(total_cost), 0) AS amount FROM stock_purchases WHERE purchased_at BETWEEN ? AND ?",
      window
    );

    const netSales = round2(num(sales.gross) - num(salesReturns.amount));
    const cogs = round2(num(stockCost.cogs));
    const courierFees = byType.courier_fee || 0;
    const writeOffs = round2(num(stockCost.write_offs) - num(stockCost.found));
    return {
      range: { from, to },
      cash: { in: round2(cashIn), out: round2(cashOut), net: round2(cashIn - cashOut), byType },
      receivable: {
        amount: round2(receivable.reduce((s, r) => s + num(r.amount), 0)),
        orders: receivable.reduce((s, r) => s + num(r.orders), 0),
        byCourier: receivable.map((r) => ({ courier: r.courier, orders: num(r.orders), amount: num(r.amount) })),
        inTransit: { orders: num(inTransit.orders), amount: num(inTransit.amount) },
      },
      refundsOwed: { count: num(owed.count), amount: num(owed.amount) },
      storeCredit: { outstanding: num(credit.outstanding), issued: num(issued.amount), redeemed: num(redeemed.amount) },
      sales: { orders: num(sales.orders), gross: num(sales.gross), shipping: num(sales.shipping), returns: num(salesReturns.amount), net: netSales },
      cogs,
      grossProfit: round2(netSales - cogs),
      courierFees,
      writeOffs,
      scrapped: round2(num(stockCost.scrapped)),
      netProfit: round2(netSales - cogs - courierFees - writeOffs),
      inventory: { value: round2(num(inventory.value)), units: num(inventory.units), reserved: num(inventory.reserved), uncosted: num(inventory.uncosted) },
      payables: { count: num(payables.count), amount: num(payables.amount) },
      purchased: num(purchased.amount),
    };
  }

  static async ledger(query) {
    const { from, to } = range(query);
    const params = [from, to];
    let where = "ce.occurred_at >= ? AND ce.occurred_at < DATE_ADD(?, INTERVAL 1 DAY)";
    if (query.type) {
      where += " AND ce.type = ?";
      params.push(query.type);
    }
    const [rows] = await pool.query(
      `SELECT ce.*, u.first_name AS admin_name FROM cash_entries ce LEFT JOIN users u ON u.id = ce.created_by
       WHERE ${where} ORDER BY ce.occurred_at DESC, ce.id DESC LIMIT 500`,
      params
    );
    return rows.map((r) => ({ ...r, amount: num(r.amount) }));
  }

  // ─── COD settlement ───────────────────────────────────────────────────────

  static async unsettledCod() {
    const [rows] = await pool.query(
      `SELECT o.id AS order_id, o.email, o.delivered_at, p.id AS payment_id, p.amount, COALESCE(s.courier_name, 'Unknown') AS courier, s.tracking_number
       FROM payments p JOIN orders o ON o.id = p.order_id ${LATEST_SHIPMENT}
       WHERE ${RECEIVABLE_WHERE} ORDER BY o.delivered_at`
    );
    return rows.map((r) => ({ ...r, id: r.payment_id, amount: num(r.amount) }));
  }

  static async remittances() {
    const [rows] = await pool.query(
      `SELECT r.*, (SELECT COUNT(*) FROM payments WHERE remittance_id = r.id) AS orders
       FROM cod_remittances r ORDER BY r.received_at DESC, r.id DESC LIMIT 200`
    );
    return rows.map((r) => ({ ...r, gross_amount: num(r.gross_amount), fee_amount: num(r.fee_amount), net_amount: num(r.net_amount) }));
  }

  // The courier paid over the cash for these orders, less their fee.
  static async recordRemittance(body, adminId) {
    const orderIds = [...new Set((Array.isArray(body.order_ids) ? body.order_ids : []).map(Number).filter(Boolean))];
    if (!orderIds.length) throw httpError("Select the orders this payout covers.");
    const fee = round2(body.fee_amount || 0);
    if (!Number.isFinite(fee) || fee < 0) throw httpError("Enter a valid courier fee.");
    const account = String(body.account || "bank");
    if (!ACCOUNTS.includes(account)) throw httpError("Choose the account the money arrived in.");
    const date = String(body.received_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError("Enter a valid date.");

    const id = await withTransaction(async (connection) => {
      const [payments] = await connection.query(
        `SELECT p.id, p.order_id, p.amount, COALESCE(s.courier_name, 'Unknown') AS courier
         FROM payments p JOIN orders o ON o.id = p.order_id ${LATEST_SHIPMENT}
         WHERE p.order_id IN (?) AND ${RECEIVABLE_WHERE} FOR UPDATE`,
        [orderIds]
      );
      if (payments.length !== orderIds.length) throw httpError("Some of these orders are already settled or aren't delivered COD orders. Refresh and try again.", 409);
      const gross = round2(payments.reduce((s, p) => s + num(p.amount), 0));
      if (fee > gross) throw httpError("The courier fee can't be more than the cash collected.");
      const couriers = [...new Set(payments.map((p) => p.courier))];
      const courier = String(body.courier || "").trim().slice(0, 60) || couriers.join(", ").slice(0, 60);
      const [created] = await connection.query(
        `INSERT INTO cod_remittances (courier, reference, received_at, gross_amount, fee_amount, net_amount, account, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [courier, String(body.reference || "").trim().slice(0, 120) || null, date, gross, fee, round2(gross - fee), account,
          String(body.note || "").trim().slice(0, 500) || null, adminId || null]
      );
      const remittanceId = created.insertId;
      await connection.query("UPDATE payments SET remittance_id = ? WHERE id IN (?)", [remittanceId, payments.map((p) => p.id)]);
      const note = `${courier} payout for ${payments.length} order${payments.length === 1 ? "" : "s"}`;
      await recordCash(connection, { type: "cod_remittance", direction: "in", amount: gross, account, refType: "remittance", refId: remittanceId, note, createdBy: adminId, occurredAt: date });
      await recordCash(connection, { type: "courier_fee", direction: "out", amount: fee, account, refType: "remittance", refId: remittanceId, note: `${courier} delivery charges`, createdBy: adminId, occurredAt: date });
      for (const p of payments) {
        await addOrderEvent(connection, p.order_id, { actor: "admin", type: "cod_settled", message: `Cash received from ${p.courier} (payout #${remittanceId}).`, visible: false });
      }
      return remittanceId;
    });
    return (await FinanceService.remittances()).find((r) => r.id === id);
  }

  // ─── Refunds owed ─────────────────────────────────────────────────────────

  static async refundsDue() {
    const [rows] = await pool.query(
      `SELECT r.*, o.email, o.status AS order_status, p.method AS payment_method, p.gateway_reference
       FROM refunds r JOIN orders o ON o.id = r.order_id
       LEFT JOIN payments p ON p.order_id = r.order_id AND p.method <> 'exchange'
       WHERE r.status = 'due' ORDER BY r.created_at`
    );
    return rows.map((r) => ({ ...r, amount: num(r.amount), jazzcash_refundable: r.payment_method === "jazzcash" && Boolean(r.gateway_reference) && jazzCashEnabled() }));
  }

  // Sends (JazzCash) or records (manual transfer) a refund that is owed.
  static async completeRefund(refundId, { method, reference, account }, adminId) {
    const lockName = `refund-complete-${refundId}`;
    const lockConnection = await pool.getConnection();
    try {
      const [[{ locked }]] = await lockConnection.query("SELECT GET_LOCK(?, 5) AS locked", [lockName]);
      if (!locked) throw httpError("This refund is already being processed.", 409);

      const [[refund]] = await pool.query(
        `SELECT r.*, p.method AS payment_method, p.gateway_reference FROM refunds r
         LEFT JOIN payments p ON p.order_id = r.order_id AND p.method <> 'exchange' WHERE r.id = ?`,
        [refundId]
      );
      if (!refund) throw httpError("Refund not found", 404);
      if (refund.status !== "due") throw httpError("This refund has already been completed.", 409);

      let finalReference = String(reference || "").trim().slice(0, 120);
      if (method === "jazzcash_api") {
        if (refund.payment_method !== "jazzcash" || !refund.gateway_reference || !jazzCashEnabled()) {
          throw httpError("This order wasn't paid through JazzCash online, so refund it manually.");
        }
        const result = await refundTransaction({ txnRef: refund.gateway_reference, amount: num(refund.amount) }).catch((e) => ({ ok: false, message: e.message }));
        if (!result.ok) throw httpError(`JazzCash refund failed: ${result.message || "no response"}. Try again or refund manually.`, 502);
        finalReference = result.reference;
      } else if (method === "manual_transfer") {
        if (finalReference.length < 3) throw httpError("Enter the transfer reference for the manual refund.");
      } else {
        throw httpError("Choose how the refund was sent.");
      }

      try {
        await withTransaction(async (connection) => {
          const [[current]] = await connection.query("SELECT status FROM refunds WHERE id = ? FOR UPDATE", [refundId]);
          if (current.status !== "due") throw httpError("This refund has already been completed.", 409);
          await connection.query(
            "UPDATE refunds SET status = 'completed', method = ?, reference = ?, created_by = ?, completed_at = NOW() WHERE id = ?",
            [method, finalReference || null, adminId || null, refundId]
          );
          await connection.query("UPDATE orders SET refunded_amount = refunded_amount + ? WHERE id = ?", [num(refund.amount), refund.order_id]);
          await connection.query(
            `UPDATE payments p JOIN orders o ON o.id = p.order_id
             SET p.status = IF(o.refunded_amount >= p.amount, 'refunded', 'partially_refunded')
             WHERE p.order_id = ? AND p.method <> 'exchange' AND p.status IN ('refund_due', 'paid', 'partially_refunded')`,
            [refund.order_id]
          );
          await recordCash(connection, {
            type: "refund", direction: "out", amount: num(refund.amount),
            account: refundAccount({ method, paymentMethod: refund.payment_method, account }),
            refType: "refund", refId: refund.id, orderId: refund.order_id, note: `Refund for cancelled order #${refund.order_id}`, createdBy: adminId,
          });
          await addOrderEvent(connection, refund.order_id, {
            actor: "admin", type: "refunded", message: `Refund of Rs ${num(refund.amount).toLocaleString()} sent.`,
          });
        });
      } catch (error) {
        if (method === "jazzcash_api") console.error(`[finance] JazzCash refund ${finalReference} sent for refund ${refundId} but recording it failed:`, error);
        throw error;
      }
      return { id: Number(refundId), status: "completed" };
    } finally {
      await lockConnection.query("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => {});
      lockConnection.release();
    }
  }

  // ─── One order's stock and money, for the order drawer ────────────────────

  static async orderMoney(orderId) {
    const [[order]] = await pool.query(
      `SELECT o.id, o.status, o.total_amount, o.refunded_amount, p.id AS payment_id, p.method, p.status AS payment_status, p.remittance_id,
              r.reference AS remittance_reference, r.received_at AS remittance_date, r.courier AS remittance_courier
       FROM orders o LEFT JOIN payments p ON p.order_id = o.id
       LEFT JOIN cod_remittances r ON r.id = p.remittance_id
       WHERE o.id = ?`,
      [orderId]
    );
    if (!order) throw httpError("Order not found", 404);
    const [[received]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS amount FROM cash_entries WHERE type = 'sale_payment' AND ref_type = 'payment' AND ref_id = ?`,
      [order.payment_id || 0]
    );
    const [refunds] = await pool.query("SELECT status, method, SUM(amount) AS amount FROM refunds WHERE order_id = ? GROUP BY status, method", [orderId]);
    const [lines] = await pool.query(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase, oi.unit_cost, p.name,
              COALESCE((SELECT SUM(ri.quantity) FROM return_items ri JOIN return_requests rr ON rr.id = ri.return_id
                        WHERE ri.order_item_id = oi.id AND rr.status = 'completed' AND ri.inspection = 'accepted' AND ri.restock = TRUE), 0) AS restocked,
              COALESCE((SELECT SUM(ri.quantity) FROM return_items ri JOIN return_requests rr ON rr.id = ri.return_id
                        WHERE ri.order_item_id = oi.id AND rr.status = 'completed' AND ri.inspection = 'accepted' AND ri.restock = FALSE), 0) AS written_off
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
      [orderId]
    );

    const stockState = { pending: "reserved", processing: "reserved", shipped: "shipped", delivered: "delivered", cancelled: "released" }[order.status] || order.status;
    const refunded = refunds.filter((r) => r.status === "completed").reduce((s, r) => s + num(r.amount), 0);
    const refundDue = refunds.filter((r) => r.status === "due").reduce((s, r) => s + num(r.amount), 0);

    let collection;
    if (order.method === "cod") {
      if (order.remittance_id) collection = { state: "settled", label: `Settled by ${order.remittance_courier}${order.remittance_reference ? ` (${order.remittance_reference})` : ""}` };
      else if (order.status === "delivered") collection = { state: "with_courier", label: "Collected by courier — not yet paid to you" };
      else if (order.status === "shipped") collection = { state: "in_transit", label: "To be collected on delivery" };
      else collection = { state: "not_collected", label: order.status === "cancelled" ? "Nothing collected" : "Collected on delivery" };
    } else if (order.method === "exchange") {
      collection = { state: "exchange", label: "Exchange — no payment" };
    } else {
      collection = num(received.amount) > 0 ? { state: "received", label: "Received online" } : { state: "not_collected", label: "Not paid yet" };
    }

    return {
      charged: num(order.total_amount),
      received: order.method === "cod" ? (order.remittance_id ? num(order.total_amount) : 0) : num(received.amount),
      refunded: round2(refunded),
      refundDue: round2(refundDue),
      storeCredit: num(refunds.find((r) => r.status === "completed" && r.method === "store_credit")?.amount),
      collection,
      lines: lines.map((l) => ({
        id: l.id,
        name: l.name,
        quantity: l.quantity,
        price: num(l.price_at_purchase),
        unit_cost: l.unit_cost === null ? null : num(l.unit_cost),
        state: stockState,
        restocked: num(l.restocked),
        written_off: num(l.written_off),
      })),
    };
  }
}
