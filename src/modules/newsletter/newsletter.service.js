import pool from "../../config/db.js";

export class NewsletterService {
  static async subscribe(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      const error = new Error("A valid email address is required");
      error.status = 400;
      throw error;
    }

    try {
      await pool.query("INSERT INTO newsletter_subscribers (email) VALUES (?)", [normalizedEmail]);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        // Already subscribed — treat as success rather than an error so the
        // footer form doesn't show a confusing failure state.
        return { alreadySubscribed: true };
      }
      throw error;
    }

    return { alreadySubscribed: false };
  }

  static async adminList() {
    const [rows] = await pool.query("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
    return rows;
  }

  // Kept separate from adminList so marketing delivery only receives the
  // address it needs, rather than passing full subscriber records around.
  static async recipientEmails() {
    const [rows] = await pool.query("SELECT email FROM newsletter_subscribers ORDER BY id ASC");
    return rows.map(({ email }) => email).filter(Boolean);
  }
}
