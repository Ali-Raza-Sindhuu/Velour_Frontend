import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import pool from "../config/db.js";
import { isAdminToken, isStoreToken } from "../utils/authTokens.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Guest checkout remains available, while authenticated customers can have
// their orders linked to their account for dashboard order history. Only a
// shop session counts here: an admin token is ignored, so an admin looking
// at the shop is just another guest.
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  try {
    const claims = jwt.verify(authHeader.split(" ")[1], config.jwtSecret);
    if (isStoreToken(claims)) req.user = claims;
  } catch {
    // A stale guest token must not prevent checkout; protected routes still
    // use requireAuth and reject it.
  }
  next();
};

// Either kind of real session (admin panel or shop) — for the few endpoints
// both sides use, like the signed-in user's own profile. Use after
// requireAuth.
export const requireSignedIn = (req, res, next) => {
  if (isStoreToken(req.user) || isAdminToken(req.user)) return next();
  return res.status(401).json({ success: false, message: "Please sign in again." });
};

// Customer-only features (orders, wishlist, addresses, reviews). Use after
// requireAuth.
export const requireCustomer = (req, res, next) => {
  if (isStoreToken(req.user)) return next();
  return res.status(403).json({ success: false, message: "Please sign in to your account to continue." });
};

// Admin panel only. Needs a token from the admin login (not a shop login,
// and not an admin token from before sessions were split), and the account
// must still be an active admin — so removing someone's access takes effect
// immediately, not when their token expires.
export const requireAdmin = async (req, res, next) => {
  if (!isAdminToken(req.user)) {
    if (req.user?.role === "admin") {
      return res.status(401).json({ success: false, message: "Your admin session has expired. Please sign in again." });
    }
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const [[account]] = await pool.query("SELECT role, status FROM users WHERE id = ?", [req.user.id]);
    if (account?.role !== "admin" || account.status !== "active") {
      return res.status(401).json({ success: false, message: "This admin account no longer has access." });
    }
    next();
  } catch (error) {
    next(error);
  }
};
