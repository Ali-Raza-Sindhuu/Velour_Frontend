import { createSlice } from "@reduxjs/toolkit";

/**
 * This slice currently owns lightweight admin UI state only (sidebar collapse,
 * last-used table filters) — it deliberately does NOT duplicate server data,
 * since pages fetch through src/admin/api/adminService.js and manage their own
 * loading/error state via useAdminResource for now.
 *
 * Product, order, customer and other admin records are loaded from the API by
 * their pages. This slice intentionally contains UI state only.
 */
const initialState = {
  sidebarCollapsed: false,
  filters: {
    products: { status: "all", query: "" },
    orders: { status: "all", query: "" },
  },
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    setTableFilter(state, action) {
      const { page, filters } = action.payload; // e.g. { page: 'products', filters: { status: 'active' } }
      state.filters[page] = { ...state.filters[page], ...filters };
    },
  },
});

export const { setSidebarCollapsed, setTableFilter } = adminSlice.actions;
export default adminSlice.reducer;

// TODO(backend): register this reducer in your existing store, e.g.:
// import adminReducer from "./store/adminSlice";
// export const store = configureStore({ reducer: { ...existingReducers, admin: adminReducer } });
