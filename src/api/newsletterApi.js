import apiClient from "./apiClient";

export const subscribeNewsletterRequest = (email) =>
  apiClient.post("/newsletter/subscribe", { email }, { timeout: 15000 });
