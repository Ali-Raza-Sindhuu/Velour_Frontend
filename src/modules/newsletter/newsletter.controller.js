import { NewsletterService } from "./newsletter.service.js";
import { sendSuccess } from "../../utils/response.js";
import { sendNewsletterWelcomeEmail } from "../../utils/email.js";

export class NewsletterController {
  static async subscribe(req, res, next) {
    try {
      const result = await NewsletterService.subscribe(req.body.email);
      if (!result.alreadySubscribed) {
        // Email delivery must not undo a successfully saved subscription.
        void sendNewsletterWelcomeEmail(String(req.body.email).trim().toLowerCase());
      }
      const message = result.alreadySubscribed
        ? "You're already subscribed."
        : "You're subscribed! Check your inbox for a welcome email and upcoming promotions.";
      return res.status(201).json({ success: true, message });
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  static async adminList(req, res, next) {
    try {
      const data = await NewsletterService.adminList();
      return sendSuccess(res, data);
    } catch (error) { next(error); }
  }
}
