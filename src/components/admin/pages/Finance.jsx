import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, Truck, Undo2, Gift, Receipt, TrendingUp, Boxes, AlertTriangle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FormField, TextInput, Select } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import {
  getFinanceSummary, getCashLedger, getUnsettledCod, getRemittances, recordRemittance, getRefundsDue, completeRefund,
} from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { ACCOUNT_OPTIONS } from "../utils/finance";

const ENTRY_LABEL = {
  sale_payment: "Online payment received",
  cod_remittance: "COD payout from courier",
  courier_fee: "Courier charges",
  refund: "Refund to customer",
  purchase_payment: "Paid supplier",
};
const ACCOUNT_LABEL = Object.fromEntries(ACCOUNT_OPTIONS.map((a) => [a.value, a.label]));

const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [
  { label: "Today", range: () => ({ from: iso(new Date()), to: iso(new Date()) }) },
  { label: "7 days", range: () => ({ from: iso(new Date(Date.now() - 6 * 86400000)), to: iso(new Date()) }) },
  { label: "30 days", range: () => ({ from: iso(new Date(Date.now() - 29 * 86400000)), to: iso(new Date()) }) },
  { label: "This month", range: () => { const n = new Date(); return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1, 12)), to: iso(n) }; } },
];

const Group = ({ title, description, children }) => (
  <section className="mt-8">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">{title}</h2>
    {description ? <p className="mt-1 text-sm text-zs-charcoal/50">{description}</p> : null}
    <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  </section>
);

// Profit & loss for the period, top to bottom.
const Statement = ({ s }) => {
  const rows = [
    ["Sales (orders shipped)", s.sales.gross, `${s.sales.orders} orders, incl. ${formatPrice(s.sales.shipping)} delivery charged`],
    ["Returns refunded", -s.sales.returns, "Refunds and store credit given on returns"],
    ["Net sales", s.sales.net, null, true],
    ["Cost of goods sold", -s.cogs, s.scrapped ? `Includes ${formatPrice(s.scrapped)} of returned items written off` : "What the shipped units cost you"],
    ["Gross profit", s.grossProfit, null, true],
    ["Courier charges", -s.courierFees, "Deducted from COD payouts"],
    ["Stock written off", -s.writeOffs, "Damaged, lost or corrected stock (net of units found)"],
    ["Profit", s.netProfit, null, true],
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-zs-beigeLine bg-white shadow-sm">
      {rows.map(([label, value, hint, strong]) => (
        <div key={label} className={"flex items-center justify-between gap-4 px-6 py-3.5 " + (strong ? "bg-zs-beige/40" : "border-b border-zs-beigeLine/70")}>
          <div>
            <p className={strong ? "font-semibold text-zs-charcoal" : "text-sm text-zs-charcoal"}>{label}</p>
            {hint ? <p className="text-xs text-zs-charcoal/50">{hint}</p> : null}
          </div>
          <p className={"tabular-nums " + (strong ? "zs-display text-lg font-semibold" : "text-sm") + (value < 0 ? " text-red-700" : "")}>
            {value < 0 ? `−${formatPrice(-value)}` : formatPrice(value)}
          </p>
        </div>
      ))}
    </div>
  );
};

