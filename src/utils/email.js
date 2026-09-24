import nodemailer from "nodemailer";
import { config } from "../config/env.js";

const isMailConfigured = () => Boolean(config.mail.host && config.mail.user && config.mail.pass && config.mail.from);
const getTransporter = () => {
  if (!isMailConfigured()) throw new Error("Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.");
  return nodemailer.createTransport({ host: config.mail.host, port: config.mail.port, secure: config.mail.secure, auth: { user: config.mail.user, pass: config.mail.pass } });
};
const sendMail = async (message) => {
  const result = await getTransporter().sendMail({ from: config.mail.from, ...message });
  return { messageId: result.messageId };
};
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

// One reusable shell keeps every customer-facing email consistent across
// Gmail, Outlook, and mobile email clients.
const renderEmail = ({ title, previewText, bodyHtml }) => `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f3f6fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:16px;background:#f3f6fb;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:666px;overflow:hidden;border-radius:14px;background:#ffffff;box-shadow:0 12px 35px rgba(24,44,80,.08);">
      <tr><td align="center" style="padding:36px 24px;background:#90EE90;color:#17301b;"><h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;">${escapeHtml(title)}</h1></td></tr>
      <tr><td style="padding:48px 34px 52px;font-size:18px;line-height:1.55;color:#172033;">${bodyHtml}</td></tr>
      <tr><td align="center" style="padding:24px;border-top:1px solid #e8edf4;color:#6c7480;font-size:14px;line-height:1.5;">Need assistance? <a href="mailto:${escapeHtml(config.mail.user)}" style="color:#2e7d32;text-decoration:none;">Contact ZeeScents</a></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const button = (href, label) => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;"><tr><td style="border-radius:8px;background:#90EE90;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;color:#17301b;font-size:16px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
const codeBox = (code) => `<div style="margin:0 0 32px;padding:22px 16px;border:1.5px dashed #55a85b;border-radius:12px;background:#f2fff2;color:#235b27;font-size:29px;font-weight:700;letter-spacing:6px;line-height:1;text-align:center;">${escapeHtml(code)}</div>`;

// Absolute image URL for a product's saved image, so it renders correctly
// inside an email client (which can't resolve a relative /uploads path).
const resolveEmailImage = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${config.backendUrl.replace(/\/$/, "")}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

// One row per ordered item: thumbnail, name × qty, line total.
const orderItemRow = (item) => {
  const image = resolveEmailImage(item.image_url);
  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid #eef1e9;" width="64">
      ${image
        ? `<img src="${escapeHtml(image)}" width="56" height="56" alt="" style="display:block;border-radius:10px;object-fit:cover;background:#f2f4ee;" />`
        : `<div style="width:56px;height:56px;border-radius:10px;background:#f2f4ee;"></div>`}
    </td>
    <td style="padding:14px 0 14px 14px;border-bottom:1px solid #eef1e9;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#172033;">${escapeHtml(item.name || "Item")}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6c7480;">Qty ${Number(item.quantity || 0)} &times; ${money(item.price)}</p>
    </td>
    <td style="padding:14px 0;border-bottom:1px solid #eef1e9;vertical-align:top;text-align:right;">
      <span style="font-size:15px;font-weight:700;color:#172033;">${money(lineTotal)}</span>
    </td>
  </tr>`;
};

// One row in the price-breakdown table (subtotal/discount/shipping/total).
const summaryRow = (label, value, { bold = false, accent = false } = {}) => `<tr>
  <td style="padding:${bold ? "12px 0 0" : "5px 0"};font-size:${bold ? "16px" : "14px"};font-weight:${bold ? "700" : "500"};color:${accent ? "#2e7d32" : bold ? "#172033" : "#6c7480"};">${escapeHtml(label)}</td>
  <td style="padding:${bold ? "12px 0 0" : "5px 0"};font-size:${bold ? "16px" : "14px"};font-weight:${bold ? "700" : "500"};color:${accent ? "#2e7d32" : bold ? "#172033" : "#172033"};text-align:right;">${escapeHtml(value)}</td>
</tr>`;

const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "";
  const { fullName, street, city, postalCode, country } = address;
  return [fullName, street, [city, postalCode].filter(Boolean).join(" "), country].filter(Boolean).map(escapeHtml).join("<br/>");
};

const paymentLabelFor = (method) =>
  method === "jazzcash" ? "JazzCash" : "Cash on Delivery";

