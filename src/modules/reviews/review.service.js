import pool from "../../config/db.js";

export class ReviewService {
  static async adminList() {
    const [reviews] = await pool.query(`SELECT r.*, p.name AS product_name,
      CONCAT(u.first_name, ' ', u.last_name) AS customer_name FROM reviews r
      JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`);
    return reviews;
  }

  static async updateStatus(id, status) {
    if (!["pending", "approved", "flagged"].includes(status)) {
      const err = new Error("Invalid review status");
      err.status = 400;
      throw err;
    }
    await pool.query("UPDATE reviews SET status = ? WHERE id = ?", [status, id]);
  }

  static async forProduct(productId) {
    const [reviews] = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.first_name, u.last_name
      FROM reviews r JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [productId]);

    const [avg] = await pool.query(
      "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = ?", [productId]
    );

    return {
      reviews,
      summary: { avg_rating: parseFloat(avg[0].avg_rating || 0).toFixed(1), total_reviews: avg[0].total_reviews },
    };
  }

  static async create(userId, { product_id, rating, comment }) {
    if (!rating || rating < 1 || rating > 5) {
      const err = new Error("Rating must be between 1 and 5");
      err.status = 400;
      throw err;
    }

    // Only customers who actually bought (and received/kept) the product can review it.
    const [purchased] = await pool.query(`
      SELECT oi.id FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'cancelled'
      LIMIT 1
    `, [userId, product_id]);

    if (purchased.length === 0) {
      const err = new Error("You can only review products you have purchased");
      err.status = 403;
      throw err;
    }

    try {
      const [result] = await pool.query(
        "INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)",
        [userId, product_id, rating, comment]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const err = new Error("You have already reviewed this product");
        err.status = 400;
        throw err;
      }
      throw error;
    }
  }

  static async remove(id, user) {
    if (user.role === "admin") {
      await pool.query("DELETE FROM reviews WHERE id = ?", [id]);
    } else {
      await pool.query("DELETE FROM reviews WHERE id = ? AND user_id = ?", [id, user.id]);
    }
  }
}
