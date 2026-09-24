import { Router } from "express";
import { PromotionController } from "./promotion.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, requireAdmin, PromotionController.create);
router.get("/", requireAuth, requireAdmin, PromotionController.list);
// Public — guest checkout needs to validate promo codes too, not just
// logged-in customers, since the store supports guest checkout end-to-end.
router.post("/validate", PromotionController.validate);
router.patch("/:id", requireAuth, requireAdmin, PromotionController.update);
router.delete("/:id", requireAuth, requireAdmin, PromotionController.remove);

export default router;