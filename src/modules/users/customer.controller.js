import { CustomerService } from "./customer.service.js";

export class CustomerController {
  static async list(req, res, next) {
    try {
      const { customers, total, pageNum, limitNum } = await CustomerService.list(req.query);
      res.json({
        success: true,
        data: customers,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      });
    } catch (e) { next(e); }
  }

  static async getOne(req, res, next) {
    try {
      const customer = await CustomerService.getById(req.params.id);
      res.json({ success: true, data: customer });
    } catch (e) { next(e); }
  }

  static async getOrders(req, res, next) {
    try {
      const orders = await CustomerService.getOrders(req.params.id);
      res.json({ success: true, data: orders });
    } catch (e) { next(e); }
  }

  static async upsertProfile(req, res, next) {
    try {
      await CustomerService.upsertProfile(req.params.id, req.body);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}
