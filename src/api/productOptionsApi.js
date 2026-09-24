import apiClient from "./apiClient";

export const fetchProductSizeGuideRequest = async () => {
  const response = await apiClient.get("/products/size-guide");
  return response.data?.data?.sizeGuide || [];
};
