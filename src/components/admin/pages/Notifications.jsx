import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, PackageX, Clock, CreditCard, BellOff, Bell, ChevronRight, Package, Undo2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";
import { OrderDetailsDrawer, getOrderContact } from "../components/OrderDetailsDrawer";
import { useAdminResource } from "../hooks/useAdminResource";
import { getProducts, getOrders, getPayments, getReturns } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { adminPath } from "../layout/navConfig";

// Notifications aren't a standalone backend resource yet — this page composes
// them from data the admin already fetches elsewhere (stock levels, order
// status, payment status), so there's nothing new to wire up server-side.
const loadNotifications = async () => {
  const [products, orders, payments, returns] = await Promise.all([getProducts(), getOrders(), getPayments(), getReturns().catch(() => [])]);

  const notifications = [];

  products
    .filter((p) => p.status === "out_of_stock" || p.status === "low_stock")
    .forEach((p) => {
      const outOfStock = p.status === "out_of_stock";
      notifications.push({
        id: `product-${p.id}`,
        kind: "stock",
        icon: outOfStock ? PackageX : AlertTriangle,
        tone: outOfStock ? "danger" : "warning",
        title: outOfStock ? "Out of stock" : "Running low on stock",
        description: `${p.name} — ${outOfStock ? "0 units left" : `only ${p.stock} unit${p.stock === 1 ? "" : "s"} left`}.`,
        to: "products",
        sortKey: outOfStock ? 0 : 1,
      });
    });

  orders
    .filter((o) => o.status === "pending")
    .forEach((o) => {
      const contact = getOrderContact(o);
      notifications.push({
        id: `order-${o.id}`,
        kind: "order",
        icon: Clock,
        tone: "info",
        title: `Order #${o.id} awaiting action`,
        description: `${contact.name || contact.email || "Guest"}${contact.phone ? ` · ${contact.phone}` : ""} · ${formatPrice(o.total_amount)} · placed ${new Date(o.placed_at).toLocaleDateString()}.`,
        to: "orders",
        // Clicking an order notification opens its details right here.
        order: o,
        sortKey: 2,
      });
    });

  payments
    .filter((p) => p.status === "submitted")
    .forEach((p) => {
      notifications.push({
        id: `payment-${p.id}`,
        kind: "payment",
        icon: CreditCard,
        tone: "info",
        title: `Payment #${p.id} needs verification`,
        description: `${p.email || "Customer"} sent ${formatPrice(p.amount)} via ${p.method}.`,
        to: "payments",
        sortKey: 2,
      });
    });

  returns
    .filter((r) => r.status === "requested" || r.status === "shipped_back")
    .forEach((r) => {
      notifications.push({
        id: `return-${r.id}`,
        kind: "order",
        icon: Undo2,
        tone: r.is_fault ? "warning" : "info",
        title: r.status === "requested" ? `Return ${r.rma} needs review` : `Return ${r.rma} is on its way back`,
        description: `${r.email} · order #${r.order_id} · ${r.item_count} item${r.item_count === 1 ? "" : "s"}${r.is_fault ? " · reported damaged/wrong" : ""}.`,
        to: "returns",
        sortKey: r.status === "requested" ? 1 : 2,
      });
    });

  return notifications.sort((a, b) => a.sortKey - b.sortKey);
};

const TONE_STYLES = {
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-sky-50 text-sky-600",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stock" },
  { value: "order", label: "Orders" },
  { value: "payment", label: "Payments" },
];

export const Notifications = () => {
  const { data: notifications, loading, error, reload, setData } = useAdminResource(useCallback(loadNotifications, []), []);
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");

  // Real counts from the alerts themselves, so the cards match the list.
  const counts = useMemo(() => {
    const list = notifications || [];
    const n = (kind) => list.filter((x) => x.kind === kind).length;
    return { all: list.length, stock: n("stock"), order: n("order"), payment: n("payment") };
  }, [notifications]);

  const visible = (notifications || []).filter((n) => filter === "all" || n.kind === filter);

  const handleStatusChange = (order, newStatus) => {
    setSelectedOrder({ ...order, status: newStatus });
    // Only pending orders are notifications, so once it's handled it drops off the list.
    if (newStatus !== "pending") {
      setData((prev) => (prev || []).filter((n) => n.id !== `order-${order.id}`));
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Everything that needs your attention right now, in one place." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Needs attention" value={loading || error ? "—" : counts.all} icon={Bell} tone="gold" />
        <StatCard label="Stock alerts" value={loading || error ? "—" : counts.stock} icon={Package} tone="gold" />
        <StatCard label="Pending orders" value={loading || error ? "—" : counts.order} icon={Clock} tone="gold" />
        <StatCard label="Payments to verify" value={loading || error ? "—" : counts.payment} icon={CreditCard} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
              <Bell size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Alerts</h2>
              <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Click an alert to act on it. Orders open right here.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start rounded-xl bg-zs-beige p-1 sm:self-auto" role="tablist" aria-label="Filter alerts">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.value ? "bg-white text-zs-gold shadow-sm" : "text-zs-charcoal/50 hover:text-zs-charcoal"
                }`}
              >
                {f.label}
                {!loading && !error ? <span className="ml-1.5 tabular-nums text-zs-charcoal/35">{counts[f.value]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-zs-beige" />)}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-medium">Couldn't load notifications</p>
            <p className="mt-1 text-red-700/80">{error}</p>
            <button onClick={reload} className="mt-3 rounded-xl border border-red-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-red-100">Try again</button>
          </div>
        ) : counts.all === 0 ? (
          <EmptyState icon={BellOff} title="You're all caught up" description="No low stock alerts, pending orders, or payments waiting on you." />
        ) : visible.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-zs-beigeLine bg-white px-6 py-10 text-center text-sm text-zs-charcoal/50">Nothing in this category right now.</p>
        ) : (
          <div className="divide-y divide-zs-beigeLine overflow-hidden rounded-3xl border border-zs-beigeLine bg-white shadow-sm">
            {visible.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => (n.order ? setSelectedOrder(n.order) : navigate(adminPath(n.to)))}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zs-beige/30 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zs-gold sm:px-6"
              >
                <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + TONE_STYLES[n.tone]}>
                  <n.icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zs-charcoal">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zs-charcoal/60">{n.description}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-zs-charcoal/25 transition-transform group-hover:translate-x-0.5 group-hover:text-zs-gold" />
              </button>
            ))}
          </div>
        )}
      </section>

      <OrderDetailsDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} />
    </div>
  );
};