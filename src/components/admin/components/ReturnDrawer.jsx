import { useEffect, useState } from "react";
import { Camera, Copy, ExternalLink, Lock, X } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { Button } from "./ui/Button";
import { TextArea, TextInput } from "./ui/FormField";
import { useToast } from "./ui/Toast";
import { getReturn, returnAction } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const PAYOUT_LABEL = { jazzcash: "JazzCash wallet", easypaisa: "Easypaisa wallet", bank: "Bank account (IBAN)" };

const Section = ({ title, children, aside }) => (
  <section className="mb-6">
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-zs-charcoal">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-zs-charcoal/55">{label}</span>
    <span className="text-right font-medium text-zs-charcoal">{children}</span>
  </div>
);

export const ReturnDrawer = ({ returnId, onClose, onChanged }) => {
  const { push } = useToast();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [decision, setDecision] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [inspection, setInspection] = useState({});
  const [refund, setRefund] = useState({ amount: "", method: "manual", reference: "", message: "" });
  const [confirming, setConfirming] = useState(false);

  const hydrate = (data) => {
    setRet(data);
    setNote(data.internal_note || "");
    setInspection(
      Object.fromEntries(
        data.items.map((i) => [i.id, { accepted: i.inspection !== "rejected", restock: i.restock, toRefund: false }])
      )
    );
    setRefund((r) => ({ ...r, amount: String(data.estimate?.total ?? ""), method: data.jazzcash_refund_available ? "jazzcash_api" : "manual" }));
    setConfirming(false);
  };

  useEffect(() => {
    if (!returnId) return undefined;
    let cancelled = false;
    getReturn(returnId)
      .then((data) => !cancelled && hydrate(data))
      .catch(() => !cancelled && push("Couldn't load this return.", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  useEffect(() => {
    if (!returnId) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [returnId, onClose]);

  if (!returnId) return null;

  const act = async (action, body, success) => {
    setBusy(action);
    try {
      const data = await returnAction(ret.id, action, body);
      hydrate(data);
      onChanged?.();
      if (success) push(success, "success");
      return true;
    } catch (err) {
      push(err?.response?.data?.message || "That didn't work. Please try again.", "error");
      return false;
    } finally {
      setBusy("");
    }
  };

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => push("Copied.", "success")).catch(() => {});

  const saveInspection = () =>
    act(
      "inspect",
      {
        items: ret.items.map((i) => ({
          id: i.id,
          accepted: inspection[i.id]?.accepted,
          restock: inspection[i.id]?.accepted && inspection[i.id]?.restock,
          resolution: inspection[i.id]?.toRefund ? "refund" : undefined,
        })),
      },
      "Inspection saved."
    );

  const complete = () =>
    act(
      "complete",
      {
        refund_amount: refund.amount === "" ? undefined : Number(refund.amount),
        method: refund.method,
        reference: refund.reference,
        message: refund.message,
      },
      `${ret.rma} completed — the customer has been emailed.`
    );

  const inspected = ret?.items.every((i) => i.inspection !== "pending");
  const payout = ret?.payout_details;
  const needsReference = ret && ret.refund_method !== "store_credit" && refund.method === "manual" && Number(refund.amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zs-charcoal/40" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label="Return details" className="h-full w-full max-w-xl overflow-y-auto bg-[var(--zs-white)] p-6 shadow-zs">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="zs-display text-xl font-semibold text-zs-charcoal">{ret?.rma || "Return"}</h2>
            {ret ? <p className="mt-0.5 text-xs text-zs-charcoal/50">Order #{ret.order_id} · requested {formatDateTime(ret.requested_at)}</p> : null}
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-zs-charcoal/50 hover:bg-zs-beige"><X size={18} /></button>
        </div>

        {loading || !ret ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zs-beige" />)}</div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <StatusBadge value={ret.status} />
              <StatusBadge value={ret.refund_method === "store_credit" ? "store_credit" : ret.payment_method} />
              {ret.ship_by && ret.status === "approved" ? <span className="text-xs text-zs-charcoal/55">Ship by {formatDateTime(ret.ship_by)}</span> : null}
            </div>

            {/* ── Next step ─────────────────────────────────────────── */}
            {ret.status === "requested" && (
              <Section title="Review request">
                <TextArea
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder="Message to the customer (optional when approving, required when rejecting)"
                  className="min-h-[80px]"
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="gold" loading={busy === "approve"} onClick={() => act("approve", { message: decision }, "Approved — return instructions emailed.")}>Approve</Button>
                  <Button variant="secondary" loading={busy === "reject"} onClick={() => act("reject", { message: decision }, "Rejected — the customer has been told why.")}>Reject</Button>
                </div>
              </Section>
            )}

            {["approved", "shipped_back"].includes(ret.status) && (
              <Section title="Waiting for the parcel">
                <p className="mb-3 text-sm text-zs-charcoal/65">
                  {ret.status === "shipped_back"
                    ? <>Shipped with <b>{ret.return_courier}</b> — tracking <span className="font-mono">{ret.return_tracking}</span>.</>
                    : "The customer hasn't added tracking yet. You can still mark it received if the parcel arrives."}
                </p>
                <Button variant="gold" loading={busy === "received"} onClick={() => act("received", {}, "Marked received — the customer has been emailed.")}>Mark parcel received</Button>
              </Section>
            )}

            {/* ── Items ─────────────────────────────────────────────── */}
            <Section title="Items" aside={ret.status === "received" && !inspected ? <span className="text-xs font-medium text-zs-gold">Inspect each item</span> : null}>
              <div className="divide-y divide-zs-beigeLine rounded-xl border border-zs-beigeLine">
                {ret.items.map((item) => {
                  const state = inspection[item.id] || {};
                  return (
                    <div key={item.id} className="p-3.5 text-sm">
                      <div className="flex gap-3">
                        <img src={resolveImg(item.image_url)} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-zs-beigeLine object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <p className="font-medium text-zs-charcoal">{item.name}</p>
                            {(item.selected_size || item.selected_color) && <p className="mt-0.5 text-xs text-zs-charcoal/55">{[item.selected_size && `Size ${item.selected_size}`, item.selected_color && `Color ${item.selected_color}`].filter(Boolean).join(" · ")}</p>}
                            <span className="shrink-0 font-medium">{item.quantity} × {formatPrice(item.unit_price)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-zs-charcoal/60">
                            {item.reason_label} · {item.condition === "sealed" ? "Sealed" : "Opened"}
                          </p>
                          {item.resolution === "exchange" ? (
                            <p className="mt-1 text-xs font-medium text-indigo-700">↔ Exchange for {item.exchange_name} ({formatPrice(item.exchange_unit_price)})</p>
                          ) : null}
                          {item.inspection !== "pending" && ret.status !== "received" ? (
                            <p className="mt-1 text-xs text-zs-charcoal/55">Inspection: {item.inspection}{item.restocked ? " · restocked" : ""}</p>
                          ) : null}
                        </div>
                      </div>

                      {ret.status === "received" && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-zs-beige/50 px-3 py-2 text-xs">
                          <label className="flex items-center gap-1.5">
                            <input type="radio" checked={state.accepted} onChange={() => setInspection({ ...inspection, [item.id]: { ...state, accepted: true } })} />
                            Passed
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="radio" checked={!state.accepted} onChange={() => setInspection({ ...inspection, [item.id]: { ...state, accepted: false } })} />
                            Failed
                          </label>
                          <label className={"flex items-center gap-1.5 " + (!state.accepted ? "opacity-40" : "")}>
                            <input type="checkbox" disabled={!state.accepted} checked={state.accepted && state.restock} onChange={(e) => setInspection({ ...inspection, [item.id]: { ...state, restock: e.target.checked } })} />
                            Put back in stock
                          </label>
                          {item.resolution === "exchange" && (
                            <label className="flex items-center gap-1.5">
                              <input type="checkbox" checked={state.toRefund} onChange={(e) => setInspection({ ...inspection, [item.id]: { ...state, toRefund: e.target.checked } })} />
                              Out of stock — refund instead
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {ret.status === "received" && (
                <div className="mt-3">
                  <Button variant="secondary" loading={busy === "inspect"} onClick={saveInspection}>Save inspection</Button>
                </div>
              )}
            </Section>

            {/* ── Resolve ───────────────────────────────────────────── */}
            {ret.status === "received" && inspected && (
              <Section title="Resolve">
                <div className="rounded-xl border border-zs-beigeLine p-4">
                  <Row label="Items">{formatPrice(ret.estimate.items)}</Row>
                  {ret.estimate.shipping > 0 ? <Row label="Original shipping (our fault)">{formatPrice(ret.estimate.shipping)}</Row> : null}
                  <Row label="Suggested">{formatPrice(ret.estimate.total)}</Row>
                  <p className="mt-1 text-xs text-zs-charcoal/50">
                    Order total {formatPrice(ret.order.total_amount)} · already refunded or credited {formatPrice(ret.order.refunded_amount)}
                  </p>

                  <label className="mt-4 block text-sm">
                    <span className="mb-1.5 block font-medium text-zs-charcoal">
                      {ret.refund_method === "store_credit" ? "Credit amount (before bonus)" : "Refund amount"}
                    </span>
                    <TextInput type="number" min="0" step="1" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                  </label>

                  {ret.refund_method === "store_credit" ? (
                    <p className="mt-2 text-xs text-zs-charcoal/60">
                      A single-use store credit code will be generated{ret.store_credit_bonus_percent ? ` with a ${ret.store_credit_bonus_percent}% bonus` : ""} and emailed to the customer.
                    </p>
                  ) : Number(refund.amount) > 0 ? (
                    <div className="mt-4 space-y-2 text-sm">
                      {ret.jazzcash_refund_available && (
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={refund.method === "jazzcash_api"} onChange={() => setRefund({ ...refund, method: "jazzcash_api" })} />
                          Refund automatically to their JazzCash wallet
                        </label>
                      )}
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={refund.method === "manual"} onChange={() => setRefund({ ...refund, method: "manual" })} />
                        I've sent it manually
                      </label>
                      {refund.method === "manual" && (
                        <>
                          {payout ? (
                            <div className="rounded-lg bg-zs-beige/50 p-3 text-xs">
                              <p className="font-medium text-zs-charcoal">Send to {PAYOUT_LABEL[payout.type] || payout.type}</p>
                              <p className="mt-1 flex items-center gap-2 font-mono text-sm">
                                {payout.account}
                                <button type="button" onClick={() => copy(payout.account)} className="text-zs-charcoal/50 hover:text-zs-charcoal" aria-label="Copy account"><Copy size={13} /></button>
                              </p>
                              <p className="text-zs-charcoal/60">{payout.title}</p>
                            </div>
                          ) : ret.payment_method === "jazzcash" ? (
                            <p className="text-xs text-zs-charcoal/60">Paid via JazzCash — refund from your JazzCash merchant portal.</p>
                          ) : null}
                          <TextInput placeholder="Transfer reference / transaction ID" value={refund.reference} onChange={(e) => setRefund({ ...refund, reference: e.target.value })} />
                        </>
                      )}
                    </div>
                  ) : null}

                  <TextArea
                    className="mt-4 min-h-[70px]"
                    placeholder="Note to include in the completion email (optional)"
                    value={refund.message}
                    onChange={(e) => setRefund({ ...refund, message: e.target.value })}
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {confirming ? (
                      <>
                        <Button variant="gold" icon={Lock} loading={busy === "complete"} disabled={needsReference && refund.reference.trim().length < 3} onClick={complete}>
                          Confirm & complete
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirming(false)}>Back</Button>
                      </>
                    ) : (
                      <Button variant="gold" disabled={needsReference && refund.reference.trim().length < 3} onClick={() => setConfirming(true)}>
                        Complete return
                      </Button>
                    )}
                    <Button variant="secondary" loading={busy === "reject"} onClick={() => act("reject", { message: refund.message }, "Rejected — the customer has been told why.")}>
                      Reject return
                    </Button>
                  </div>
                  {confirming ? <p className="mt-2 text-xs text-zs-charcoal/55">This restocks items, issues the refund/credit and creates any exchange order. It can't be undone.</p> : null}
                </div>
              </Section>
            )}

            {ret.status === "completed" && (
              <Section title="Resolution">
                <div className="rounded-xl bg-emerald-50/60 p-4 text-sm">
                  {ret.refund ? <Row label={ret.refund.method === "store_credit" ? "Store credit" : "Refunded"}>{formatPrice(ret.refund.amount)} · {ret.refund.reference}</Row> : <Row label="Refund">None</Row>}
                  {ret.exchange_order_id ? <Row label="Exchange order">#{ret.exchange_order_id}</Row> : null}
                  <Row label="Completed">{formatDateTime(ret.resolved_at)}</Row>
                </div>
              </Section>
            )}

            {/* ── Customer details ──────────────────────────────────── */}
            <Section title="Customer">
              <div className="rounded-xl bg-zs-beige/40 p-4 text-sm">
                <Row label="Email"><a href={`mailto:${ret.email}`} className="hover:underline">{ret.email}</a></Row>
                {ret.order.phone ? <Row label="Phone"><a href={`tel:${ret.order.phone}`} className="hover:underline">{ret.order.phone}</a></Row> : null}
                <Row label="Refund to">{ret.refund_method === "store_credit" ? "Store credit" : payout ? `${PAYOUT_LABEL[payout.type]} ${payout.account}` : "Original payment"}</Row>
                {ret.customer_note ? <p className="mt-3 rounded-lg bg-white p-3 text-zs-charcoal/80">“{ret.customer_note}”</p> : null}
              </div>
            </Section>

            {ret.photos.length > 0 && (
              <Section title={`Photos (${ret.photos.length})`}>
                <div className="grid grid-cols-4 gap-2">
                  {ret.photos.map((p) => (
                    <a key={p.id} href={resolveImg(p.path)} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border border-zs-beigeLine">
                      <img src={resolveImg(p.path)} alt="Customer photo" className="h-full w-full object-cover" />
                      <ExternalLink size={14} className="absolute right-1.5 top-1.5 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </Section>
            )}
            {ret.photos.length === 0 && ret.items.some((i) => ["damaged", "leaking", "wrong_item"].includes(i.reason)) ? (
              <p className="mb-6 flex items-center gap-1.5 text-xs text-zs-charcoal/50"><Camera size={13} /> No photos attached.</p>
            ) : null}

            {/* ── Communication ─────────────────────────────────────── */}
            {!["completed", "rejected", "cancelled", "expired"].includes(ret.status) && (
              <Section title="Message the customer">
                <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sent by email and shown on their return page" className="min-h-[70px]" />
                <div className="mt-2">
                  <Button variant="secondary" loading={busy === "message"} disabled={!message.trim()} onClick={async () => (await act("message", { text: message }, "Message sent.")) && setMessage("")}>
                    Send message
                  </Button>
                </div>
              </Section>
            )}

            <Section title="Internal note" aside={<span className="text-xs text-zs-charcoal/40">Only visible to staff</span>}>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px]" />
              <div className="mt-2">
                <Button variant="ghost" loading={busy === "note"} onClick={() => act("note", { note }, "Note saved.")}>Save note</Button>
              </div>
            </Section>

            <Section title="History">
              <ol className="space-y-3 border-l border-zs-beigeLine pl-4">
                {ret.events.map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zs-gold" />
                    <p className="text-zs-charcoal">
                      <span className="font-medium capitalize">{e.type.replace(/_/g, " ")}</span>
                      <span className="text-zs-charcoal/45"> · {e.actor} · {formatDateTime(e.created_at)}</span>
                      {!e.visible_to_customer ? <span className="ml-1.5 rounded bg-zs-beige px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zs-charcoal/50">internal</span> : null}
                    </p>
                    {e.message ? <p className="mt-0.5 text-zs-charcoal/65">{e.message}</p> : null}
                  </li>
                ))}
              </ol>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};
