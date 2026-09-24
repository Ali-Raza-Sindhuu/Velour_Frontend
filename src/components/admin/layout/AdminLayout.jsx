import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminUser } from "../auth/adminSession";
import { DesktopSidebar, MobileDrawer } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "../components/ui/Toast";
import "../admin-theme.css";

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const user = getAdminUser();

  // Signs out of the admin panel only; a shop session in the same browser
  // is untouched.
  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  };

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ToastProvider>
      <div className={`zs-root flex min-h-screen font-body ${isDarkMode ? "dark" : ""}`}>
        <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col bg-zs-page">
          <Topbar
            user={user}
            onOpenDrawer={() => setDrawerOpen(true)}
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};