import { useEffect, useRef, useState } from "react";
import { jazzCashStatusRequest, payWithJazzCashRequest } from "../../api/ordersApi";

const POLL_MS = 5000;
const POLL_LIMIT_MS = 6 * 60 * 1000;
const pollingExpired = (startedAt) => Date.now() - startedAt > POLL_LIMIT_MS;

// phase: idle → approving (waiting on the customer's MPIN) → confirming
// (polling JazzCash) → onPaid(), or back to idle with an error.
export default function useJazzCashPayment({ onPaid }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const pollTimer = useRef(null);
  // The charge in flight, so an answer arriving from outside the poll loop
  // (the demo handset approving) can be settled against it.
  const active = useRef(null);

  useEffect(() => () => clearTimeout(pollTimer.current), []);

  const fail = (message) => {
    setPhase("idle");
    setError(message || "The payment didn't go through. Please try again.");
  };

  const handleResult = (result, order, startedAt) => {
    if (result.status === "paid") {
      onPaid(order);
      return;
    }
    if (result.status !== "processing") {
      fail(result.message);
      return;
    }
    if (pollingExpired(startedAt)) {
      fail("We couldn't confirm your payment yet. If money left your wallet, don't pay again — contact us with your order number.");
      return;
    }
    setPhase("confirming");
    pollTimer.current = setTimeout(async () => {
      try {
        handleResult(await jazzCashStatusRequest(order.orderId, order.paymentToken), order, startedAt);
      } catch {
        handleResult({ status: "processing" }, order, startedAt);
      }
    }, POLL_MS);
  };

  // Settle a result that reached us outside the poll loop, and drop the
  // pending poll so the two can't both act on the same charge.
  const resolve = (result) => {
    if (!active.current) return;
    clearTimeout(pollTimer.current);
    handleResult(result, active.current.order, active.current.startedAt);
  };

  const charge = async (order, { mobile, cnic }) => {
    setError("");
    setPhase("approving");
    const startedAt = Date.now();
    active.current = { order, startedAt };
    try {
      handleResult(await payWithJazzCashRequest(order.orderId, { paymentToken: order.paymentToken, mobile, cnic }), order, startedAt);
    } catch (err) {
      // Connection dropped while waiting — the charge may still complete.
      if (!err.response) handleResult({ status: "processing" }, order, startedAt);
      else fail(err.response.data?.message);
    }
  };

  return { phase, error, busy: phase !== "idle", charge, resolve, fail };
}
