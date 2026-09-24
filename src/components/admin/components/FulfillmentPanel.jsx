import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, PackageCheck, Truck, Undo2 } from "lucide-react";
import { Button } from "./ui/Button";
import { FormField, Select, TextArea, TextInput } from "./ui/FormField";
import { useToast } from "./ui/Toast";
import {
  fulfillOrder,
  getFulfillment,
  markOrderDelivered,
  markReturnedToSender,
  updateOrderStatus,
  updateTracking,
} from "../api/adminService";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const NO_TRACKING = "Own delivery";
const OTHER = "__other";

const EVENT_LABEL = {
  placed: "Order placed",
  paid: "Payment received",
  confirmed: "Confirmed",
  fulfilled: "Shipped",
  tracking_updated: "Tracking updated",
  delivered: "Delivered",
  delivery_failed: "Returned by courier",
  cancelled: "Cancelled",
  note: "Note",
};

// The Shopify-style "Fulfill items" form: courier, tracking number, an
// optional tracking link and whether to email the customer.
const ShipmentForm = ({ couriers, initial, submitLabel, notifyLabel, notifyDefault, busy, onSubmit, onCancel }) => {
  const knownCourier = !initial?.courier || couriers.includes(initial.courier);
  const [form, setForm] = useState({
    courier: initial?.courier ? (knownCourier ? initial.courier : OTHER) : "",
    otherCourier: knownCourier ? "" : initial?.courier || "",
    tracking_number: initial?.tracking_number || "",
    tracking_url: initial?.tracking_url || "",
    note: initial?.note || "",
    notify: notifyDefault,
  });
  const courier = form.courier === OTHER ? form.otherCourier.trim() : form.courier;
  const noTracking = courier === NO_TRACKING;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ courier, tracking_number: noTracking ? "" : form.tracking_number.trim(), tracking_url: form.tracking_url.trim(), note: form.note.trim(), notify: form.notify });
      }}
      className="rounded-xl border border-zs-beigeLine bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-x-4">
        <FormField label="Courier" htmlFor="fl-courier" required>
          <Select id="fl-courier" required value={form.courier} onChange={set("courier")}>
            <option value="" disabled>Choose courier</option>
            {couriers.map((c) => <option key={c} value={c}>{c === NO_TRACKING ? "Own rider (no tracking)" : c}</option>)}
            <option value={OTHER}>Other…</option>
          </Select>
        </FormField>
        {form.courier === OTHER ? (
          <FormField label="Courier name" htmlFor="fl-other" required>
            <TextInput id="fl-other" required value={form.otherCourier} onChange={set("otherCourier")} />
          </FormField>
        ) : (
          <FormField label="Tracking number" htmlFor="fl-tracking" required={!noTracking}>
            <TextInput
              id="fl-tracking"
              required={!noTracking}
              disabled={noTracking}
              placeholder={noTracking ? "Not needed" : "From the courier receipt"}
              value={noTracking ? "" : form.tracking_number}
              onChange={set("tracking_number")}
            />
          </FormField>
        )}
      </div>
      {form.courier === OTHER && (
        <FormField label="Tracking number" htmlFor="fl-tracking2" required>
          <TextInput id="fl-tracking2" required value={form.tracking_number} onChange={set("tracking_number")} />
        </FormField>
      )}
      {!noTracking && (
        <FormField label="Tracking link" htmlFor="fl-url" hint="Optional — the courier's tracking page for this parcel. Shown as a “Track your parcel” button.">
          <TextInput id="fl-url" type="url" placeholder="https://" value={form.tracking_url} onChange={set("tracking_url")} />
        </FormField>
      )}
      <FormField label="Internal note" htmlFor="fl-note" hint="Only visible to staff — e.g. COD amount on the slip, packed by, parcel weight.">
        <TextArea id="fl-note" className="min-h-[60px]" value={form.note} onChange={set("note")} />
      </FormField>
      <label className="mb-4 flex items-start gap-2.5 text-sm text-zs-charcoal">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-zs-gold" checked={form.notify} onChange={set("notify")} />
        <span>{notifyLabel}</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="gold" icon={Truck} loading={busy}>{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
};

