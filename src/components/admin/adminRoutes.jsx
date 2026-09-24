import { AdminLayout } from "./layout/AdminLayout";
import {
  Overview, Notifications, Products, Categories, Orders, Customers, Promotions, Reviews, Payments, Returns, Settings, WebsiteEditor, Stock, Purchases, Finance, ProductOptions
} from "./pages";

/**
 * Nested route object for React Router (v6 data or element-based).
 *
 * HOW TO MOUNT — Option A (element-based router, most existing setups):
 *   import { adminRouteChildren } from "./admin/adminRoutes";
 *   <Route path="/adminDashboard" element={<AdminLayout />}>
 *     {adminRouteChildren.map(({ path, element, index }) => (
 *       <Route key={path ?? "index"} index={index} path={path} element={element} />
 *     ))}
 *   </Route>
 *
 * This preserves your existing top-level /adminDashboard path and every other
 * existing route (customer pages, guest cart/checkout, login) untouched.
 */
export const adminRouteChildren = [
  { index: true, element: <Overview /> },
  { path: "notifications", element: <Notifications /> },
  { path: "products", element: <Products /> },
  { path: "categories", element: <Categories /> },
  { path: "product-options", element: <ProductOptions /> },
  { path: "stock", element: <Stock /> },
  { path: "purchases", element: <Purchases /> },
  { path: "orders", element: <Orders /> },
  { path: "returns", element: <Returns /> },
  { path: "customers", element: <Customers /> },
  { path: "promotions", element: <Promotions /> },
  { path: "reviews", element: <Reviews /> },
  { path: "payments", element: <Payments /> },
  { path: "finance", element: <Finance /> },
  { path: "settings", element: <Settings /> },
  { path: "editor", element: <WebsiteEditor /> },
];

export { AdminLayout };
