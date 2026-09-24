import { Router } from "express";
import { ContactController } from "./contact.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// Public — the storefront Contact page
router.post("/", ContactController.submit);

// Admin — review submitted messages
router.get("/admin/all", requireAuth, requireAdmin, ContactController.adminList);
router.patch("/:id/status", requireAuth, requireAdmin, ContactController.updateStatus);

export default router;