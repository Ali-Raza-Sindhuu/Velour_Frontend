import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

// Two separate kinds of session. A shop token ("store") is what customers
// get from the storefront login; an admin token ("admin") only comes from
// the admin login and is short-lived. Neither is accepted where the other
// belongs, so an admin session never acts as a shopper and a customer
// session never reaches the admin panel.
export const ADMIN_SESSION_HOURS = 12;

export const signCustomerToken = (user) =>
  jwt.sign({ id: user.id, role: "customer", aud: "store" }, config.jwtSecret, { expiresIn: "7d" });

export const signAdminToken = (user) =>
  jwt.sign({ id: user.id, role: "admin", aud: "admin" }, config.jwtSecret, { expiresIn: `${ADMIN_SESSION_HOURS}h` });

// A signed-in account's token always carries a numeric user id; the site
// also signs short-lived purpose tokens (return lookups, Google sign-in
// state) with the same secret, and those must never count as a login.
const isAccountToken = (claims) => Boolean(claims) && Number.isInteger(Number(claims.id)) && Number(claims.id) > 0 && !claims.purpose;

export const isAdminToken = (claims) => isAccountToken(claims) && claims.role === "admin" && claims.aud === "admin";

// Shop tokens issued before sessions were split carry no audience; customer
// ones stay valid so shoppers aren't logged out by the upgrade.
export const isStoreToken = (claims) => isAccountToken(claims) && claims.role !== "admin" && (claims.aud === "store" || claims.aud === undefined);
