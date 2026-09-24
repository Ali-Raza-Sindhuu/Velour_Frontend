import { PaymentService } from "./payment.service.js";
import { sendSuccess } from "../../utils/response.js";

export class PaymentController {
  static async getAccounts(req, res, next) {
    try {
      const data = PaymentService.getAccounts();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  static async payJazzCash(req, res) {
    try {
      const result = await PaymentService.payWithJazzCash(req.params.orderId, req.body.payment_token, {
        mobile: req.body.mobile,
        cnic: req.body.cnic,
      });
      return sendSuccess(res, result);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Payment could not be started" });
    }
  }

  static async jazzCashStatus(req, res) {
    try {
      const result = await PaymentService.jazzCashStatus(req.params.orderId, req.query.token);
      return sendSuccess(res, result);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Could not check payment status" });
    }
  }

  static async demoApproveMpin(req, res) {
    try {
      const result = await PaymentService.demoApproveMpin(req.params.orderId, req.body.payment_token, {
        mpin: req.body.mpin,
        decline: Boolean(req.body.decline),
      });
      return sendSuccess(res, result);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Could not approve payment" });
    }
  }

  static async adminVerify(req, res, next) {
    try {
      const result = await PaymentService.adminVerify(req.params.id, !!req.body.approve, req.user?.id);
      return sendSuccess(res, result);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async adminList(req, res, next) {
    try {
      const data = await PaymentService.adminList();
      return sendSuccess(res, data);
    } catch (err) { next(err); }
  }
}
