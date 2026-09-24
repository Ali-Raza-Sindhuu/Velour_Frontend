import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import logo from "../../../assets/almina-logo.svg";

const Brand = ({ collapsed = false }) => collapsed ? (
  <div className="admin-brand-monogram" aria-label="Almina">A</div>
) : (
  <div className="admin-brand-lockup">
    <img src={logo} alt="Almina" />
    <span>STORE STUDIO</span>
  </div>
);

export const DesktopSidebar = ({ collapsed, onToggle }) => (
  <aside className={"admin-sidebar sticky top-0 hidden h-screen shrink-0 flex-col transition-[width] duration-200 md:flex " + (collapsed ? "w-[82px]" : "w-[260px]")}>
    <div className={"admin-sidebar-brand flex items-center px-5 py-6 " + (collapsed ? "justify-center" : "")}>
      <Brand collapsed={collapsed} />
    </div>
    <SidebarNav collapsed={collapsed} />
    <button type="button" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="admin-sidebar-toggle mx-4 mb-5 flex items-center justify-center gap-2 border py-2.5 text-xs font-semibold transition-colors">
      {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse menu</>}
    </button>
  </aside>
);

export const MobileDrawer = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="admin-mobile-drawer fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-full w-72 max-w-[84%] flex-col bg-white shadow-xl">
        <div className="admin-sidebar-brand flex items-center justify-between border-b px-5 py-6">
          <Brand />
          <button type="button" aria-label="Close menu" onClick={onClose} className="grid h-9 w-9 place-items-center text-zs-charcoal/60 transition hover:bg-zs-beige hover:text-zs-charcoal"><X size={18} /></button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  );
};
