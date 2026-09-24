import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { addOrderEvent } from "../../utils/orderEvents.js";
import { recordCash } from "../finance/ledger.js";
import { config } from "../../config/env.js";
import { chargeWallet, inquire, jazzCashEnabled, newTxnRef, outcomeOf, settleWindowMs } from "./jazzcash.js";
import { demoApprove, demoDecline } from "./jazzcashDemo.js";

const STALE_AFTER_MS = 5 * 60 * 1000;
const httpError = (message, status) => Object.assign(new Error(message), { status });

// Records a final JazzCash answer. Only a charge still marked 'processing'
// under this reference can be settled, so a late or repeated answer can't
// overwrite a newer attempt.
async function settleJazzCash(payment, txnRef, outcome, result) {
  // An inquiry's own pp_ResponseMessage only says the lookup worked; the
  // payment's fate is in pp_PaymentResponseMessage. A charge reply has just
  // the one message, so it falls through.
  const message = String(result?.pp_PaymentResponseMessage || result?.pp_ResponseMessage || "").slice(0, 255) || null;
  if (outcome === "pending") return { status: "processing" };

  return withTransaction(async (connection) => {
    const [orders] = await connection.query("SELECT id, status FROM orders WHERE id = ? FOR UPDATE", [payment.order_id]);
    const [update] = await connection.query(
      outcome === "paid"
        ? "UPDATE payments SET status = 'paid', transaction_id = ?, gateway_message = ?, verified_at = NOW() WHERE id = ? AND status = 'processing' AND gateway_reference = ?"
        // A declined charge goes back to 'pending' so the customer can retry.
        : "UPDATE payments SET status = 'pending', transaction_id = ?, gateway_message = ? WHERE id = ? AND status = 'processing' AND gateway_reference = ?",
      [result?.pp_RetreivalReferenceNo || null, message, payment.id, txnRef]
    );
    if (update.affectedRows === 1 && outcome === "paid") {
      await addOrderEvent(connection, payment.order_id, { actor: "system", type: "paid", message: "Payment received via JazzCash." });
      await recordCash(connection, {
        type: "sale_payment", direction: "in", amount: Number(payment.amount), account: "jazzcash",
        refType: "payment", refId: payment.id, orderId: payment.order_id, note: `JazzCash ${result?.pp_RetreivalReferenceNo || txnRef}`,
      });
      if (orders[0]?.status === "pending") {
        await connection.query("UPDATE orders SET status = 'processing', confirmed_at = NOW() WHERE id = ?", [payment.order_id]);
        await addOrderEvent(connection, payment.order_id, { actor: "system", type: "confirmed", message: "Order confirmed — we're preparing it for shipping." });
      }
    }
    return outcome === "paid"
      ? { status: "paid" }
      : { status: "failed", message: message || "JazzCash declined the payment. Please try again." };
  });
}

export class PaymentService {
  static getAccounts() {
    // `demo` is sent on so the checkout page can label the simulated flow
    // plainly and stand in for the customer's handset. The demo wallet is a
    // made-up credential, not a secret — the form shows it so whoever is
    // running the demo knows what to type.
    const { demo, demoMobile, demoCnic } = config.jazzCash;
    return {
      jazzcash: {
        online: jazzCashEnabled(),
        demo,
        ...(demo ? { demoMobile, demoCnic } : {}),
      },
    };
  }

  static async findGatewayPayment(orderId, paymentToken) {
    if (!paymentToken) throw httpError("Payment session not found", 404);
    const [rows] = await pool.query(
      "SELECT id, order_id, amount, method, status, gateway_reference, TIMESTAMPDIFF(SECOND, updated_at, NOW()) AS age_seconds FROM payments WHERE order_id = ? AND payment_token = ?",
      [orderId, paymentToken]
    );
    const payment = rows[0];
    if (!payment || payment.method !== "jazzcash") throw httpError("Payment session not found", 404);
    return payment;
  }

  // Sends a charge to the customer's JazzCash wallet; they approve it by
  // entering their MPIN on their phone, and JazzCash answers this request.
  static async payWithJazzCash(orderId, paymentToken, { mobile, cnic }) {
    if (!jazzCashEnabled()) throw httpError("JazzCash payments are not available right now", 503);
    const cleanMobile = String(mobile || "").replace(/\D/g, "").replace(/^92/, "0");
    const cleanCnic = String(cnic || "").replace(/\D/g, "");
    if (!/^03\d{9}$/.test(cleanMobile)) throw httpError("Enter your JazzCash number as 03XXXXXXXXX", 400);
    if (!/^\d{6}$/.test(cleanCnic)) throw httpError("Enter the last 6 digits of your CNIC", 400);

    const payment = await PaymentService.findGatewayPayment(orderId, paymentToken);
    if (payment.status === "paid") return { status: "paid" };
    if (payment.status === "processing") throw httpError("A payment is already waiting for approval on your phone", 409);
    if (payment.status !== "pending") throw httpError("This order can no longer be paid", 409);

    const txnRef = newTxnRef(payment.order_id);
    // Claim the payment (compare-and-set) so two clicks can't send two charges.
    const [claim] = await pool.query(
      `UPDATE payments p JOIN orders o ON o.id = p.order_id
       SET p.status = 'processing', p.gateway_reference = ?, p.gateway_message = NULL
       WHERE p.id = ? AND p.status = 'pending' AND o.status = 'pending'`,
      [txnRef, payment.id]
    );
    if (claim.affectedRows !== 1) throw httpError("This order can no longer be paid", 409);

    let result;
    try {
      result = await chargeWallet({ txnRef, amount: payment.amount, orderId: payment.order_id, mobile: cleanMobile, cnic: cleanCnic });
    } catch (error) {
      // No answer (timeout / network): the charge may still go through, so
      // leave it 'processing' and let the status check ask JazzCash.
      console.error("[jazzcash] charge request failed:", error.message);
      return { status: "processing" };
    }
    return settleJazzCash(payment, txnRef, outcomeOf(result), result);
  }

