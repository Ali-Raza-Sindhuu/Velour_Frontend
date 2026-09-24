import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { recordCash, ACCOUNTS } from "../finance/ledger.js";
import { bucketChanges, nextAvgCost, round2 } from "./inventory.math.js";

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

export const ADJUST_REASONS = {
  count_correction: "Stock count correction",
  damaged: "Damaged",
  lost: "Lost / stolen",
  found: "Found",
  sample: "Used as tester / sample",
  other: "Other",
};

// Locks the products (ascending id — the same order checkout and returns
// use, so two transactions can't deadlock) and returns them by id.
async function lockProducts(connection, productIds) {
  const ids = [...new Set(productIds.map(Number))].sort((a, b) => a - b);
  if (!ids.length) return new Map();
  const [rows] = await connection.query(
    "SELECT id, name, status, stock_quantity, reserved_quantity, avg_cost FROM products WHERE id IN (?) ORDER BY id FOR UPDATE",
    [ids]
  );
  return new Map(rows.map((row) => [row.id, row]));
}

// Applies one movement to a product the caller has locked, and writes it to
// the stock card. The UPDATE is guarded so neither bucket can go negative.
async function move(connection, product, { type, quantity, unitCost = null, refType = null, refId = null, note = null, createdBy = null, soldOutMessage }) {
  const change = bucketChanges(type, quantity);
  if (change.available || change.reserved) {
    const [update] = await connection.query(
      `UPDATE products SET stock_quantity = stock_quantity + ?, reserved_quantity = reserved_quantity + ?
       WHERE id = ? AND stock_quantity + ? >= 0 AND reserved_quantity + ? >= 0`,
      [change.available, change.reserved, product.id, change.available, change.reserved]
    );
    if (update.affectedRows !== 1) {
      throw httpError(soldOutMessage || `Not enough stock of "${product.name}".`, 409);
    }
  }
  product.stock_quantity += change.available;
  product.reserved_quantity += change.reserved;
  await connection.query(
    `INSERT INTO inventory_movements
       (product_id, type, quantity, available_change, reserved_change, available_after, reserved_after, unit_cost, ref_type, ref_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [product.id, type, Math.abs(quantity), change.available, change.reserved, product.stock_quantity, product.reserved_quantity,
      unitCost, refType, refId, note, createdBy]
  );
}

// Brings units into stock at a cost and re-averages the product's cost.
async function receive(connection, product, type, quantity, unitCost, ref) {
  const onHand = product.stock_quantity + product.reserved_quantity;
  const avg = nextAvgCost(onHand, product.avg_cost, quantity, unitCost);
  await connection.query("UPDATE products SET avg_cost = ? WHERE id = ?", [avg, product.id]);
  product.avg_cost = avg;
  await move(connection, product, { type, quantity, unitCost, ...ref });
}

const orderLines = async (connection, orderId) =>
  (await connection.query("SELECT id, product_id, selected_size, selected_color, quantity, unit_cost FROM order_items WHERE order_id = ? ORDER BY product_id", [orderId]))[0];

async function variantRows(connection, productId, lock = false) {
  const [rows] = await connection.query(`SELECT size_label, color_label, stock_quantity FROM product_variants WHERE product_id = ? ORDER BY size_label, color_label${lock ? " FOR UPDATE" : ""}`, [productId]);
  return rows;
}

async function changeVariant(connection, product, size, color, delta) {
  const [result] = await connection.query(
    "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE product_id = ? AND size_label = ? AND color_label = ? AND stock_quantity + ? >= 0",
    [delta, product.id, size || "", color || "", delta]
  );
  if (result.affectedRows !== 1) throw httpError(`Invalid or insufficient stock for ${size || "one size"} / ${color || "one color"} on ${product.name}.`, 409);
}

export class InventoryService {
  // ─── Transaction helpers (called with the caller's connection) ────────────

  // Order placed: available → reserved.
  static async reserve(connection, lines, { orderId, soldOutMessage } = {}) {
    const products = await lockProducts(connection, lines.map((l) => l.product_id));
    for (const line of lines) {
      const product = products.get(Number(line.product_id));
      if (!product) throw httpError("A product in this order no longer exists.", 409);
      await move(connection, product, {
        type: "reserve", quantity: Number(line.quantity), refType: "order", refId: orderId,
        soldOutMessage: soldOutMessage || `"${product.name}" just sold out.`,
      });
    }
  }

  // Order cancelled before shipping: reserved → available.
  static async release(connection, orderId, note = null) {
    const lines = await orderLines(connection, orderId);
    const products = await lockProducts(connection, lines.map((l) => l.product_id));
    for (const line of lines) {
      const product = products.get(line.product_id);
      if (product) await move(connection, product, { type: "release", quantity: line.quantity, refType: "order", refId: orderId, note });
    }
  }

  // Order shipped: the reserved units leave the building. Their current
  // average cost is fixed on the order line as the cost of goods sold.
  static async ship(connection, orderId) {
    const lines = await orderLines(connection, orderId);
    const products = await lockProducts(connection, lines.map((l) => l.product_id));
    for (const line of lines) {
      const product = products.get(line.product_id);
      if (!product) continue;
      const cost = round2(product.avg_cost);
      await connection.query("UPDATE order_items SET unit_cost = ? WHERE id = ?", [cost, line.id]);
      await move(connection, product, { type: "ship", quantity: line.quantity, unitCost: cost, refType: "order", refId: orderId });
    }
  }

  // The courier brought the parcel back: the units are on the shelf again,
  // still held for this order until it is re-shipped or cancelled.
  static async unship(connection, orderId) {
    const lines = await orderLines(connection, orderId);
    const products = await lockProducts(connection, lines.map((l) => l.product_id));
    for (const line of lines) {
      const product = products.get(line.product_id);
      if (!product) continue;
      await move(connection, product, {
        type: "unship", quantity: line.quantity, unitCost: line.unit_cost ?? round2(product.avg_cost),
        refType: "order", refId: orderId, note: "Returned by the courier",
      });
    }
  }

  // Returned items: restockable ones go back on sale at the cost they left
  // at; the rest are written off (logged, no stock change — they left stock
  // when they shipped).
  // lines: [{ product_id, quantity, unit_cost, restock }]
  static async processReturn(connection, returnId, lines) {
    const products = await lockProducts(connection, lines.map((l) => l.product_id));
    for (const line of lines) {
      const product = products.get(Number(line.product_id));
      if (!product) continue;
      const cost = line.unit_cost ?? round2(product.avg_cost);
      const ref = { refType: "return", refId: returnId };
      if (line.restock) {
        await receive(connection, product, "return_restock", Number(line.quantity), cost, ref);
        const variants = await variantRows(connection, product.id, true);
        if (variants.length) await changeVariant(connection, product, line.selected_size, line.selected_color, Number(line.quantity));
      }
      else await move(connection, product, { type: "return_scrap", quantity: Number(line.quantity), unitCost: cost, ...ref, note: "Not restockable — written off" });
    }
  }

  // New product: its first stock, optionally at a known cost.
  static async opening(connection, productId, quantity, unitCost, createdBy = null) {
    const products = await lockProducts(connection, [productId]);
    const product = products.get(Number(productId));
    if (!product) throw httpError("Product not found", 404);
    await receive(connection, product, "opening", Math.max(0, Number(quantity) || 0), round2(unitCost || 0), {
      refType: "product", refId: product.id, note: "Opening stock", createdBy,
    });
  }

  // ─── Admin actions ────────────────────────────────────────────────────────

  static async adjust(productId, { delta, reason, note, selected_size = "", selected_color = "" }, adminId) {
    const change = Math.trunc(Number(delta));
    if (!Number.isFinite(change) || change === 0) throw httpError("Enter how many units to add (+) or remove (−).");
    if (!ADJUST_REASONS[reason]) throw httpError("Choose a reason for the adjustment.");
    const text = [ADJUST_REASONS[reason], String(note || "").trim()].filter(Boolean).join(" — ").slice(0, 255);
    await withTransaction(async (connection) => {
      const product = (await lockProducts(connection, [productId])).get(Number(productId));
      if (!product) throw httpError("Product not found", 404);
      const variants = await variantRows(connection, product.id, true);
      if (variants.length) {
        if (!variants.some((v) => v.size_label === selected_size && v.color_label === selected_color)) throw httpError("Choose a size and color variant to adjust.");
        await changeVariant(connection, product, selected_size, selected_color, change);
      }
      await move(connection, product, {
        type: "adjustment", quantity: change, unitCost: round2(product.avg_cost), refType: "adjustment", note: text, createdBy: adminId,
        soldOutMessage: `Only ${product.stock_quantity} of "${product.name}" are available to remove (the rest are reserved for orders).`,
      });
    });
    return InventoryService.product(productId);
  }

  // Sets a product's unit cost directly — for stock that was on hand before
  // costs were tracked. Future purchases re-average from here.
  static async setCost(productId, { unit_cost }, adminId) {
    const cost = round2(unit_cost);
    if (!Number.isFinite(cost) || cost < 0) throw httpError("Enter a valid unit cost.");
    await withTransaction(async (connection) => {
      const product = (await lockProducts(connection, [productId])).get(Number(productId));
      if (!product) throw httpError("Product not found", 404);
      await connection.query("UPDATE products SET avg_cost = ? WHERE id = ?", [cost, product.id]);
      await move(connection, product, {
        type: "cost_update", quantity: 0, unitCost: cost, refType: "adjustment",
        note: `Unit cost changed from Rs ${Number(product.avg_cost).toLocaleString()} to Rs ${cost.toLocaleString()}`, createdBy: adminId,
      });
    });
    return InventoryService.product(productId);
  }

  static async createPurchase(body, adminId) {
    const supplier = String(body.supplier || "").trim().slice(0, 150);
    if (!supplier) throw httpError("Enter the supplier's name.");
    const date = String(body.purchased_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError("Enter a valid purchase date.");
    const lines = (Array.isArray(body.items) ? body.items : []).map((item) => ({
      product_id: Number(item.product_id),
      quantity: Math.trunc(Number(item.quantity)),
      unit_cost: round2(item.unit_cost),
      selected_size: String(item.selected_size || "").trim(),
      selected_color: String(item.selected_color || "").trim(),
    }));
    if (!lines.length) throw httpError("Add at least one product to the purchase.");
    if (lines.some((l) => !l.product_id || !(l.quantity > 0) || !Number.isFinite(l.unit_cost) || l.unit_cost < 0)) {
      throw httpError("Each line needs a product, a quantity above 0 and a unit cost.");
    }
    const paid = Boolean(body.paid);
    const account = paid ? String(body.account || "") : null;
    if (paid && !ACCOUNTS.includes(account)) throw httpError("Choose which account the supplier was paid from.");
    const total = round2(lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0));

    const purchaseId = await withTransaction(async (connection) => {
      const [created] = await connection.query(
        `INSERT INTO stock_purchases (supplier, invoice_ref, purchased_at, total_cost, payment_status, paid_at, paid_account, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [supplier, String(body.invoice_ref || "").trim().slice(0, 100) || null, date, total, paid ? "paid" : "unpaid",
          paid ? new Date() : null, account, String(body.note || "").trim().slice(0, 500) || null, adminId || null]
      );
      const id = created.insertId;
      await connection.query(
        "INSERT INTO stock_purchase_items (purchase_id, product_id, selected_size, selected_color, quantity, unit_cost) VALUES ?",
        [lines.map((l) => [id, l.product_id, l.selected_size, l.selected_color, l.quantity, l.unit_cost])]
      );
      const products = await lockProducts(connection, lines.map((l) => l.product_id));
      for (const line of lines) {
        const product = products.get(line.product_id);
        if (!product) throw httpError("One of the products no longer exists.", 409);
        const variants = await variantRows(connection, product.id, true);
        if (variants.length) {
          if (!variants.some((v) => v.size_label === line.selected_size && v.color_label === line.selected_color)) throw httpError(`Choose a valid size and color for ${product.name}.`);
          await changeVariant(connection, product, line.selected_size, line.selected_color, line.quantity);
        }
        await receive(connection, product, "purchase", line.quantity, line.unit_cost, {
          refType: "purchase", refId: id, note: `From ${supplier}`, createdBy: adminId,
        });
      }
      if (paid) {
        await recordCash(connection, {
          type: "purchase_payment", direction: "out", amount: total, account, refType: "purchase", refId: id,
          note: `Stock from ${supplier}`, createdBy: adminId,
        });
      }
      return id;
    });
    return InventoryService.purchase(purchaseId);
  }

  static async payPurchase(purchaseId, { account, paid_at }, adminId) {
    if (!ACCOUNTS.includes(account)) throw httpError("Choose which account the supplier was paid from.");
    const when = paid_at ? new Date(paid_at) : new Date();
    if (Number.isNaN(when.getTime())) throw httpError("Enter a valid payment date.");
    await withTransaction(async (connection) => {
      const [[purchase]] = await connection.query("SELECT * FROM stock_purchases WHERE id = ? FOR UPDATE", [purchaseId]);
      if (!purchase) throw httpError("Purchase not found", 404);
      if (purchase.payment_status === "paid") throw httpError("This purchase is already paid.", 409);
      await connection.query("UPDATE stock_purchases SET payment_status = 'paid', paid_at = ?, paid_account = ? WHERE id = ?", [when, account, purchaseId]);
      await recordCash(connection, {
        type: "purchase_payment", direction: "out", amount: Number(purchase.total_cost), account, refType: "purchase", refId: purchase.id,
        note: `Stock from ${purchase.supplier}`, createdBy: adminId, occurredAt: when,
      });
    });
    return InventoryService.purchase(purchaseId);
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

  static async stockList() {
    const [[settingRow]] = await pool.query("SELECT setting_value FROM store_settings WHERE setting_key = 'inventory'");
    const settings = typeof settingRow?.setting_value === "string" ? JSON.parse(settingRow.setting_value) : settingRow?.setting_value || {};
    const threshold = Number(settings.lowStockThreshold ?? 5);
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, p.image_url, p.status, p.price, p.stock_quantity AS available, p.reserved_quantity AS reserved,
              p.stock_quantity + p.reserved_quantity AS on_hand, p.avg_cost, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.name`
    );
    const [variants] = await pool.query("SELECT product_id, size_label AS size, color_label AS color, stock_quantity FROM product_variants ORDER BY product_id, size_label, color_label");
    return {
      lowStockThreshold: threshold,
      products: rows.map((row) => ({
        ...row,
        variants: variants.filter((variant) => variant.product_id === row.id),
        avg_cost: Number(row.avg_cost),
        price: Number(row.price),
        value: round2(Number(row.on_hand) * Number(row.avg_cost)),
        level: row.available <= 0 ? "out_of_stock" : row.available <= threshold ? "low_stock" : "in_stock",
      })),
    };
  }

  static async product(productId) {
    const [[row]] = await pool.query(
      `SELECT id, name, stock_quantity AS available, reserved_quantity AS reserved, stock_quantity + reserved_quantity AS on_hand, avg_cost
       FROM products WHERE id = ?`,
      [productId]
    );
    if (!row) throw httpError("Product not found", 404);
    return { ...row, avg_cost: Number(row.avg_cost), value: round2(row.on_hand * Number(row.avg_cost)) };
  }

  static async movements(productId, { page = 1, limit = 50 } = {}) {
    const size = Math.min(200, Math.max(1, Number(limit) || 50));
    const offset = (Math.max(1, Number(page) || 1) - 1) * size;
    const [rows] = await pool.query(
      `SELECT m.*, u.first_name AS admin_name
       FROM inventory_movements m LEFT JOIN users u ON u.id = m.created_by
       WHERE m.product_id = ? ORDER BY m.id DESC LIMIT ? OFFSET ?`,
      [productId, size, offset]
    );
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM inventory_movements WHERE product_id = ?", [productId]);
    return {
      product: await InventoryService.product(productId),
      movements: rows.map((m) => ({ ...m, unit_cost: m.unit_cost === null ? null : Number(m.unit_cost) })),
      pagination: { page: Math.floor(offset / size) + 1, limit: size, total },
    };
  }

  static async purchases() {
    const [purchases] = await pool.query(
      "SELECT sp.*, (SELECT COUNT(*) FROM stock_purchase_items WHERE purchase_id = sp.id) AS line_count FROM stock_purchases sp ORDER BY sp.purchased_at DESC, sp.id DESC"
    );
    if (!purchases.length) return [];
    const [items] = await pool.query(
      `SELECT spi.*, p.name FROM stock_purchase_items spi JOIN products p ON p.id = spi.product_id WHERE spi.purchase_id IN (?) ORDER BY spi.id`,
      [purchases.map((p) => p.id)]
    );
    return purchases.map((p) => ({
      ...p,
      total_cost: Number(p.total_cost),
      items: items.filter((i) => i.purchase_id === p.id).map((i) => ({ ...i, unit_cost: Number(i.unit_cost) })),
    }));
  }

  static async purchase(purchaseId) {
    const found = (await InventoryService.purchases()).find((p) => p.id === Number(purchaseId));
    if (!found) throw httpError("Purchase not found", 404);
    return found;
  }

  // Every product's buckets must equal the sum of its stock card.
  static async reconcile() {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.stock_quantity, p.reserved_quantity,
              COALESCE(SUM(m.available_change), 0) AS ledger_available, COALESCE(SUM(m.reserved_change), 0) AS ledger_reserved
       FROM products p LEFT JOIN inventory_movements m ON m.product_id = p.id
       GROUP BY p.id
       HAVING p.stock_quantity <> ledger_available OR p.reserved_quantity <> ledger_reserved`
    );
    // Reservations must match the orders that are actually waiting to ship.
    const [reservedDrift] = await pool.query(
      `SELECT p.id, p.name, p.reserved_quantity, COALESCE(r.qty, 0) AS open_order_units
       FROM products p LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN ('pending', 'processing') GROUP BY oi.product_id
       ) r ON r.product_id = p.id
       WHERE p.reserved_quantity <> COALESCE(r.qty, 0)`
    );
    return { ok: rows.length === 0 && reservedDrift.length === 0, ledgerDrift: rows, reservedDrift };
  }
}
