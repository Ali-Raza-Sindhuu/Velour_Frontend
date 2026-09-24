import { OrderService } from "./order.service.js";
import { sendSuccess } from "../../utils/response.js";

const getGuestToken = (req) => String(req.get("X-Guest-Cart") || "").trim();

// Optional client-generated key (a UUID per checkout attempt). Same key →
// same order, however many times the request is sent.
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,100}$/;

export class OrderController {
  static async checkout(req, res, next) {
    const idempotencyKey = String(req.get("Idempotency-Key") || "").trim() || null;
    if (idempotencyKey && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      return res.status(400).json({ success: false, message: "Invalid Idempotency-Key header" });
    }
    try {
      const result = await OrderService.checkout({
        ...req.body,
        guestToken: getGuestToken(req),
        userId: req.user?.id,
        idempotencyKey,
      });
      // 201 for a newly placed order, 200 when replaying one already placed.
      return res.status(result.replayed ? 200 : 201).json({ success: true, ...result });
    } catch (err) {
      if (!err.status) {
        // Unexpected (database etc.) — log it, don't leak internals to shoppers.
        console.error("Checkout error:", err);
        return res.status(500).json({ success: false, message: "We couldn't place your order. Please try again." });
      }
      return res.status(err.status).json({ success: false, message: err.message, orderId: err.orderId });
    }
  }

  static async list(req, res, next) {
    try {
      const data = await OrderService.listForUser(req.user.id);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async getOne(req, res, next) {
    try {
      const data = await OrderService.getForUser(req.params.id, req.user.id);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async cancel(req, res, next) {
    try {
      await OrderService.cancel(req.params.id, req.user.id);
      return res.json({ success: true, message: "Order cancelled and inventory restored" });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async adminList(req, res, next) {
    try {
      const data = await OrderService.adminList();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async adminGetItems(req, res, next) {
    try {
      const data = await OrderService.adminGetItems(req.params.id);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async updateStatus(req, res, next) {
    try {
      await OrderService.updateStatus(req.params.id, req.body.status);
      return res.json({ success: true });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }
}
