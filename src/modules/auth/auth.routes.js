import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "./auth.controller.js";
import { requireAuth, requireSignedIn } from "../../middleware/auth.middleware.js";

const router = Router();
const signupVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification emails requested. Please try again in 15 minutes." },
});

router.post("/signup", AuthController.signup);
router.post("/signup/request-verification", signupVerificationLimiter, AuthController.requestSignupVerification);
router.post("/signup/verify", AuthController.verifySignupVerification);
// Admin sign-in attempts are few; slow down password guessing.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

router.post("/login", AuthController.login);
router.post("/admin/login", adminLoginLimiter, AuthController.adminLogin);
router.get("/me", requireAuth, requireSignedIn, AuthController.getMe);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.get("/google", AuthController.googleStart);
router.get("/google/callback", AuthController.googleCallback);
router.post("/google/exchange", AuthController.googleExchange);

export default router;
