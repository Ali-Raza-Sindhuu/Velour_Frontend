import { createSlice } from "@reduxjs/toolkit";
import { fetchWishlist, toggleWishlistThunk, removeFromWishlistThunk } from "./wishlistThunks";

const STORAGE_KEY = "zeescents_wishlist_slugs";

const loadWishlistFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveWishlistToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore write errors
  }
};

const initialState = {
  items: loadWishlistFromStorage(), // array of product slugs
  loading: false,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    // Guest / offline path — used when there's no logged-in user to sync
    // against the backend. Logged-in toggles go through toggleWishlistThunk
    // instead so the change actually persists server-side.
    toggleWishlist: (state, action) => {
      const slug = action.payload;
      if (state.items.includes(slug)) {
        state.items = state.items.filter((s) => s !== slug);
      } else {
        state.items.push(slug);
      }
      saveWishlistToStorage(state.items);
    },
    removeFromWishlist: (state, action) => {
      state.items = state.items.filter((s) => s !== action.payload);
      saveWishlistToStorage(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlistToStorage(state.items);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = (action.payload || []).map((p) => p.slug);
        saveWishlistToStorage(state.items);
      })
      .addCase(fetchWishlist.rejected, (state) => {
        state.loading = false;
      })
      .addCase(toggleWishlistThunk.fulfilled, (state, action) => {
        const { slug, isWishlisted } = action.payload;
        // isWishlisted here is the state BEFORE the toggle — so "was
        // wishlisted" means we just removed it, and vice versa.
        state.items = isWishlisted
          ? state.items.filter((s) => s !== slug)
          : state.items.includes(slug) ? state.items : [...state.items, slug];
        saveWishlistToStorage(state.items);
      })
      .addCase(removeFromWishlistThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s !== action.payload.slug);
        saveWishlistToStorage(state.items);
      });
  },
});

export const { toggleWishlist, removeFromWishlist, clearWishlist } =
  wishlistSlice.actions;

export default wishlistSlice.reducer;
