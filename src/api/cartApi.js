import apiClient from "./apiClient";

export const fetchCartRequest = async () => {
  const response = await apiClient.get("/cart");
  return response.data;
};

export const addToCartRequest = async (productId, quantity, size = "", color = "") => {
  const response = await apiClient.post("/cart/items", { product_id: productId, quantity, selected_size: size, selected_color: color });
  return response.data;
};

export const updateCartItemRequest = async (itemId, quantity) => {
  const response = await apiClient.patch(`/cart/items/${itemId}`, { quantity });
  return response.data;
};

export const removeFromCartRequest = async (itemId) => {
  const response = await apiClient.delete(`/cart/items/${itemId}`);
  return response.data;
};
