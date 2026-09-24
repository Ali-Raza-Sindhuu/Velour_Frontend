import { Router } from "express";
import { OrderController } from "./order.controller.js";
import { optionalAuth, requireAuth, requireAdmin, requireCustomer } from "../../middleware/auth.middleware.js";

const router = Router();

// Public checkout (guest or logged-in)
router.post("/checkout", optionalAuth, OrderController.checkout);

// All routes below require login
router.use(requireAuth);

// Customer routes
router.get("/", requireCustomer, OrderController.list);
router.get("/:id", requireCustomer, OrderController.getOne);
router.patch("/:id/cancel", requireCustomer, OrderController.cancel);

// Admin routes
router.get("/admin/all", requireAdmin, OrderController.adminList);
router.get("/admin/:id/items", requireAdmin, OrderController.adminGetItems);
router.patch("/:id/status", requireAdmin, OrderController.updateStatus);

export default router;
