import { createAsyncThunk } from "@reduxjs/toolkit";
import { loginRequest, verifySignupVerification, forgotPasswordRequest, resetPasswordRequest } from "../../api/authApi";
import { mergeGuestWishlistThunk } from "../wishlist/wishlistThunks";

export const signupUser = createAsyncThunk(
  "auth/signup",
  async (verification, thunkAPI) => {
    try {
      const response = await verifySignupVerification(verification);

      // Fold any guest-wishlisted items into the new account before the
      // rest of the app treats this user as logged in. The merge calls a
      // protected endpoint, so the token has to be in localStorage first —
      // authSlice's extraReducer also persists it, but only after this
      // thunk resolves, which would be too late for apiClient to pick up.
      if (response?.token) localStorage.setItem("zeescents_token", response.token);
      await thunkAPI.dispatch(mergeGuestWishlistThunk());

      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || {
          message: "Something went wrong",
        },
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (userData, thunkAPI) => {
    try {
      const response = await loginRequest(userData);

      // Same merge on login — a returning guest may have wishlisted items
      // locally on this device before signing back in. See the note above
      // on why the token is stashed here rather than waiting for the slice.
      if (response?.token) localStorage.setItem("zeescents_token", response.token);
      await thunkAPI.dispatch(mergeGuestWishlistThunk());

      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || {
          message: "Something went wrong",
        }
      );
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, thunkAPI) => {
    try {
      const response = await forgotPasswordRequest(email);
      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || {
          message: "Something went wrong",
        }
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password }, thunkAPI) => {
    try {
      const response = await resetPasswordRequest(token, password);
      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || {
          message: "Something went wrong",
        }
      );
    }
  }
);
