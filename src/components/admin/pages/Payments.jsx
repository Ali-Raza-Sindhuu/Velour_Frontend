import { useMemo, useState } from "react";
import { Wallet, Clock, Hourglass, XCircle, CreditCard } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getPayments, verifyPayment } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";

const METHOD_LABEL = { cod: "Cash on delivery", jazzcash: "JazzCash" };

export const Payments = () => {
  const { data: payments, loading, error, reload, setData } = useAdminResource(getPayments, []);
  const { push } = useToast();
  const [busyId, setBusyId] = useState(null);

  const totalAmount = useMemo(() => (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0), [payments]);

  // Real totals per status, so the cards always agree with the table below.
  const summary = useMemo(() => {
    const by = (status) => (payments || []).filter((p) => p.status === status);
    const sum = (rows) => rows.reduce((total, p) => total + Number(p.amount || 0), 0);
    const paid = by("paid");
    const submitted = by("submitted");
    const pending = by("pending");
    const closed = (payments || []).filter((p) => p.status === "failed" || p.status === "refunded");
    return { paid: sum(paid), submitted: submitted.length, submittedAmount: sum(submitted), pending: sum(pending), pendingCount: pending.length, closedCount: closed.length };
  }, [payments]);

  const decide = async (payment, approve) => {
    setBusyId(payment.id);
    try {
      const result = await verifyPayment(payment.id, approve);
      setData((prev) => prev.map((p) => (p.id === payment.id ? { ...p, status: result?.status || (approve ? "paid" : "failed") } : p)));
      push(approve ? `Payment #${payment.id} confirmed.` : `Payment #${payment.id} marked failed.`, approve ? "success" : "error");
    } catch {
      push("Couldn't update this payment.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Payments" description="Every transaction across cash on delivery and JazzCash." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={loading ? "—" : formatPrice(summary.paid)} icon={Wallet} tone="gold" />
        <StatCard label="Awaiting verification" value={loading ? "—" : summary.submitted} icon={Clock} tone="gold" />
        <StatCard label="Pending" value={loading ? "—" : formatPrice(summary.pending)} icon={Hourglass} tone="gold" />
        <StatCard label="Failed / refunded" value={loading ? "—" : summary.closedCount} icon={XCircle} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
            <CreditCard size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Transactions</h2>
            <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Confirm or reject transfers once you've checked them.</p>
          </div>
        </div>

        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No payments recorded"
          rows={payments}
          columns={[
            { key: "id", label: "Payment", render: (p) => <span className="font-medium">#{p.id}</span> },
            { key: "order_id", label: "Order", render: (p) => `#${p.order_id}` },
            { key: "email", label: "Customer" },
            { key: "method", label: "Method", render: (p) => <StatusBadge value={p.method} /> },
            { key: "transaction_id", label: "Transaction ID", render: (p) => p.transaction_id ? <span className="font-mono text-xs">{p.transaction_id}</span> : <span className="text-zs-charcoal/30">—</span> },
            { key: "receipt", label: "Receipt", render: (p) => p.receipt_path ? <a href={resolveImg(p.receipt_path)} target="_blank" rel="noreferrer" className="text-xs font-medium text-zs-gold underline">View</a> : <span className="text-zs-charcoal/30">—</span> },
            { key: "status", label: "Status", render: (p) => <StatusBadge value={p.status} /> },
            { key: "amount", label: "Amount", render: (p) => <b>{formatPrice(p.amount)}</b>, className: "text-right" },
            { key: "actions", label: "", render: (p) => p.status === "submitted" ? (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => decide(p, true)}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => decide(p, false)}
                  className="rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Reject
                </button>
              </div>
            ) : null, className: "text-right" },
          ]}
        />

        {!loading && !error && payments?.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
            <span className="text-zs-charcoal/60">
              {payments.length} payment{payments.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-zs-charcoal">
              Total value: <b className="zs-display">{formatPrice(totalAmount)}</b>
            </span>
          </div>
        )}
      </section>

      <p className="mt-5 rounded-2xl bg-zs-beige/40 px-4 py-3 text-xs leading-relaxed text-zs-charcoal/55">
        Methods shown: {Object.values(METHOD_LABEL).join(" · ")}. JazzCash payments are confirmed by JazzCash and show as "Paid" automatically. Older manual transfers marked "Submitted" can still be approved or rejected here.
      </p>
    </div>
  );
};