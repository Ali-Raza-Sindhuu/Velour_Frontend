import { useState } from "react";
import { CheckCircle2, Delete, Loader2 } from "lucide-react";
import CheckoutDialog from "./CheckoutDialog";
import JazzCashLogo from "./JazzCashLogo";
import { formatPrice } from "../../utils/price";
import { SYSTEM_FONT } from "../ui/formStyles";

// The MPIN prompt that JazzCash pushes to the customer's phone, drawn here on
// screen instead. It exists only while JAZZCASH_ENV=demo, so the wallet flow
// can be shown end to end before real sandbox credentials arrive — everything
// behind it (the charge, the polling, settlement) is the production code path.
//
// Once the real gateway is wired up this dialog never renders: the prompt
// goes to the customer's handset and the page just waits, as it does today.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
const MPIN_LENGTH = 4;

const JazzCashMpinDialog = ({ mobile, amount, orderId, onApprove, onCancel }) => {
  const [mpin, setMpin] = useState("");
  const [state, setState] = useState("entering"); // entering | sending | approved
  const [error, setError] = useState("");

  const submit = async (pin) => {
    setState("sending");
    setError("");
    const result = await onApprove(pin);
    if (result?.ok) {
      setState("approved");
      return;
    }
    setMpin("");
    setState("entering");
    setError(result?.message || "That didn't go through. Try again.");
  };

  const press = (key) => {
    if (state !== "entering") return;
    if (key === "del") {
      setMpin((current) => current.slice(0, -1));
      return;
    }
    setMpin((current) => {
      const next = (current + key).slice(0, MPIN_LENGTH);
      // A real handset submits as soon as the PIN is complete.
      if (next.length === MPIN_LENGTH) submit(next);
      return next;
    });
  };

  return (
    <CheckoutDialog
      onClose={onCancel}
      labelledBy="mpin-title"
      dismissable={state === "entering"}
      className="fashion-checkout-mpin max-w-[340px]"
    >
      <div style={{ fontFamily: SYSTEM_FONT }} className="flex flex-col">
        <div className="bg-[#1a1a1a] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ffd166]">
          Simulated handset — demo only
        </div>

        <div className="bg-[#c8102e] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="rounded bg-white px-2 py-1">
              <JazzCashLogo height={14} />
            </span>
          </div>
          <p id="mpin-title" className="mt-2.5 text-[15px] font-semibold">
            Payment request
          </p>
          <p className="mt-0.5 text-[13px] text-white/80 tabular-nums">{mobile}</p>
        </div>

        <div className="border-b border-[#ececef] bg-[#fff9ea] px-5 py-4 text-center">
          <p className="text-[12.5px] text-[#6b6b73]">Almina · Order #{orderId}</p>
          <p className="mt-1 text-[30px] font-semibold leading-tight tracking-tight tabular-nums text-[#1a1a1a]">
            {formatPrice(amount)}
          </p>
        </div>

        {state === "approved" ? (
          <div className="flex flex-col items-center gap-2 px-5 py-9 text-center">
            <CheckCircle2 size={38} className="text-[#2f7d32]" />
            <p className="text-[15px] font-semibold text-[#1a1a1a]">Payment approved</p>
            <p className="text-[13px] text-[#6b6b73]">Returning you to your order…</p>
          </div>
        ) : (
          <div className="px-5 py-5">
            <p className="text-center text-[13px] text-[#4a4a55]">
              {state === "sending" ? "Authorising…" : "Enter your MPIN to approve"}
            </p>

            <div className="mt-3.5 flex justify-center gap-3" aria-label="MPIN entry" role="status">
              {Array.from({ length: MPIN_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={
                    "h-3 w-3 rounded-full transition " +
                    (index < mpin.length ? "bg-[#1a1a1a]" : "bg-[#dcdce0]")
                  }
                />
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-center text-[12.5px] text-[#c01a3b]">
                {error}
              </p>
            )}

            {state === "sending" ? (
              <div className="flex h-[196px] items-center justify-center">
                <Loader2 size={22} className="animate-spin text-[#c9a96e]" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {KEYS.map((key, index) =>
                  key === "" ? (
                    <span key={index} />
                  ) : (
                    <button
                      key={index}
                      type="button"
                      onClick={() => press(key)}
                      aria-label={key === "del" ? "Delete" : key}
                      className="flex h-11 items-center justify-center rounded-md bg-[#f4f4f6] text-[17px] font-medium text-[#1a1a1a] transition hover:bg-[#e8e8ec] active:scale-95"
                    >
                      {key === "del" ? <Delete size={17} /> : key}
                    </button>
                  )
                )}
              </div>
            )}

            <p className="mt-4 text-center text-[11.5px] leading-relaxed text-[#a3a3a8]">
              Any 4-digit PIN is accepted while the gateway is simulated.
            </p>

            <button
              type="button"
              onClick={onCancel}
              disabled={state === "sending"}
              className="mt-2 w-full rounded-md py-2 text-[13px] font-medium text-[#6b6b73] transition hover:bg-black/5 hover:text-[#1a1a1a] disabled:opacity-40"
            >
              Cancel payment
            </button>
          </div>
        )}
      </div>
    </CheckoutDialog>
  );
};

export default JazzCashMpinDialog;
