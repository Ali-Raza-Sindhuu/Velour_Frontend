import { Router } from "express";
import { CmsController } from "./cms.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { upload } from "../../config/multer.js";

const router = Router();

// Public — used by the live storefront and the admin editor
router.get("/pages", CmsController.getPages);

// Admin only
router.put("/pages/:pageId/reorder", requireAuth, requireAdmin, CmsController.reorderSections);
router.put("/sections/:pageId/:sectionId", requireAuth, requireAdmin, CmsController.updateSection);
router.post("/upload", requireAuth, requireAdmin, upload.single("image"), CmsController.uploadImage);

export default router;
