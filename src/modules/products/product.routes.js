import { Router } from "express";
import { ProductController } from "./product.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { productMediaUpload } from "../../config/multer.js";
import { ProductOptionsController } from "./productOptions.controller.js";

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================
router.get("/", ProductController.getPublicProducts);
router.get("/size-guide", ProductOptionsController.getPublic);

// ========================================
// ADMIN ROUTES
// ========================================
router.get("/admin/all", requireAuth, requireAdmin, ProductController.getAllAdminProducts);
router.get("/admin/options", requireAuth, requireAdmin, ProductOptionsController.getAdmin);
router.put("/admin/options", requireAuth, requireAdmin, ProductOptionsController.saveAdmin);
// Multipart: `images` (up to 5 gallery images) + optional `video` (one reel).
router.post("/", requireAuth, requireAdmin, productMediaUpload, ProductController.create);
router.put("/:id", requireAuth, requireAdmin, productMediaUpload, ProductController.update);
router.delete("/:id", requireAuth, requireAdmin, ProductController.delete);

// ========================================
// DYNAMIC PUBLIC SLUG ROUTE (MUST BE LAST)
// ========================================
router.get("/:slug", ProductController.getProductBySlug);

export default router;
