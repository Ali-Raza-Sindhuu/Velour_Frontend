import { WishlistService } from "./wishlist.service.js";
import { sendSuccess } from "../../utils/response.js";

export class WishlistController {
  static async list(req, res, next) {
    try {
      const data = await WishlistService.list(req.user.id);
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async add(req, res, next) {
    try {
      await WishlistService.add(req.user.id, req.body.product_id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      await WishlistService.remove(req.user.id, req.params.productId);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
}
