import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSearchOpen: false,
  isMobileMenuOpen: false,
  isCartOpen: false,
  activeAuthModal: null, // null | "login" | "signup" | "forgotPassword"
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSearch: (state) => {
      state.isSearchOpen = !state.isSearchOpen;
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    },
    openAuthModal: (state, action) => {
      state.activeAuthModal = action.payload;
    },
    closeAuthModal: (state) => {
      state.activeAuthModal = null;
    },
    closeAllOverlays: (state) => {
      state.isSearchOpen = false;
      state.isMobileMenuOpen = false;
      state.isCartOpen = false;
      state.activeAuthModal = null;
    },
  },
});

export const {
  toggleSearch,
  toggleMobileMenu,
  toggleCart,
  openAuthModal,
  closeAuthModal,
  closeAllOverlays,
} = uiSlice.actions;

export const selectActiveAuthModal = (state) => state.ui.activeAuthModal;

export default uiSlice.reducer;