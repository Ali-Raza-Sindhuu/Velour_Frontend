import axios from "axios";
import { apiBaseUrl } from "../../../api/apiClient";
import { clearAdminSession, getAdminToken } from "../auth/adminSession";

// Every admin panel request goes through here: it carries the admin token
// only (never the shop's token or guest cart), and an expired or revoked
// admin session sends the admin back to the admin sign-in page.
const adminApiClient = axios.create({ baseURL: apiBaseUrl });

adminApiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || (status === 403 && !getAdminToken())) {
      clearAdminSession();
      if (!window.location.pathname.startsWith("/admin/login")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/admin/login?next=${next}&expired=1`);
      }
    }
    return Promise.reject(error);
  }
);

export default adminApiClient;
