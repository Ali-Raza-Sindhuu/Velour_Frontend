import { useMemo, useState } from "react";
import { Star, Check, Flag, MessageSquare, Clock } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FilterSelect } from "../components/ui/FilterSelect";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getReviews, moderateReview } from "../api/adminService";

const STATUS_OPTIONS = [
  { value: "all", label: "All reviews" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "flagged", label: "Flagged" },
];

const Stars = ({ rating }) => (
  <div className="flex items-center gap-0.5 text-zs-gold" aria-label={`${rating} out of 5 stars`}>
    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} strokeWidth={1.5} />)}
  </div>
);

export const Reviews = () => {
  const { data: reviews, loading, error, reload, setData } = useAdminResource(getReviews, []);
  const { push } = useToast();
  const [status, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(
    () => (reviews || []).filter((r) => status === "all" || r.status === status),
    [reviews, status]
  );

  // Real numbers from the reviews themselves, so the cards match the table.
  const summary = useMemo(() => {
    const list = reviews || [];
    const rated = list.filter((r) => Number(r.rating) > 0);
    const average = rated.length ? rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length : null;
    return {
      total: list.length,
      average,
      pending: list.filter((r) => r.status === "pending").length,
      flagged: list.filter((r) => r.status === "flagged").length,
    };
  }, [reviews]);

  const setStatus = async (review, next) => {
    setBusyId(review.id);
    try {
      await moderateReview(review.id, next);
      setData((prev) => prev.map((r) => (r.id === review.id ? { ...r, status: next } : r)));
      push(`Review ${next}.`, "success");
    } catch {
      push("Couldn't update this review.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer feedback before it goes live on product pages." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reviews" value={loading ? "—" : summary.total} icon={MessageSquare} tone="gold" />
        <StatCard label="Average rating" value={loading ? "—" : summary.average != null ? `${summary.average.toFixed(1)} / 5` : "—"} icon={Star} tone="gold" />
        <StatCard label="Pending" value={loading ? "—" : summary.pending} icon={Clock} tone="gold" />
        <StatCard label="Flagged" value={loading ? "—" : summary.flagged} icon={Flag} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
              <MessageSquare size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Customer reviews</h2>
              <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Approve good feedback and flag anything that shouldn't be shown.</p>
            </div>
          </div>
          <FilterSelect label="Filter by status" value={status} onChange={setFilter} options={STATUS_OPTIONS} />
        </div>

        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={status === "all" ? "No reviews yet" : "No reviews match this filter"}
          rows={filtered}
          columns={[
            { key: "product_name", label: "Product", render: (r) => <span className="font-medium text-zs-charcoal">{r.product_name}</span> },
            { key: "customer_name", label: "Customer" },
            { key: "rating", label: "Rating", render: (r) => <Stars rating={Number(r.rating)} /> },
            { key: "comment", label: "Comment", render: (r) => <p className="line-clamp-2 max-w-xs text-zs-charcoal/70">{r.comment}</p> },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            {
              key: "actions", label: "", className: "text-right",
              render: (r) => (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    aria-label="Approve review"
                    disabled={busyId === r.id || r.status === "approved"}
                    onClick={() => setStatus(r, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    type="button"
                    aria-label="Flag review"
                    disabled={busyId === r.id || r.status === "flagged"}
                    onClick={() => setStatus(r, "flagged")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Flag size={13} /> Flag
                  </button>
                </div>
              ),
            },
          ]}
        />

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
            <span className="text-zs-charcoal/60">
              Showing {filtered.length} of {summary.total} review{summary.total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </section>
    </div>
  );
};