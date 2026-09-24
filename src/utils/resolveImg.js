// src/utils/resolveImg.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const resolveImg = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return `${API_BASE_URL}${url}`;
  return url;
};