import { ContactService } from "./contact.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class ContactController {
  static async submit(req, res, next) {
    try {
      const result = await ContactService.submit(req.body);
      return sendCreated(res, result, "Thanks for reaching out — we'll be in touch shortly.");
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  static async adminList(req, res, next) {
    try {
      const data = await ContactService.adminList();
      return sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  static async updateStatus(req, res, next) {
    try {
      await ContactService.updateStatus(req.params.id, req.body.status);
      return res.json({ success: true });
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }
}