import { Router } from "express";
import { CustomerController } from "./customer.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", CustomerController.list);
router.get("/:id", CustomerController.getOne);
router.get("/:id/orders", CustomerController.getOrders);
router.patch("/:id/profile", CustomerController.upsertProfile);

export default router;
