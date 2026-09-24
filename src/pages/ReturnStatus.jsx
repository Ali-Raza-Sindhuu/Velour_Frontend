import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, Copy, Loader2, MapPin, RefreshCcw, Truck } from "lucide-react";
import { addReturnTracking, cancelReturn, getReturnStatus } from "../api/returnsApi";
import { formatPrice } from "../utils/price";
import { resolveImg } from "../utils/resolveImg";
import { ErrorNote, Label, SYSTEM_FONT, SectionTitle, cardBox, inputSingle, primaryButton, secondaryButton } from "../components/ui/formStyles";

const STAGES = [
  ["requested", "Requested"],
  ["approved", "Approved"],
  ["shipped_back", "Shipped"],
  ["received", "Received"],
  ["completed", "Resolved"],
];
const CLOSED = {
  rejected: "This return wasn't approved",
  cancelled: "This return was cancelled",
  expired: "This return expired",
};
const formatDate = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: withTime ? undefined : "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) })
    : "";
const errorText = (err, fallback) => err?.response?.data?.message || fallback;

const ReturnStatus = () => {
  const { rma } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token");
  const isNew = params.get("new") === "1";

  const [ret, setRet] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tracking, setTracking] = useState({ courier: "", tracking: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getReturnStatus(rma, token)
      .then((data) => active && setRet(data))
      .catch((err) => active && setLoadError(errorText(err, "We couldn't load this return.")));
    return () => { active = false; };
  }, [rma, token]);

  const run = async (name, work) => {
    setBusy(name);
    setError("");
    try {
      setRet(await work());
    } catch (err) {
      setError(errorText(err, "That didn't work. Please try again."));
    } finally {
      setBusy("");
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(ret.store_credit_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const shell = (children) => (
    <section className="bg-white px-5 pb-20 pt-10 text-[#1a1a1a] antialiased sm:px-8" style={{ fontFamily: SYSTEM_FONT }}>
      <div className="mx-auto max-w-[580px]">{children}</div>
    </section>
  );

  if (loadError) {
    return shell(
      <div className="py-16 text-center">
        <p className="text-[18px] font-semibold">Return not found</p>
        <p className="mt-2 text-[14px] text-[#6b6b73]">Open the link from your return email, or sign in to the account you ordered with.</p>
        <Link to="/returns" className={secondaryButton + " mx-auto mt-6 w-fit"}>Start or find a return</Link>
      </div>
    );
  }
  if (!ret) return shell(<div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#a3a3a8]" /></div>);

  const closed = CLOSED[ret.status];
  const stageIndex = STAGES.findIndex(([id]) => id === ret.status);
  const hasExchange = ret.items.some((i) => i.resolution === "exchange");
  const lastCustomerMessage = [...ret.events].reverse().find((e) => e.type === "message");

  return shell(
    <>
      {isNew && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-[#cfe8d1] bg-[#f3faf3] px-4 py-3 text-[14px] text-[#24562a]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p><b>Request submitted.</b> We've emailed you a copy with a link back to this page. We'll review it within 1–2 business days.</p>
        </div>
      )}

      <p className="text-[13px] font-medium text-[#6b6b73]">Order #{ret.order_id}</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Return {ret.rma}</h1>
      <p className="mt-1 text-[14px] text-[#6b6b73]">Requested {formatDate(ret.requested_at)}</p>

      {/* ── Progress ─────────────────────────────────────────────── */}
      {closed ? (
        <div className="mt-6 rounded-md bg-[#f7f7f8] px-4 py-3.5 text-[14px]">
          <p className="font-semibold">{closed}</p>
          {ret.decision_message && ret.status === "rejected" ? <p className="mt-1 text-[#4a4a55]">{ret.decision_message}</p> : null}
          {ret.status === "expired" ? <p className="mt-1 text-[#4a4a55]">If you already shipped it, reply to your return email with the tracking number.</p> : null}
        </div>
      ) : (
        <ol className="mt-7 grid grid-cols-5 gap-1.5" aria-label="Return progress">
          {STAGES.map(([id, label], i) => {
            const done = i < stageIndex || ret.status === "completed";
            const current = i === stageIndex && ret.status !== "completed";
            return (
              <li key={id} className="flex flex-col gap-2">
                <span className={"h-1 rounded-full " + (done || current ? "bg-[#1a1a1a]" : "bg-[#e3e3e6]")} />
                <span className={"flex items-center gap-1 text-[11.5px] font-medium " + (current ? "text-[#1a1a1a]" : done ? "text-[#4a4a55]" : "text-[#a3a3a8]")}>
                  {done && <Check size={11} strokeWidth={3} />}
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* ── What to do now ───────────────────────────────────────── */}
      <div className="mt-8">
        {ret.status === "requested" && (
          <div className={cardBox + " p-5 text-[14px] text-[#4a4a55]"}>
            <p className="font-semibold text-[#1a1a1a]">We're reviewing your request</p>
            <p className="mt-1">You'll get an email with the return address once it's approved. Please don't send anything yet.</p>
          </div>
        )}

        {ret.status === "approved" && (
          <>
            <div className={cardBox + " p-5 text-[14px] text-[#4a4a55]"}>
              <p className="font-semibold text-[#1a1a1a]">Your return is approved — please send it by {formatDate(ret.ship_by)}</p>
              {ret.decision_message ? <p className="mt-1">{ret.decision_message}</p> : null}
              {ret.return_address ? (
                <div className="mt-4 flex gap-3 rounded-md bg-[#f7f7f8] p-3.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#6b6b73]" />
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6b6b73]">Send to</p>
                    <p className="mt-0.5 whitespace-pre-line text-[#1a1a1a]">{ret.return_address}</p>
                  </div>
                </div>
              ) : null}
              <p className="mt-4">Write <b className="text-[#1a1a1a]">{ret.rma}</b> on the parcel. {ret.instructions}</p>
            </div>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                run("tracking", () => addReturnTracking(ret.rma, token, tracking));
              }}
            >
              <SectionTitle>Shipped it? Add the tracking number</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <div className="sm:col-span-2">
                  <Label htmlFor="rs-courier">Courier</Label>
                  <input id="rs-courier" required list="couriers" placeholder="e.g. TCS" value={tracking.courier} onChange={(e) => setTracking({ ...tracking, courier: e.target.value })} className={inputSingle} />
                  <datalist id="couriers">
                    {["TCS", "Leopards", "M&P", "PostEx", "Trax", "Call Courier", "Pakistan Post", "BlueEx"].map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="rs-tracking">Tracking number</Label>
                  <input id="rs-tracking" required minLength={3} value={tracking.tracking} onChange={(e) => setTracking({ ...tracking, tracking: e.target.value })} className={inputSingle} />
                </div>
              </div>
              <button type="submit" disabled={busy === "tracking"} className={primaryButton + " mt-4"}>
                {busy === "tracking" ? <Loader2 size={17} className="animate-spin" /> : <Truck size={16} />}
                Save tracking
              </button>
            </form>
          </>
        )}

        {ret.status === "shipped_back" && (
          <div className={cardBox + " p-5 text-[14px] text-[#4a4a55]"}>
            <p className="font-semibold text-[#1a1a1a]">On its way back to us</p>
            <p className="mt-1">{ret.return_courier} · <span className="font-mono">{ret.return_tracking}</span></p>
            <p className="mt-2">We'll email you as soon as it arrives.</p>
          </div>
        )}

        {ret.status === "received" && (
          <div className={cardBox + " p-5 text-[14px] text-[#4a4a55]"}>
            <p className="font-semibold text-[#1a1a1a]">We've received your parcel</p>
            <p className="mt-1">We're inspecting the items and will confirm your {hasExchange ? "exchange" : "refund"} within 2 business days.</p>
          </div>
        )}

        {ret.status === "completed" && (
          <div className="rounded-md border border-[#cfe8d1] bg-[#f3faf3] p-5 text-[14px] text-[#24562a]">
            <p className="font-semibold">Your return is complete</p>
            {ret.store_credit_code ? (
              <div className="mt-3">
                <p>Your store credit code — use it at checkout:</p>
                <button type="button" onClick={copyCode} className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-[#7cb883] bg-white px-4 py-2.5 font-mono text-[16px] font-semibold tracking-wider text-[#1a1a1a]">
                  {ret.store_credit_code}
                  {copied ? <Check size={15} /> : <Copy size={15} className="text-[#6b6b73]" />}
                </button>
                <p className="mt-2 text-[12.5px]">Single use, valid for one year. Any unused balance isn't carried over.</p>
              </div>
            ) : Number(ret.refund_amount) > 0 ? (
              <p className="mt-1">We've refunded {formatPrice(ret.refund_amount)}. It usually shows in your account within 5–7 business days.</p>
            ) : null}
            {ret.exchange_order_id ? (
              <p className="mt-2">Your exchange is order <b>#{ret.exchange_order_id}</b> — we'll email you when it ships.</p>
            ) : null}
            {ret.decision_message ? <p className="mt-2">{ret.decision_message}</p> : null}
          </div>
        )}

        {lastCustomerMessage && !["completed", "rejected"].includes(ret.status) && (
          <div className="mt-4 rounded-md bg-[#fdf6e7] px-4 py-3 text-[13.5px] text-[#5c4515]">
            <p className="text-[12px] font-semibold uppercase tracking-wide">Message from IT Store</p>
            <p className="mt-1">{lastCustomerMessage.message}</p>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
      </div>

      {/* ── Items ────────────────────────────────────────────────── */}
      <div className="mt-10">
        <SectionTitle>Items</SectionTitle>
        <div className={cardBox + " divide-y divide-[#ececef]"}>
          {ret.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-[14px]">
              <img src={resolveImg(item.image_url)} alt="" className="h-11 w-11 rounded-md border border-black/[.06] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name} × {item.quantity}</p>
                {(item.selected_size || item.selected_color) && <p className="text-[12px] text-[#6b6b73]">{[item.selected_size && `Size ${item.selected_size}`, item.selected_color && `Color ${item.selected_color}`].filter(Boolean).join(" · ")}</p>}
                <p className="text-[12.5px] text-[#6b6b73]">
                  {item.reason_label}
                  {item.resolution === "exchange" ? <> · <RefreshCcw size={11} className="inline" /> {item.exchange_name}</> : null}
                  {item.inspection === "rejected" ? <span className="text-[#c01a3b]"> · didn't pass inspection</span> : null}
                </p>
              </div>
              <span className="tabular-nums text-[#4a4a55]">{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-[#6b6b73]">
          {ret.refund_method === "store_credit" ? "Refund as store credit" : ret.payout_details ? `Refund to ${ret.payout_details.type === "bank" ? "bank account" : `${ret.payout_details.type === "easypaisa" ? "Easypaisa" : "JazzCash"} wallet`} ${ret.payout_details.account}` : "Refund to your original payment method"}
        </p>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div className="mt-10">
        <SectionTitle>Updates</SectionTitle>
        <ol className="flex flex-col gap-4 border-l border-[#e3e3e6] pl-5">
          {[...ret.events].reverse().map((e) => (
            <li key={e.id} className="relative text-[14px]">
              <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-[#1a1a1a] ring-4 ring-white" />
              <p className="font-medium capitalize">{e.type === "shipped_back" ? "Shipped back" : e.type.replace(/_/g, " ")}</p>
              {e.message ? <p className="mt-0.5 text-[#4a4a55]">{e.message}</p> : null}
              <p className="mt-0.5 text-[12px] text-[#a3a3a8]">{formatDate(e.created_at, true)}</p>
            </li>
          ))}
        </ol>
      </div>

      {["requested", "approved"].includes(ret.status) && (
        <button
          type="button"
          disabled={busy === "cancel"}
          onClick={() => window.confirm("Cancel this return request?") && run("cancel", () => cancelReturn(ret.rma, token))}
          className="mt-10 text-[13px] font-medium text-[#6b6b73] underline underline-offset-2 hover:text-[#c01a3b]"
        >
          Cancel this return
        </button>
      )}
    </>
  );
};

export default ReturnStatus;
