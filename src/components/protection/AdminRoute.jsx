import { Navigate, useLocation } from "react-router-dom";
import { isAdminSignedIn } from "../admin/auth/adminSession";

// The admin panel checks its own session only — being signed in to the shop
// (even with an admin email) doesn't open it.
const AdminRoute = ({ children }) => {
  const location = useLocation();

  if (!isAdminSignedIn()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return children;
};

export default AdminRoute;
