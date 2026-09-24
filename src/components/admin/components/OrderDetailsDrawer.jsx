import { useEffect, useState } from "react";
import { X, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { getOrderItems, getOrderReturns, getOrderMoney } from "../api/adminService";
import { FulfillmentPanel } from "./FulfillmentPanel";
import { Link } from "react-router-dom";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";


// shipping_address may come back as an object or as a JSON string, depending
// on how the backend stores it.
const parseAddress = (raw) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : { street: raw };
    } catch {
      return { street: raw };
    }
  }
  return typeof raw === "object" ? raw : {};
};

const pick = (...values) => values.find((v) => v != null && String(v).trim() !== "");

/**
 * Collects the customer/contact info for an order from wherever the API puts
 * it: top-level order columns first, then the saved shipping address.
 */
export const getOrderContact = (order = {}) => {
  const addr = parseAddress(order.shipping_address ?? order.address);
  const accountName = [order.first_name, order.last_name].filter(Boolean).join(" ");

  return {
    name: pick(addr.fullName, addr.full_name, addr.name, accountName),
    email: pick(order.email, order.customer_email, addr.email),
    phone: pick(
      order.phone, order.customer_phone, order.contact_phone, order.shipping_phone, order.mobile,
      addr.phone, addr.phoneNumber, addr.phone_number, addr.mobile
    ),
    address: [
      pick(addr.street, addr.address, order.street, order.address_line),
      pick(addr.city, order.city),
      pick(addr.postalCode, addr.postal_code, order.postal_code),
      pick(addr.country, order.country),
    ].filter(Boolean).join(", "),
  };
};

// 03001234567 / +92 300 1234567 -> 923001234567 for wa.me links.
const whatsappNumber = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
};

const initials = (name, email) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email ? email.slice(0, 2).toUpperCase() : "?";
};

