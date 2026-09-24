// A stand-in for the JazzCash wallet API, used while we wait on real sandbox
// credentials (JAZZCASH_ENV=demo).
//
// It answers in the same pp_* dialect the live gateway does, so everything
// above it runs the real code path: the compare-and-set claim on the payment
// row, the "awaiting MPIN" hold, the status polling, settlement, the order
// event and the cash ledger entry. Only the outbound HTTP call is replaced.
//
// The difference from the real thing: no MPIN prompt reaches a phone, so the
// approval arrives from the checkout page's simulated handset instead
// (PaymentService.demoApproveMpin), and any well-formed wallet number is
// accepted. Nothing here may ever run in production.

import { config } from "../../config/env.js";

// txnRef -> { orderId, amount, mobile, approved, rrn, createdAt }
const transactions = new Map();

const TTL_MS = 30 * 60 * 1000;

// The map only holds charges still in flight; drop anything long settled so a
// long-running demo server doesn't grow one entry per attempt.
const sweep = () => {
  const cutoff = Date.now() - TTL_MS;
  for (const [ref, txn] of transactions) {
    if (txn.createdAt < cutoff) transactions.delete(ref);
  }
};

const rrn = () => String(Math.floor(Math.random() * 9e9) + 1e9);

// Mirrors a real wallet charge: JazzCash accepts it and holds it "pending"
// while the customer is asked for their MPIN. 157 is the code the live
// gateway returns for that, and outcomeOf() maps it to 'pending'.
export function demoCharge({ txnRef, amount, orderId, mobile, cnic }) {
  sweep();
  // Only the designated demo wallet is accepted. Anyone else — a real
  // shopper who picked JazzCash and typed their own number — is declined,
  // exactly as an unenrolled wallet would be by the live gateway.
  const { demoMobile, demoCnic } = config.jazzCash;
  if (String(mobile) !== demoMobile || String(cnic) !== demoCnic) {
    return Promise.resolve({
      pp_ResponseCode: "134",
      pp_ResponseMessage: "This wallet is not enrolled for the demo. Use the demo number shown on the payment form.",
      pp_TxnRefNo: txnRef,
    });
  }
  transactions.set(txnRef, {
    orderId: String(orderId),
    amount,
    mobile,
    approved: false,
    rrn: rrn(),
    createdAt: Date.now(),
  });
  return Promise.resolve({
    pp_ResponseCode: "157",
    pp_ResponseMessage: "Transaction is pending, awaiting customer authorization (DEMO)",
    pp_TxnRefNo: txnRef,
  });
}

// Stands in for the customer tapping their MPIN into the JazzCash prompt.
// Any 4-6 digit PIN is accepted; the point is the flow, not the secret.
export function demoApprove(txnRef, mpin) {
  const txn = transactions.get(txnRef);
  if (!txn) return { ok: false, message: "That payment is no longer awaiting approval" };
  if (!/^\d{4,6}$/.test(String(mpin || ""))) return { ok: false, message: "Enter your 4-6 digit MPIN" };
  txn.approved = true;
  return { ok: true };
}

// The customer dismissing the prompt. Answering 'declined' rather than
// leaving it pending lets the charge settle back to 'pending', which is what
// frees the order to be paid again.
export function demoDecline(txnRef) {
  const txn = transactions.get(txnRef);
  if (!txn) return { ok: false, message: "That payment is no longer awaiting approval" };
  txn.declined = true;
  return { ok: true };
}

// Mirrors the payment inquiry the status poll makes. 000 means the inquiry
// itself succeeded; the payment's own state rides on pp_PaymentResponseCode
// (121 completed / 157 still awaiting the MPIN).
export function demoInquire(txnRef) {
  const txn = transactions.get(txnRef);
  if (!txn) {
    return Promise.resolve({
      pp_ResponseCode: "124",
      pp_ResponseMessage: "Transaction not found (DEMO)",
      pp_TxnRefNo: txnRef,
    });
  }
  const paymentCode = txn.approved ? "121" : txn.declined ? "199" : "157";
  const message = txn.approved
    ? "Thank you for using JazzCash, your transaction was successful (DEMO)"
    : txn.declined
      ? "Transaction cancelled by customer (DEMO)"
      : "Awaiting customer authorization (DEMO)";
  return Promise.resolve({
    pp_ResponseCode: "000",
    pp_ResponseMessage: "Inquiry successful (DEMO)",
    pp_TxnRefNo: txnRef,
    pp_PaymentResponseCode: paymentCode,
    pp_PaymentResponseMessage: message,
    pp_Status: txn.approved ? "Completed" : txn.declined ? "Failed" : "Pending",
    pp_RetreivalReferenceNo: txn.approved ? txn.rrn : undefined,
    pp_Amount: String(Math.round(Number(txn.amount) * 100)),
  });
}

// Wallet refunds in demo mode always succeed, so the returns flow can be
// shown end to end as well.
export function demoRefund({ txnRef }) {
  return Promise.resolve({
    pp_ResponseCode: "000",
    pp_ResponseMessage: "Refund successful (DEMO)",
    pp_RetreivalReferenceNo: rrn(),
    pp_TxnRefNo: txnRef,
  });
}
