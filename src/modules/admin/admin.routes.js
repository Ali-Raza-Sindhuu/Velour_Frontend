import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// Public — safe subset of store settings for the storefront (e.g. Contact page)
router.get("/settings/public", AdminController.getPublicStoreInfo);

router.use(requireAuth, requireAdmin);

router.get("/overview", AdminController.overview);
router.get("/sales-trend", AdminController.salesTrend);
router.get("/top-products", AdminController.topProducts);
router.get("/settings", AdminController.getSettings);
router.put("/settings/:section", AdminController.updateSettings);

export default router;
