import pool from "../../config/db.js";
import { sendContactAcknowledgementEmail } from "../../utils/email.js";

export class ContactService {
  static async submit({ name, email, subject, message }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || !cleanMessage) {
      const error = new Error("Name, a valid email, and a message are required");
      error.status = 400;
      throw error;
    }

    const [result] = await pool.query(
      "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
      [cleanName, normalizedEmail, String(subject || "").trim() || null, cleanMessage]
    );

    sendContactAcknowledgementEmail(normalizedEmail, cleanName);

    return { id: result.insertId };
  }

  static async adminList() {
    const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC");
    return rows;
  }

  static async updateStatus(id, status) {
    if (!["new", "read", "archived"].includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }
    await pool.query("UPDATE contact_messages SET status = ? WHERE id = ?", [status, id]);
  }
}