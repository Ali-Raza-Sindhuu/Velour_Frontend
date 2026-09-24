import apiClient from "./apiClient";

export const fetchProductsRequest = async (params = {}) => {
  const response = await apiClient.get("/products", { params });
  return response.data;
};

export const fetchProductBySlugRequest = async (slug) => {
  const response = await apiClient.get(`/products/${slug}`);
  return response.data;
};