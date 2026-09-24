import pool from "../../config/db.js";

export class CustomerService {
  static async list({ search, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = ["u.role = 'customer'"];
    let params = [];

    if (search) {
      where.push("(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR cp.phone LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.join(" AND ");

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id WHERE ${whereClause}`,
      params
    );
    const [customers] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.created_at,
              cp.phone, cp.city, cp.country,
              COUNT(DISTINCT o.id) as order_count,
              COALESCE(SUM(o.total_amount), 0) as total_spent
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return { customers, total: countResult[0].total, pageNum, limitNum };
  }

  static async getById(id) {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.created_at,
              cp.phone, cp.default_shipping_address, cp.default_billing_address, cp.city, cp.state, cp.zip_code, cp.country, cp.notes
       FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id WHERE u.id = ?`,
      [id]
    );
    if (!users.length) { const err = new Error("Customer not found"); err.status = 404; throw err; }

    const [orderStats] = await pool.query(
      "SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE user_id = ?",
      [id]
    );
    return { ...users[0], ...orderStats[0] };
  }

  static async getOrders(customerId) {
    const [orders] = await pool.query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [customerId]);
    return orders;
  }

  static async upsertProfile(customerId, fields) {
    const { phone, default_shipping_address, default_billing_address, city, state, zip_code, country, notes } = fields;
    const [existing] = await pool.query("SELECT id FROM customer_profiles WHERE user_id = ?", [customerId]);

    if (existing.length > 0) {
      await pool.query(
        `UPDATE customer_profiles SET phone=?, default_shipping_address=?, default_billing_address=?,
         city=?, state=?, zip_code=?, country=?, notes=? WHERE user_id=?`,
        [phone, default_shipping_address, default_billing_address, city, state, zip_code, country, notes, customerId]
      );
    } else {
      await pool.query(
        `INSERT INTO customer_profiles (user_id, phone, default_shipping_address, default_billing_address, city, state, zip_code, country, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerId, phone, default_shipping_address, default_billing_address, city, state, zip_code, country, notes]
      );
    }
  }
}
