import pool from "../../config/db.js";

export class PromotionService {
  static async create({ code, discount_type, discount_value, min_order_amount, max_uses, expires_at }) {
    try {
      const [result] = await pool.query(
        "INSERT INTO promotions (code, discount_type, discount_value, min_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [code.toUpperCase(), discount_type || "percentage", discount_value, min_order_amount || 0, max_uses || null, expires_at || null]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const err = new Error("Promo code already exists");
        err.status = 400;
        throw err;
      }
      throw error;
    }
  }

  static async list() {
    const [promos] = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC");
    return promos;
  }

  static async validate({ code, order_total }) {
    const [promos] = await pool.query("SELECT * FROM promotions WHERE code = ? AND is_active = TRUE", [code.toUpperCase()]);
    if (promos.length === 0) {
      const err = new Error("Invalid promo code");
      err.status = 404;
      throw err;
    }

    const promo = promos[0];

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      const err = new Error("Promo code has expired");
      err.status = 400;
      throw err;
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      const err = new Error("Promo code usage limit reached");
      err.status = 400;
      throw err;
    }
    if (order_total < promo.min_order_amount) {
      const err = new Error(`Minimum order amount is ${promo.min_order_amount}`);
      err.status = 400;
      throw err;
    }

    let discount = promo.discount_type === "percentage" ? (order_total * promo.discount_value) / 100 : Number(promo.discount_value);
    discount = Math.min(discount, order_total);

    return { discount, promo_code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value };
  }

  static async update(id, { code, discount_type, is_active, discount_value, min_order_amount, max_uses, expires_at }) {
    await pool.query(
      "UPDATE promotions SET code=COALESCE(?,code), discount_type=COALESCE(?,discount_type), is_active=COALESCE(?,is_active), discount_value=COALESCE(?,discount_value), min_order_amount=COALESCE(?,min_order_amount), max_uses=COALESCE(?,max_uses), expires_at=COALESCE(?,expires_at) WHERE id=?",
      [code?.toUpperCase(), discount_type, is_active, discount_value, min_order_amount, max_uses, expires_at || null, id]
    );
  }

  static async remove(id) {
    await pool.query("DELETE FROM promotions WHERE id = ?", [id]);
  }
}