export const Finance = () => {
  const [range, setRange] = useState(PRESETS[2].range());
  const [tab, setTab] = useState("ledger");
  const { data: s, loading, error, reload } = useAdminResource(() => getFinanceSummary(range), [range.from, range.to]);

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Every rupee in and out, what's still owed either way, and what you actually earned."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setRange(p.range())}
                className="rounded-xl border border-zs-beigeLine bg-white px-3 py-2 text-xs font-medium text-zs-charcoal hover:bg-zs-beige/50"
              >
                {p.label}
              </button>
            ))}
            <input type="date" aria-label="From" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className="rounded-xl border border-zs-beigeLine bg-white px-3 py-2 text-xs" />
            <input type="date" aria-label="To" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className="rounded-xl border border-zs-beigeLine bg-white px-3 py-2 text-xs" />
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error} <button onClick={reload} className="ml-2 underline">Try again</button>
        </div>
      ) : (
        <>
          <Group title="Cash" description={`Money that actually moved between ${range.from} and ${range.to}.`}>
            <StatCard label="Money in" value={loading ? "—" : formatPrice(s.cash.in)} icon={ArrowDownLeft} tone="gold" />
            <StatCard label="Money out" value={loading ? "—" : formatPrice(s.cash.out)} icon={ArrowUpRight} tone="gold" />
            <StatCard label="Net cash" value={loading ? "—" : (s.cash.net < 0 ? "−" : "") + formatPrice(Math.abs(s.cash.net))} icon={Scale} tone="gold" />
            <StatCard label="Stock bought" value={loading ? "—" : formatPrice(s.purchased)} icon={Receipt} tone="gold" />
          </Group>

          <Group title="Owed right now" description="Balances today, whatever the period.">
            <StatCard label="COD with couriers" value={loading ? "—" : formatPrice(s.receivable.amount)} icon={Truck} tone="gold" />
            <StatCard label="Refunds owed" value={loading ? "—" : formatPrice(s.refundsOwed.amount)} icon={Undo2} tone="gold" />
            <StatCard label="Store credit unused" value={loading ? "—" : formatPrice(s.storeCredit.outstanding)} icon={Gift} tone="gold" />
            <StatCard label="Owed to suppliers" value={loading ? "—" : formatPrice(s.payables.amount)} icon={Receipt} tone="gold" />
          </Group>

          {!loading && s.receivable.inTransit.orders > 0 && (
            <p className="mt-3 text-xs text-zs-charcoal/55">
              Plus {formatPrice(s.receivable.inTransit.amount)} to be collected on {s.receivable.inTransit.orders} COD order{s.receivable.inTransit.orders === 1 ? "" : "s"} still out for delivery.
            </p>
          )}

          <section className="mt-8 grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
            <div>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">Profit</h2>
              {loading ? <div className="h-72 animate-pulse rounded-3xl bg-zs-beige" /> : <Statement s={s} />}
            </div>
            <div className="space-y-5 xl:pt-8">
              <StatCard label="Gross margin" value={loading || !s.sales.net ? "—" : `${Math.round((s.grossProfit / s.sales.net) * 100)}%`} icon={TrendingUp} tone="gold" />
              <StatCard label="Stock value at cost" value={loading ? "—" : formatPrice(s.inventory.value)} icon={Boxes} tone="gold" />
              {!loading && s.inventory.uncosted > 0 && (
                <p className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle size={15} className="shrink-0" />
                  {s.inventory.uncosted} product{s.inventory.uncosted === 1 ? " has" : "s have"} no unit cost, so cost of goods and stock value are understated. Set costs on the Stock page.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <div className="mt-10 flex gap-1 border-b border-zs-beigeLine">
        {[["ledger", "Cash ledger"], ["cod", "COD settlements"], ["refunds", "Refunds owed"]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={"-mb-px border-b-2 px-4 py-2.5 text-sm font-medium " + (tab === key ? "border-zs-gold text-zs-charcoal" : "border-transparent text-zs-charcoal/50 hover:text-zs-charcoal")}
          >
            {label}
            {key === "refunds" && s?.refundsOwed.count ? <span className="ml-1.5 rounded-full bg-red-100 px-1.5 text-xs text-red-700">{s.refundsOwed.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "ledger" && <Ledger range={range} />}
        {tab === "cod" && <CodSettlements onChanged={reload} />}
        {tab === "refunds" && <RefundsOwed onChanged={reload} />}
      </div>
    </div>
  );
};

const Ledger = ({ range }) => {
  const [type, setType] = useState("");
  const { data, loading, error, reload } = useAdminResource(() => getCashLedger({ ...range, type: type || undefined }), [range.from, range.to, type]);
  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Select aria-label="Entry type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All entries</option>
          {Object.entries(ENTRY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="No money moved in this period"
        rows={data}
        columns={[
          { key: "occurred_at", label: "Date", render: (e) => <span className="whitespace-nowrap text-xs">{new Date(e.occurred_at).toLocaleString()}</span> },
          { key: "type", label: "Entry", render: (e) => (
            <div>
              <p className="font-medium">{ENTRY_LABEL[e.type] || e.type}</p>
              {e.note ? <p className="text-xs text-zs-charcoal/55">{e.note}</p> : null}
            </div>
          ) },
          { key: "order_id", label: "Order", render: (e) => e.order_id ? `#${e.order_id}` : <span className="text-zs-charcoal/30">—</span> },
          { key: "account", label: "Account", render: (e) => ACCOUNT_LABEL[e.account] || e.account },
          { key: "in", label: "In", className: "text-right", render: (e) => e.direction === "in" ? <b className="tabular-nums text-emerald-700">{formatPrice(e.amount)}</b> : null },
          { key: "out", label: "Out", className: "text-right", render: (e) => e.direction === "out" ? <b className="tabular-nums text-red-700">{formatPrice(e.amount)}</b> : null },
        ]}
      />
    </div>
  );
};

const CodSettlements = ({ onChanged }) => {
  const { data: unsettled, loading, error, reload } = useAdminResource(getUnsettledCod, []);
  const { data: history, loading: historyLoading, reload: reloadHistory } = useAdminResource(getRemittances, []);
  const { push } = useToast();
  const [courier, setCourier] = useState("all");
  const [selected, setSelected] = useState([]);
  const [payout, setPayout] = useState(null); // { fee, reference, account, received_at }
  const [busy, setBusy] = useState(false);

  const couriers = useMemo(() => [...new Set((unsettled || []).map((u) => u.courier))], [unsettled]);
  const rows = (unsettled || []).filter((u) => courier === "all" || u.courier === courier);
  const chosen = (unsettled || []).filter((u) => selected.includes(u.order_id));
  const gross = chosen.reduce((sum, u) => sum + u.amount, 0);
  const toggle = (orderId) => setSelected((sel) => (sel.includes(orderId) ? sel.filter((id) => id !== orderId) : [...sel, orderId]));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await recordRemittance({ order_ids: selected, fee_amount: Number(payout.fee) || 0, reference: payout.reference, account: payout.account, received_at: payout.received_at });
      push(`Payout recorded: ${formatPrice(gross - (Number(payout.fee) || 0))} received.`, "success");
      setPayout(null);
      setSelected([]);
      reload();
      reloadHistory();
      onChanged?.();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't record the payout.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-zs-charcoal/60">
        Delivered cash-on-delivery orders the courier hasn't paid you for yet. When a payout arrives, tick the orders it covers and record it.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select aria-label="Courier" value={courier} onChange={(e) => { setCourier(e.target.value); setSelected([]); }}>
            <option value="all">All couriers</option>
            {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        {rows.length > 0 && (
          <Button variant="secondary" onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.order_id))}>
            {selected.length === rows.length ? "Clear selection" : "Select all"}
          </Button>
        )}
        <Button
          variant="gold"
          disabled={!selected.length}
          onClick={() => setPayout({ fee: "", reference: "", account: "bank", received_at: iso(new Date()) })}
          className="ml-auto"
        >
          Record payout{selected.length ? ` · ${formatPrice(gross)}` : ""}
        </Button>
      </div>

      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="Nothing waiting"
        emptyDescription="Every delivered COD order has been paid over by its courier."
        rows={rows}
        onRowClick={(r) => toggle(r.order_id)}
        columns={[
          { key: "pick", label: "", render: (r) => <input type="checkbox" aria-label={`Select order ${r.order_id}`} className="h-4 w-4 accent-zs-gold" checked={selected.includes(r.order_id)} onChange={() => toggle(r.order_id)} onClick={(e) => e.stopPropagation()} /> },
          { key: "order_id", label: "Order", render: (r) => <span className="font-medium">#{r.order_id}</span> },
          { key: "courier", label: "Courier", render: (r) => <span>{r.courier}{r.tracking_number ? <span className="ml-1 font-mono text-xs text-zs-charcoal/50">{r.tracking_number}</span> : null}</span> },
          { key: "delivered_at", label: "Delivered", render: (r) => r.delivered_at ? new Date(r.delivered_at).toLocaleDateString() : "—" },
          { key: "amount", label: "Collected", className: "text-right", render: (r) => <b className="tabular-nums">{formatPrice(r.amount)}</b> },
        ]}
      />

      <h3 className="mb-3 mt-8 text-sm font-medium text-zs-charcoal">Payouts received</h3>
      <DataTable
        loading={historyLoading}
        emptyTitle="No payouts recorded yet"
        rows={history}
        columns={[
          { key: "received_at", label: "Date", render: (r) => new Date(r.received_at).toLocaleDateString() },
          { key: "courier", label: "Courier", render: (r) => <span>{r.courier}{r.is_legacy ? <span className="ml-1 text-xs text-zs-charcoal/50">(before tracking)</span> : null}</span> },
          { key: "reference", label: "Reference", render: (r) => r.reference || "—" },
          { key: "orders", label: "Orders" },
          { key: "gross_amount", label: "Collected", className: "text-right", render: (r) => <span className="tabular-nums">{formatPrice(r.gross_amount)}</span> },
          { key: "fee_amount", label: "Fee", className: "text-right", render: (r) => <span className="tabular-nums text-red-700">{r.fee_amount ? `−${formatPrice(r.fee_amount)}` : "—"}</span> },
          { key: "net_amount", label: "Received", className: "text-right", render: (r) => <b className="tabular-nums">{formatPrice(r.net_amount)}</b> },
        ]}
      />

      <Modal
        open={!!payout}
        onClose={() => setPayout(null)}
        title="Record courier payout"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayout(null)}>Cancel</Button>
            <Button type="submit" form="payout-form" variant="gold" loading={busy}>Record payout</Button>
          </>
        }
      >
        {payout && (
          <form id="payout-form" onSubmit={submit}>
            <dl className="mb-4 grid grid-cols-2 gap-y-1.5 rounded-xl bg-zs-beige/40 p-4 text-sm">
              <dt className="text-zs-charcoal/60">Orders</dt><dd className="text-right">{chosen.length}</dd>
              <dt className="text-zs-charcoal/60">Cash collected</dt><dd className="text-right tabular-nums">{formatPrice(gross)}</dd>
              <dt className="text-zs-charcoal/60">Courier fee</dt><dd className="text-right tabular-nums text-red-700">−{formatPrice(Number(payout.fee) || 0)}</dd>
              <dt className="font-semibold">You receive</dt><dd className="text-right font-semibold tabular-nums">{formatPrice(gross - (Number(payout.fee) || 0))}</dd>
            </dl>
            <FormField label="Courier fee deducted (PKR)" htmlFor="po-fee" hint="Delivery and COD charges taken out of this payout.">
              <TextInput id="po-fee" type="number" min="0" step="0.01" data-autofocus value={payout.fee} onChange={(e) => setPayout((p) => ({ ...p, fee: e.target.value }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Received in" htmlFor="po-account">
                <Select id="po-account" value={payout.account} onChange={(e) => setPayout((p) => ({ ...p, account: e.target.value }))}>
                  {ACCOUNT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Date received" htmlFor="po-date">
                <TextInput id="po-date" type="date" value={payout.received_at} onChange={(e) => setPayout((p) => ({ ...p, received_at: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Payout reference" htmlFor="po-ref" hint="The courier's payment or invoice number.">
              <TextInput id="po-ref" value={payout.reference} onChange={(e) => setPayout((p) => ({ ...p, reference: e.target.value }))} />
            </FormField>
          </form>
        )}
      </Modal>
    </div>
  );
};

const RefundsOwed = ({ onChanged }) => {
  const { data, loading, error, reload } = useAdminResource(getRefundsDue, []);
  const { push } = useToast();
  const [paying, setPaying] = useState(null); // { refund, method, reference, account }
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await completeRefund(paying.refund.id, { method: paying.method, reference: paying.reference, account: paying.account });
      push(`Refund for order #${paying.refund.order_id} recorded.`, "success");
      setPaying(null);
      reload();
      onChanged?.();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't complete the refund.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-zs-charcoal/60">
        Paid orders that were cancelled. Send the money back, then record it here. Refunds for returns are handled on the Returns page.
      </p>
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="No refunds owed"
        rows={data}
        columns={[
          { key: "order_id", label: "Order", render: (r) => <span className="font-medium">#{r.order_id}</span> },
          { key: "email", label: "Customer" },
          { key: "payment_method", label: "Paid by", render: (r) => r.payment_method === "jazzcash" ? "JazzCash" : r.payment_method },
          { key: "created_at", label: "Owed since", render: (r) => new Date(r.created_at).toLocaleDateString() },
          { key: "amount", label: "Amount", className: "text-right", render: (r) => <b className="tabular-nums">{formatPrice(r.amount)}</b> },
          { key: "actions", label: "", className: "text-right", render: (r) => (
            <Button variant="secondary" onClick={() => setPaying({ refund: r, method: r.jazzcash_refundable ? "jazzcash_api" : "manual_transfer", reference: "", account: r.payment_method === "jazzcash" ? "jazzcash" : "bank" })}>
              Refund
            </Button>
          ) },
        ]}
      />

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Refund order #${paying.refund.order_id}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>Cancel</Button>
            <Button type="submit" form="refund-form" variant="gold" loading={busy}>
              {paying?.method === "jazzcash_api" ? `Send ${formatPrice(paying.refund.amount)} via JazzCash` : "Record refund"}
            </Button>
          </>
        }
      >
        {paying && (
          <form id="refund-form" onSubmit={submit}>
            <p className="mb-4 text-sm text-zs-charcoal/60">{paying.refund.email} · <b>{formatPrice(paying.refund.amount)}</b></p>
            <FormField label="How" htmlFor="rf-method">
              <Select id="rf-method" value={paying.method} onChange={(e) => setPaying((p) => ({ ...p, method: e.target.value }))}>
                {paying.refund.jazzcash_refundable && <option value="jazzcash_api">Refund to their JazzCash automatically</option>}
                <option value="manual_transfer">I sent it myself (bank / wallet transfer)</option>
              </Select>
            </FormField>
            {paying.method === "manual_transfer" && (
              <>
                <FormField label="Sent from" htmlFor="rf-account">
                  <Select id="rf-account" value={paying.account} onChange={(e) => setPaying((p) => ({ ...p, account: e.target.value }))}>
                    {ACCOUNT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </Select>
                </FormField>
                <FormField label="Transfer reference" htmlFor="rf-ref" required>
                  <TextInput id="rf-ref" required minLength={3} data-autofocus value={paying.reference} onChange={(e) => setPaying((p) => ({ ...p, reference: e.target.value }))} />
                </FormField>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};
