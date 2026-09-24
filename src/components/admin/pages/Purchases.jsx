import { useMemo, useState } from "react";
import { Plus, Trash2, Truck, Receipt, Clock } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FormField, TextInput, TextArea, Select } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getPurchases, createPurchase, payPurchase, getStock } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { ACCOUNT_OPTIONS } from "../utils/finance";

const today = () => new Date().toISOString().slice(0, 10);
const newLine = () => ({ key: Math.random().toString(36).slice(2), product_id: "", selected_size: "", selected_color: "", quantity: "", unit_cost: "" });
const emptyForm = () => ({ supplier: "", invoice_ref: "", purchased_at: today(), note: "", paid: true, account: "bank", items: [newLine()] });

export const Purchases = () => {
  const { data: purchases, loading, error, reload } = useAdminResource(getPurchases, []);
  const { data: stock } = useAdminResource(getStock, []);
  const { push } = useToast();
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null); // { purchase, account, paid_at }
  const [busy, setBusy] = useState(false);

  const products = stock?.products || [];
  const summary = useMemo(() => {
    const list = purchases || [];
    const unpaid = list.filter((p) => p.payment_status === "unpaid");
    const monthStart = today().slice(0, 7);
    return {
      month: list.filter((p) => String(p.purchased_at).slice(0, 7) === monthStart).reduce((s, p) => s + p.total_cost, 0),
      unpaid: unpaid.reduce((s, p) => s + p.total_cost, 0),
      unpaidCount: unpaid.length,
      count: list.length,
    };
  }, [purchases]);

  const formTotal = (form?.items || []).reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const setLine = (key, patch) => setForm((f) => ({ ...f, items: f.items.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createPurchase({
        supplier: form.supplier,
        invoice_ref: form.invoice_ref,
        purchased_at: form.purchased_at,
        note: form.note,
        paid: form.paid,
        account: form.paid ? form.account : undefined,
        items: form.items.filter((l) => l.product_id).map((l) => ({ product_id: Number(l.product_id), selected_size: l.selected_size, selected_color: l.selected_color, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) })),
      });
      push("Purchase recorded and stock received.", "success");
      setForm(null);
      reload();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't record this purchase.", "error");
    } finally {
      setBusy(false);
    }
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await payPurchase(paying.purchase.id, { account: paying.account, paid_at: paying.paid_at });
      push("Supplier payment recorded.", "success");
      setPaying(null);
      reload();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't record the payment.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Stock you buy from suppliers. Recording a purchase adds the units to stock and sets their cost."
        actions={<Button variant="gold" icon={Plus} onClick={() => setForm(emptyForm())}>New purchase</Button>}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Bought this month" value={loading ? "—" : formatPrice(summary.month)} icon={Truck} tone="gold" />
        <StatCard label="Owed to suppliers" value={loading ? "—" : formatPrice(summary.unpaid)} icon={Clock} tone="gold" />
        <StatCard label="Purchases recorded" value={loading ? "—" : summary.count} icon={Receipt} tone="gold" />
      </div>

      <section className="mt-8">
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No purchases yet"
          emptyDescription="Record the stock you buy so on-hand units, cost and profit stay accurate."
          rows={purchases}
          onRowClick={setViewing}
          columns={[
            { key: "purchased_at", label: "Date", render: (p) => new Date(p.purchased_at).toLocaleDateString() },
            { key: "supplier", label: "Supplier", render: (p) => <span className="font-medium">{p.supplier}</span> },
            { key: "invoice_ref", label: "Invoice", render: (p) => p.invoice_ref || <span className="text-zs-charcoal/30">—</span> },
            { key: "items", label: "Products", render: (p) => `${p.items.reduce((s, i) => s + i.quantity, 0)} units · ${p.items.length} product${p.items.length === 1 ? "" : "s"}` },
            { key: "total_cost", label: "Total", className: "text-right", render: (p) => <b className="tabular-nums">{formatPrice(p.total_cost)}</b> },
            { key: "payment_status", label: "Payment", render: (p) => <StatusBadge value={p.payment_status} /> },
            { key: "actions", label: "", className: "text-right", render: (p) => p.payment_status === "unpaid" ? (
              <span onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" onClick={() => setPaying({ purchase: p, account: "bank", paid_at: today() })}>Mark paid</Button>
              </span>
            ) : null },
          ]}
        />
      </section>

      {/* New purchase */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="New purchase"
        size="lg"
        footer={
          <>
            <span className="mr-auto text-sm text-zs-charcoal/60">Total <b className="zs-display text-base text-zs-charcoal">{formatPrice(formTotal)}</b></span>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit" form="purchase-form" variant="gold" loading={busy}>Receive stock</Button>
          </>
        }
      >
        {form && (
          <form id="purchase-form" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Supplier" htmlFor="pu-supplier" required>
                <TextInput id="pu-supplier" required data-autofocus value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
              </FormField>
              <FormField label="Invoice / bill no." htmlFor="pu-invoice">
                <TextInput id="pu-invoice" value={form.invoice_ref} onChange={(e) => setForm((f) => ({ ...f, invoice_ref: e.target.value }))} />
              </FormField>
              <FormField label="Date received" htmlFor="pu-date" required>
                <TextInput id="pu-date" type="date" required value={form.purchased_at} onChange={(e) => setForm((f) => ({ ...f, purchased_at: e.target.value }))} />
              </FormField>
            </div>

            <p className="mb-2 text-sm font-medium text-zs-charcoal">Products</p>
            <div className="mb-4 space-y-2.5">
              {form.items.map((line) => (
                <div key={line.key} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-7">
                  {(() => { const product = products.find((p) => String(p.id) === String(line.product_id)); const sizes = [...new Set((product?.variants || []).map((v) => v.size).filter(Boolean))]; const colors = [...new Set((product?.variants || []).map((v) => v.color).filter(Boolean))]; return product?.variants?.length ? <>
                    {sizes.length > 0 && <Select className="order-2" aria-label="Size" required value={line.selected_size} onChange={(e) => setLine(line.key, { selected_size: e.target.value })}><option value="">Size</option>{sizes.map((v) => <option key={v} value={v}>{v}</option>)}</Select>}
                    {colors.length > 0 && <Select className="order-3" aria-label="Color" required value={line.selected_color} onChange={(e) => setLine(line.key, { selected_color: e.target.value })}><option value="">Color</option>{colors.map((v) => <option key={v} value={v}>{v}</option>)}</Select>}
                  </> : null; })()}
                  <Select className="order-1 sm:col-span-2" aria-label="Product" required value={line.product_id} onChange={(e) => setLine(line.key, { product_id: e.target.value, selected_size: "", selected_color: "" })}>
                    <option value="">Choose product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (on hand {p.on_hand})</option>)}
                  </Select>
                  <TextInput className="order-4" aria-label="Quantity" type="number" min="1" required placeholder="Qty" value={line.quantity} onChange={(e) => setLine(line.key, { quantity: e.target.value })} />
                  <TextInput className="order-5" aria-label="Unit cost" type="number" min="0" step="0.01" required placeholder="Unit cost" value={line.unit_cost} onChange={(e) => setLine(line.key, { unit_cost: e.target.value })} />
                  <button
                    className="order-6 flex h-9 w-9 items-center justify-center rounded-lg text-zs-charcoal/50 hover:bg-zs-beige disabled:opacity-30"
                    type="button"
                    aria-label="Remove line"
                    disabled={form.items.length === 1}
                    onClick={() => setForm((f) => ({ ...f, items: f.items.filter((l) => l.key !== line.key) }))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button type="button" variant="ghost" icon={Plus} onClick={() => setForm((f) => ({ ...f, items: [...f.items, newLine()] }))}>Add product</Button>
            </div>

            <div className="mb-4 rounded-2xl border border-zs-beigeLine p-4">
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-zs-gold" checked={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
                <span className="font-medium text-zs-charcoal">Paid the supplier now</span>
              </label>
              {form.paid ? (
                <div className="mt-3 max-w-xs">
                  <FormField label="Paid from" htmlFor="pu-account">
                    <Select id="pu-account" value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}>
                      {ACCOUNT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </Select>
                  </FormField>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zs-charcoal/55">It will show under "Owed to suppliers" until you mark it paid.</p>
              )}
            </div>

            <FormField label="Note" htmlFor="pu-note">
              <TextArea id="pu-note" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </FormField>
          </form>
        )}
      </Modal>

      {/* View */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Purchase #${viewing.id} — ${viewing.supplier}` : ""} size="md">
        {viewing && (
          <div className="text-sm">
            <p className="mb-3 text-zs-charcoal/60">
              {new Date(viewing.purchased_at).toLocaleDateString()}{viewing.invoice_ref ? ` · Invoice ${viewing.invoice_ref}` : ""} ·{" "}
              {viewing.payment_status === "paid" ? `Paid${viewing.paid_account ? ` from ${viewing.paid_account}` : ""}${viewing.paid_at ? ` on ${new Date(viewing.paid_at).toLocaleDateString()}` : ""}` : "Not paid yet"}
            </p>
            <div className="divide-y divide-zs-beigeLine rounded-xl border border-zs-beigeLine">
              {viewing.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3">
                  <span>{i.name}{(i.selected_size || i.selected_color) && <span className="block text-xs text-zs-charcoal/55">{[i.selected_size && `Size ${i.selected_size}`, i.selected_color && `Color ${i.selected_color}`].filter(Boolean).join(" · ")}</span>} <span className="text-zs-charcoal/50">× {i.quantity} @ {formatPrice(i.unit_cost)}</span></span>
                  <b className="tabular-nums">{formatPrice(i.quantity * i.unit_cost)}</b>
                </div>
              ))}
            </div>
            <p className="mt-3 text-right">Total <b className="zs-display text-base">{formatPrice(viewing.total_cost)}</b></p>
            {viewing.note ? <p className="mt-3 rounded-xl bg-zs-beige/40 p-3 text-zs-charcoal/70">{viewing.note}</p> : null}
          </div>
        )}
      </Modal>

      {/* Pay */}
      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Record supplier payment"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>Cancel</Button>
            <Button type="submit" form="pay-form" loading={busy}>Record payment</Button>
          </>
        }
      >
        {paying && (
          <form id="pay-form" onSubmit={submitPay}>
            <p className="mb-4 text-sm text-zs-charcoal/60">{paying.purchase.supplier} · {formatPrice(paying.purchase.total_cost)}</p>
            <FormField label="Paid from" htmlFor="pay-account">
              <Select id="pay-account" value={paying.account} onChange={(e) => setPaying((p) => ({ ...p, account: e.target.value }))}>
                {ACCOUNT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Date paid" htmlFor="pay-date">
              <TextInput id="pay-date" type="date" value={paying.paid_at} onChange={(e) => setPaying((p) => ({ ...p, paid_at: e.target.value }))} />
            </FormField>
          </form>
        )}
      </Modal>
    </div>
  );
};
