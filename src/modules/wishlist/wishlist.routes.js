import { Router } from "express";
import { WishlistController } from "./wishlist.controller.js";
import { requireAuth, requireCustomer } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(requireAuth, requireCustomer);

router.get("/", WishlistController.list);
router.post("/", WishlistController.add);
router.delete("/:productId", WishlistController.remove);

export default router;
