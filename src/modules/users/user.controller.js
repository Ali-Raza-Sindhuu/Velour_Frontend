import { UserService } from "./user.service.js";

export class UserController {
  static async getMe(req, res, next) {
    try {
      const user = await UserService.getProfile(req.user.id);
      res.json({ success: true, user });
    } catch (e) { next(e); }
  }

  static async updateMe(req, res, next) {
    try {
      const user = await UserService.updateProfile(req.user.id, req.body);
      res.json({ success: true, user });
    } catch (e) { next(e); }
  }

  static async changePassword(req, res, next) {
    try {
      await UserService.changePassword(req.user.id, req.body);
      res.json({ success: true, message: "Password updated" });
    } catch (e) { next(e); }
  }

  static async getAddresses(req, res, next) {
    try {
      const addresses = await UserService.getAddresses(req.user.id);
      res.json({ success: true, addresses });
    } catch (e) { next(e); }
  }

  static async addAddress(req, res, next) {
    try {
      const address = await UserService.addAddress(req.user.id, req.body);
      res.status(201).json({ success: true, address });
    } catch (e) { next(e); }
  }

  static async updateAddress(req, res, next) {
    try {
      const address = await UserService.updateAddress(req.user.id, req.params.id, req.body);
      res.json({ success: true, address });
    } catch (e) { next(e); }
  }

  static async deleteAddress(req, res, next) {
    try {
      await UserService.deleteAddress(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  static async setDefaultAddress(req, res, next) {
    try {
      await UserService.setDefaultAddress(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}
