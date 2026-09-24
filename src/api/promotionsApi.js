import apiClient from "./apiClient";

export const validatePromoRequest = async (code, orderTotal) => {
  const response = await apiClient.post("/promotions/validate", {
    code,
    order_total: orderTotal,
  });
  return response.data;
};