// Items + price breakdown + shipping address — shared by the customer's
// confirmation and the store's new-order alert so both always match.
const orderDetailsHtml = ({ items = [], summary = {}, address = null }) => {
  const itemsHtml = items.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">${items.map(orderItemRow).join("")}</table>`
    : "";

  const summaryHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      ${summary.subtotal != null ? summaryRow("Subtotal", money(summary.subtotal)) : ""}
      ${summary.discount ? summaryRow("Discount" + (summary.promo ? ` (${summary.promo})` : ""), `-${money(summary.discount)}`, { accent: true }) : ""}
      ${summary.shipping != null ? summaryRow("Shipping", summary.shipping ? money(summary.shipping) : "Free") : ""}
      ${summaryRow("Total", money(summary.total), { bold: true })}
    </table>`;

  const addressHtml = address
    ? `<div style="margin:0 0 28px;padding:18px 20px;border-radius:12px;background:#f7faf5;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6c7480;">Shipping to</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#172033;">${formatAddress(address)}</p>
        </div>`
    : "";

  return `${itemsHtml}${summaryHtml}${addressHtml}`;
};

const orderItemsText = (items = []) =>
  items.map((i) => `- ${i.name} x${i.quantity} - PKR ${Number(i.price * i.quantity).toLocaleString()}`).join("\n");

export const verifyEmailConfiguration = async () => getTransporter().verify();

export const sendOrderConfirmationEmail = async (email, order, legacyTotal) => {
  // Back-compat: still accepts the old (email, orderId, total) call shape,
  // just without the item/address details a richer email needs.
  const {
    orderId,
    items = [],
    summary = {},
    address = null,
    paymentMethod = "cod",
  } = typeof order === "object" && order !== null ? order : { orderId: order, summary: { total: legacyTotal } };
  const total = summary.total;

  try {
    const orderIdSafe = escapeHtml(orderId);
    const amount = Number(total || 0).toLocaleString();

    const paymentLabel = paymentLabelFor(paymentMethod);

    const bodyHtml = `
      <p style="margin:0 0 6px;">Thank you for your order!</p>
      <p style="margin:0 0 28px;">Your order <strong>#${orderIdSafe}</strong> for <strong>${money(total)}</strong> has been confirmed. We&rsquo;ll keep you updated as it moves through delivery.</p>
      ${orderDetailsHtml({ items, summary: { ...summary, total }, address })}
      <p style="margin:0;font-size:13px;color:#6c7480;">Payment method: <strong style="color:#172033;">${escapeHtml(paymentLabel)}</strong></p>
    `;

    return await sendMail({
      to: email,
      subject: `Order Confirmation #${orderId} - ZeeScents`,
      text: `Thank you for your order! Your order #${orderId} for PKR ${amount} has been confirmed.` +
        (items.length ? `\n\nItems:\n${orderItemsText(items)}` : ""),
      html: renderEmail({ title: "Order Confirmed", previewText: `Your ZeeScents order #${orderId} is confirmed.`, bodyHtml }),
    });
  } catch (error) { console.error("Order email error:", error.message); return null; }
};

// New-order alert for the store owner. Sent to the address set in admin →
// Settings → Notifications (see OrderService). Reply-To is the customer, so
// the owner can answer them straight from their inbox.
export const sendNewOrderAlertEmail = async (recipient, {
  orderId,
  customerEmail,
  items = [],
  summary = {},
  address = null,
  paymentMethod = "cod",
} = {}) => {
  try {
    const paymentLabel = paymentLabelFor(paymentMethod);
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const adminUrl = `${config.appUrl.replace(/\/$/, "")}/adminDashboard/orders`;
    const needsProof = paymentMethod !== "cod";

    const bodyHtml = `
      <p style="margin:0 0 6px;">You have a new order.</p>
      <p style="margin:0 0 24px;">Order <strong>#${escapeHtml(orderId)}</strong> &middot; <strong>${money(summary.total)}</strong> &middot; ${itemCount} item${itemCount === 1 ? "" : "s"}</p>
      <div style="margin:0 0 28px;padding:18px 20px;border-radius:12px;background:#f7faf5;font-size:14px;line-height:1.7;color:#172033;">
        <strong>Customer:</strong> <a href="mailto:${escapeHtml(customerEmail)}" style="color:#2e7d32;text-decoration:none;">${escapeHtml(customerEmail)}</a><br/>
        ${address?.phone ? `<strong>Phone:</strong> <a href="tel:${escapeHtml(address.phone)}" style="color:#2e7d32;text-decoration:none;">${escapeHtml(address.phone)}</a><br/>` : ""}
        <strong>Payment:</strong> ${escapeHtml(paymentLabel)}${needsProof ? " &mdash; waiting for the customer's transfer screenshot" : ""}
      </div>
      ${orderDetailsHtml({ items, summary, address })}
      ${button(adminUrl, "Open orders in admin")}
    `;

    return await sendMail({
      to: recipient,
      replyTo: customerEmail,
      subject: `🛍 New order #${orderId} — ${money(summary.total)} · ${paymentLabel}`,
      text: `New order #${orderId} for ${money(summary.total)} (${paymentLabel}).\nCustomer: ${customerEmail}` +
        (address?.phone ? `\nPhone: ${address.phone}` : "") +
        (items.length ? `\n\nItems:\n${orderItemsText(items)}` : "") +
        `\n\nManage it: ${adminUrl}`,
      html: renderEmail({ title: "New Order", previewText: `Order #${orderId} · ${money(summary.total)} · ${customerEmail}`, bodyHtml }),
    });
  } catch (error) { console.error("New-order alert email error:", error.message); return null; }
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    return await sendMail({
      to: email,
      subject: "Reset your ZeeScents password",
      text: `We received a request to reset your ZeeScents password. Open this link within one hour: ${resetUrl}`,
      html: renderEmail({ title: "Reset Your Password", previewText: "Use this link to reset your ZeeScents password.", bodyHtml: `<p style="margin:0;">We received a request to reset your password. This link expires in 1 hour.</p>${button(resetUrl, "Reset password")}<p style="margin:0;">If you didn&rsquo;t request this, you can safely ignore this email.</p>` }),
    });
  } catch (error) { console.error("Password-reset email error:", error.message); return null; }
};

