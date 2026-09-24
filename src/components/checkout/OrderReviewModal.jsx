import { Loader2, Lock, Pencil } from "lucide-react";
import CheckoutDialog from "./CheckoutDialog";
import JazzCashLogo from "./JazzCashLogo";
import { formatPrice } from "../../utils/price";
import { resolveImg } from "../../utils/resolveImg";
import { SYSTEM_FONT } from "../ui/formStyles";

// The last stop before an order exists: everything the shopper typed, read
// back to them, with one button that commits it. Nothing is placed until
// `onConfirm` runs.
const OrderReviewModal = ({
  view,
  email,
  address,
  paymentMethod,
  methodLabel,
  wallet,
  submitting,
  onConfirm,
  onClose,
}) => {
  const row = (label, value, strong = false) => (
    <div className={"flex justify-between gap-4 text-[14px] " + (strong ? "font-semibold text-[#1a1a1a]" : "text-[#4a4a55]")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  const block = (title, children) => (
    <div className="border-t border-[#ececef] px-5 py-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b73]">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <CheckoutDialog
      onClose={onClose}
      labelledBy="review-title"
      dismissable={!submitting}
      className="fashion-checkout-review max-w-[460px]"
    >
      <div style={{ fontFamily: SYSTEM_FONT }} className="flex min-h-0 flex-col text-[#1a1a1a]">
        <header className="px-5 pb-4 pt-5 sm:px-6">
          <h2 id="review-title" className="text-[18px] font-semibold">
            Review your order
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#6b6b73]">
            Please check everything below. Your order is not placed until you confirm.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {block(
            `Items (${view.items.reduce((n, item) => n + item.quantity, 0)})`,
            <ul className="flex flex-col gap-3">
              {view.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <img
                    src={resolveImg(item.image_url || item.image)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-md border border-black/[.06] bg-white object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{item.name || item.title}</p>
                    {(item.selected_size || item.selected_color) && <p className="mt-0.5 text-[12px] text-[#6b6b73]">{[item.selected_size && "Size: " + item.selected_size, item.selected_color && "Color: " + item.selected_color].filter(Boolean).join(" · ")}</p>}
                    <p className="mt-0.5 text-[13px] text-[#6b6b73]">Qty {item.quantity}</p>
                  </div>
                  <p className="text-[14px] font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          )}

          {block(
            "Deliver to",
            <address className="text-[14px] not-italic leading-relaxed text-[#4a4a55]">
              <span className="font-medium text-[#1a1a1a]">{address.fullName}</span>
              <br />
              {address.street}
              <br />
              {address.city} {address.postalCode}
              <br />
              {address.country}
              <br />
              <span className="tabular-nums">{address.phone}</span>
            </address>
          )}

          {block("Contact", <p className="break-all text-[14px] text-[#4a4a55]">{email}</p>)}

          {block(
            "Payment",
            <div className="text-[14px] text-[#4a4a55]">
              {paymentMethod === "jazzcash" ? (
                <JazzCashLogo height={15} />
              ) : (
                <p className="font-medium text-[#1a1a1a]">{methodLabel}</p>
              )}
              {paymentMethod === "jazzcash" && (
                <p className="mt-0.5 tabular-nums">
                  {wallet.mobile} · CNIC ••••{wallet.cnic.slice(-2)}
                </p>
              )}
              {paymentMethod === "cod" && <p className="mt-0.5">Pay in cash when your order arrives.</p>}
            </div>
          )}

          {block(
            "Total",
            <div className="flex flex-col gap-2">
              {row("Subtotal", formatPrice(view.subtotal))}
              {view.discount > 0 && row("Discount", "−" + formatPrice(view.discount))}
              {row("Shipping", view.shipping === 0 ? "Free" : formatPrice(view.shipping))}
              <div className="border-t border-[#e3e3e6] pt-2">{row("Total due", formatPrice(view.total), true)}</div>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#ececef] bg-[#fafafa] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1a1a1a] text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition hover:bg-black disabled:cursor-default disabled:bg-[#3a3a3f]"
          >
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <Lock size={15} />}
            {submitting
              ? "Placing your order…"
              : paymentMethod === "cod"
                ? "Confirm & place order"
                : `Confirm & pay ${formatPrice(view.total)}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md text-[14px] font-medium text-[#6b6b73] transition hover:bg-black/5 hover:text-[#1a1a1a] disabled:opacity-40"
          >
            <Pencil size={14} />
            Go back and edit
          </button>
        </footer>
      </div>
    </CheckoutDialog>
  );
};

export default OrderReviewModal;
