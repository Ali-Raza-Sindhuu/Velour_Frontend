import { Router } from "express";
import { ReviewController } from "./review.controller.js";
import { requireAuth, requireAdmin, requireCustomer } from "../../middleware/auth.middleware.js";

const router = Router();

// Admin
router.get("/admin/all", requireAuth, requireAdmin, ReviewController.adminList);
router.patch("/:id/status", requireAuth, requireAdmin, ReviewController.updateStatus);
router.delete("/admin/:id", requireAuth, requireAdmin, ReviewController.remove);

// Public
router.get("/product/:productId", ReviewController.forProduct);

// Authenticated customer
router.post("/", requireAuth, requireCustomer, ReviewController.create);
router.delete("/:id", requireAuth, requireCustomer, ReviewController.remove);

export default router;
