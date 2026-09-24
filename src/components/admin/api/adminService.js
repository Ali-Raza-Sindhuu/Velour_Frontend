import apiClient from "./adminApiClient";
import { updateAdminUser } from "../auth/adminSession";

const data = async (request) => (await request).data?.data;
const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const productStatus = (product) => product.status === "draft" || product.status === "archived" ? product.status : Number(product.stock_quantity) === 0 ? "out_of_stock" : Number(product.stock_quantity) <= 5 ? "low_stock" : "active";
const mapProduct = (product) => ({
  ...product,
  stock: Number(product.stock_quantity),
  status: productStatus(product),
  sku: product.slug,
  discount_type: product.discount_type || "",
  discount_value: product.discount_value != null ? String(product.discount_value) : "",
  final_price: product.final_price != null ? Number(product.final_price) : Number(product.price),
  has_discount: !!product.has_discount,
  is_returnable: product.is_returnable === undefined ? true : Boolean(Number(product.is_returnable)),
  discount_percent: Number(product.discount_percent || 0),
});
const mapPromotion = (promo) => ({ ...promo, type: promo.discount_type, value: Number(promo.discount_value), usage: Number(promo.used_count), status: promo.is_active ? "active" : "inactive", expires_at: promo.expires_at ? String(promo.expires_at).slice(0, 10) : "â€”" });

export async function getOverview() {
  const [overview, orders, products, customers, payments, salesTrend, topProducts] = await Promise.all([
    data(apiClient.get("/admin/overview")), getOrders(), getProducts(), getCustomers(), getPayments(),
    getSalesTrend(), getTopProducts(),
  ]);
  return { ...overview, orders, products, customers, payments, salesTrend, topProducts };
}

export async function getSalesTrend(days = 30) { return data(apiClient.get("/admin/sales-trend", { params: { days } })); }
export async function getTopProducts(limit = 5) { return data(apiClient.get("/admin/top-products", { params: { limit } })); }

// Lightweight â€” just the overview stats (includes lowStock), without the
// orders/products/customers/payments fan-out getOverview() does. Used by
// the Topbar notification bell, which only needs the count.
export async function getOverviewStats() { return data(apiClient.get("/admin/overview")); }

export async function getProducts() { return (await data(apiClient.get("/products/admin/all"))).map(mapProduct); }
export async function getProductOptions() { return data(apiClient.get("/products/admin/options")); }
export async function saveProductOptions(options) { return data(apiClient.put("/products/admin/options", options)); }
// onProgress(percent) reports upload progress â€” useful with a large product video.
export async function saveProduct(product, { onProgress } = {}) {
  const categories = await getCategories();
  const category = categories.find((item) => item.name.toLowerCase() === String(product.category_name || "").toLowerCase());

  // product.images: [{ id, file?: File, url?: string, isCover }], in the
  // UI's display order (up to 5). The backend contract wants the cover
  // first, so reorder before building the request â€” a stable sort keeps
  // everything else in its existing order.
  const images = product.images || [];
  const ordered = [...images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));

  const payload = new FormData();
  payload.append("name", product.name);
  payload.append("slug", product.slug || slugify(product.name));
  if (product.description) payload.append("description", product.description);
  if (product.specifications) payload.append("specifications", product.specifications);
  payload.append("sizes", Array.isArray(product.sizes) ? product.sizes.join(", ") : product.sizes || "");
  payload.append("colors", Array.isArray(product.colors) ? product.colors.join(", ") : product.colors || "");
  payload.append("variants", JSON.stringify(product.variants || []));
  // Reel/demo video: a new file is uploaded; otherwise the saved one is kept
  // by sending its URL back. Sending neither removes the product video.
  if (product.video?.file instanceof File) payload.append("video", product.video.file);
  else if (product.video?.url) payload.append("video_url", product.video.url);
  payload.append("price", Number(product.price));
  // Explicit empty string clears an existing discount â€” the backend treats
  // a missing/empty discount_type as "no discount" either way.
  payload.append("discount_type", product.discount_type || "");
  payload.append("discount_value", product.discount_type && product.discount_value !== "" && product.discount_value != null ? Number(product.discount_value) : "");
  // Stock is only set when a product is created (its opening stock); after
  // that it changes through Inventory â†’ Stock / Purchases.
  if (!product.id) {
    payload.append("stock_quantity", Number(product.stock) || 0);
    payload.append("unit_cost", Number(product.unit_cost) || 0);
  }
  payload.append("is_returnable", product.is_returnable === false ? "false" : "true");
  payload.append("status", product.status === "draft" ? "draft" : product.status === "archived" ? "archived" : "active");
  if (category?.id) payload.append("category_id", category.id);

  if (ordered.length) {
    // image_slots: one entry per final image (cover first) â€” "new" means
    // "take the next file appended below", anything else is an existing
    // image's URL to keep as-is. Lets the backend rebuild the exact
    // cover-first order even when new uploads and kept images are mixed.
    const slots = ordered.map((img) => {
      if (img.file instanceof File) {
        payload.append("images", img.file);
        return "new";
      }
      return img.url;
    });
    payload.append("image_slots", JSON.stringify(slots));
  }

  const config = onProgress
    ? { onUploadProgress: (event) => event.total && onProgress(Math.round((event.loaded / event.total) * 100)) }
    : undefined;

  let response;
  if (product.id) {
    response = await apiClient.put(`/products/${product.id}`, payload, config);
  } else {
    response = await apiClient.post("/products", payload, config);
  }

  // Trust what the server actually saved â€” it knows the real generated
  // image filenames and the real stock_quantity column, neither of which
  // the frontend can reliably reconstruct itself.
  const savedRow = response.data.data;
  return mapProduct({ ...savedRow, category_name: category?.name || savedRow.category_name });
}
export async function deleteProduct(id) { await apiClient.delete(`/products/${id}`); }

