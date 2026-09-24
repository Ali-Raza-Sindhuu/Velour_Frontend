import apiClient from "./apiClient";

// idempotencyKey: one per checkout attempt, reused on retries, so the same
// order can never be placed twice (see backend OrderService.checkout).
export const checkoutRequest = async (checkoutData, { idempotencyKey } = {}) => {
  const response = await apiClient.post("/orders/checkout", checkoutData, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
  return response.data;
};

export const fetchOrdersRequest = async () => {
  const response = await apiClient.get("/orders");
  return response.data;
};

export const getPaymentAccountsRequest = async () => {
  const response = await apiClient.get("/payments/accounts");
  return response.data.data;
};

// Waits while the customer approves the charge with their MPIN (up to ~100s).
export const payWithJazzCashRequest = async (orderId, { paymentToken, mobile, cnic }) => {
  const response = await apiClient.post(`/payments/${orderId}/jazzcash/pay`, {
    payment_token: paymentToken,
    mobile,
    cnic,
  });
  return response.data.data;
};

// DEMO ONLY (JAZZCASH_ENV=demo). Stands in for the customer entering their
// MPIN on their phone; 404s when the real gateway is configured.
export const approveJazzCashDemoRequest = async (orderId, { paymentToken, mpin, decline = false }) => {
  const response = await apiClient.post(`/payments/${orderId}/jazzcash/demo-approve`, {
    payment_token: paymentToken,
    mpin,
    decline,
  });
  return response.data.data;
};

export const jazzCashStatusRequest = async (orderId, paymentToken) => {
  const response = await apiClient.get(`/payments/${orderId}/jazzcash/status`, {
    params: { token: paymentToken },
  });
  return response.data.data;
};
