import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ReturnsController } from "./returns.controller.js";
import { optionalAuth, requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { returnPhotosUpload } from "../../config/multer.js";

const router = Router();

// Order number + email guessing is the thing to slow down.
const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

const photos = (req, res, next) =>
  returnPhotosUpload(req, res, (err) => {
    if (!err) return next();
    const messages = {
      LIMIT_FILE_SIZE: "Each photo can be up to 10MB.",
      LIMIT_FILE_COUNT: "You can add up to 4 photos.",
      LIMIT_UNEXPECTED_FILE: "You can add up to 4 photos.",
    };
    res.status(400).json({ success: false, message: messages[err.code] || err.message });
  });

// Admin (registered first so "/admin/..." never matches "/:rma")
router.get("/admin/all", requireAuth, requireAdmin, ReturnsController.adminList);
router.get("/admin/order/:orderId", requireAuth, requireAdmin, ReturnsController.adminForOrder);
router.get("/admin/:id", requireAuth, requireAdmin, ReturnsController.adminGet);
router.patch("/admin/:id/approve", requireAuth, requireAdmin, ReturnsController.approve);
router.patch("/admin/:id/reject", requireAuth, requireAdmin, ReturnsController.reject);// AFTER
router.patch("/admin/:id/received", requireAuth, requireAdmin, ReturnsController.markReceived);
router.patch("/admin/:id/request-payout", requireAuth, requireAdmin, ReturnsController.requestPayout);
router.patch("/admin/:id/inspect", requireAuth, requireAdmin, ReturnsController.inspect);
router.post("/admin/:id/message", requireAuth, requireAdmin, ReturnsController.message);
router.patch("/admin/:id/note", requireAuth, requireAdmin, ReturnsController.note);
router.post("/admin/:id/complete", requireAuth, requireAdmin, ReturnsController.complete);

// Customer / guest
router.post("/lookup", lookupLimiter, ReturnsController.lookup);
router.get("/order/:orderId", optionalAuth, ReturnsController.eligibility);
router.post("/order/:orderId", createLimiter, optionalAuth, photos, ReturnsController.create);
router.get("/:rma", optionalAuth, ReturnsController.get);// AFTER
router.patch("/:rma/tracking", optionalAuth, ReturnsController.addTracking);
router.patch("/:rma/payout", optionalAuth, ReturnsController.submitPayout);
router.patch("/:rma/cancel", optionalAuth, ReturnsController.cancel);

export default router;
