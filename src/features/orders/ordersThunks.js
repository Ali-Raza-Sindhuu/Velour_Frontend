import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchOrdersRequest, checkoutRequest } from "../../api/ordersApi";
import { clearCart } from "../cart/cartSlice";

export const fetchOrders = createAsyncThunk("orders/fetch", async (_, thunkAPI) => {
  try {
    const response = await fetchOrdersRequest();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to fetch orders" });
  }
});

export const placeOrderThunk = createAsyncThunk("orders/checkout", async ({ idempotencyKey, ...checkoutData }, thunkAPI) => {
  try {
    const response = await checkoutRequest(checkoutData, { idempotencyKey });
    thunkAPI.dispatch(clearCart());
    thunkAPI.dispatch(fetchOrders());
    return response;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Checkout failed" });
  }
});
