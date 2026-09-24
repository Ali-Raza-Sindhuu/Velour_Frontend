import { useMemo, useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Users, ShoppingBag, Wallet, Repeat } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { SearchInput } from "../components/ui/SearchInput";
import { useAdminResource } from "../hooks/useAdminResource";
import { getCustomers } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { Modal } from "../components/ui/Modal";

const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed customer";
const initials = (c) => {
  const letters = `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`.toUpperCase();
  return letters || c.email?.slice(0, 2).toUpperCase() || "?";
};
const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : value || "—";
};
// 03001234567 / +92 300 1234567 -> 923001234567 for wa.me links.
const whatsappNumber = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  return digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
};

const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zs-charcoal/50 ring-1 ring-zs-beigeLine">
      <Icon size={14} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wide text-zs-charcoal/45">{label}</p>
      <div className="text-sm text-zs-charcoal">{children}</div>
    </div>
  </div>
);

export const Customers = () => {
  const { data: customers, loading, error, reload } = useAdminResource(getCustomers, []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (customers || []).filter((c) =>
      !query || [fullName(c), c.email, c.phone].some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [customers, query]);

  // Real totals from the customers loaded below, so the cards match the table.
  const summary = useMemo(() => {
    const list = customers || [];
    return {
      total: list.length,
      orders: list.reduce((sum, c) => sum + Number(c.order_count || 0), 0),
      spend: list.reduce((sum, c) => sum + Number(c.total_spent || 0), 0),
      repeat: list.filter((c) => Number(c.order_count || 0) > 1).length,
    };
  }, [customers]);

  return (
    <div>
      <PageHeader title="Customers" description="See who's buying, how often, and how much they've spent." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={loading ? "—" : summary.total} icon={Users} tone="gold" />
        <StatCard label="Orders placed" value={loading ? "—" : summary.orders} icon={ShoppingBag} tone="gold" />
        <StatCard label="Lifetime spend" value={loading ? "—" : formatPrice(summary.spend)} icon={Wallet} tone="gold" />
        <StatCard label="Repeat customers" value={loading ? "—" : summary.repeat} icon={Repeat} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
              <Users size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">All customers</h2>
              <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Click a customer to see their contact details and spend.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-3xl border border-zs-beigeLine bg-white p-3 shadow-sm">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or phone…" label="Search customers" />
        </div>

        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No customers found"
          rows={filtered}
          onRowClick={setSelected}
          columns={[
            {
              key: "name", label: "Customer",
              render: (c) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zs-gold/15 text-[11px] font-bold text-zs-gold">{initials(c)}</span>
                  <span className="font-medium text-zs-charcoal">{fullName(c)}</span>
                </div>
              ),
            },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone", render: (c) => c.phone || <span className="text-zs-charcoal/30">—</span> },
            { key: "order_count", label: "Orders", render: (c) => <span className="tabular-nums">{c.order_count}</span> },
            { key: "joined_at", label: "Joined", render: (c) => formatDate(c.joined_at) },
            { key: "total_spent", label: "Lifetime spend", render: (c) => <b>{formatPrice(c.total_spent)}</b>, className: "text-right" },
          ]}
        />

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
            <span className="text-zs-charcoal/60">
              Showing {filtered.length} of {summary.total} customer{summary.total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </section>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Customer details" size="sm">
        {selected && (
          <div>
            <div className="mb-5 flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zs-gold/15 text-sm font-bold text-zs-gold">
                {initials(selected)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zs-charcoal">{fullName(selected)}</p>
                <p className="text-xs text-zs-charcoal/50">Customer since {formatDate(selected.joined_at)}</p>
              </div>
            </div>

            <div className="mb-4 space-y-3.5 rounded-2xl bg-zs-beige/40 p-4">
              <DetailRow icon={Phone} label="Phone">
                {selected.phone ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${selected.phone}`} className="font-medium hover:underline">{selected.phone}</a>
                    <a
                      href={`https://wa.me/${whatsappNumber(selected.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                    >
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  </div>
                ) : (
                  <span className="italic text-zs-charcoal/40">Not provided</span>
                )}
              </DetailRow>
              <DetailRow icon={Mail} label="Email">
                <a href={`mailto:${selected.email}`} className="break-all hover:underline">{selected.email}</a>
              </DetailRow>
              {selected.city || selected.country ? (
                <DetailRow icon={MapPin} label="Location">{[selected.city, selected.country].filter(Boolean).join(", ")}</DetailRow>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-zs-beigeLine p-4">
                <dt className="text-xs text-zs-charcoal/50">Orders placed</dt>
                <dd className="zs-display mt-1 text-lg font-semibold text-zs-charcoal">{selected.order_count}</dd>
              </div>
              <div className="rounded-2xl border border-zs-beigeLine p-4">
                <dt className="text-xs text-zs-charcoal/50">Lifetime spend</dt>
                <dd className="zs-display mt-1 text-lg font-semibold text-zs-charcoal">{formatPrice(selected.total_spent)}</dd>
              </div>
            </dl>
            {/* TODO(backend): list this customer's recent orders once GET /admin/customers/:id/orders exists. */}
          </div>
        )}
      </Modal>
    </div>
  );
};