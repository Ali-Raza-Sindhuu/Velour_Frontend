import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Lock, Wallet, AlertTriangle, SlidersHorizontal, BadgeDollarSign, History, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SearchInput } from "../components/ui/SearchInput";
import { FilterSelect } from "../components/ui/FilterSelect";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FormField, TextInput, TextArea, Select } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getStock, getStockMovements, adjustStock, setUnitCost, reconcileStock } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";

const LEVELS = [
  { value: "all", label: "All stock levels" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "uncosted", label: "No unit cost set" },
];

const REASONS = [
  { value: "count_correction", label: "Stock count correction" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost / stolen" },
  { value: "found", label: "Found" },
  { value: "sample", label: "Used as tester / sample" },
  { value: "other", label: "Other" },
];

// What each stock-card line means, in the admin's words.
const MOVEMENT_LABEL = {
  opening: "Opening stock",
  purchase: "Purchase received",
  adjustment: "Adjustment",
  cost_update: "Unit cost changed",
  reserve: "Reserved for order",
  release: "Released — order cancelled",
  ship: "Shipped",
  unship: "Returned by courier",
  return_restock: "Customer return — restocked",
  return_scrap: "Customer return — written off",
};

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "—");
const tone = (n) => (n > 0 ? "text-emerald-700" : n < 0 ? "text-red-700" : "text-zs-charcoal/35");

const reference = (m) => {
  if (m.ref_type === "order") return `Order #${m.ref_id}`;
  if (m.ref_type === "return") return `Return #${m.ref_id}`;
  if (m.ref_type === "purchase") return `Purchase #${m.ref_id}`;
  return null;
};

