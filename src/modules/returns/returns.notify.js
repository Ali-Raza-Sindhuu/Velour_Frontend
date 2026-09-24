import pool from "../../config/db.js";
import { config } from "../../config/env.js";
import { sendNoticeEmail } from "../../utils/email.js";
import { getOrderAlertRecipient, getReturnSettings } from "../../utils/storeSettings.js";
import { returnAccessToken } from "./returns.access.js";
import { REASONS } from "./returns.policy.js";

const appUrl = () => config.appUrl.replace(/\/$/, "");
const money = (amount) => `Rs ${Number(amount || 0).toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const statusLink = (ret) => `${appUrl()}/returns/${ret.rma_number}?token=${returnAccessToken(ret.id)}`;

async function load(returnId) {
  const [[ret]] = await pool.query("SELECT * FROM return_requests WHERE id = ?", [returnId]);
  if (!ret) return null;
  const [items] = await pool.query(
    `SELECT ri.quantity, ri.reason, ri.resolution, ri.inspection, p.name, xp.name AS exchange_name
     FROM return_items ri
     JOIN order_items oi ON oi.id = ri.order_item_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN products xp ON xp.id = ri.exchange_product_id
     WHERE ri.return_id = ?`,
    [returnId]
  );
  return { ret, items };
}

const itemLines = (items) =>
  items
    .map((i) => `${i.name} × ${i.quantity} — ${REASONS[i.reason] || i.reason}${i.resolution === "exchange" ? ` (exchange for ${i.exchange_name})` : ""}`)
    .join("\n");

// Emails the customer (and, for some events, the store) about a return.
// Runs after the change is committed; never throws.
export async function notifyReturn(returnId, type, extra = {}) {
  try {
    const loaded = await load(returnId);
    if (!loaded) return;
    const { ret, items } = loaded;
    const rma = ret.rma_number;
    const link = statusLink(ret);
    const view = { href: link, label: "View your return" };
    const customer = (message) => sendNoticeEmail(ret.email, { ...message, cta: message.cta === undefined ? view : message.cta });

    switch (type) {
      case "requested": {
        await customer({
          subject: `Return request ${rma} received - ZeeScents`,
          title: "Return Request Received",
          paragraphs: [
            `We've received your return request for order #${ret.order_id}. Our team reviews requests within 1–2 business days and we'll email you as soon as it's approved.`,
            "Please don't send anything back until your return is approved — we'll send the return address and instructions then.",
          ],
          details: [["Return number", rma], ["Items", itemLines(items)]],
        });
        const store = await getOrderAlertRecipient();
        if (store) {
          await sendNoticeEmail(store, {
            subject: `↩️ New return request ${rma} for order #${ret.order_id}`,
            title: "New Return Request",
            replyTo: ret.email,
            paragraphs: [`${ret.email} requested a return for order #${ret.order_id}.`],
            details: [["Items", itemLines(items)], ...(ret.customer_note ? [["Customer note", ret.customer_note]] : [])],
            cta: { href: `${appUrl()}/adminDashboard/returns`, label: "Review in admin" },
          });
        }
        break;
      }
      case "approved": {
        const settings = await getReturnSettings();
        await customer({
          subject: `Your return ${rma} is approved - ZeeScents`,
          title: "Return Approved",
          paragraphs: [
            ...(ret.decision_message ? [ret.decision_message] : []),
            `Please send your parcel by ${formatDate(ret.ship_by)}. Once it's on its way, add the courier and tracking number on your return page so we can watch for it.`,
            settings.instructions,
          ].filter(Boolean),
          details: [
            ["Return number", `${rma} (write this on the parcel)`],
            ...(settings.returnAddress ? [["Send to", settings.returnAddress]] : []),
            ["Ship by", formatDate(ret.ship_by)],
          ],
          cta: { href: link, label: "Add tracking number" },
        });
        break;
      }
      case "rejected":
        await customer({
          subject: `Update on your return ${rma} - ZeeScents`,
          title: "Return Not Approved",
          paragraphs: [
            "We've reviewed your return request and unfortunately we can't accept it.",
            ret.decision_message || "",
            "If you have questions, just reply to this email.",
          ].filter(Boolean),
        });
        break;
      case "shipped_back": {
        await customer({
          subject: `We're watching for your return ${rma} - ZeeScents`,
          title: "Return On Its Way",
          paragraphs: ["Thanks — we've got your tracking details. We'll let you know as soon as your parcel arrives."],
          details: [["Courier", ret.return_courier || "-"], ["Tracking number", ret.return_tracking || "-"]],
        });
        const store = await getOrderAlertRecipient();
        if (store) {
          await sendNoticeEmail(store, {
            subject: `📦 Return ${rma} shipped back by the customer`,
            title: "Return Shipped Back",
            paragraphs: [`The customer shipped return ${rma} (order #${ret.order_id}).`],
            details: [["Courier", ret.return_courier || "-"], ["Tracking number", ret.return_tracking || "-"]],
            cta: { href: `${appUrl()}/adminDashboard/returns`, label: "Open returns" },
          });
        }
        break;
      }
      // AFTER
      case "received":
        await customer({
          subject: `We received your return ${rma} - ZeeScents`,
          title: "Return Received",
          paragraphs: ["Your parcel has arrived. We're inspecting the items now and will confirm your refund or exchange within 2 business days."],
        });
        break;
      case "payout_requested":
        await customer({
          subject: `Where should we send your refund? - ${rma} - ZeeScents`,
          title: "One Last Thing — Where To Send Your Refund",
          paragraphs: [
            ret.decision_message || "We've inspected your return. Tell us which account to transfer your refund to and we'll send it right away.",
          ],
          cta: { href: link, label: "Add payout details" },
        });
        break;
      case "payout_submitted": {
        const store = await getOrderAlertRecipient();
        if (store) {
          await sendNoticeEmail(store, {
            subject: `💳 Payout details added for return ${rma}`,
            title: "Payout Details Received",
            paragraphs: [`The customer added where to send the refund for return ${rma} (order #${ret.order_id}). You can complete it now.`],
            cta: { href: `${appUrl()}/adminDashboard/returns`, label: "Open in admin" },
          });
        }
        break;
      }
      case "completed": {
        const lines = [];
        if (Number(ret.refund_amount) > 0) {
          if (ret.refund_method === "store_credit") lines.push(["Store credit", `${money(extra.creditValue)} — use code ${ret.store_credit_code} at checkout (single use, valid for 1 year)`]);
          else lines.push(["Refund", `${money(ret.refund_amount)} to ${extra.refundDestination || "your original payment method"}`]);
          if (extra.reference && ret.refund_method !== "store_credit") lines.push(["Reference", extra.reference]);
        }
        if (ret.exchange_order_id) lines.push(["Exchange order", `#${ret.exchange_order_id} — we'll email you when it ships`]);
        const rejectedCount = items.filter((i) => i.inspection === "rejected").length;
        await customer({
          subject: `Your return ${rma} is complete - ZeeScents`,
          title: "Return Complete",
          paragraphs: [
            "We've inspected your return and it's all sorted.",
            ...(ret.refund_method !== "store_credit" && Number(ret.refund_amount) > 0 ? ["Refunds usually show in your account within 5–7 business days."] : []),
            ...(rejectedCount ? ["Some items didn't pass inspection — see the note on your return page."] : []),
            ...(ret.decision_message ? [ret.decision_message] : []),
          ],
          details: lines,
        });
        break;
      }
      case "message":
        await customer({
          subject: `A message about your return ${rma} - ZeeScents`,
          title: "Message About Your Return",
          paragraphs: [extra.text],
        });
        break;
      case "reminder":
        await customer({
          subject: `Reminder: please ship your return ${rma} - ZeeScents`,
          title: "Don't Forget Your Return",
          paragraphs: [`Your return is approved, but we haven't received tracking details yet. Please send it by ${formatDate(ret.ship_by)} so it doesn't expire.`],
          cta: { href: link, label: "Add tracking number" },
        });
        break;
      case "expired":
        await customer({
          subject: `Your return ${rma} has expired - ZeeScents`,
          title: "Return Expired",
          paragraphs: ["We didn't receive tracking details before the ship-by date, so this return has expired. If you already sent the parcel, just reply to this email with the tracking number and we'll sort it out."],
        });
        break;
      case "cancelled":
        await customer({
          subject: `Return ${rma} cancelled - ZeeScents`,
          title: "Return Cancelled",
          paragraphs: ["Your return request has been cancelled. You can start a new one from your order while the return window is open."],
          cta: null,
        });
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Return email (${type}) for return ${returnId} failed:`, error.message);
  }
}
