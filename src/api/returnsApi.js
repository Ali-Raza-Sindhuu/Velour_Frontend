import apiClient from "./apiClient";

const data = async (request) => (await request).data?.data;
const lookupHeaders = (lookup) => (lookup ? { "X-Return-Lookup": lookup } : undefined);

export const lookupOrderForReturn = (orderId, email) =>
  data(apiClient.post("/returns/lookup", { order_id: orderId, email }));

export const getReturnEligibility = (orderId, lookup) =>
  data(apiClient.get(`/returns/order/${orderId}`, { headers: lookupHeaders(lookup) }));

export const createReturn = (orderId, lookup, { items, refundMethod, payoutDetails, note, photos }) => {
  const payload = new FormData();
  payload.append("items", JSON.stringify(items));
  payload.append("refund_method", refundMethod);
  if (payoutDetails) payload.append("payout_details", JSON.stringify(payoutDetails));
  if (note) payload.append("note", note);
  for (const photo of photos || []) payload.append("photos", photo);
  return data(apiClient.post(`/returns/order/${orderId}`, payload, { headers: lookupHeaders(lookup) }));
};

export const getReturnStatus = (rma, token) => data(apiClient.get(`/returns/${rma}`, { params: token ? { token } : undefined }));

export const addReturnTracking = (rma, token, body) =>
  data(apiClient.patch(`/returns/${rma}/tracking`, body, { params: token ? { token } : undefined }));

export const cancelReturn = (rma, token) => data(apiClient.patch(`/returns/${rma}/cancel`, {}, { params: token ? { token } : undefined }));