export const Stock = () => {
  const { data, loading, error, reload } = useAdminResource(getStock, []);
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [adjusting, setAdjusting] = useState(null); // { product, direction, qty, reason, note }
  const [costing, setCosting] = useState(null); // { product, cost }
  const [card, setCard] = useState(null); // { product, rows, loading, page, total }
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const products = useMemo(() => data?.products || [], [data]);
  const filtered = useMemo(() => products.filter((p) => {
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
    const matchesLevel = level === "all" || (level === "uncosted" ? p.avg_cost === 0 && p.on_hand > 0 : p.level === level);
    return matchesQuery && matchesLevel;
  }), [products, query, level]);

  const totals = useMemo(() => ({
    onHand: products.reduce((s, p) => s + Number(p.on_hand), 0),
    reserved: products.reduce((s, p) => s + Number(p.reserved), 0),
    value: products.reduce((s, p) => s + Number(p.value), 0),
    attention: products.filter((p) => p.level !== "in_stock" && p.status === "active").length,
    uncosted: products.filter((p) => p.avg_cost === 0 && p.on_hand > 0).length,
  }), [products]);

  const openCard = async (product, page = 1) => {
    setCard({ product, rows: [], loading: true, page, total: 0 });
    try {
      const result = await getStockMovements(product.id, page);
      setCard({ product, rows: result.movements, loading: false, page, total: result.pagination.total, summary: result.product });
    } catch {
      push("Couldn't load the stock card.", "error");
      setCard(null);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    const qty = Math.trunc(Number(adjusting.qty));
    if (!(qty > 0)) return push("Enter how many units.", "error");
    setBusy(true);
    try {
      await adjustStock(adjusting.product.id, { delta: adjusting.direction === "remove" ? -qty : qty, reason: adjusting.reason, note: adjusting.note, selected_size: adjusting.selected_size || "", selected_color: adjusting.selected_color || "" });
      push(`Stock for ${adjusting.product.name} updated.`, "success");
      setAdjusting(null);
      reload();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't adjust stock.", "error");
    } finally {
      setBusy(false);
    }
  };

  const submitCost = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await setUnitCost(costing.product.id, Number(costing.cost));
      push(`Unit cost for ${costing.product.name} saved.`, "success");
      setCosting(null);
      reload();
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't save the unit cost.", "error");
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const result = await reconcileStock();
      if (result.ok) push("Stock check passed: every product matches its stock card.", "success");
      else push(`Stock check found ${result.ledgerDrift.length + result.reservedDrift.length} mismatch(es). Contact your developer.`, "error");
    } catch {
      push("Couldn't run the stock check.", "error");
    } finally {
      setChecking(false);
    }
  };

  const stopRow = (e) => e.stopPropagation();

  return (
    <div>
      <PageHeader
        title="Stock"
        description="What you hold, what's promised to orders, and what's free to sell. Click a product to see every movement."
        actions={
          <>
            <Button variant="secondary" icon={ShieldCheck} loading={checking} onClick={runCheck}>Check stock</Button>
            <Link to="/adminDashboard/purchases" className="inline-flex items-center gap-2 rounded-xl bg-zs-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-zs-gold/90">
              <Truck size={16} strokeWidth={2} /> Receive stock
            </Link>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units on hand" value={loading ? "—" : totals.onHand.toLocaleString()} icon={Boxes} tone="gold" />
        <StatCard label="Reserved for orders" value={loading ? "—" : totals.reserved.toLocaleString()} icon={Lock} tone="gold" />
        <StatCard label="Stock value (at cost)" value={loading ? "—" : formatPrice(totals.value)} icon={Wallet} tone="gold" />
        <StatCard label="Low or out of stock" value={loading ? "—" : totals.attention} icon={AlertTriangle} tone="gold" />
      </div>

      {!loading && totals.uncosted > 0 && (
        <button
          type="button"
          onClick={() => setLevel("uncosted")}
          className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 hover:bg-amber-100"
        >
          <b>{totals.uncosted} product{totals.uncosted === 1 ? " has" : "s have"} no unit cost.</b> Set what you paid per unit so stock value and profit are accurate.
        </button>
      )}

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search products…" /></div>
        <FilterSelect label="Stock level" value={level} onChange={setLevel} options={LEVELS} />
      </div>

      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="No products match"
        rows={filtered}
        onRowClick={(p) => openCard(p)}
        columns={[
          { key: "name", label: "Product", render: (p) => (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zs-beigeLine bg-zs-beige/50">
                {p.image_url ? <img src={resolveImg(p.image_url)} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-zs-charcoal/50">{p.category_name || "Uncategorised"}{p.status !== "active" ? ` · ${p.status}` : ""}</p>
              </div>
            </div>
          ) },
          { key: "on_hand", label: "On hand", className: "text-right", render: (p) => <span className="tabular-nums">{p.on_hand}</span> },
          { key: "reserved", label: "Reserved", className: "text-right", render: (p) => <span className="tabular-nums text-zs-charcoal/60">{p.reserved}</span> },
          { key: "available", label: "Available", className: "text-right", render: (p) => <b className="tabular-nums">{p.available}</b> },
          { key: "avg_cost", label: "Unit cost", className: "text-right", render: (p) => p.avg_cost > 0 ? <span className="tabular-nums">{formatPrice(p.avg_cost)}</span> : <span className="text-amber-700">Not set</span> },
          { key: "value", label: "Value", className: "text-right", render: (p) => <span className="tabular-nums">{formatPrice(p.value)}</span> },
          { key: "level", label: "Level", render: (p) => <StatusBadge value={p.level} /> },
          { key: "actions", label: "", className: "text-right", render: (p) => (
            <div className="flex justify-end gap-1.5" onClick={stopRow}>
              <button type="button" title="Adjust stock" onClick={() => setAdjusting({ product: p, direction: "remove", qty: "", reason: "count_correction", note: "" })} className="rounded-lg p-2 text-zs-charcoal/60 hover:bg-zs-beige hover:text-zs-charcoal">
                <SlidersHorizontal size={16} />
              </button>
              <button type="button" title="Set unit cost" onClick={() => setCosting({ product: p, cost: p.avg_cost ? String(p.avg_cost) : "" })} className="rounded-lg p-2 text-zs-charcoal/60 hover:bg-zs-beige hover:text-zs-charcoal">
                <BadgeDollarSign size={16} />
              </button>
              <button type="button" title="Stock card" onClick={() => openCard(p)} className="rounded-lg p-2 text-zs-charcoal/60 hover:bg-zs-beige hover:text-zs-charcoal">
                <History size={16} />
              </button>
            </div>
          ) },
        ]}
      />

      <p className="mt-5 rounded-2xl bg-zs-beige/40 px-4 py-3 text-xs leading-relaxed text-zs-charcoal/60">
        <b>On hand</b> is everything physically in your stock. <b>Reserved</b> units belong to orders that haven't shipped yet. <b>Available</b> is what customers can still buy.
        Placing an order moves units from available to reserved; shipping takes them out of stock; a cancellation puts them back on sale.
      </p>

      {/* Adjust */}
      <Modal
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Adjust stock — ${adjusting.product.name}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjusting(null)}>Cancel</Button>
            <Button type="submit" form="adjust-form" loading={busy}>Save adjustment</Button>
          </>
        }
      >
        {adjusting && (
          <form id="adjust-form" onSubmit={submitAdjust}>
            <p className="mb-4 text-sm text-zs-charcoal/60">
              On hand {adjusting.product.on_hand} · Reserved {adjusting.product.reserved} · Available {adjusting.product.available}
            </p>
            {adjusting.product.variants?.length > 0 && (() => {
              const sizes = [...new Set(adjusting.product.variants.map((v) => v.size).filter(Boolean))];
              const colors = [...new Set(adjusting.product.variants.map((v) => v.color).filter(Boolean))];
              return <div className="mb-4 grid grid-cols-2 gap-4">
                {sizes.length > 0 && <FormField label="Size" htmlFor="adj-size" required><Select id="adj-size" required value={adjusting.selected_size ?? ""} onChange={(e) => setAdjusting((a) => ({ ...a, selected_size: e.target.value }))}><option value="">Choose size</option>{sizes.map((v) => <option key={v} value={v}>{v}</option>)}</Select></FormField>}
                {colors.length > 0 && <FormField label="Color" htmlFor="adj-color" required><Select id="adj-color" required value={adjusting.selected_color ?? ""} onChange={(e) => setAdjusting((a) => ({ ...a, selected_color: e.target.value }))}><option value="">Choose color</option>{colors.map((v) => <option key={v} value={v}>{v}</option>)}</Select></FormField>}
              </div>;
            })()}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Change" htmlFor="adj-direction">
                <Select id="adj-direction" value={adjusting.direction} onChange={(e) => setAdjusting((a) => ({ ...a, direction: e.target.value }))}>
                  <option value="remove">Remove units</option>
                  <option value="add">Add units</option>
                </Select>
              </FormField>
              <FormField label="Units" htmlFor="adj-qty" required>
                <TextInput id="adj-qty" type="number" min="1" required data-autofocus value={adjusting.qty} onChange={(e) => setAdjusting((a) => ({ ...a, qty: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Reason" htmlFor="adj-reason" required>
              <Select id="adj-reason" value={adjusting.reason} onChange={(e) => setAdjusting((a) => ({ ...a, reason: e.target.value }))}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Note" htmlFor="adj-note" hint="Optional — e.g. which shelf count this came from.">
              <TextArea id="adj-note" rows={2} value={adjusting.note} onChange={(e) => setAdjusting((a) => ({ ...a, note: e.target.value }))} />
            </FormField>
            <p className="text-xs text-zs-charcoal/55">
              Buying new stock? Record it as a <Link to="/adminDashboard/purchases" className="font-medium text-zs-gold underline">purchase</Link> instead, so its cost is tracked.
            </p>
          </form>
        )}
      </Modal>

      {/* Unit cost */}
      <Modal
        open={!!costing}
        onClose={() => setCosting(null)}
        title={costing ? `Unit cost — ${costing.product.name}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCosting(null)}>Cancel</Button>
            <Button type="submit" form="cost-form" loading={busy}>Save cost</Button>
          </>
        }
      >
        {costing && (
          <form id="cost-form" onSubmit={submitCost}>
            <FormField label="Cost per unit (PKR)" htmlFor="cost-value" required hint="What you paid per unit for the stock you hold now. New purchases are averaged in automatically.">
              <TextInput id="cost-value" type="number" min="0" step="0.01" required data-autofocus value={costing.cost} onChange={(e) => setCosting((c) => ({ ...c, cost: e.target.value }))} />
            </FormField>
          </form>
        )}
      </Modal>

      {/* Stock card */}
      <Modal open={!!card} onClose={() => setCard(null)} title={card ? `Stock card — ${card.product.name}` : ""} size="xl">
        {card && (
          <div>
            {card.summary && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["On hand", card.summary.on_hand],
                  ["Reserved", card.summary.reserved],
                  ["Available", card.summary.available],
                  ["Unit cost", formatPrice(card.summary.avg_cost)],
                  ["Value", formatPrice(card.summary.value)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-zs-beige/40 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-zs-charcoal/45">{label}</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-zs-charcoal">{value}</p>
                  </div>
                ))}
              </div>
            )}
            <DataTable
              loading={card.loading}
              emptyTitle="No movements yet"
              rows={card.rows}
              columns={[
                { key: "created_at", label: "When", render: (m) => <span className="whitespace-nowrap text-xs">{new Date(m.created_at).toLocaleString()}</span> },
                { key: "type", label: "Movement", render: (m) => (
                  <div>
                    <p className="font-medium">{MOVEMENT_LABEL[m.type] || m.type}</p>
                    {m.note ? <p className="text-xs text-zs-charcoal/55">{m.note}</p> : null}
                  </div>
                ) },
                { key: "ref", label: "Reference", render: (m) => <span className="text-xs">{reference(m) || "—"}</span> },
                { key: "available_change", label: "Available", className: "text-right", render: (m) => <span className={"tabular-nums " + tone(m.available_change)}>{signed(m.available_change)}</span> },
                { key: "reserved_change", label: "Reserved", className: "text-right", render: (m) => <span className={"tabular-nums " + tone(m.reserved_change)}>{signed(m.reserved_change)}</span> },
                { key: "after", label: "On hand after", className: "text-right", render: (m) => <b className="tabular-nums">{m.available_after + m.reserved_after}</b> },
                { key: "unit_cost", label: "Cost", className: "text-right", render: (m) => m.unit_cost != null ? <span className="tabular-nums text-xs">{formatPrice(m.unit_cost)}</span> : "—" },
                { key: "by", label: "By", render: (m) => <span className="text-xs text-zs-charcoal/55">{m.admin_name || (["reserve", "release"].includes(m.type) ? "Checkout" : "System")}</span> },
              ]}
            />
            {card.total > card.rows.length && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zs-charcoal/55">Page {card.page} · {card.total} movements</span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={card.page <= 1} onClick={() => openCard(card.product, card.page - 1)}>Newer</Button>
                  <Button variant="secondary" disabled={card.page * 50 >= card.total} onClick={() => openCard(card.product, card.page + 1)}>Older</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
