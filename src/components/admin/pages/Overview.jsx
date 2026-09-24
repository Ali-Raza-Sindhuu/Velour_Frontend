import { useNavigate } from "react-router-dom";
import { BarChart3, ShoppingBag, Package, Users, Plus, Tags, Percent, Zap, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { useAdminResource } from "../hooks/useAdminResource";
import { getOverview } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";
import { OrdersTrendChart } from "../components/charts/OrdersTrendChart";
import { adminPath } from "../layout/navConfig";

const DAY = 86400000;

// Real period-over-period change: the last 30 days against the 30 before that.
// Returns null when there is nothing to compare against, so no arrow is shown.
const periodChange = (orders, valueOf) => {
  const now = Date.now();
  const sum = (from, to) =>
    orders.reduce((total, o) => {
      const t = new Date(o.placed_at).getTime();
      return t >= from && t < to ? total + valueOf(o) : total;
    }, 0);
  const current = sum(now - 30 * DAY, now + DAY);
  const previous = sum(now - 60 * DAY, now - 30 * DAY);
  return previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
};

// Same card language as the Settings page: icon badge + title on a ruled header.
const Card = ({ icon: Icon, title, description, action, className = "", children }) => (
  <section className={"flex flex-col rounded-3xl border border-zs-beigeLine bg-white shadow-sm " + className}>
    <header className="flex items-start justify-between gap-3 border-b border-zs-beigeLine px-6 py-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">{description}</p> : null}
        </div>
      </div>
      {action}
    </header>
    <div className="flex-1 p-6">{children}</div>
  </section>
);

export const Overview = () => {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAdminResource(getOverview, []);
  const orders = data?.orders || [];
  const revenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const trend = data?.salesTrend || [];
  const topProducts = data?.topProducts || [];

  const revenueChange = periodChange(orders, (o) => Number(o.total_amount || 0));
  const ordersChange = periodChange(orders, () => 1);

  return (
    <div>
      <PageHeader
        title="Almina overview"
        description="A snapshot of Almina's performance across orders, catalog and customers."
        actions={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => navigate(adminPath("products"))}>Add product</Button>
            <Button variant="gold" icon={Percent} onClick={() => navigate(adminPath("promotions"))}>New promotion</Button>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatPrice(revenue)} icon={BarChart3} trend={revenueChange} tone="gold" />
        <StatCard label="Orders" value={orders.length} icon={ShoppingBag} trend={ordersChange} tone="gold" />
        <StatCard label="Products" value={data?.products?.length ?? "â€”"} icon={Package} tone="gold" />
        <StatCard label="Customers" value={data?.customers?.length ?? "â€”"} icon={Users} tone="gold" />
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-5">
        <Card icon={TrendingUp} title="Orders trend" description="Orders placed per day" className="lg:col-span-3">
          {loading ? (
            <div className="flex h-44 items-center justify-center text-sm text-zs-charcoal/40">Loadingâ€¦</div>
          ) : (
            <OrdersTrendChart trend={trend} />
          )}
        </Card>

        <Card icon={Zap} title="Quick actions" description="Jump straight to common tasks" className="lg:col-span-2">
          <div className="flex flex-col gap-2.5">
            <QuickAction icon={Plus} label="Add a new product" onClick={() => navigate(adminPath("products"))} />
            <QuickAction icon={Tags} label="Create a category" onClick={() => navigate("categories")} />
            <QuickAction icon={Percent} label="Launch a promotion" onClick={() => navigate(adminPath("promotions"))} />
            <QuickAction icon={ShoppingBag} label="Review pending orders" onClick={() => navigate("orders")} />
          </div>
        </Card>
      </div>

      <Card icon={Trophy} title="Top products" description="Best sellers by revenue" className="mt-6">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-zs-beige" />)}</div>
        ) : topProducts.length === 0 ? (
          <p className="text-sm text-zs-charcoal/40">No sales yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3.5 rounded-2xl border border-zs-beigeLine px-3.5 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zs-gold/15 text-xs font-semibold text-zs-gold">{index + 1}</span>
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zs-beige">
                  {product.image_url ? (
                    <img src={resolveImg(product.image_url)} alt={product.name} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zs-charcoal">{product.name}</p>
                  <p className="text-xs text-zs-charcoal/45">{product.units_sold} units sold</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zs-charcoal">{formatPrice(product.revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
              <ShoppingBag size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Recent orders</h2>
              <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">The latest five orders placed</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate("orders")}>View all</Button>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No orders yet"
          emptyDescription="Orders placed by customers will show up here."
          rows={orders.slice(0, 5)}
          columns={[
            { key: "id", label: "Order", render: (o) => <span className="font-semibold">#{o.id}</span> },
            { key: "email", label: "Customer", render: (o) => o.email || "Guest" },
            { key: "status", label: "Status", render: (o) => <StatusBadge value={o.status} /> },
            { key: "total_amount", label: "Total", render: (o) => <b>{formatPrice(o.total_amount)}</b>, className: "text-right" },
          ]}
        />
      </section>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-2xl border border-zs-beigeLine px-4 py-3.5 text-left text-sm font-medium text-zs-charcoal transition-colors hover:border-zs-gold/40 hover:bg-zs-gold/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold"><Icon size={16} /></span>
    {label}
  </button>
);

