import { CartService } from "./cart.service.js";
import { sendSuccess } from "../../utils/response.js";

const getGuestToken = (req) => String(req.get("X-Guest-Cart") || "").trim();

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    const error = new Error(`${field} must be a positive whole number`);
    error.status = 400;
    throw error;
  }
  return number;
}

export class CartController {
  static async getCart(req, res, next) {
    try {
      const cartId = await CartService.getCartId(getGuestToken(req), req.user?.id);
      const items = await CartService.getCartItems(cartId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req, res, next) {
    try {
      const productId = positiveInteger(req.body.product_id, "product_id");
      const quantity = positiveInteger(req.body.quantity ?? 1, "quantity");
      const selectedSize = String(req.body.selected_size || "").trim();
      const selectedColor = String(req.body.selected_color || "").trim();
      if (selectedSize.length > 60 || selectedColor.length > 80) {
        throw Object.assign(new Error("The selected size or color is too long"), { status: 400 });
      }
      
      const cartId = await CartService.getCartId(getGuestToken(req), req.user?.id);
      await CartService.addItem(cartId, productId, quantity, selectedSize, selectedColor);
      
      const items = await CartService.getCartItems(cartId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req, res, next) {
    try {
      const quantity = Number(req.body.quantity);
      if (!Number.isInteger(quantity)) {
        const error = new Error("quantity must be a whole number");
        error.status = 400;
        throw error;
      }
      
      const cartId = await CartService.getCartId(getGuestToken(req), req.user?.id);
      await CartService.updateItem(cartId, req.params.id, quantity);
      
      const items = await CartService.getCartItems(cartId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req, res, next) {
    try {
      const cartId = await CartService.getCartId(getGuestToken(req), req.user?.id);
      await CartService.removeItem(cartId, req.params.id);
      
      const items = await CartService.getCartItems(cartId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }
}
