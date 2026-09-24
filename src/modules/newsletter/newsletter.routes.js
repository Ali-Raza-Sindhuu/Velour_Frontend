import { Router } from "express";
import { NewsletterController } from "./newsletter.controller.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// Public — the footer subscribe form
router.post("/subscribe", NewsletterController.subscribe);

// Admin — view subscriber list
router.get("/admin/all", requireAuth, requireAdmin, NewsletterController.adminList);

export default router;