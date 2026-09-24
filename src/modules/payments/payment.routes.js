import { Router } from "express";
import rateLimit from "express-rate-limit";
import { PaymentController } from "./payment.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// Each attempt pushes an MPIN prompt to someone's phone; keep that rare.
// Keyed per order, since mobile carriers put many shoppers behind one IP.
const walletChargeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  keyGenerator: (req) => `order:${req.params.orderId}`,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/accounts", PaymentController.getAccounts);
router.post("/:orderId/jazzcash/pay", walletChargeLimiter, PaymentController.payJazzCash);
router.get("/:orderId/jazzcash/status", PaymentController.jazzCashStatus);
// DEMO ONLY — 404s unless JAZZCASH_ENV=demo. Stands in for the MPIN prompt on
// the customer's phone while we wait on real sandbox credentials. Not rate
// limited: it pushes nothing to a real phone, and a 429 mid-demo helps nobody.
router.post("/:orderId/jazzcash/demo-approve", PaymentController.demoApproveMpin);

router.get("/admin/all", requireAuth, requireAdmin, PaymentController.adminList);
router.patch("/admin/:id/verify", requireAuth, requireAdmin, PaymentController.adminVerify);

export default router;
