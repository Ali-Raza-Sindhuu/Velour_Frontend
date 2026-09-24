import { createSlice } from "@reduxjs/toolkit";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "./userThunks";

const initialState = {
  profile: null,
  profileLoading: false,
  profileError: null,

  savingProfile: false,
  saveProfileError: null,
  saveProfileSuccess: false,

  changingPassword: false,
  passwordError: null,
  passwordSuccess: false,

  addresses: [],
  addressesLoading: false,
  addressesError: null,
  savingAddress: false,
  addressActionError: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearProfileStatus: (state) => {
      state.saveProfileSuccess = false;
      state.saveProfileError = null;
    },
    clearPasswordStatus: (state) => {
      state.passwordSuccess = false;
      state.passwordError = null;
    },
    clearAddressError: (state) => {
      state.addressActionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Profile
      .addCase(fetchProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload?.user || action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload?.message;
      })

      .addCase(updateProfile.pending, (state) => {
        state.savingProfile = true;
        state.saveProfileError = null;
        state.saveProfileSuccess = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.savingProfile = false;
        state.saveProfileSuccess = true;
        state.profile = action.payload?.user || action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.savingProfile = false;
        state.saveProfileError = action.payload?.message;
      })

      // Password
      .addCase(changePassword.pending, (state) => {
        state.changingPassword = true;
        state.passwordError = null;
        state.passwordSuccess = false;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.changingPassword = false;
        state.passwordSuccess = true;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.changingPassword = false;
        state.passwordError = action.payload?.message;
      })

      // Addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.addressesLoading = true;
        state.addressesError = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.addressesLoading = false;
        state.addresses = action.payload?.addresses || action.payload || [];
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.addressesLoading = false;
        state.addressesError = action.payload?.message;
      })

      .addCase(addAddress.pending, (state) => {
        state.savingAddress = true;
        state.addressActionError = null;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.savingAddress = false;
        const newAddress = action.payload?.address || action.payload;
        if (newAddress) state.addresses.push(newAddress);
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.savingAddress = false;
        state.addressActionError = action.payload?.message;
      })

      .addCase(updateAddress.pending, (state) => {
        state.savingAddress = true;
        state.addressActionError = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.savingAddress = false;
        const updated = action.payload?.address || action.payload;
        if (updated?.id) {
          state.addresses = state.addresses.map((addr) =>
            addr.id === updated.id ? updated : addr
          );
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.savingAddress = false;
        state.addressActionError = action.payload?.message;
      })

      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.filter((addr) => addr.id !== action.payload);
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.addressActionError = action.payload?.message;
      })

      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === action.payload,
        }));
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.addressActionError = action.payload?.message;
      });
  },
});

export default userSlice.reducer;
export const { clearProfileStatus, clearPasswordStatus, clearAddressError } = userSlice.actions;