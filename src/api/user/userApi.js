import apiClient from "../apiClient";

// Profile
export const getProfileRequest = async () => {
  const response = await apiClient.get("/users/me");
  return response.data;
};

export const updateProfileRequest = async (profileData) => {
  const response = await apiClient.put("/users/me", profileData);
  return response.data;
};

export const changePasswordRequest = async (passwordData) => {
  const response = await apiClient.put("/users/me/password", passwordData);
  return response.data;
};

// Addresses
export const getAddressesRequest = async () => {
  const response = await apiClient.get("/users/me/addresses");
  return response.data;
};

export const addAddressRequest = async (addressData) => {
  const response = await apiClient.post("/users/me/addresses", addressData);
  return response.data;
};

export const updateAddressRequest = async (addressId, addressData) => {
  const response = await apiClient.put(`/users/me/addresses/${addressId}`, addressData);
  return response.data;
};

export const deleteAddressRequest = async (addressId) => {
  const response = await apiClient.delete(`/users/me/addresses/${addressId}`);
  return response.data;
};

export const setDefaultAddressRequest = async (addressId) => {
  const response = await apiClient.patch(`/users/me/addresses/${addressId}/default`);
  return response.data;
};