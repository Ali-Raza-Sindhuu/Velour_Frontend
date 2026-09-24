import { useMemo, useState } from "react";
import { ShoppingBag, Clock, Truck, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SearchInput } from "../components/ui/SearchInput";
import { FilterSelect } from "../components/ui/FilterSelect";
import { OrderDetailsDrawer, getOrderContact } from "../components/OrderDetailsDrawer";
import { useAdminResource } from "../hooks/useAdminResource";
import { getOrders } from "../api/adminService";
import { formatPrice } from "../../../utils/price";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Unconfirmed" },
  { value: "processing", label: "Unfulfilled (to ship)" },
  { value: "shipped", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const FULFILLMENT_LABEL = { pending: "Unconfirmed", processing: "Unfulfilled", shipped: "In transit" };

const initialsOf = (name, email) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email ? email.slice(0, 2).toUpperCase() : "?";
};

const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : "—";
};

export const Orders = () => {
  const { data: orders, loading, error, reload, setData } = useAdminResource(getOrders, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return (orders || []).filter((o) => {
      const c = getOrderContact(o);
      const q = query.toLowerCase();
      const matchesQuery = !query || String(o.id).includes(query) || [c.email, c.name, c.phone].some((v) => v && String(v).toLowerCase().includes(q));
      const matchesStatus = status === "all" || o.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, status]);

  const totalAmount = useMemo(() => filtered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0), [filtered]);

  // Real counts from all orders (not just the filtered ones).
  const counts = useMemo(() => {
    const list = orders || [];
    const n = (...statuses) => list.filter((o) => statuses.includes(o.status)).length;
    return { total: list.length, pending: n("pending"), inProgress: n("processing", "shipped"), delivered: n("delivered") };
  }, [orders]);

  const handleStatusChange = (order, newStatus) => {
    setData((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
    setSelected((cur) => (cur && cur.id === order.id ? { ...cur, status: newStatus } : cur));
  };

  return (
    <div>
      <PageHeader title="Orders" description="Track and fulfil customer orders across all payment methods." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={loading ? "—" : counts.total} icon={ShoppingBag} tone="gold" />
        <StatCard label="Pending" value={loading ? "—" : counts.pending} icon={Clock} tone="gold" />
        <StatCard label="In progress" value={loading ? "—" : counts.inProgress} icon={Truck} tone="gold" />
        <StatCard label="Delivered" value={loading ? "—" : counts.delivered} icon={CheckCircle2} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
            <ShoppingBag size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">All orders</h2>
            <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Click an order to see the customer, contact number and items.</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-zs-beigeLine bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by order #, name, email or phone…" label="Search orders" />
          <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>

        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No orders match your filters"
          rows={filtered}
          onRowClick={setSelected}
          columns={[
            { key: "id", label: "Order", render: (o) => <span className="font-medium">#{o.id}</span> },
            { key: "customer", label: "Customer", render: (o) => {
              const c = getOrderContact(o);
              return (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zs-gold/15 text-[11px] font-bold text-zs-gold">
                    {initialsOf(c.name, c.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none text-zs-charcoal">{c.name || "Guest"}</p>
                    <p className="mt-1 truncate text-[11px] leading-none text-zs-charcoal/50">
                      {[c.email || "No email", c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            } },
            { key: "placed_at", label: "Placed", render: (o) => <span className="text-zs-charcoal/65">{formatDate(o.placed_at)}</span> },
            { key: "items", label: "Items", render: (o) => <span className="tabular-nums">{o.items}</span> },
            { key: "payment_method", label: "Payment", render: (o) => <StatusBadge value={o.payment_method} /> },
            { key: "status", label: "Fulfillment", render: (o) => (
              <div>
                <StatusBadge value={FULFILLMENT_LABEL[o.status] || o.status} />
                {o.tracking && ["shipped", "delivered"].includes(o.status) ? <p className="mt-1 font-mono text-[11px] text-zs-charcoal/50">{o.tracking}</p> : null}
              </div>
            ) },
            { key: "total_amount", label: "Total", render: (o) => <b>{formatPrice(o.total_amount)}</b>, className: "text-right" },
          ]}
        />

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
            <span className="text-zs-charcoal/60">
              {filtered.length} order{filtered.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-zs-charcoal">
              Total: <b className="zs-display">{formatPrice(totalAmount)}</b>
            </span>
          </div>
        )}
      </section>

      <OrderDetailsDrawer order={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
    </div>
  );
};