export async function getCategories() { return data(apiClient.get("/categories")); }
export async function saveCategory(category) {
  const payload = { name: category.name, slug: category.slug || slugify(category.name), description: category.description || null };
  if (category.id) await apiClient.put(`/categories/${category.id}`, payload);
  else { const response = await apiClient.post("/categories", payload); category = { ...category, id: response.data.id }; }
  return { ...category, ...payload };
}
export async function deleteCategory(id) { await apiClient.delete(`/categories/${id}`); }

export async function getOrders() {
  const orders = await data(apiClient.get("/orders/admin/all"));
  return orders.map((order) => ({ ...order, items: Number(order.item_count || 0), payment_method: order.payment_method || "cod", placed_at: order.created_at }));
}
export async function getOrderItems(orderId) { return data(apiClient.get(`/orders/admin/${orderId}/items`)); }
export async function updateOrderStatus(orderId, status) { await apiClient.patch(`/orders/${orderId}/status`, { status }); }
export async function getFulfillment(orderId) { return data(apiClient.get(`/fulfillment/${orderId}`)); }
export async function fulfillOrder(orderId, body) { return data(apiClient.post(`/fulfillment/${orderId}/fulfill`, body)); }
export async function updateTracking(orderId, body) { return data(apiClient.patch(`/fulfillment/${orderId}/tracking`, body)); }
export async function markOrderDelivered(orderId) { return data(apiClient.patch(`/fulfillment/${orderId}/delivered`)); }
export async function markReturnedToSender(orderId, note) { return data(apiClient.patch(`/fulfillment/${orderId}/returned-to-sender`, { note })); }

export async function getCustomers() {
  const customers = await data(apiClient.get("/customers", { params: { limit: 100 } }));
  return customers.map((customer) => ({ ...customer, joined_at: customer.created_at }));
}

export async function getPromotions() { return (await data(apiClient.get("/promotions"))).map(mapPromotion); }
export async function savePromotion(promo) {
  const payload = { code: promo.code, discount_type: promo.type, discount_value: Number(promo.value), is_active: promo.status === "active", expires_at: promo.expires_at === "â€”" ? null : promo.expires_at };
  if (promo.id) await apiClient.patch(`/promotions/${promo.id}`, payload);
  else { const response = await apiClient.post("/promotions", payload); promo = { ...promo, id: response.data.id }; }
  return mapPromotion({ ...promo, ...payload, used_count: promo.usage || 0 });
}
export async function deletePromotion(id) { await apiClient.delete(`/promotions/${id}`); }

