import { createSlice } from "@reduxjs/toolkit";
import { fetchCart, addToCartThunk, updateQuantityThunk, removeFromCartThunk } from "./cartThunks";

const initialState = {
  items: [],
  loading: false,
  error: null
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearCart: (state) => {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    const setLoading = (state) => { state.loading = true; state.error = null; };
    const setItems = (state, action) => { state.loading = false; state.items = action.payload || []; };
    const setError = (state, action) => { state.loading = false; state.error = action.payload?.message; };

    builder
      .addCase(fetchCart.pending, setLoading)
      .addCase(fetchCart.fulfilled, setItems)
      .addCase(fetchCart.rejected, setError)
      .addCase(addToCartThunk.pending, setLoading)
      .addCase(addToCartThunk.fulfilled, setItems)
      .addCase(addToCartThunk.rejected, setError)
      .addCase(updateQuantityThunk.pending, setLoading)
      .addCase(updateQuantityThunk.fulfilled, setItems)
      .addCase(updateQuantityThunk.rejected, setError)
      .addCase(removeFromCartThunk.pending, setLoading)
      .addCase(removeFromCartThunk.fulfilled, setItems)
      .addCase(removeFromCartThunk.rejected, setError);
  }
});

export const { clearCart } = cartSlice.actions;
export default cartSlice.reducer;
