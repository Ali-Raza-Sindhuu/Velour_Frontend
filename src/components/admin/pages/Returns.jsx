import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, PackageSearch, Truck } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FilterSelect } from "../components/ui/FilterSelect";
import { useAdminResource } from "../hooks/useAdminResource";
import { getReturns } from "../api/adminService";
import { ReturnDrawer } from "../components/ReturnDrawer";

const STATUS_OPTIONS = [
  { value: "active", label: "Needs attention" },
  { value: "all", label: "All returns" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "shipped_back", label: "Shipped back" },
  { value: "received", label: "Received" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];
const ACTIVE = ["requested", "approved", "shipped_back", "received"];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");

export const Returns = () => {
  const { data: returns, loading, error, reload } = useAdminResource(getReturns, []);
  const [status, setStatus] = useState("active");
  const [selectedId, setSelectedId] = useState(null);

  const counts = useMemo(() => {
    const list = returns || [];
    const n = (...statuses) => list.filter((r) => statuses.includes(r.status)).length;
    return { review: n("requested"), transit: n("approved", "shipped_back"), inspect: n("received"), done: n("completed") };
  }, [returns]);

  const rows = useMemo(
    () => (returns || []).filter((r) => status === "all" || (status === "active" ? ACTIVE.includes(r.status) : r.status === status)),
    [returns, status]
  );

  return (
    <div>
      <PageHeader title="Returns" description="Review requests, track parcels coming back, inspect and resolve refunds, store credit and exchanges." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="To review" value={loading ? "—" : counts.review} icon={Inbox} tone="gold" />
        <StatCard label="On the way back" value={loading ? "—" : counts.transit} icon={Truck} tone="gold" />
        <StatCard label="To inspect & resolve" value={loading ? "—" : counts.inspect} icon={PackageSearch} tone="gold" />
        <StatCard label="Completed" value={loading ? "—" : counts.done} icon={CheckCircle2} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zs-charcoal/55">Click a return to see its items, photos and next step.</p>
          <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>

        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={status === "active" ? "No returns need attention" : "No returns here"}
          rows={rows}
          onRowClick={(row) => setSelectedId(row.id)}
          columns={[
            { key: "rma", label: "Return", render: (r) => <span className="font-medium">{r.rma}</span> },
            { key: "order_id", label: "Order", render: (r) => `#${r.order_id}` },
            { key: "email", label: "Customer" },
            { key: "item_count", label: "Items", render: (r) => r.item_count },
            {
              key: "type",
              label: "Type",
              render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={r.has_exchange ? "exchange" : r.refund_method === "store_credit" ? "store_credit" : "refund"} />
                  {r.is_fault ? <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200">Our fault</span> : null}
                </div>
              ),
            },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            { key: "requested_at", label: "Requested", render: (r) => formatDate(r.requested_at) },
            {
              key: "ship_by",
              label: "Ship by",
              render: (r) => (r.status === "approved" ? formatDate(r.ship_by) : r.return_tracking ? <span className="font-mono text-xs">{r.return_tracking}</span> : "—"),
            },
          ]}
        />
      </section>

      <ReturnDrawer key={selectedId || "none"} returnId={selectedId} onClose={() => setSelectedId(null)} onChanged={reload} />
    </div>
  );
};
