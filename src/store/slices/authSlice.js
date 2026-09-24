import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "vera_auth_user";

const loadUserFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storedUser = loadUserFromStorage();

const initialState = {
  user: storedUser, // { name, email }
  isAuthenticated: !!storedUser,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload; // { name, email }
      state.isAuthenticated = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { login, logout } = authSlice.actions;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export default authSlice.reducer;