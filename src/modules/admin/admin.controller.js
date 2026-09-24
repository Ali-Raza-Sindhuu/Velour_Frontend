import { AdminService } from "./admin.service.js";
import { sendSuccess } from "../../utils/response.js";

export class AdminController {
  static async getPublicStoreInfo(req, res, next) {
    try {
      const data = await AdminService.getPublicStoreInfo();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async overview(req, res, next) {
    try {
      const data = await AdminService.overview();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async getSettings(req, res, next) {
    try {
      const data = await AdminService.getSettings();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async updateSettings(req, res, next) {
    try {
      const data = await AdminService.updateSettings(req.params.section, req.body);
      return sendSuccess(res, data);
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async salesTrend(req, res, next) {
    try {
      const data = await AdminService.salesTrend(Number(req.query.days) || 30);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async topProducts(req, res, next) {
    try {
      const data = await AdminService.topProducts(Number(req.query.limit) || 5);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }
}
