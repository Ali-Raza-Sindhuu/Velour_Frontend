import { Router } from "express";
import { CategoryController } from "./category.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// Public: List all categories
router.get("/", CategoryController.getAll);

// Admin: Create category
router.post("/", requireAuth, requireAdmin, CategoryController.create);

// Admin: Update category
router.put("/:id", requireAuth, requireAdmin, CategoryController.update);

// Admin: Delete category
router.delete("/:id", requireAuth, requireAdmin, CategoryController.delete);

export default router;
