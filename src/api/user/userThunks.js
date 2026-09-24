import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getProfileRequest,
  updateProfileRequest,
  changePasswordRequest,
  getAddressesRequest,
  addAddressRequest,
  updateAddressRequest,
  deleteAddressRequest,
  setDefaultAddressRequest,
} from "./userApi";

const fail = (error, message) =>
  error.response?.data || { message: error.message || message };

export const fetchProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, thunkAPI) => {
    try {
      return await getProfileRequest();
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to load profile"));
    }
  }
);

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (profileData, thunkAPI) => {
    try {
      return await updateProfileRequest(profileData);
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to update profile"));
    }
  }
);

export const changePassword = createAsyncThunk(
  "user/changePassword",
  async (passwordData, thunkAPI) => {
    try {
      return await changePasswordRequest(passwordData);
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to change password"));
    }
  }
);

export const fetchAddresses = createAsyncThunk(
  "user/fetchAddresses",
  async (_, thunkAPI) => {
    try {
      return await getAddressesRequest();
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to load addresses"));
    }
  }
);

export const addAddress = createAsyncThunk(
  "user/addAddress",
  async (addressData, thunkAPI) => {
    try {
      return await addAddressRequest(addressData);
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to add address"));
    }
  }
);

export const updateAddress = createAsyncThunk(
  "user/updateAddress",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateAddressRequest(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to update address"));
    }
  }
);

export const deleteAddress = createAsyncThunk(
  "user/deleteAddress",
  async (id, thunkAPI) => {
    try {
      await deleteAddressRequest(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to delete address"));
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  "user/setDefaultAddress",
  async (id, thunkAPI) => {
    try {
      await setDefaultAddressRequest(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(fail(error, "Failed to set default address"));
    }
  }
);
