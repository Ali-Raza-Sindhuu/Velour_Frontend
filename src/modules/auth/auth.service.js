import pool from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../../config/env.js";
import { sendPasswordResetEmail, sendSignupVerificationEmail } from "../../utils/email.js";
import { signAdminToken, signCustomerToken } from "../../utils/authTokens.js";

export class AuthService {
  static validateSignupDetails({ email, password, first_name, last_name }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedFirstName = String(first_name || "").trim();
    const normalizedLastName = String(last_name || "").trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !password || !normalizedFirstName || !normalizedLastName) {
      throw Object.assign(new Error("Email, password, first name, and last name are required"), { status: 400 });
    }
    if (String(password).length < 8) {
      throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
    }
    return { normalizedEmail, normalizedFirstName, normalizedLastName };
  }

  static async requestSignupVerification({ email, password, first_name, last_name }) {
    const { normalizedEmail, normalizedFirstName, normalizedLastName } = this.validateSignupDetails({ email, password, first_name, last_name });
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length) throw Object.assign(new Error("An account with this email already exists"), { status: 409 });

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO signup_verifications (email, first_name, last_name, password_hash, code_hash, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name),
       password_hash = VALUES(password_hash), code_hash = VALUES(code_hash), expires_at = VALUES(expires_at),
       attempts = 0, updated_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, normalizedFirstName, normalizedLastName, passwordHash, codeHash, expiresAt]
    );

    const delivery = await sendSignupVerificationEmail(normalizedEmail, code, normalizedFirstName);
    if (!delivery) throw Object.assign(new Error("We couldn't send the verification email. Please try again shortly."), { status: 503 });
    return { message: "We sent a 6-digit verification code to your email. It expires in 10 minutes." };
  }

  static async verifySignupVerification({ email, code }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !/^\d{6}$/.test(normalizedCode)) {
      throw Object.assign(new Error("Enter the 6-digit verification code"), { status: 400 });
    }

    const [rows] = await pool.query("SELECT * FROM signup_verifications WHERE email = ? LIMIT 1", [normalizedEmail]);
    const verification = rows[0];
    if (!verification || new Date(verification.expires_at) <= new Date()) {
      if (verification) await pool.query("DELETE FROM signup_verifications WHERE email = ?", [normalizedEmail]);
      throw Object.assign(new Error("This verification code has expired. Request a new code to continue."), { status: 400 });
    }
    if (verification.attempts >= 5) {
      await pool.query("DELETE FROM signup_verifications WHERE email = ?", [normalizedEmail]);
      throw Object.assign(new Error("Too many incorrect attempts. Request a new verification code."), { status: 429 });
    }

    const valid = await bcrypt.compare(normalizedCode, verification.code_hash);
    if (!valid) {
      await pool.query("UPDATE signup_verifications SET attempts = attempts + 1 WHERE email = ?", [normalizedEmail]);
      throw Object.assign(new Error("Invalid verification code. Please try again."), { status: 400 });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length) throw Object.assign(new Error("An account with this email already exists"), { status: 409 });

    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)",
      [normalizedEmail, verification.password_hash, verification.first_name, verification.last_name]
    );
    await pool.query("DELETE FROM signup_verifications WHERE email = ?", [normalizedEmail]);
    const token = signCustomerToken({ id: result.insertId });
    return { token, user: { id: result.insertId, email: normalizedEmail, first_name: verification.first_name, last_name: verification.last_name, role: "customer" } };
  }

  static getGoogleClient() {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw Object.assign(new Error("Google sign-in is not configured on the server"), { status: 503 });
    }
    return {
      redirectUri: `${config.backendUrl}/api/auth/google/callback`,
    };
  }

  static async getGoogleAuthorizationUrl() {
    const state = jwt.sign({ purpose: "google-oauth", nonce: crypto.randomBytes(16).toString("hex") }, config.jwtSecret, { expiresIn: "10m" });
    const client = this.getGoogleClient();
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: client.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      access_type: "online",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  static async completeGoogleAuthorization(authorizationCode, state) {
    if (!authorizationCode || !state) throw Object.assign(new Error("Google sign-in was cancelled or expired"), { status: 400 });
    try {
      const payload = jwt.verify(state, config.jwtSecret);
      if (payload.purpose !== "google-oauth") throw new Error("Wrong token purpose");
    } catch { throw Object.assign(new Error("Invalid Google sign-in request"), { status: 400 }); }
    const client = this.getGoogleClient();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: authorizationCode, client_id: config.google.clientId, client_secret: config.google.clientSecret, redirect_uri: client.redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw Object.assign(new Error("Google could not complete sign-in"), { status: 401 });
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile?.sub || !profile.email || !profile.email_verified) throw Object.assign(new Error("Your Google account must have a verified email address"), { status: 401 });
    const result = await this.findOrCreateGoogleUser(profile);
    const oneTimeCode = crypto.randomBytes(32).toString("hex");
    await pool.query("INSERT INTO google_auth_codes (code, user_id, expires_at) VALUES (?, ?, ?)", [oneTimeCode, result.user.id, new Date(Date.now() + 2 * 60 * 1000)]);
    return oneTimeCode;
  }

  static async findOrCreateGoogleUser(profile) {
    const email = profile.email.toLowerCase();
    const [bySubject] = await pool.query("SELECT * FROM users WHERE google_subject = ?", [profile.sub]);
    let user = bySubject[0];
    if (!user) {
      const [byEmail] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      user = byEmail[0];
      if (user) await pool.query("UPDATE users SET google_subject = ? WHERE id = ?", [profile.sub, user.id]);
      else {
        const names = String(profile.name || "Google User").trim().split(/\s+/);
        const [created] = await pool.query("INSERT INTO users (email, password_hash, first_name, last_name, google_subject) VALUES (?, ?, ?, ?, ?)", [email, await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10), names[0] || "Google", names.slice(1).join(" ") || "User", profile.sub]);
        const [createdUsers] = await pool.query("SELECT * FROM users WHERE id = ?", [created.insertId]);
        user = createdUsers[0];
      }
    }
    if (user.status !== "active") throw Object.assign(new Error("This account is disabled"), { status: 403 });
    return { user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } };
  }

  static async exchangeGoogleLoginCode(code) {
    if (!/^[a-f0-9]{64}$/i.test(String(code || ""))) throw Object.assign(new Error("Invalid or expired Google sign-in"), { status: 400 });
    const [codes] = await pool.query("SELECT user_id FROM google_auth_codes WHERE code = ? AND expires_at > NOW() LIMIT 1", [code]);
    await pool.query("DELETE FROM google_auth_codes WHERE code = ?", [code]);
    if (!codes.length) throw Object.assign(new Error("Invalid or expired Google sign-in"), { status: 400 });
    const user = await this.getCurrentUser(codes[0].user_id);
    // Google sign-in is the shop's; admins use the admin login. The message
    // doesn't hint that an admin panel exists.
    if (user.role === "admin") throw Object.assign(new Error("This account can't sign in to the shop."), { status: 403 });
    return { token: signCustomerToken(user), user };
  }

  static async signup({ email, password, first_name, last_name }) {
    throw Object.assign(new Error("Email verification is required before creating an account"), { status: 410 });
  }

  // Checks an email + password and returns the active account. Same error
  // for an unknown email and a wrong password.
  static async verifyCredentials({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      const error = new Error("Email and password are required");
      error.status = 400;
      throw error;
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    const user = users[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }
    if (user.status !== "active") {
      const error = new Error("This account is disabled");
      error.status = 403;
      throw error;
    }
    return user;
  }

  static publicUser(user) {
    return { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role };
  }

  // Storefront login — customers only. An admin account gets exactly the
  // answer a wrong password gets, so the shop never reveals that an admin
  // panel (or an admin email) exists.
  static async login(credentials) {
    const user = await this.verifyCredentials(credentials);
    if (user.role === "admin") {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }
    return { token: signCustomerToken(user), user: this.publicUser(user) };
  }

  // Admin panel login — admins only. A customer account gets the same
  // "Invalid credentials" as a wrong password, so this page doesn't reveal
  // which emails belong to customers.
  static async adminLogin(credentials) {
    const user = await this.verifyCredentials(credentials);
    if (user.role !== "admin") {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }
    return { token: signAdminToken(user), user: this.publicUser(user) };
  }

  static async getCurrentUser(userId) {
    const [users] = await pool.query(
      "SELECT id, email, first_name, last_name, role FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    return users[0];
  }

  // ─── Forgot password ───────────────────────────────────────────────────────
  // Always resolves without revealing whether the email exists, to avoid
  // leaking which addresses have accounts.
  static async requestPasswordReset(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      const error = new Error("A valid email address is required");
      error.status = 400;
      throw error;
    }

    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (users.length > 0) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
        [normalizedEmail, token, expiresAt]
      );

      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(normalizedEmail, resetUrl);
    }

    return { message: "If an account exists for that email, a reset link has been sent." };
  }

  static async resetPassword(token, newPassword) {
    if (!token || !newPassword || newPassword.length < 8) {
      const error = new Error("A valid token and a password of at least 8 characters are required");
      error.status = 400;
      throw error;
    }

    const [resets] = await pool.query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [token]
    );
    if (resets.length === 0) {
      const error = new Error("This reset link is invalid or has expired");
      error.status = 400;
      throw error;
    }

    const reset = resets[0];
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE email = ?", [hash, reset.email]);

    // Invalidate every outstanding reset token for this email, not just the
    // one used, so an older leaked link can't still be redeemed afterwards.
    await pool.query("DELETE FROM password_resets WHERE email = ?", [reset.email]);

    return { message: "Password has been reset. You can now log in." };
  }
}
