import pool from "../../config/db.js";
import bcrypt from "bcryptjs";

const profileSelect = `SELECT id, email, first_name AS firstName, last_name AS lastName,
  role, status, created_at AS createdAt FROM users WHERE id = ?`;
const addressFields = ["fullName", "phone", "line1", "line2", "city", "state", "postalCode", "country"];
const readAddress = (body) => Object.fromEntries(addressFields.map((f) => [f, String(body[f] || "").trim()]));

export class UserService {
  static async getProfile(userId) {
    const [users] = await pool.query(profileSelect, [userId]);
    if (!users.length) {
      const err = new Error("User not found"); err.status = 404; throw err;
    }
    return users[0];
  }

  static async updateProfile(userId, { firstName, lastName, email }) {
    const fName = String(firstName || "").trim();
    const lName = String(lastName || "").trim();
    const emailN = String(email || "").trim().toLowerCase();
    if (!fName || !lName || !/^\S+@\S+\.\S+$/.test(emailN)) {
      const err = new Error("First name, last name, and a valid email are required"); err.status = 400; throw err;
    }
    const [dups] = await pool.query("SELECT id FROM users WHERE email = ? AND id <> ?", [emailN, userId]);
    if (dups.length) {
      const err = new Error("That email is already in use"); err.status = 409; throw err;
    }
    await pool.query("UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?", [fName, lName, emailN, userId]);
    return this.getProfile(userId);
  }

  static async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      const err = new Error("Current password and a new password of at least 8 characters are required"); err.status = 400; throw err;
    }
    const [users] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
    if (!users.length || !(await bcrypt.compare(currentPassword, users[0].password_hash))) {
      const err = new Error("Current password is incorrect"); err.status = 400; throw err;
    }
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), userId]);
  }

  static async getAddresses(userId) {
    const [addresses] = await pool.query(
      `SELECT id, full_name AS fullName, phone, line1, line2, city, state,
        postal_code AS postalCode, country, is_default AS isDefault
       FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return addresses;
  }

  static async addAddress(userId, body) {
    const address = readAddress(body);
    if (Object.entries(address).some(([k, v]) => k !== "line2" && !v)) {
      const err = new Error("Please complete all required address fields"); err.status = 400; throw err;
    }
    const [count] = await pool.query("SELECT COUNT(*) AS total FROM customer_addresses WHERE user_id = ?", [userId]);
    const isDefault = count[0].total === 0;
    const [result] = await pool.query(
      `INSERT INTO customer_addresses (user_id, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, address.fullName, address.phone, address.line1, address.line2 || null, address.city, address.state, address.postalCode, address.country, isDefault]
    );
    return { id: result.insertId, ...address, isDefault };
  }

  static async updateAddress(userId, addressId, body) {
    const address = readAddress(body);
    if (Object.entries(address).some(([k, v]) => k !== "line2" && !v)) {
      const err = new Error("Please complete all required address fields"); err.status = 400; throw err;
    }
    const [result] = await pool.query(
      `UPDATE customer_addresses SET full_name=?, phone=?, line1=?, line2=?, city=?, state=?, postal_code=?, country=?
       WHERE id=? AND user_id=?`,
      [address.fullName, address.phone, address.line1, address.line2 || null, address.city, address.state, address.postalCode, address.country, addressId, userId]
    );
    if (!result.affectedRows) {
      const err = new Error("Address not found"); err.status = 404; throw err;
    }
    const [rows] = await pool.query("SELECT is_default AS isDefault FROM customer_addresses WHERE id = ?", [addressId]);
    return { id: Number(addressId), ...address, isDefault: Boolean(rows[0].isDefault) };
  }

  static async deleteAddress(userId, addressId) {
    const [result] = await pool.query("DELETE FROM customer_addresses WHERE id = ? AND user_id = ?", [addressId, userId]);
    if (!result.affectedRows) {
      const err = new Error("Address not found"); err.status = 404; throw err;
    }
  }

  static async setDefaultAddress(userId, addressId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        "UPDATE customer_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?",
        [addressId, userId]
      );
      if (!result.affectedRows) throw Object.assign(new Error("Address not found"), { status: 404 });
      await connection.query("UPDATE customer_addresses SET is_default = FALSE WHERE user_id = ? AND id <> ?", [userId, addressId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}