/**
 * Order fulfillment for the admin order drawer:
 * pending → Confirm → Fulfill (courier + tracking) → Mark delivered.
 * onChanged(newStatus) keeps the orders list in sync.
 */
export const FulfillmentPanel = ({ orderId, onChanged }) => {
  const { push } = useToast();
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState(null); // null | "fulfill" | "edit" | "returned"
  const [busy, setBusy] = useState("");
  const [returnNote, setReturnNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    getFulfillment(orderId)
      .then((data) => !cancelled && setDetail(data))
      .catch(() => !cancelled && push("Couldn't load fulfillment details.", "error"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const run = async (name, work, success) => {
    setBusy(name);
    try {
      const result = await work();
      const fresh = result?.order ? result : await getFulfillment(orderId);
      setDetail(fresh);
      setMode(null);
      onChanged?.(fresh.order.status);
      push(success, "success");
    } catch (err) {
      push(err?.response?.data?.message || "That didn't work. Please try again.", "error");
    } finally {
      setBusy("");
    }
  };

  if (!detail) return <div className="mb-5 h-28 animate-pulse rounded-xl bg-zs-beige" />;

  const { order, shipment, events, couriers } = detail;
  const unpaidOnline = order.payment_method === "jazzcash" && !["paid", "partially_refunded"].includes(order.payment_status);
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => push("Copied.", "success")).catch(() => {});
  const label = {
    pending: ["Unconfirmed", "bg-amber-50 text-amber-700 ring-amber-200"],
    processing: ["Unfulfilled", "bg-amber-50 text-amber-700 ring-amber-200"],
    shipped: ["Fulfilled · in transit", "bg-violet-50 text-violet-700 ring-violet-200"],
    delivered: ["Delivered", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
    cancelled: ["Cancelled", "bg-red-50 text-red-700 ring-red-200"],
  }[order.status] || [order.status, "bg-zs-beige text-zs-charcoal ring-zs-beigeLine"];

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zs-charcoal">Fulfillment</h3>
        <span className={"rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset " + label[1]}>{label[0]}</span>
      </div>

      <div className="rounded-xl bg-zs-beige/40 p-4">
        {unpaidOnline && ["pending", "processing"].includes(order.status) && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Waiting for the customer's JazzCash payment — you can confirm and ship once it's received.
          </p>
        )}

        {/* Shipment card */}
        {shipment && ["shipped", "delivered"].includes(order.status) && mode !== "edit" && (
          <div className="mb-3 rounded-lg bg-white p-3.5 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zs-gold/15 text-zs-gold">
                {order.status === "delivered" ? <CheckCircle2 size={17} /> : <Truck size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zs-charcoal">{shipment.courier === NO_TRACKING ? "Own rider" : shipment.courier}</p>
                {shipment.tracking_number ? (
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-zs-charcoal/70">
                    {shipment.tracking_number}
                    <button type="button" aria-label="Copy tracking number" onClick={() => copy(shipment.tracking_number)} className="text-zs-charcoal/40 hover:text-zs-charcoal"><Copy size={12} /></button>
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zs-charcoal/50">
                  Shipped {formatDateTime(shipment.shipped_at)}
                  {order.delivered_at ? ` · delivered ${formatDateTime(order.delivered_at)}` : ""}
                  {shipment.customer_notified ? " · customer emailed" : " · customer not emailed"}
                </p>
              </div>
              {shipment.tracking_url ? (
                <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-zs-gold hover:underline">
                  Track <ExternalLink size={12} />
                </a>
              ) : null}
            </div>
          </div>
        )}

        {/* Actions for the current step */}
        {order.status === "pending" && mode !== "fulfill" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" icon={PackageCheck} disabled={unpaidOnline} loading={busy === "confirm"} onClick={() => run("confirm", () => updateOrderStatus(orderId, "processing"), `Order #${orderId} confirmed.`)}>
              Confirm order
            </Button>
            <Button variant="secondary" icon={Truck} disabled={unpaidOnline} onClick={() => setMode("fulfill")}>Fulfill items</Button>
          </div>
        )}
        {order.status === "processing" && mode !== "fulfill" && (
          <div>
            <p className="mb-3 text-xs text-zs-charcoal/60">Pack the order, hand it to the courier, then enter the tracking details from their receipt.</p>
            <Button variant="gold" icon={Truck} disabled={unpaidOnline} onClick={() => setMode("fulfill")}>Fulfill items</Button>
          </div>
        )}
        {mode === "fulfill" && (
          <ShipmentForm
            couriers={couriers}
            submitLabel="Fulfill items"
            notifyLabel="Send the shipping confirmation email with tracking details to the customer"
            notifyDefault
            busy={busy === "fulfill"}
            onCancel={() => setMode(null)}
            onSubmit={(body) => run("fulfill", () => fulfillOrder(orderId, body), `Order #${orderId} marked as shipped.`)}
          />
        )}

        {order.status === "shipped" && !mode && (
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" icon={CheckCircle2} loading={busy === "delivered"} onClick={() => run("delivered", () => markOrderDelivered(orderId), `Order #${orderId} marked delivered — the customer has been emailed.`)}>
              Mark as delivered
            </Button>
            <Button variant="secondary" onClick={() => setMode("edit")}>Edit tracking</Button>
            <Button variant="ghost" icon={Undo2} onClick={() => setMode("returned")}>Courier returned it</Button>
          </div>
        )}
        {mode === "edit" && (
          <ShipmentForm
            couriers={couriers}
            initial={shipment}
            submitLabel="Save tracking"
            notifyLabel="Email the customer the updated tracking details"
            notifyDefault={false}
            busy={busy === "edit"}
            onCancel={() => setMode(null)}
            onSubmit={(body) => run("edit", () => updateTracking(orderId, body), "Tracking updated.")}
          />
        )}
        {mode === "returned" && (
          <div className="rounded-xl border border-zs-beigeLine bg-white p-4">
            <p className="mb-2 text-sm text-zs-charcoal">The courier couldn't deliver and sent the parcel back. The order goes back to <b>Unfulfilled</b> so you can re-ship or cancel it.</p>
            <TextArea className="min-h-[60px]" placeholder="What happened? e.g. customer unreachable after 3 attempts" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button variant="danger" loading={busy === "returned"} onClick={() => run("returned", () => markReturnedToSender(orderId, returnNote), "Marked as returned by the courier.")}>Confirm</Button>
              <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {["pending", "processing"].includes(order.status) && !mode && (
          <button
            type="button"
            disabled={busy === "cancel"}
            onClick={() =>
              window.confirm(`Cancel order #${orderId}? Stock is put back and the customer can't undo this.`) &&
              run("cancel", () => updateOrderStatus(orderId, "cancelled"), `Order #${orderId} cancelled.`)
            }
            className="mt-3 block text-xs font-medium text-zs-danger hover:underline"
          >
            Cancel order
          </button>
        )}
      </div>

      {/* Timeline */}
      <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zs-charcoal/50">Timeline</h4>
      <ol className="space-y-3 border-l border-zs-beigeLine pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zs-gold" />
            <p className="text-zs-charcoal">
              <span className="font-medium">{EVENT_LABEL[e.type] || e.type}</span>
              <span className="text-zs-charcoal/45"> · {formatDateTime(e.created_at)}</span>
              {!e.visible_to_customer ? <span className="ml-1.5 rounded bg-zs-beige px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zs-charcoal/50">internal</span> : null}
            </p>
            {e.message ? <p className="mt-0.5 text-zs-charcoal/65">{e.message}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
};
