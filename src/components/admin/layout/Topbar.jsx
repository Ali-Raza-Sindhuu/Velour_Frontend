import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, Moon, Sun } from "lucide-react";
import { getOverviewStats } from "../api/adminService";
import { adminPath } from "./navConfig";

export const Topbar = ({ user, onOpenDrawer, onLogout, isDarkMode, onToggleTheme }) => {
  const name = [user?.first_name || user?.firstName, user?.last_name || user?.lastName].filter(Boolean).join(" ") || "Administrator";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const navigate = useNavigate();
  const [lowStock, setLowStock] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getOverviewStats()
      .then((stats) => { if (!cancelled) setLowStock(Number(stats?.lowStock || 0)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zs-beigeLine bg-white/90 px-4 py-3.5 shadow-[0_8px_24px_-20px_rgba(24,70,110,.35)] backdrop-blur sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenDrawer}
        className="rounded-lg p-2 text-zs-charcoal transition-colors hover:bg-zs-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold md:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="admin-topbar-brand hidden md:flex"><span>ALMINA / STUDIO</span><small>Collection management</small></div>

      <div className="flex items-center gap-1.5">
        {/* <button
          aria-label="Toggle theme"
          onClick={onToggleTheme}
          className="rounded-full p-2.5 text-zs-charcoal/60 transition-colors hover:bg-zs-beige hover:text-zs-gold"
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button> */}
        <button
          type="button"
          onClick={() => navigate(adminPath("notifications"))}
          aria-label={lowStock > 0 ? `${lowStock} products low on stock` : "Notifications"}
          title={lowStock > 0 ? `${lowStock} product${lowStock === 1 ? "" : "s"} low on stock` : "No new notifications"}
          className="relative rounded-full p-2.5 text-zs-charcoal/60 transition-colors hover:bg-zs-beige hover:text-zs-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
        >
          <Bell size={17} />
          {lowStock > 0 && (
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-zs-gold ring-2 ring-white" />
          )}
        </button>

        <div className="ml-1.5 flex items-center gap-2.5 rounded-full border border-zs-beigeLine py-1 pl-1 pr-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zs-gold text-xs font-semibold text-white">
            {initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-zs-charcoal">{name}</p>
            <p className="text-[11px] text-zs-charcoal/50">Administrator</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Log out"
          onClick={onLogout}
          className="rounded-full p-2.5 text-zs-charcoal/50 transition-colors hover:bg-zs-danger/10 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
};