export const sendContactAcknowledgementEmail = async (email, name) => {
  try {
    const safeName = escapeHtml(name || "there");
    return await sendMail({
      to: email,
      subject: "We received your message - ZeeScents",
      text: `Hi ${name || "there"}, we received your message. A member of our team will get back to you shortly.`,
      html: renderEmail({ title: "Message Received", previewText: "We received your message.", bodyHtml: `<p style="margin:0 0 24px;">Hi <strong>${safeName}</strong>,</p><p style="margin:0;">We&rsquo;ve received your message and a member of our team will get back to you shortly.</p>` }),
    });
  } catch (error) { console.error("Contact email error:", error.message); return null; }
};

export const sendNewsletterWelcomeEmail = async (email) => {
  try {
    return await sendMail({
      to: email,
      subject: "Welcome to ZeeScents — you're subscribed!",
      text: "You're now subscribed to the ZeeScents newsletter. Expect new drops, exclusive promotions, and special offers.",
      html: renderEmail({ title: "Welcome to ZeeScents", previewText: "You're subscribed to ZeeScents updates.", bodyHtml: "<p style=\"margin:0 0 24px;\">You&rsquo;re now subscribed to the ZeeScents newsletter.</p><p style=\"margin:0;\">We&rsquo;ll send you first access to new drops, exclusive promotions, and special offers straight to your inbox.</p>" }),
    });
  } catch (error) { console.error("Newsletter welcome email error:", error.message); return null; }
};

export const sendSignupVerificationEmail = async (email, code, firstName) => {
  try {
    const safeName = escapeHtml(firstName || "there");
    return await sendMail({
      to: email,
      subject: "Your ZeeScents verification code",
      text: `Hi ${firstName || "there"}, your ZeeScents verification code is ${code}. It expires in 10 minutes.`,
      html: renderEmail({ title: "Verify Your Email", previewText: `Your ZeeScents verification code: ${code}`, bodyHtml: `<p style="margin:0 0 25px;">Hi <strong>${safeName}</strong>,</p><p style="margin:0 0 32px;">Thanks for joining ZeeScents! To complete your registration, please use the verification code below:</p>${codeBox(code)}<p style="margin:0;">This code is valid for 10 minutes. If you didn&rsquo;t request this verification, no further action is needed.</p>` }),
    });
  } catch (error) { console.error("Signup verification email error:", error.message); return null; }
};

// Marketing messages are delivered individually, but their supplied content
// is still placed inside the same shared ZeeScents email shell.
export const sendNewsletterEmail = async (recipients, { subject, html }) => {
  if (!recipients.length) return { sent: 0, failed: 0 };
  try {
    const results = await Promise.allSettled(recipients.map((to) => sendMail({
      to,
      subject,
      html: renderEmail({ title: "ZeeScents", previewText: subject, bodyHtml: html }),
    })));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed) console.error(`Newsletter delivery failed for ${failed} recipient(s).`);
    return { sent: recipients.length - failed, failed };
  } catch (error) { console.error("Newsletter email error:", error.message); return { sent: 0, failed: recipients.length }; }
};

// Generic status notice: plain-text paragraphs, an optional key/value box and
// one call-to-action. Everything passed in is escaped here.
export const sendNoticeEmail = async (to, { subject, title, preview, paragraphs = [], details = [], cta = null, replyTo }) => {
  try {
    const detailsHtml = details.length
      ? `<div style="margin:0 0 28px;padding:18px 20px;border-radius:12px;background:#f7faf5;font-size:14px;line-height:1.7;color:#172033;">${details
          .map(([label, value]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value).replace(/\n/g, "<br/>")}`)
          .join("<br/>")}</div>`
      : "";
    const bodyHtml =
      paragraphs.map((p) => `<p style="margin:0 0 20px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`).join("") +
      detailsHtml +
      (cta ? button(cta.href, cta.label) : "");
    const text = [
      ...paragraphs,
      ...details.map(([label, value]) => `${label}: ${value}`),
      cta ? `${cta.label}: ${cta.href}` : "",
    ].filter(Boolean).join("\n\n");
    return await sendMail({ to, replyTo, subject, text, html: renderEmail({ title, previewText: preview || subject, bodyHtml }) });
  } catch (error) { console.error(`Notice email error (${subject}):`, error.message); return null; }
};
