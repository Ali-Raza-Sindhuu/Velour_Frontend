import { Router } from "express";
import { CartController } from "./cart.controller.js";
import { optionalAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, CartController.getCart);
router.post("/items", optionalAuth, CartController.addItem);
router.patch("/items/:id", optionalAuth, CartController.updateItem);
router.delete("/items/:id", optionalAuth, CartController.removeItem);

export default router;
