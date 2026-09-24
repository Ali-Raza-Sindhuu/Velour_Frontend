import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "vera_cart_items";

const loadCartFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persist = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — ignore
  }
};

const initialState = {
  items: loadCartFromStorage(), // { id, name, price, image, size, qty }
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const existing = state.items.find(
        (i) => i.id === action.payload.id && i.size === action.payload.size
      );
      if (existing) {
        existing.qty += action.payload.qty ?? 1;
      } else {
        state.items.push({ qty: 1, ...action.payload });
      }
      persist(state.items);
    },
    removeItem: (state, action) => {
      const { id, size } = typeof action.payload === "string" ? { id: action.payload } : action.payload;
      state.items = state.items.filter((item) => item.id !== id || (size && item.size !== size));
      persist(state.items);
    },
    updateQty: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.qty = Math.max(1, action.payload.qty);
      persist(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      persist(state.items);
    },
  },
});

export const { addItem, removeItem, updateQty, clearCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.qty, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.qty * i.price, 0);

export default cartSlice.reducer;
