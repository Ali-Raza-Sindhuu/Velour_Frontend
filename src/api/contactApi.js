import apiClient from "./apiClient";

export const submitContactRequest = async (form) => {
  const response = await apiClient.post("/contact", form);
  return response.data;
};
