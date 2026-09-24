import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Check, Loader2, Minus, Plus, RefreshCcw, Undo2, X } from "lucide-react";
import { createReturn, getReturnEligibility, lookupOrderForReturn } from "../api/returnsApi";
import { formatPrice } from "../utils/price";
import { resolveImg } from "../utils/resolveImg";
import { ErrorNote, Label, SYSTEM_FONT, SectionTitle, cardBox, inputSingle, primaryButton, secondaryButton } from "../components/ui/formStyles";

const PHOTO_REASONS = ["damaged", "leaking", "wrong_item"];
const MAX_PHOTOS = 4;
const errorText = (err, fallback) => err?.response?.data?.message || fallback;
const formatDate = (value) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const Steps = ({ step }) => (
  <ol className="mb-8 flex items-center gap-2 text-[12px] font-medium text-[#a3a3a8]">
    {["Find order", "Choose items", "Refund"].map((label, i) => (
      <li key={label} className="flex items-center gap-2">
        <span
          className={
            "flex h-5 w-5 items-center justify-center rounded-full text-[11px] " +
            (i < step ? "bg-[#1a1a1a] text-white" : i === step ? "bg-[#1a1a1a] text-white" : "bg-[#ececef] text-[#6b6b73]")
          }
        >
          {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
        </span>
        <span className={i === step ? "text-[#1a1a1a]" : ""}>{label}</span>
        {i < 2 && <span className="mx-1 h-px w-6 bg-[#e3e3e6]" />}
      </li>
    ))}
  </ol>
);

const Segmented = ({ options, value, onChange, name }) => (
  <div className="inline-flex w-fit rounded-md bg-[#f1f1f3] p-0.5" role="radiogroup" aria-label={name}>
    {options.map(([id, label]) => (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={value === id}
        onClick={() => onChange(id)}
        className={
          "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition " +
          (value === id ? "bg-white text-[#1a1a1a] shadow-[0_1px_2px_rgba(0,0,0,0.1)]" : "text-[#6b6b73] hover:text-[#1a1a1a]")
        }
      >
        {label}
      </button>
    ))}
  </div>
);

const Returns = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [find, setFind] = useState({ orderId: params.get("order") || "", email: "" });
  const [lookup, setLookup] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selection, setSelection] = useState({});
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const [payout, setPayout] = useState({ type: "jazzcash", account: "", title: "" });

  const loadEligibility = async (orderId, lookupToken) => {
    const result = await getReturnEligibility(orderId, lookupToken);
    setData(result);
    setLookup(lookupToken);
    setSelection({});
    setStep(1);
  };

  // Signed-in customers arriving from their order skip the lookup step.
  useEffect(() => {
    const orderId = params.get("order");
    if (!orderId || !localStorage.getItem("zeescents_token")) return;
    let active = true;
    getReturnEligibility(orderId)
      .then((result) => {
        if (!active) return;
        setData(result);
        setStep(1);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [params]);

  const submitFind = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { orderId, token } = await lookupOrderForReturn(find.orderId.trim(), find.email.trim());
      await loadEligibility(orderId, token);
    } catch (err) {
      setError(errorText(err, "We couldn't find that order."));
    } finally {
      setLoading(false);
    }
  };

  const lines = useMemo(
    () =>
      (data?.items || [])
        .filter((item) => selection[item.order_item_id]?.selected)
        .map((item) => ({ item, ...selection[item.order_item_id] })),
    [data, selection]
  );

  const exchangeFor = (id) => data?.exchange_products.find((p) => p.id === Number(id));
  const needsPhotos = lines.some((l) => PHOTO_REASONS.includes(l.reason));
  const refundValue = lines.reduce((sum, l) => {
    const perUnit = l.resolution === "exchange" ? Math.max(0, l.item.unit_price - (exchangeFor(l.exchangeId)?.price || 0)) : l.item.unit_price;
    return sum + perUnit * l.quantity;
  }, 0);
  const bonus = data?.policy.store_credit_bonus_percent || 0;
  const payoutNeeded = refundValue > 0 && refundMethod === "original" && data?.order.payment_method !== "jazzcash";

  const update = (id, patch) => setSelection((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const toggle = (item) =>
    update(item.order_item_id, selection[item.order_item_id]?.selected
      ? { selected: false }
      : { selected: true, quantity: selection[item.order_item_id]?.quantity || 1, reason: selection[item.order_item_id]?.reason || "", condition: selection[item.order_item_id]?.condition || "sealed", resolution: "refund", exchangeId: "" });

  const itemsProblem = () => {
    if (!lines.length) return "Choose at least one item.";
    for (const l of lines) {
      if (!l.reason) return `Tell us why you're returning ${l.item.name}.`;
      if (l.reason === "changed_mind" && l.condition !== "sealed") return `${l.item.name} can only be returned for a change of mind if it's still sealed.`;
      if (l.resolution === "exchange" && !l.exchangeId) return `Choose what to exchange ${l.item.name} for.`;
    }
    if (needsPhotos && !photos.length) return "Add at least one photo showing the problem.";
    return "";
  };

  const continueToRefund = () => {
    const problem = itemsProblem();
    setError(problem);
    if (!problem) setStep(2);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await createReturn(data.order.id, lookup, {
        items: lines.map((l) => ({
          order_item_id: l.item.order_item_id,
          quantity: l.quantity,
          reason: l.reason,
          condition: l.condition,
          resolution: l.resolution,
          exchange_product_id: l.resolution === "exchange" ? Number(l.exchangeId) : undefined,
        })),
        refundMethod: refundValue > 0 ? refundMethod : "store_credit",
        payoutDetails: payoutNeeded ? payout : null,
        note,
        photos,
      });
      navigate(`/returns/${result.rma}?token=${result.token}&new=1`);
    } catch (err) {
      setError(errorText(err, "We couldn't submit your return. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const addPhotos = (files) => {
    const next = [...photos, ...Array.from(files || [])].slice(0, MAX_PHOTOS);
    setPhotos(next);
  };

  return (
    <section className="bg-white px-5 pb-20 pt-10 text-[#1a1a1a] antialiased sm:px-8" style={{ fontFamily: SYSTEM_FONT }}>
      <div className="mx-auto max-w-[580px]">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[#6b6b73]"><Undo2 size={15} /> Returns & exchanges</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Start a return</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6b6b73]">
            Unopened items can be returned within {data?.policy.window_days || 30} days of delivery. Damaged, leaking or wrong items are always covered.{" "}
            <Link to="/shipping-returns" className="text-[#1a1a1a] underline underline-offset-2">Read the policy</Link>
          </p>
        </div>

        <Steps step={step} />

        {step === 0 && (
          <form onSubmit={submitFind} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="rt-order">Order number</Label>
              <input id="rt-order" required inputMode="numeric" placeholder="e.g. 1024" value={find.orderId} onChange={(e) => setFind({ ...find, orderId: e.target.value })} className={inputSingle} />
            </div>
            <div>
              <Label htmlFor="rt-email">Email used for the order</Label>
              <input id="rt-email" required type="email" autoComplete="email" placeholder="you@example.com" value={find.email} onChange={(e) => setFind({ ...find, email: e.target.value })} className={inputSingle} />
            </div>
            <button type="submit" disabled={loading} className={primaryButton + " mt-2"}>
              {loading && <Loader2 size={17} className="animate-spin" />}
              Find my order
            </button>
            <ErrorNote>{error}</ErrorNote>
            <p className="text-center text-[12.5px] text-[#6b6b73]">Your order number is in your confirmation email.</p>
          </form>
        )}

        {step === 1 && data && (
          <div>
            <div className="mb-6 flex items-center justify-between rounded-md bg-[#f7f7f8] px-4 py-3 text-[13.5px]">
              <span>
                Order <b>#{data.order.id}</b>
                {data.order.delivered_at ? <> · delivered {formatDate(data.order.delivered_at)}</> : null}
              </span>
              {data.order.days_left ? <span className="font-medium text-[#8a7148]">{data.order.days_left} days left</span> : null}
            </div>

            {!data.can_request ? (
              <div className="rounded-md border border-[#e3e3e6] p-5 text-[14px] text-[#4a4a55]">
                <p>{data.message}</p>
                {data.returns.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {data.returns.map((r) => (
                      <Link key={r.rma} to={r.link} className="flex items-center justify-between rounded-md bg-[#f7f7f8] px-3 py-2.5 font-medium text-[#1a1a1a] hover:bg-[#f1f1f3]">
                        <span>{r.rma}</span>
                        <span className="text-[12.5px] capitalize text-[#6b6b73]">{r.status.replace("_", " ")} →</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <SectionTitle>Which items?</SectionTitle>
                <div className={cardBox + " divide-y divide-[#ececef] overflow-hidden"}>
                  {data.items.map((item) => {
                    const sel = selection[item.order_item_id] || {};
                    const disabled = item.remaining < 1;
                    const options = data.exchange_products.filter((p) => p.price <= item.unit_price && p.id !== item.product_id);
                    return (
                      <div key={item.order_item_id} className={disabled ? "opacity-50" : ""}>
                        <label className={"flex items-center gap-3 px-4 py-3.5 " + (disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-[#fafafa]")}>
                          <input type="checkbox" disabled={disabled} checked={Boolean(sel.selected)} onChange={() => toggle(item)} className="h-4 w-4 accent-[#1a1a1a]" />
                          <img src={resolveImg(item.image_url)} alt="" className="h-12 w-12 rounded-md border border-black/[.06] object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium">{item.name}</span>
                              {(item.selected_size || item.selected_color) && <span className="block text-[12px] text-[#6b6b73]">{[item.selected_size && `Size ${item.selected_size}`, item.selected_color && `Color ${item.selected_color}`].filter(Boolean).join(" · ")}</span>}
                            <span className="block text-[12.5px] text-[#6b6b73]">
                              {disabled ? (item.returnable ? "Already returned" : "Final sale — not returnable") : `${formatPrice(item.unit_price)} each · ${item.remaining} returnable`}
                            </span>
                          </span>
                        </label>

                        {sel.selected && (
                          <div className="flex flex-col gap-4 border-t border-[#ececef] bg-[#fcfcfd] px-4 pb-4 pt-3.5">
                            {item.remaining > 1 && (
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[#4a4a55]">Quantity</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" aria-label="Fewer" onClick={() => update(item.order_item_id, { quantity: Math.max(1, sel.quantity - 1) })} className={secondaryButton + " h-8 w-8 px-0"}><Minus size={14} /></button>
                                  <span className="w-6 text-center text-[14px] tabular-nums">{sel.quantity}</span>
                                  <button type="button" aria-label="More" onClick={() => update(item.order_item_id, { quantity: Math.min(item.remaining, sel.quantity + 1) })} className={secondaryButton + " h-8 w-8 px-0"}><Plus size={14} /></button>
                                </div>
                              </div>
                            )}
                            <div>
                              <Label htmlFor={`reason-${item.order_item_id}`}>Reason</Label>
                              <select id={`reason-${item.order_item_id}`} value={sel.reason} onChange={(e) => update(item.order_item_id, { reason: e.target.value, condition: PHOTO_REASONS.includes(e.target.value) ? "opened" : sel.condition })} className={inputSingle}>
                                <option value="" disabled>Choose a reason</option>
                                {Object.entries(data.policy.reasons).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[13px] font-medium text-[#4a4a55]">Is the item unworn with tags attached?</span>
                              <Segmented name="Condition" value={sel.condition} onChange={(v) => update(item.order_item_id, { condition: v })} options={[["sealed", "Yes"], ["opened", "No"]]} />
                            </div>
                            {sel.reason === "changed_mind" && sel.condition === "opened" && (
                              <p className="rounded-md bg-[#fdf6e7] px-3 py-2 text-[12.5px] text-[#7a5d1c]">Change-of-mind returns require unworn items with their tags attached. You can still report an item that arrived damaged or incorrect.</p>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[13px] font-medium text-[#4a4a55]">What would you like?</span>
                              <Segmented name="Resolution" value={sel.resolution} onChange={(v) => update(item.order_item_id, { resolution: v })} options={[["refund", "Refund"], ...(options.length ? [["exchange", "Exchange"]] : [])]} />
                            </div>
                            {sel.resolution === "exchange" && (
                              <div>
                                <Label htmlFor={`exchange-${item.order_item_id}`}>Exchange for</Label>
                                <select id={`exchange-${item.order_item_id}`} value={sel.exchangeId} onChange={(e) => update(item.order_item_id, { exchangeId: e.target.value })} className={inputSingle}>
                                  <option value="" disabled>Choose an item</option>
                                  {options.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} — {formatPrice(p.price)}{p.price < item.unit_price ? ` (you get ${formatPrice(item.unit_price - p.price)} back)` : ""}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1.5 text-[12px] text-[#6b6b73]">Exchanges are for items of the same price or less.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {needsPhotos && (
                  <div className="mt-6">
                    <SectionTitle>Photos of the problem</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((file, i) => (
                        <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border border-[#e3e3e6]">
                          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                          <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                        </div>
                      ))}
                      {photos.length < MAX_PHOTOS && (
                        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#c9c9ce] text-[11px] text-[#6b6b73] hover:bg-[#fafafa]">
                          <Camera size={18} />
                          Add
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] text-[#6b6b73]">Show the damage, leak or the item you received — up to {MAX_PHOTOS} photos.</p>
                  </div>
                )}

                <div className="mt-6">
                  <Label htmlFor="rt-note">Anything else we should know? (optional)</Label>
                  <textarea id="rt-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputSingle + " resize-y"} />
                </div>

                <button type="button" onClick={continueToRefund} className={primaryButton + " mt-7"}>Continue</button>
                <ErrorNote>{error}</ErrorNote>
              </>
            )}
          </div>
        )}

        {step === 2 && data && (
          <form onSubmit={submit}>
            <button type="button" onClick={() => { setError(""); setStep(1); }} className="mb-5 flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b73] hover:text-[#1a1a1a]">
              <ArrowLeft size={14} /> Back to items
            </button>

            <SectionTitle>Summary</SectionTitle>
            <div className={cardBox + " mb-7 divide-y divide-[#ececef]"}>
              {lines.map((l) => (
                <div key={l.item.order_item_id} className="flex items-center gap-3 px-4 py-3 text-[14px]">
                  <img src={resolveImg(l.item.image_url)} alt="" className="h-10 w-10 rounded-md border border-black/[.06] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.item.name} × {l.quantity}</p>
                    <p className="text-[12.5px] text-[#6b6b73]">
                      {data.policy.reasons[l.reason]}
                      {l.resolution === "exchange" ? <> · <RefreshCcw size={11} className="inline" /> {exchangeFor(l.exchangeId)?.name}</> : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {refundValue > 0 ? (
              <>
                <SectionTitle>How would you like your {formatPrice(refundValue)}?</SectionTitle>
                <div className={cardBox + " divide-y divide-[#ececef] overflow-hidden"}>
                  {[
                    ["original", data.order.payment_method === "jazzcash" ? "Refund to my JazzCash wallet" : "Refund to my account", "Sent within 5–7 business days after we receive the item"],
                    ["store_credit", `Store credit${bonus ? ` — ${formatPrice(refundValue * (1 + bonus / 100))}` : ""}`, bonus ? `Get ${bonus}% extra as a one-time code for your next order` : "A one-time code for your next order, issued as soon as we receive the item"],
                  ].map(([id, label, hint]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-[#fafafa]">
                      <input type="radio" name="refund-method" checked={refundMethod === id} onChange={() => setRefundMethod(id)} className="h-4 w-4 accent-[#1a1a1a]" />
                      <span className="flex-1">
                        <span className="block text-[14px] font-medium">{label}</span>
                        <span className="block text-[12.5px] text-[#6b6b73]">{hint}</span>
                      </span>
                      {id === "store_credit" && bonus ? <span className="rounded bg-[#eef6ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#2f7d32]">+{bonus}%</span> : null}
                    </label>
                  ))}
                </div>

                {payoutNeeded && (
                  <div className="mt-6">
                    <SectionTitle>Where should we send it?</SectionTitle>
                    <p className="-mt-1 mb-3 text-[13px] text-[#6b6b73]">You paid cash on delivery, so we'll transfer your refund to an account of your choice.</p>
                    <div className="flex flex-col gap-3">
                      <Segmented name="Account type" value={payout.type} onChange={(v) => setPayout({ ...payout, type: v, account: "" })} options={[["jazzcash", "JazzCash"], ["easypaisa", "Easypaisa"], ["bank", "Bank (IBAN)"]]} />
                      <div>
                        <Label htmlFor="rt-account">{payout.type === "bank" ? "IBAN" : "Wallet number"}</Label>
                        <input
                          id="rt-account"
                          required
                          inputMode={payout.type === "bank" ? "text" : "numeric"}
                          placeholder={payout.type === "bank" ? "PK36SCBL0000001123456702" : "03XXXXXXXXX"}
                          pattern={payout.type === "bank" ? "[Pp][Kk][0-9]{2}[A-Za-z]{4}[0-9A-Za-z]{16}" : "03[0-9]{9}"}
                          value={payout.account}
                          onChange={(e) => setPayout({ ...payout, account: payout.type === "bank" ? e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 24) : e.target.value.replace(/\D/g, "").slice(0, 11) })}
                          className={inputSingle + " tabular-nums"}
                        />
                      </div>
                      <div>
                        <Label htmlFor="rt-title">Account holder name</Label>
                        <input id="rt-title" required minLength={3} value={payout.title} onChange={(e) => setPayout({ ...payout, title: e.target.value })} className={inputSingle} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-md bg-[#f7f7f8] px-4 py-3 text-[14px] text-[#4a4a55]">This is an even exchange — nothing to refund. We'll send your new item once we receive the return.</p>
            )}

            <div className="mt-7 rounded-md bg-[#f7f7f8] px-4 py-3 text-[13px] leading-relaxed text-[#4a4a55]">
              <b className="text-[#1a1a1a]">What happens next:</b> we review your request within 1–2 business days and email you the return address. Please don't send anything until it's approved.
            </div>

            <button type="submit" disabled={loading} className={primaryButton + " mt-6"}>
              {loading && <Loader2 size={17} className="animate-spin" />}
              Submit return request
            </button>
            <ErrorNote>{error}</ErrorNote>
          </form>
        )}
      </div>
    </section>
  );
};

export default Returns;
