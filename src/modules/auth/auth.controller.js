import { AuthService } from "./auth.service.js";
import { CartService } from "../cart/cart.service.js";
import { config } from "../../config/env.js";

export class AuthController {
  static async requestSignupVerification(req, res, next) {
    try {
      const { email, password, first_name, last_name, firstName, lastName } = req.body;
      const result = await AuthService.requestSignupVerification({ email, password, first_name: first_name || firstName, last_name: last_name || lastName });
      return res.status(202).json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async verifySignupVerification(req, res, next) {
    try {
      const result = await AuthService.verifySignupVerification(req.body);
      const guestToken = String(req.get("X-Guest-Cart") || "").trim();
      if (guestToken) await CartService.mergeGuestCartIntoUserCart(guestToken, result.user.id);
      return res.status(201).json({ success: true, token: result.token, user: result.user });
    } catch (error) { next(error); }
  }

  static async signup(req, res, next) {
    try {
      const { email, password, first_name, last_name, firstName, lastName } = req.body;
      const fName = first_name || firstName;
      const lName = last_name || lastName;

      const result = await AuthService.signup({ email, password, first_name: fName, last_name: lName });
      
      // Merge guest cart if present
      const guestToken = String(req.get("X-Guest-Cart") || "").trim();
      if (guestToken) {
        await CartService.mergeGuestCartIntoUserCart(guestToken, result.user.id);
      }

      // Return exactly what old frontend expects
      return res.status(201).json({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      
      // Merge guest cart if present
      const guestToken = String(req.get("X-Guest-Cart") || "").trim();
      if (guestToken) {
        await CartService.mergeGuestCartIntoUserCart(guestToken, result.user.id);
      }

      return res.json({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin panel login: no guest cart to merge, and the token it returns
  // only works in the admin panel.
  static async adminLogin(req, res, next) {
    try {
      const result = await AuthService.adminLogin(req.body);
      return res.json({ success: true, token: result.token, user: result.user });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.user.id);
      return res.json({
        success: true,
        user
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const result = await AuthService.requestPasswordReset(req.body.email);
      return res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const result = await AuthService.resetPassword(req.body.token, req.body.password);
      return res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  static async googleStart(req, res, next) {
    try { return res.redirect(await AuthService.getGoogleAuthorizationUrl()); } catch (error) { next(error); }
  }

  static async googleCallback(req, res) {
    try {
      const code = await AuthService.completeGoogleAuthorization(req.query.code, req.query.state);
      return res.redirect(`${config.frontendUrl}/auth/google/callback?code=${encodeURIComponent(code)}`);
    } catch (error) {
      return res.redirect(`${config.frontendUrl}/auth/google/callback?error=${encodeURIComponent(error.message)}`);
    }
  }

  static async googleExchange(req, res, next) {
    try { return res.json({ success: true, ...(await AuthService.exchangeGoogleLoginCode(req.body.code)) }); } catch (error) { next(error); }
  }
}
