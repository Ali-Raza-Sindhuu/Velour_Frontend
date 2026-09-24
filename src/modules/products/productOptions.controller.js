import { ProductOptionsService } from "./productOptions.service.js";
import { sendSuccess } from "../../utils/response.js";

export class ProductOptionsController {
  static async getPublic(req, res, next) {
    try {
      return sendSuccess(res, await ProductOptionsService.getPublicOptions());
    } catch (error) {
      next(error);
    }
  }

  static async getAdmin(req, res, next) {
    try {
      return sendSuccess(res, await ProductOptionsService.getAdminOptions());
    } catch (error) {
      next(error);
    }
  }

  static async saveAdmin(req, res, next) {
    try {
      return sendSuccess(res, await ProductOptionsService.saveAdminOptions(req.body || {}));
    } catch (error) {
      next(error);
    }
  }
}
