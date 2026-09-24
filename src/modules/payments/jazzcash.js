import crypto from "crypto";
import { config } from "../../config/env.js";
import { demoCharge, demoInquire, demoRefund } from "./jazzcashDemo.js";

// JazzCash expects yyyyMMddHHmmss in Pakistan time (UTC+5, no DST).
const pktStamp = (date) =>
  new Date(date.getTime() + 5 * 60 * 60 * 1000).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

// HMAC-SHA256 keyed with the integrity salt over "salt&v1&v2…", where the
// values are the non-empty pp_* / ppmpf_* fields in key order.
export function secureHash(fields, salt) {
  const values = Object.keys(fields)
    .filter((key) => key !== "pp_SecureHash" && fields[key] !== undefined && fields[key] !== null && String(fields[key]) !== "")
    .sort()
    .map((key) => String(fields[key]));
  return crypto.createHmac("sha256", salt).update([salt, ...values].join("&"), "utf8").digest("hex");
}

// The customer has about a minute to enter their MPIN before JazzCash answers.
export const CHARGE_TIMEOUT_MS = 100_000;

export const jazzCashEnabled = () => {
  const { demo, merchantId, password, integritySalt } = config.jazzCash;
  if (demo) return true;
  return Boolean(merchantId && password && integritySalt);
};

// The real gateway holds the charge request open while the customer finds
// their phone, so the status poll waits that long before inquiring rather
// than racing it. The demo gateway answers at once, so there is nothing to
// wait for and the first poll can inquire.
export const settleWindowMs = () => (config.jazzCash.demo ? 0 : CHARGE_TIMEOUT_MS);

async function post(url, fields) {
  const body = { ...fields, pp_SecureHash: secureHash(fields, config.jazzCash.integritySalt) };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`JazzCash responded with HTTP ${response.status}`);
  return response.json();
}

export function newTxnRef(orderId) {
  return `ZS${orderId}T${Date.now()}`.slice(0, 20);
}

export function chargeWallet({ txnRef, amount, orderId, mobile, cnic }) {
  if (config.jazzCash.demo) return demoCharge({ txnRef, amount, orderId, mobile, cnic });
  const now = new Date();
  const { merchantId, password, walletUrl } = config.jazzCash;
  return post(walletUrl, {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: merchantId,
    pp_Password: password,
    pp_TxnRefNo: txnRef,
    pp_Amount: String(Math.round(Number(amount) * 100)),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: pktStamp(now),
    pp_BillReference: `order${orderId}`,
    pp_Description: `ZeeScents order ${orderId}`,
    pp_TxnExpiryDateTime: pktStamp(new Date(now.getTime() + 60 * 60 * 1000)),
    pp_MobileNumber: mobile,
    pp_CNIC: cnic,
  });
}

export function inquire(txnRef) {
  if (config.jazzCash.demo) return demoInquire(txnRef);
  const { merchantId, password, inquiryUrl } = config.jazzCash;
  return post(inquiryUrl, { pp_TxnRefNo: txnRef, pp_MerchantID: merchantId, pp_Password: password });
}

// Maps a JazzCash answer to paid / pending / failed.
export function outcomeOf(result, { inquiry = false } = {}) {
  const code = String(result?.pp_ResponseCode ?? "");
  if (inquiry) {
    if (code !== "000") return "pending";
    const paymentCode = String(result.pp_PaymentResponseCode ?? "");
    const status = String(result.pp_Status ?? "").toLowerCase();
    if (paymentCode === "121" || status === "completed") return "paid";
    if (paymentCode === "157" || paymentCode === "124" || status === "pending") return "pending";
    return "failed";
  }
  if (code === "000") return "paid";
  if (code === "157" || code === "124") return "pending";
  return "failed";
}

// Refunds a paid wallet transaction back to the customer. Needs refunds
// enabled on the JazzCash merchant account; wallet refunds also need the
// merchant MPIN (JAZZCASH_MERCHANT_MPIN).
export async function refundTransaction({ txnRef, amount }) {
  const { merchantId, password, refundUrl, merchantMpin, demo } = config.jazzCash;
  const result = demo
    ? await demoRefund({ txnRef })
    : await post(refundUrl, {
        pp_TxnRefNo: txnRef,
        pp_Amount: String(Math.round(Number(amount) * 100)),
        pp_TxnCurrency: "PKR",
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_MerchantMPIN: merchantMpin,
      });
  return {
    ok: String(result?.pp_ResponseCode) === "000",
    message: result?.pp_ResponseMessage || "",
    reference: result?.pp_RetreivalReferenceNo || result?.pp_TxnRefNo || txnRef,
  };
}
