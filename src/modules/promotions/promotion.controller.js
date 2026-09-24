import { PromotionService } from "./promotion.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";
import { NewsletterService } from "../newsletter/newsletter.service.js";
import { sendNewsletterEmail } from "../../utils/email.js";
import { config } from "../../config/env.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

const announcePromotion = async (promotion) => {
  const recipients = await NewsletterService.recipientEmails();
  const discount = promotion.discount_type === "percentage"
    ? `${promotion.discount_value}% off`
    : `PKR ${Number(promotion.discount_value).toLocaleString()} off`;
  const shopUrl = `${config.appUrl.replace(/\/$/, "")}/shops`;
  await sendNewsletterEmail(recipients, {
    subject: `A ZeeScents offer for you: ${promotion.code}`,
    html: `<h1>An exclusive offer is here</h1>
      <p>Use code <strong>${escapeHtml(promotion.code)}</strong> for ${escapeHtml(discount)}.</p>
      <p><a href="${shopUrl}">Shop ZeeScents</a></p>`,
  });
};

export class PromotionController {
  static async create(req, res, next) {
    try {
      const id = await PromotionService.create(req.body);
      // Promotions are sent only after the database record is successfully
      // created; delivery failures never undo the promotion itself.
      void announcePromotion({ ...req.body, id, code: String(req.body.code || "").toUpperCase() }).catch((error) =>
        console.error("Promotion newsletter error:", error.message)
      );
      return sendCreated(res, { insertId: id });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async list(req, res, next) {
    try {
      const data = await PromotionService.list();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async validate(req, res, next) {
    try {
      const result = await PromotionService.validate(req.body);
      return res.json({ success: true, ...result });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async update(req, res, next) {
    try {
      await PromotionService.update(req.params.id, req.body);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      await PromotionService.remove(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
}
