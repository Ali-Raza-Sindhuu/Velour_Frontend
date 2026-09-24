import pool from "../../config/db.js";

const SETTINGS_SECTIONS = ["store", "shipping", "tax", "notifications", "returns", "inventory"];

// Accepts real booleans plus the string/number forms a form or older client
// might send. Anything unrecognised falls back to `fallback`.
function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function parseJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value || {};
}

export class AdminService {
  static async overview() {
    // Revenue is what customers paid for orders that weren't cancelled,
    // less every refund and store credit given back on returns.
    const [[orderStats]] = await pool.query(
      `SELECT COUNT(*) AS orderCount,
              COALESCE(SUM(total_amount), 0) - (SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE status = 'completed' AND return_id IS NOT NULL) AS revenue
       FROM orders WHERE status <> 'cancelled'`
    );
    const [[setting]] = await pool.query("SELECT setting_value FROM store_settings WHERE setting_key = 'inventory'");
    const inventory = typeof setting?.setting_value === "string" ? JSON.parse(setting.setting_value) : setting?.setting_value || {};
    const [[productStats]] = await pool.query(
      "SELECT COUNT(*) AS productCount, COALESCE(SUM(stock_quantity <= ?), 0) AS lowStock FROM products WHERE status <> 'archived'",
      [Number(inventory.lowStockThreshold ?? 5)]
    );
    const [[customerStats]] = await pool.query(
      "SELECT COUNT(*) AS customerCount FROM users WHERE role = 'customer'"
    );
    return { ...orderStats, ...productStats, ...customerStats };
  }

  static async getSettings() {
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM store_settings");
    const settings = Object.fromEntries(rows.map((row) => [row.setting_key, parseJson(row.setting_value)]));
    settings.store = {
      ...(settings.store || {}),
      requireLoginToCheckout: toBoolean(settings.store?.requireLoginToCheckout, false),
    };
    return settings;
  }

  // Public, unauthenticated subset of store settings — safe to expose to the
  // storefront (e.g. the Contact page's "Visit Us" details, and the flat
  // shipping rate/free-shipping threshold shown in the cart and used at
  // checkout). Only "store" and the non-sensitive parts of "shipping" are
  // ever returned here — never tax, notifications, or payment settings.
  static async getPublicStoreInfo() {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('store', 'shipping')"
    );
    const parsed = Object.fromEntries(
      rows.map((row) => [row.setting_key, typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value || {}])
    );
    const store = parsed.store || {};
    const shipping = parsed.shipping || {};
    return {
      name: store.name || "",
      supportEmail: store.supportEmail || "",
      phone: store.phone || "",
      address: store.address || "",
      // Customer-facing: guests read this before the cart / checkout / buy-now
      // flow decides whether to send them to login.
      requireLoginToCheckout: toBoolean(store.requireLoginToCheckout, false),
      shipping: {
        flatRate: shipping.flatRate ?? 200,
        freeThreshold: shipping.freeThreshold ?? 0,
        codEnabled: shipping.codEnabled ?? true,
      },
    };
  }

  static async updateSettings(section, values) {
    if (!SETTINGS_SECTIONS.includes(section)) {
      const err = new Error("Invalid settings section");
      err.status = 400;
      throw err;
    }
    if (section === "inventory") {
      const hold = Math.round(Number(values?.unpaidHoldMinutes));
      const threshold = Math.round(Number(values?.lowStockThreshold));
      values = {
        unpaidHoldMinutes: Number.isFinite(hold) ? Math.min(1440, Math.max(10, hold)) : 60,
        lowStockThreshold: Number.isFinite(threshold) ? Math.max(0, threshold) : 5,
      };
    }
    if (section === "store") {
      values = { ...(values || {}) };
      // If the client didn't send the flag (e.g. an older admin build), keep
      // the stored value instead of silently resetting it to false.
      let current = false;
      if (!("requireLoginToCheckout" in values)) {
        const [[row]] = await pool.query("SELECT setting_value FROM store_settings WHERE setting_key = 'store'");
        current = toBoolean(parseJson(row?.setting_value).requireLoginToCheckout, false);
      }
      values.requireLoginToCheckout = toBoolean(values.requireLoginToCheckout, current);
    }
    await pool.query(
      "INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
      [section, JSON.stringify(values)]
    );
    return values;
  }

  // Sales trend for the last N days — used by the dashboard revenue chart.
  static async salesTrend(days = 30) {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE status <> 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    return rows;
  }

  static async topProducts(limit = 5) {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.image_url, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.price_at_purchase) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
       JOIN products p ON p.id = oi.product_id
       GROUP BY p.id
       ORDER BY units_sold DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}