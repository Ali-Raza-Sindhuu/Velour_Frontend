import axios from "axios";

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  let guestCartToken = localStorage.getItem("zeescents_guest_cart");
  if (!guestCartToken) {
    guestCartToken = crypto.randomUUID();
    localStorage.setItem("zeescents_guest_cart", guestCartToken);
  }
  config.headers["X-Guest-Cart"] = guestCartToken;
  const token = localStorage.getItem("zeescents_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
