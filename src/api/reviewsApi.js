import apiClient from "./apiClient";

export const fetchProductReviewsRequest = async (productId) => {
  const response = await apiClient.get(`/reviews/product/${productId}`);
  return response.data; // { success, data: reviews[], summary: { avg_rating, total_reviews } }
};

export const submitReviewRequest = async ({ product_id, rating, comment }) => {
  const response = await apiClient.post("/reviews", { product_id, rating, comment });
  return response.data;
};