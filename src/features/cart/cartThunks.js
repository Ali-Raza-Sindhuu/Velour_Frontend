import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchCartRequest, addToCartRequest, updateCartItemRequest, removeFromCartRequest } from "../../api/cartApi";

export const fetchCart = createAsyncThunk("cart/fetch", async (_, thunkAPI) => {
  try {
    const response = await fetchCartRequest();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to fetch cart" });
  }
});

export const addToCartThunk = createAsyncThunk("cart/add", async ({ productId, quantity = 1, size = "", color = "" }, thunkAPI) => {
  try {
    const response = await addToCartRequest(productId, quantity, size, color);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to add to cart" });
  }
});

export const updateQuantityThunk = createAsyncThunk("cart/updateQuantity", async ({ itemId, quantity }, thunkAPI) => {
  try {
    const response = await updateCartItemRequest(itemId, quantity);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to update quantity" });
  }
});

export const removeFromCartThunk = createAsyncThunk("cart/remove", async (itemId, thunkAPI) => {
  try {
    const response = await removeFromCartRequest(itemId);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to remove from cart" });
  }
});
