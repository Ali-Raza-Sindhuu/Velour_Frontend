import { ReviewService } from "./review.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class ReviewController {
  static async adminList(req, res, next) {
    try {
      const data = await ReviewService.adminList();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async updateStatus(req, res, next) {
    try {
      await ReviewService.updateStatus(req.params.id, req.body.status);
      return res.json({ success: true });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async forProduct(req, res, next) {
    try {
      const { reviews, summary } = await ReviewService.forProduct(req.params.productId);
      return res.json({ success: true, data: reviews, summary });
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const id = await ReviewService.create(req.user.id, req.body);
      return sendCreated(res, { insertId: id });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async remove(req, res, next) {
    try {
      await ReviewService.remove(req.params.id, req.user);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
}
