import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "../protection/AdminRoute";
import { AdminLayout, adminRouteChildren } from "./adminRoutes";
import AdminLogin from "./AdminLogin";

// The whole admin panel, loaded as its own chunk (see App.jsx) so shoppers
// never download any of it.

// Mounted at /admin/* — the sign-in page.
export const AdminAuthRoutes = () => (
  <Routes>
    <Route path="login" element={<AdminLogin />} />
    <Route path="*" element={<Navigate to="/adminDashboard" replace />} />
  </Routes>
);

// Mounted at /adminDashboard/* — the panel itself, behind the admin session.
export const AdminDashboardRoutes = () => (
  <Routes>
    <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
      {adminRouteChildren.map((route) => (
        <Route key={route.path || "overview"} {...route} />
      ))}
      <Route path="*" element={<Navigate to="/adminDashboard" replace />} />
    </Route>
  </Routes>
);