  // Polled by the checkout page while a charge awaits the customer's MPIN.
  static async jazzCashStatus(orderId, paymentToken) {
    const payment = await PaymentService.findGatewayPayment(orderId, paymentToken);
    if (payment.status === "paid") return { status: "paid" };
    if (payment.status !== "processing") return { status: payment.status === "pending" ? "pending" : "failed" };
    // The charge request itself may still be waiting on the customer's MPIN;
    // let it settle the payment rather than racing it with an inquiry.
    if (payment.age_seconds * 1000 < settleWindowMs()) return { status: "processing" };

    let result;
    try {
      result = await inquire(payment.gateway_reference);
    } catch (error) {
      console.error("[jazzcash] status inquiry failed:", error.message);
      return { status: "processing" };
    }
    let outcome = outcomeOf(result, { inquiry: true });
    // JazzCash's MPIN prompt expires within about a minute; a charge still
    // unconfirmed long after that never went through, so free the order for
    // another attempt.
    if (outcome === "pending" && payment.age_seconds * 1000 > STALE_AFTER_MS) outcome = "failed";
    return settleJazzCash(payment, payment.gateway_reference, outcome, result);
  }

  // DEMO ONLY. Stands in for the customer entering their MPIN on their phone,
  // so the flow can be shown before the real sandbox is available. It only
  // flips the stand-in gateway's answer — the payment is still settled by the
  // ordinary status poll running the ordinary code.
  static async demoApproveMpin(orderId, paymentToken, { mpin, decline = false }) {
    if (!config.jazzCash.demo) throw httpError("Not found", 404);
    const payment = await PaymentService.findGatewayPayment(orderId, paymentToken);
    if (payment.status === "paid") return { status: "paid" };
    if (payment.status !== "processing") throw httpError("This payment is not awaiting approval", 409);

    const answered = decline
      ? demoDecline(payment.gateway_reference)
      : demoApprove(payment.gateway_reference, mpin);
    if (!answered.ok) throw httpError(answered.message, 400);
    // Settle straight away so the demo doesn't sit on a poll interval.
    return PaymentService.jazzCashStatus(orderId, paymentToken);
  }

  static async adminVerify(paymentId, approve, adminId = null) {
    const [lookup] = await pool.query("SELECT order_id FROM payments WHERE id = ?", [paymentId]);
    if (!lookup[0]) throw Object.assign(new Error("Payment not found"), { status: 404 });

    // Lock the order, then the payment — the same order customer/admin
    // cancellation uses — so a verification and a cancellation of the same
    // order are serialised instead of racing (or deadlocking).
    return withTransaction(async (connection) => {
      const [orders] = await connection.query("SELECT id, status FROM orders WHERE id = ? FOR UPDATE", [lookup[0].order_id]);
      const [payments] = await connection.query("SELECT * FROM payments WHERE id = ? FOR UPDATE", [paymentId]);
      const order = orders[0];
      const payment = payments[0];
      if (!payment) throw Object.assign(new Error("Payment not found"), { status: 404 });
      if (payment.status !== "submitted")
        throw Object.assign(new Error("This payment has already been reviewed"), { status: 409 });
      // Money that arrives for an order already cancelled is still money
      // received: it is recorded, and the refund is queued (Finance →
      // Refunds owed).
      const cancelled = order?.status === "cancelled";
      const newStatus = approve ? (cancelled ? "refund_due" : "paid") : "failed";
      await connection.query("UPDATE payments SET status = ?, verified_at = NOW() WHERE id = ?", [newStatus, payment.id]);
      if (approve) {
        await recordCash(connection, {
          type: "sale_payment", direction: "in", amount: Number(payment.amount),
          account: payment.method === "easypaisa" ? "easypaisa" : "jazzcash",
          refType: "payment", refId: payment.id, orderId: payment.order_id,
          note: payment.transaction_id ? `Transfer ${payment.transaction_id}` : "Manual transfer", createdBy: adminId,
        });
        if (cancelled) {
          await connection.query("INSERT INTO refunds (order_id, amount, status) VALUES (?, ?, 'due')", [payment.order_id, payment.amount]);
        }
      }
      if (approve && order?.status === "pending") {
        await connection.query("UPDATE orders SET status = 'processing' WHERE id = ?", [order.id]);
      }
      return { status: newStatus };
    });
  }

  static async adminList() {
    const [payments] = await pool.query(
      `SELECT p.id, p.order_id, p.amount, p.method, p.status, p.transaction_id, p.receipt_path, p.gateway_reference, p.gateway_message,
              p.submitted_at, p.verified_at, p.created_at, o.email
       FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC`
    );
    return payments;
  }
}
