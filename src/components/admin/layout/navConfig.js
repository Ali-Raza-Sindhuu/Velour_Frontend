import { BarChart3, Bell, ShoppingBag, Package, Tags, Users, Percent, Star, CreditCard, Settings, LayoutTemplate, Undo2, Boxes, Truck, Landmark, Ruler } from "lucide-react";

// Paths are relative to the admin root; adminPath() turns them into full
// URLs so links work from any admin page.
export const ADMIN_BASE = "/adminDashboard";
export const adminPath = (to = "") => (to ? `${ADMIN_BASE}/${to}` : ADMIN_BASE);

export const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "", label: "Dashboard", icon: BarChart3, end: true },
      
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "products", label: "Products", icon: Package },
      { to: "categories", label: "Categories", icon: Tags },
      { to: "product-options", label: "Size & color", icon: Ruler },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "stock", label: "Stock", icon: Boxes },
      { to: "purchases", label: "Purchases", icon: Truck },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "orders", label: "Orders", icon: ShoppingBag },
      { to: "returns", label: "Returns", icon: Undo2 },
      { to: "customers", label: "Customers", icon: Users },
      { to: "payments", label: "Payments", icon: CreditCard },
      { to: "finance", label: "Finance", icon: Landmark },
      { to: "promotions", label: "Promotions", icon: Percent },
    ],
  },
  {
    label: "Community",
    items: [{ to: "reviews", label: "Reviews", icon: Star }],
  },
  {
    label: "CMS",
    items: [{ to: "editor", label: "Website Editor", icon: LayoutTemplate }],
  },
  {
    label: "Configuration",
    items: [{ to: "settings", label: "Settings", icon: Settings },
      { to: "notifications", label: "Notifications", icon: Bell },
    ],
    
  },
];
