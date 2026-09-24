import { createSlice } from "@reduxjs/toolkit";
import { loginUser, signupUser } from "./authThunks";
import { updateProfile } from "../../api/user/userThunks";

// The shop's session. Admins sign in separately (/admin/login) with their
// own session, so an admin session left here from before the split is
// dropped: the shop never acts as an admin.
const readShopSession = () => {
  try {
    const token = localStorage.getItem("zeescents_token");
    const user = JSON.parse(localStorage.getItem("zeescents_user") || "null");
    if (user?.role?.toLowerCase() === "admin") {
      localStorage.removeItem("zeescents_token");
      localStorage.removeItem("zeescents_user");
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};
const { token: savedToken, user: savedUserObject } = readShopSession();
const savedUser = savedUserObject ? JSON.stringify(savedUserObject) : null;

const initialState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedToken || null,
  loading: false,
  error: null,
  isAuthenticated: !!savedToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("zeescents_token");
      localStorage.removeItem("zeescents_user");
    },
    completeGoogleLogin: (state, action) => {
      const { token, user } = action.payload;
      state.user = user;
      state.accessToken = token;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem("zeescents_token", token);
      localStorage.setItem("zeescents_user", JSON.stringify(user));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        // token is issued on signup too
        const { token, user } = action.payload;
        state.user = user;
        state.accessToken = token;
        state.isAuthenticated = true;
        localStorage.setItem("zeescents_token", token);
        localStorage.setItem("zeescents_user", JSON.stringify(user));
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        const { token, user } = action.payload;
        state.user = user;
        state.accessToken = token;
        state.isAuthenticated = true;
        localStorage.setItem("zeescents_token", token);
        localStorage.setItem("zeescents_user", JSON.stringify(user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        const updatedUser = action.payload?.user || action.payload;
        if (updatedUser) {
          state.user = { ...state.user, ...updatedUser };
          localStorage.setItem("zeescents_user", JSON.stringify(state.user));
        }
      });
  },
});

export default authSlice.reducer;
export const { logout, completeGoogleLogin } = authSlice.actions;
