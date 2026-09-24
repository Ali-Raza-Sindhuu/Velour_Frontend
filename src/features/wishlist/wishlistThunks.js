import { createAsyncThunk } from "@reduxjs/toolkit";
import { getWishlistRequest, addToWishlistRequest, removeFromWishlistRequest } from "../../api/wishlistApi";
import { fetchProductBySlugRequest } from "../../api/productsApi";

// Pulls the server-side wishlist (only meaningful once logged in — the
// backend route requires auth) and hydrates local state with it.
export const fetchWishlist = createAsyncThunk("wishlist/fetch", async (_, thunkAPI) => {
  try {
    const response = await getWishlistRequest();
    return response.data.data; // array of full product rows
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to fetch wishlist" });
  }
});

// Adds or removes based on current state, and persists it server-side for
// logged-in users. Guests fall back to the existing local-only toggle
// (see wishlistSlice's plain `toggleWishlist` reducer) since the backend
// has no concept of a guest wishlist.
export const toggleWishlistThunk = createAsyncThunk(
  "wishlist/toggle",
  async ({ productId, slug, isWishlisted }, thunkAPI) => {
    try {
      if (isWishlisted) {
        await removeFromWishlistRequest(productId);
      } else {
        await addToWishlistRequest(productId);
      }
      return { slug, isWishlisted };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to update wishlist" });
    }
  }
);

export const removeFromWishlistThunk = createAsyncThunk(
  "wishlist/removeOne",
  async ({ productId, slug }, thunkAPI) => {
    try {
      await removeFromWishlistRequest(productId);
      return { slug };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: "Failed to remove from wishlist" });
    }
  }
);

// Called right after a successful login/signup. A guest may have wishlisted
// items locally (by slug, in localStorage — see wishlistSlice) before ever
// creating an account. This resolves each guest slug to its product id and
// adds it server-side, so nothing they wishlisted as a guest is lost once
// they're identified. Best-effort per item — one bad/deleted slug shouldn't
// block the rest from merging.
const GUEST_WISHLIST_STORAGE_KEY = "zeescents_wishlist_slugs";

export const mergeGuestWishlistThunk = createAsyncThunk(
  "wishlist/mergeGuest",
  async (_, thunkAPI) => {
    let guestSlugs = [];
    try {
      guestSlugs = JSON.parse(localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY) || "[]");
    } catch {
      guestSlugs = [];
    }

    if (!Array.isArray(guestSlugs) || guestSlugs.length === 0) {
      return { merged: 0 };
    }

    const results = await Promise.allSettled(
      guestSlugs.map(async (slug) => {
        const product = await fetchProductBySlugRequest(slug);
        const productId = product?.data?.id ?? product?.id;
        if (!productId) throw new Error(`No product found for slug ${slug}`);
        await addToWishlistRequest(productId);
      })
    );

    const merged = results.filter((result) => result.status === "fulfilled").length;
    return { merged };
  }
);
