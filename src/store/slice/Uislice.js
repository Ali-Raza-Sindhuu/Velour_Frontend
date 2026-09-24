import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  authModal: null,
  LoginPreFill : "",
  isCartOpen: false,
  isSearchOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openLogin: (state) => {
      state.authModal = "login";
    },
    openSignUp: (state) => {
      state.authModal = "signUp";
    },
    openForgotPassword: (state) => {
      state.authModal = "forgotPassword";
    },
    closeAuth: (state) => {
      state.authModal = null;
    },
    openCart: (state) => {
      state.isCartOpen = true;
    },
    closeCart: (state) => {
      state.isCartOpen = false;
    },
    openSearch: (state) => {
      state.isSearchOpen = true;
    },
    closeSearch: (state) => {
      state.isSearchOpen = false;
    },
    setLoginPreFill : (state, action) => {
      state.LoginPreFill = action.payload;
    },
    clearLoginPreFill : (state) => {
      state.LoginPreFill = ""
    }
  },
});

export const {
  openLogin,
  openSignUp,
  openForgotPassword,
  closeAuth,
  openCart,
  closeCart,
  openSearch,
  closeSearch,
  setLoginPreFill,
  clearLoginPreFill
} = uiSlice.actions;

export default uiSlice.reducer;
