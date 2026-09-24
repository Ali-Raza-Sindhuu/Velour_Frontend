import apiClient from "./apiClient";

export const getWishlistRequest = () => apiClient.get("/wishlist");
export const addToWishlistRequest = (productId) => apiClient.post("/wishlist", { product_id: productId });
export const removeFromWishlistRequest = (productId) => apiClient.delete(`/wishlist/${productId}`);
