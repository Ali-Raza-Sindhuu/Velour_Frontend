import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchProductsRequest, fetchProductBySlugRequest } from "../../api/productsApi";

export const fetchProducts = createAsyncThunk("products/fetchAll", async (_, thunkAPI) => {
  try {
    // The API defaults to 20 per page; the storefront filters client-side, so
    // ask for the full catalogue (the API caps this at 100).
    const response = await fetchProductsRequest({ limit: 100 });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to fetch products" });
  }
});

export const fetchProductBySlug = createAsyncThunk("products/fetchBySlug", async (slug, thunkAPI) => {
  try {
    const response = await fetchProductBySlugRequest(slug);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to fetch product" });
  }
});
