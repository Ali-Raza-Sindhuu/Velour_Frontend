import { NavLink } from "react-router-dom";
import { NAV_SECTIONS, adminPath } from "./navConfig";

export const SidebarNav = ({ collapsed = false, onNavigate }) => (
  <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
    {NAV_SECTIONS.map((section) => (
      <div key={section.label}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-zs-charcoal/35">{section.label}</p>
        )}
        <div className="flex flex-col gap-1">
          {section.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={adminPath(to)}
              end={end}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                (isActive ? "bg-zs-gold/15 text-zs-gold" : "text-zs-charcoal/70 hover:bg-zs-beige hover:text-zs-charcoal") +
                (collapsed ? " justify-center" : "")
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </div>
    ))}
  </nav>
);
