import pool from "../../config/db.js";

export class WishlistService {
  static async list(userId) {
    const [rows] = await pool.query(
      `SELECT p.* FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ? ORDER BY w.created_at DESC`,
      [userId]
    );
    // Cost price and reservations are for the admin only.
    return rows.map(({ avg_cost, reserved_quantity, ...product }) => product);
  }

  static async add(userId, productId) {
    try {
      await pool.query("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", [userId, productId]);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return; // already in wishlist, no-op
      throw error;
    }
  }

  static async remove(userId, productId) {
    await pool.query("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?", [userId, productId]);
  }
}