const Row = ({ icon: Icon, label, children }) => (
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

const NotProvided = () => <span className="italic text-zs-charcoal/40">Not provided</span>;

/**
 * order: a row from getOrders()
 * onClose: close the drawer
 * onStatusChange(order, newStatus): called after the status is saved, so the
 *   parent can update its own list/state.
 */
export const OrderDetailsDrawer = ({ order, onClose, onStatusChange }) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  const [money, setMoney] = useState(null);
  const [moneyVersion, setMoneyVersion] = useState(0);
  const orderId = order?.id;

  // Where this order's stock and money stand; refreshed after each fulfillment step.
  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;
    getOrderMoney(orderId).then((row) => !cancelled && setMoney(row)).catch(() => !cancelled && setMoney(null));
    return () => { cancelled = true; };
  }, [orderId, moneyVersion]);

  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;
    getOrderReturns(orderId).then((rows) => !cancelled && setReturns(rows || [])).catch(() => !cancelled && setReturns([]));
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (!order) return undefined;
    let cancelled = false;
    setItemsLoading(true);
    getOrderItems(order.id)
      .then((rows) => !cancelled && setItems(rows || []))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setItemsLoading(false));
    return () => { cancelled = true; };
  }, [order?.id]);

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  if (!order) return null;

  const contact = getOrderContact(order);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zs-charcoal/40"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.id} details`}
        className="h-full w-full max-w-md overflow-y-auto bg-[var(--zs-white)] p-6 shadow-zs"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="zs-display text-xl font-semibold text-zs-charcoal">Order #{order.id}</h2>
            {order.placed_at || order.created_at ? (
              <p className="mt-0.5 text-xs text-zs-charcoal/50">
                Placed {new Date(order.placed_at || order.created_at).toLocaleString()}
              </p>
            ) : null}
          </div>
          <button aria-label="Close order details" onClick={onClose} className="rounded-full p-1.5 text-zs-charcoal/50 hover:bg-zs-beige">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.payment_method} />
        </div>

        {/* Customer + contact */}
        <h3 className="mb-2 text-sm font-medium text-zs-charcoal">Customer</h3>
        <div className="mb-5 rounded-xl bg-zs-beige/40 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zs-gold/20 text-xs font-bold text-zs-gold">
              {initials(contact.name, contact.email)}
            </div>
            <p className="min-w-0 truncate text-sm font-semibold text-zs-charcoal">{contact.name || "Guest customer"}</p>
          </div>

          <div className="space-y-3.5">
            <Row icon={Phone} label="Phone">
              {contact.phone ? (
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`tel:${contact.phone}`} className="font-medium hover:underline">{contact.phone}</a>
                  <a
                    href={`https://wa.me/${whatsappNumber(contact.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                  >
                    <MessageCircle size={11} /> WhatsApp
                  </a>
                </div>
              ) : (
                <NotProvided />
              )}
            </Row>
            <Row icon={Mail} label="Email">
              {contact.email ? <a href={`mailto:${contact.email}`} className="break-all hover:underline">{contact.email}</a> : <NotProvided />}
            </Row>
            <Row icon={MapPin} label="Shipping address">
              {contact.address ? <span>{contact.address}</span> : <NotProvided />}
            </Row>
          </div>
        </div>

        <FulfillmentPanel key={order.id} orderId={order.id} onChanged={(newStatus) => {
          setMoneyVersion((v) => v + 1);
          if (newStatus !== order.status) onStatusChange?.(order, newStatus);
        }} />

        <h3 className="mb-2 text-sm font-medium text-zs-charcoal">Items</h3>
        {itemsLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-zs-beige" />)}</div>
        ) : items.length ? (
          <div className="divide-y divide-zs-beigeLine rounded-xl border border-zs-beigeLine">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-3.5 text-sm">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-zs-beigeLine bg-zs-beige/50">
                  {it.image_url ? (
                    <img src={resolveImg(it.image_url)} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-zs-beigeLine/30" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-zs-charcoal">{it.name}</p>
                  {(it.selected_size || it.selected_color) && <p className="text-xs text-zs-charcoal/55">{[it.selected_size && "Size: " + it.selected_size, it.selected_color && "Color: " + it.selected_color].filter(Boolean).join(" · ")}</p>}
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-zs-charcoal/60">
                    Qty: {it.qty}
                    {(() => {
                      const line = money?.lines?.find((l) => l.id === it.id);
                      if (!line) return null;
                      return (
                        <>
                          <StatusBadge value={line.state} />
                          {line.restocked > 0 && <span className="text-emerald-700">{line.restocked} returned to stock</span>}
                          {line.written_off > 0 && <span className="text-red-700">{line.written_off} written off</span>}
                        </>
                      );
                    })()}
                  </p>
                </div>
                <div className="font-medium text-zs-charcoal">{formatPrice(it.price * it.qty)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zs-beigeLine p-4 text-center text-sm text-zs-charcoal/50">
            Line items unavailable.
          </p>
        )}

        {returns.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-zs-charcoal">Returns</h3>
            <div className="divide-y divide-zs-beigeLine rounded-xl border border-zs-beigeLine">
              {returns.map((r) => (
                <Link key={r.id} to="/adminDashboard/returns" onClick={onClose} className="flex items-center justify-between p-3.5 text-sm hover:bg-zs-beige/40">
                  <span className="font-medium text-zs-charcoal">{r.rma}</span>
                  <StatusBadge value={r.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {money && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-zs-charcoal">Money</h3>
            <div className="rounded-xl border border-zs-beigeLine p-4 text-sm">
              <p className="mb-3 text-xs text-zs-charcoal/60">{money.collection.label}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-zs-charcoal/60">Charged</dt>
                <dd className="text-right font-medium tabular-nums">{formatPrice(money.charged)}</dd>
                <dt className="text-zs-charcoal/60">Received</dt>
                <dd className="text-right font-medium tabular-nums">{formatPrice(money.received)}</dd>
                {money.refunded > 0 && (
                  <>
                    <dt className="text-zs-charcoal/60">Refunded</dt>
                    <dd className="text-right font-medium tabular-nums text-red-700">−{formatPrice(money.refunded)}</dd>
                  </>
                )}
                {money.refundDue > 0 && (
                  <>
                    <dt className="text-zs-charcoal/60">Refund owed</dt>
                    <dd className="text-right tabular-nums">
                      <Link to="/adminDashboard/finance" onClick={onClose} className="font-semibold text-red-700 underline">{formatPrice(money.refundDue)}</Link>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-zs-beigeLine pt-4 text-zs-charcoal">
          <span className="text-sm text-zs-charcoal/60">Order total</span>
          <span className="zs-display text-lg font-semibold">{formatPrice(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
};
