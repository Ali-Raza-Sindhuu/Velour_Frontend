import { Router } from "express";
import { FinanceService } from "./finance.service.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const handle = (work) => async (req, res, next) => {
  try {
    return sendSuccess(res, await work(req));
  } catch (err) {
    next(err);
  }
};

router.get("/summary", handle((req) => FinanceService.summary(req.query)));
router.get("/ledger", handle((req) => FinanceService.ledger(req.query)));
router.get("/cod/unsettled", handle(() => FinanceService.unsettledCod()));
router.get("/cod/remittances", handle(() => FinanceService.remittances()));
router.post("/cod/remittances", handle((req) => FinanceService.recordRemittance(req.body, req.user?.id)));
router.get("/refunds/due", handle(() => FinanceService.refundsDue()));
router.post("/refunds/:id/complete", handle((req) => FinanceService.completeRefund(Number(req.params.id), req.body, req.user?.id)));
router.get("/orders/:orderId", handle((req) => FinanceService.orderMoney(Number(req.params.orderId))));

export default router;
