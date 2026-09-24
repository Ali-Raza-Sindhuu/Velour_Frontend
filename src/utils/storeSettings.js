import pool from "../config/db.js";
import { normalizeSettings } from "../modules/returns/returns.policy.js";

const VALID_EMAIL = /^\S+@\S+\.\S+$/;

export async function getSettings(keys) {
  const [rows] = await pool.query("SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN (?)", [keys]);
  return Object.fromEntries(
    rows.map((row) => [row.setting_key, typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value || {}])
  );
}

// Store owner's inbox for order/return alerts: admin → Settings →
// Notifications ("New order emails" on/off, "Send order emails to"),
// falling back to the store's support email.
export async function getOrderAlertRecipient() {
  const settings = await getSettings(["notifications", "store"]);
  if (settings.notifications?.orderEmails === false) return null;
  const recipient = String(settings.notifications?.orderEmailRecipient || settings.store?.supportEmail || "").trim();
  return VALID_EMAIL.test(recipient) ? recipient : null;
}

export async function getReturnSettings() {
  const settings = await getSettings(["returns"]);
  return normalizeSettings(settings.returns);
}
