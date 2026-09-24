import { createSlice } from "@reduxjs/toolkit";
import { fetchOrders, placeOrderThunk } from "./ordersThunks";

const initialState = {
  orders: [],
  lastOrder: null,
  loading: false,
  error: null
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload || [];
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
      })
      .addCase(placeOrderThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(placeOrderThunk.fulfilled, (state, action) => {
        state.loading = false;
        const clientOrder = action.meta.arg.clientOrder;
        state.lastOrder = clientOrder
          ? { ...clientOrder, id: action.payload.orderId || clientOrder.id }
          : null;
      })
      .addCase(placeOrderThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
      });
  }
});

export default ordersSlice.reducer;
