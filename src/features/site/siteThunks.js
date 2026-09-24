import { createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

export const fetchCMSData = createAsyncThunk("site/fetchCMSData", async () => {
  const response = await apiClient.get("/cms/pages");
  return response.data;
});

// Public "Visit Us" style store info — name/email/phone/address — kept editable
// from the admin Settings page ("Store details") and readable by anyone.
export const fetchStoreInfo = createAsyncThunk("site/fetchStoreInfo", async () => {
  const response = await apiClient.get("/admin/settings/public");
  return response.data.data;
});
