
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import About from "./pages/About";
import Home from "./pages/Home";
import Shops from "./pages/Shops";
import MainLayout from "./components/layout/MainLayout";
import Contact from "./pages/Contact";
import ScrollToTop from "./components/ScrollToTop";
import ProductDetails from "./pages/ProductDetails";
import ProtectedRoute from "./components/protection/ProtectedRoute";
import Dashboard from "./components/user/Dashboard";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Returns from "./pages/Returns";
import ReturnStatus from "./pages/ReturnStatus";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Wishlist from "./pages/Wishlist";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookieSettings from "./pages/CookieSettings";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";

import { fetchProducts } from "./features/products/productsThunks";
import { fetchCart } from "./features/cart/cartThunks";
import {
  fetchCMSData,
  fetchStoreInfo,
} from "./features/site/siteThunks";
import { fetchWishlist } from "./features/wishlist/wishlistThunks";

const AdminAuthRoutes = lazy(() =>
  import("./components/admin/entry").then((m) => ({
    default: m.AdminAuthRoutes,
  }))
);

const AdminDashboardRoutes = lazy(() =>
  import("./components/admin/entry").then((m) => ({
    default: m.AdminDashboardRoutes,
  }))
);

const isAdminPath = (pathname) =>
  pathname === "/admin" ||
  pathname.startsWith("/admin/") ||
  pathname.startsWith("/adminDashboard");

const StorefrontBootstrap = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  );

  const inShop = !isAdminPath(pathname);
  const started = useRef(false);

  useEffect(() => {
    if (!inShop || started.current) return;

    started.current = true;

    dispatch(fetchProducts());
    dispatch(fetchCart());
    dispatch(fetchCMSData());
    dispatch(fetchStoreInfo());
  }, [inShop, dispatch]);

  useEffect(() => {
    if (inShop && isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [inShop, isAuthenticated, dispatch]);

  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <StorefrontBootstrap />

      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/shop/:slug" element={<ProductDetails />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/order-success/:orderId"
            element={<OrderSuccess />}
          />
          <Route path="/returns" element={<Returns />} />
          <Route path="/returns/:rma" element={<ReturnStatus />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/faq" element={<FAQ />} />
          <Route
            path="/shipping-returns"
            element={<ShippingReturns />}
          />
          <Route
            path="/privacy-policy"
            element={<PrivacyPolicy />}
          />
          <Route
            path="/terms-of-service"
            element={<TermsOfService />}
          />
          <Route
            path="/cookie-settings"
            element={<CookieSettings />}
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:orderId"
            element={<OrderDetail />}
          />
        </Route>

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/checkout" element={<Checkout />} />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/auth/google/callback"
          element={<GoogleAuthCallback />}
        />

        <Route
          path="/admin/*"
          element={
            <Suspense fallback={null}>
              <AdminAuthRoutes />
            </Suspense>
          }
        />

        <Route
          path="/adminDashboard/*"
          element={
            <Suspense fallback={null}>
              <AdminDashboardRoutes />
            </Suspense>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
