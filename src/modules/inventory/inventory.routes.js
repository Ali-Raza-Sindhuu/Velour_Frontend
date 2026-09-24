import { Router } from "express";
import { InventoryService } from "./inventory.service.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const handle = (work) => async (req, res, next) => {
  try {
    return sendSuccess(res, await work(req));
  } catch (err) {
    next(err);
  }
};

router.get("/stock", handle(() => InventoryService.stockList()));
router.get("/reconcile", handle(() => InventoryService.reconcile()));
router.get("/products/:id/movements", handle((req) => InventoryService.movements(Number(req.params.id), req.query)));
router.post("/products/:id/adjust", handle((req) => InventoryService.adjust(Number(req.params.id), req.body, req.user?.id)));
router.patch("/products/:id/cost", handle((req) => InventoryService.setCost(Number(req.params.id), req.body, req.user?.id)));
router.get("/purchases", handle(() => InventoryService.purchases()));
router.post("/purchases", handle((req) => InventoryService.createPurchase(req.body, req.user?.id)));
router.patch("/purchases/:id/pay", handle((req) => InventoryService.payPurchase(Number(req.params.id), req.body, req.user?.id)));

export default router;