export async function getReviews() { return data(apiClient.get("/reviews/admin/all")); }
export async function moderateReview(id, status) { await apiClient.patch(`/reviews/${id}/status`, { status }); }
export async function getReturns() { return data(apiClient.get("/returns/admin/all")); }
export async function getReturn(id) { return data(apiClient.get(`/returns/admin/${id}`)); }
export async function getOrderReturns(orderId) { return data(apiClient.get(`/returns/admin/order/${orderId}`)); }
export async function returnAction(id, action, body = {}) {
  const routes = {
    approve: ["patch", "approve"], reject: ["patch", "reject"], received: ["patch", "received"], inspect: ["patch", "inspect"],
    message: ["post", "message"], note: ["patch", "note"], complete: ["post", "complete"],
  };
  const [method, path] = routes[action];
  return data(apiClient[method](`/returns/admin/${id}/${path}`, body));
}
// The signed-in admin's own profile (Settings â†’ Account)
export async function getAdminProfile() { return (await apiClient.get("/users/me")).data; }
export async function updateAdminProfile(profile) {
  const result = (await apiClient.put("/users/me", profile)).data;
  if (result?.user) updateAdminUser({ first_name: result.user.firstName, last_name: result.user.lastName, email: result.user.email });
  return result;
}
export async function changeAdminPassword(passwords) { return (await apiClient.put("/users/me/password", passwords)).data; }

// Inventory
export async function getStock() { return data(apiClient.get("/inventory/stock")); }
export async function getStockMovements(productId, page = 1) { return (await apiClient.get(`/inventory/products/${productId}/movements`, { params: { page, limit: 50 } })).data?.data; }
export async function adjustStock(productId, body) { return data(apiClient.post(`/inventory/products/${productId}/adjust`, body)); }
export async function setUnitCost(productId, unit_cost) { return data(apiClient.patch(`/inventory/products/${productId}/cost`, { unit_cost })); }
export async function getPurchases() { return data(apiClient.get("/inventory/purchases")); }
export async function createPurchase(body) { return data(apiClient.post("/inventory/purchases", body)); }
export async function payPurchase(id, body) { return data(apiClient.patch(`/inventory/purchases/${id}/pay`, body)); }
export async function reconcileStock() { return data(apiClient.get("/inventory/reconcile")); }

// Finance
export async function getFinanceSummary(range) { return data(apiClient.get("/finance/summary", { params: range })); }
export async function getCashLedger(params) { return data(apiClient.get("/finance/ledger", { params })); }
export async function getUnsettledCod() { return data(apiClient.get("/finance/cod/unsettled")); }
export async function getRemittances() { return data(apiClient.get("/finance/cod/remittances")); }
export async function recordRemittance(body) { return data(apiClient.post("/finance/cod/remittances", body)); }
export async function getRefundsDue() { return data(apiClient.get("/finance/refunds/due")); }
export async function completeRefund(id, body) { return data(apiClient.post(`/finance/refunds/${id}/complete`, body)); }
export async function getOrderMoney(orderId) { return data(apiClient.get(`/finance/orders/${orderId}`)); }

export async function getPayments() { return data(apiClient.get("/payments/admin/all")); }
export async function verifyPayment(id, approve) { return data(apiClient.patch(`/payments/admin/${id}/verify`, { approve })); }

const defaultSettings = { store: { name: "Almina", supportEmail: "", phone: "", address: "" }, shipping: { flatRate: 200, freeThreshold: 0, codEnabled: true }, tax: { taxPercent: 0, taxInclusive: true }, notifications: { orderEmails: true, orderEmailRecipient: "", lowStockAlerts: true, marketingEmails: false }, returns: { windowDays: 30, shipByDays: 14, returnAddress: "", instructions: "", storeCreditBonusPercent: 0 }, inventory: { unpaidHoldMinutes: 60, lowStockThreshold: 5 } };
// One level deeper than a plain spread â€” a section (or a nested key within
// it, like payment.jazzcash) saved in an earlier/partial shape shouldn't
// wipe out the rest of that section's defaults and crash the form.
const mergeDeep = (defaults, stored) => {
  if (Array.isArray(defaults) || typeof defaults !== "object" || defaults === null) {
    return stored !== undefined ? stored : defaults;
  }
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    result[key] = mergeDeep(defaults[key], stored?.[key]);
  }
  return result;
};
export async function getSettings() { return mergeDeep(defaultSettings, await data(apiClient.get("/admin/settings"))); }
export async function saveSettings(section, values) { return data(apiClient.put(`/admin/settings/${section}`, values)); }

// CMS
export async function getCmsPages() { return (await apiClient.get("/cms/pages")).data; }
export async function updateCmsSection(pageId, sectionId, content) { return (await apiClient.put(`/cms/sections/${pageId}/${sectionId}`, { content })).data; }
export async function reorderCmsSections(pageId, sections) { return (await apiClient.put(`/cms/pages/${pageId}/reorder`, { sections })).data; }
export async function uploadCmsImage(file) {
  const payload = new FormData();
  payload.append("image", file);
  const response = await apiClient.post("/cms/upload", payload);
  return response.data.data.image_url;
}

