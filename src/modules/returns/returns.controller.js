import { ReturnsService } from "./returns.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

const customerAccess = (req) => ({
  user: req.user,
  lookupToken: req.get("X-Return-Lookup") || req.query.lookup || req.body?.lookup,
  token: req.query.token || req.get("X-Return-Token") || req.body?.token,
});

const handle = (work, respond = sendSuccess) => async (req, res, next) => {
  try {
    return respond(res, await work(req));
  } catch (err) {
    next(err);
  }
};

export const ReturnsController = {
  lookup: handle((req) => ReturnsService.lookup({ orderId: req.body.order_id, email: req.body.email })),
  eligibility: handle((req) => ReturnsService.eligibility(Number(req.params.orderId), customerAccess(req))),
  create: handle((req) => ReturnsService.create(Number(req.params.orderId), customerAccess(req), req.body, req.files || []), sendCreated),
  get: handle((req) => ReturnsService.getForCustomer(req.params.rma, customerAccess(req))),// AFTER
  addTracking: handle((req) => ReturnsService.addTracking(req.params.rma, customerAccess(req), req.body)),
  submitPayout: handle((req) => ReturnsService.submitPayout(req.params.rma, customerAccess(req), req.body)),
  cancel: handle((req) => ReturnsService.cancelByCustomer(req.params.rma, customerAccess(req))),

  adminList: handle(() => ReturnsService.adminList()),
  adminForOrder: handle((req) => ReturnsService.adminListForOrder(Number(req.params.orderId))),
  adminGet: handle((req) => ReturnsService.adminGet(Number(req.params.id))),
  approve: handle((req) => ReturnsService.approve(Number(req.params.id), req.body)),
  reject: handle((req) => ReturnsService.reject(Number(req.params.id), req.body)),// AFTER
  markReceived: handle((req) => ReturnsService.markReceived(Number(req.params.id))),
  requestPayout: handle((req) => ReturnsService.requestPayout(Number(req.params.id), req.body)),
  inspect: handle((req) => ReturnsService.inspect(Number(req.params.id), req.body)),
  message: handle((req) => ReturnsService.message(Number(req.params.id), req.body)),
  note: handle((req) => ReturnsService.saveNote(Number(req.params.id), req.body)),
  complete: handle((req) =>
    ReturnsService.complete(Number(req.params.id), req.user?.id, {
      refundAmount: req.body.refund_amount,
      method: req.body.method,
      reference: req.body.reference,
      account: req.body.account,
      message: req.body.message,
    })
  ),
};
