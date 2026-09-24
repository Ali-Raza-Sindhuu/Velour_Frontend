import { Router } from "express";
import { FulfillmentService } from "./fulfillment.service.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";
import { receiptUpload } from "../../config/multer.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const handle = (work) => async (req, res, next) => {
  try {
    return sendSuccess(res, await work(req));
  } catch (err) {
    next(err);
  }
};

router.get("/:orderId", handle((req) => FulfillmentService.detail(Number(req.params.orderId))));
// multipart/form-data: text fields + optional "receipt" file
router.post("/:orderId/fulfill", receiptUpload, handle((req) => FulfillmentService.fulfill(Number(req.params.orderId), req.body, req.file)));
router.patch("/:orderId/tracking", receiptUpload, handle((req) => FulfillmentService.updateTracking(Number(req.params.orderId), req.body, req.file)));
router.patch("/:orderId/delivered", handle((req) => FulfillmentService.markDelivered(Number(req.params.orderId))));
router.patch("/:orderId/returned-to-sender", handle((req) => FulfillmentService.markReturnedToSender(Number(req.params.orderId), req.body)));

export default router;