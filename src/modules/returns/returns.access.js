import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";

// Guest access to one return: an HMAC of its id, so the link in every email
// works without storing the token itself.
export const returnAccessToken = (returnId) =>
  crypto.createHmac("sha256", config.jwtSecret).update(`return:${returnId}`).digest("hex");

export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

export function tokenMatches(returnId, token) {
  if (typeof token !== "string" || token.length !== 64) return false;
  const expected = Buffer.from(returnAccessToken(returnId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Short-lived proof that someone knew an order's number and email.
export const signOrderLookup = (orderId) =>
  jwt.sign({ purpose: "return-lookup", orderId: Number(orderId) }, config.jwtSecret, { expiresIn: "45m" });

export function lookupMatches(orderId, token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(String(token), config.jwtSecret);
    return payload.purpose === "return-lookup" && Number(payload.orderId) === Number(orderId);
  } catch {
    return false;
  }
}
