import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Banknote, ChevronDown, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { placeOrderThunk } from "../features/orders/ordersThunks";
import { approveJazzCashDemoRequest, getPaymentAccountsRequest } from "../api/ordersApi";
import { validatePromoRequest } from "../api/promotionsApi";
import { formatPrice } from "../utils/price";
import { resolveImg } from "../utils/resolveImg";
import { useShipping } from "../utils/shipping";
import useJazzCashPayment from "../components/checkout/useJazzCashPayment";
import OrderReviewModal from "../components/checkout/OrderReviewModal";
import JazzCashMpinDialog from "../components/checkout/JazzCashMpinDialog";
import JazzCashLogo from "../components/checkout/JazzCashLogo";
import { Label, SectionTitle, SYSTEM_FONT, inputGrouped, inputSingle } from "../components/ui/formStyles";

const METHOD_META = {
  jazzcash: { label: "JazzCash", hint: "Approve on your phone with your MPIN", Icon: Smartphone },
  cod: { label: "Cash on delivery", hint: "Pay when your order arrives", Icon: Banknote },
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const cartItems = useSelector((state) => state.cart?.items) || [];

  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    country: "Pakistan",
  });
  const [wallet, setWallet] = useState({ mobile: "", cnic: "" });

  const [jazzCashOnline, setJazzCashOnline] = useState(false);
  // The gateway is being simulated (JAZZCASH_ENV=demo): the MPIN prompt is
  // drawn on screen instead of reaching a phone.
  const [jazzCashDemo, setJazzCashDemo] = useState(false);
  // The one wallet the simulated gateway approves; shown on the form so the
  // demo can be driven without guessing.
  const [demoWallet, setDemoWallet] = useState(null);
  const [chosenMethod, setChosenMethod] = useState(null);
  const paymentMethod = chosenMethod || (jazzCashOnline ? "jazzcash" : "cod");
  const methods = jazzCashOnline ? ["jazzcash", "cod"] : ["cod"];

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Last stop before the order is created — see `submit` / `confirmOrder`.
  const [reviewOpen, setReviewOpen] = useState(false);

  // One idempotency key per checkout visit, reused if "Pay" is pressed
  // again — the server then returns the order it already placed.
  const [checkoutKey] = useState(() =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  );

  // Set once the order exists and is awaiting a JazzCash payment; the cart
  // is cleared at that point, so the summary is kept here.
  const [placed, setPlaced] = useState(null);

  const [appliedPromo, setAppliedPromo] = useState(location.state?.appliedPromo || null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);

  const jazzCash = useJazzCashPayment({
    onPaid: (order) => navigate("/order-success/" + order.orderId),
  });

  useEffect(() => {
    getPaymentAccountsRequest()
      .then((data) => {
        setJazzCashOnline(Boolean(data?.jazzcash?.online));
        setJazzCashDemo(Boolean(data?.jazzcash?.demo));
        if (data?.jazzcash?.demoMobile) {
          setDemoWallet({ mobile: data.jazzcash.demoMobile, cnic: data.jazzcash.demoCnic });
        }
      })
      .catch(() => setJazzCashOnline(false));
  }, []);

  const liveSubtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const { cost: liveShipping } = useShipping(liveSubtotal);
  const liveDiscount = appliedPromo?.discount || 0;

  const view = placed?.summary || {
    items: cartItems,
    subtotal: liveSubtotal,
    shipping: liveShipping,
    discount: liveDiscount,
    total: Math.max(liveSubtotal + liveShipping - liveDiscount, 0),
  };

  const busy = submitting || jazzCash.busy;
  const locked = Boolean(placed) || busy;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true);
    setPromoError("");
    try {
      const result = await validatePromoRequest(code, liveSubtotal);
      setAppliedPromo({
        code: result.promo_code,
        discount: result.discount,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      });
      setPromoOpen(false);
    } catch (error) {
      setAppliedPromo(null);
      setPromoError(error.response?.data?.message || "That code isn't valid.");
    } finally {
      setPromoChecking(false);
    }
  };

  const placeOrder = async () => {
    setSubmitting(true);
    try {
      const result = await dispatch(
        placeOrderThunk({
          email: email.trim(),
          shipping_address: address,
          payment_method: paymentMethod,
          promo_code: appliedPromo?.code || undefined,
          idempotencyKey: checkoutKey,
          clientOrder: {
            id: null,
            date: new Date().toISOString(),
            status: "Processing",
            items: cartItems,
            contact: { email },
            address,
            shippingMethod: "standard",
            paymentMethod,
            total: view.total,
          },
        })
      ).unwrap();
      return result;
    } catch (error) {
      // This checkout already produced an order (the first response was
      // lost) — take the shopper to it rather than showing an error.
      if (error?.orderId) {
        navigate("/order-success/" + error.orderId);
        return null;
      }
      setSubmitError(error?.message || "We could not place your order. Please try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // The form's own validation has passed by the time this runs, so the review
  // modal always shows a complete order. Nothing is placed here.
  const submit = (event) => {
    event.preventDefault();
    setSubmitError("");

    // The order already exists and only its payment is being retried — there
    // is nothing left to review.
    if (placed) {
      jazzCash.charge(placed, wallet);
      return;
    }
    setReviewOpen(true);
  };

  // Confirmed in the review modal: from here the order is real.
  const confirmOrder = async () => {
    const summary = { ...view, items: cartItems };
    const result = await placeOrder();
    if (!result) {
      setReviewOpen(false);
      return;
    }
    setReviewOpen(false);
    if (paymentMethod === "cod") {
      navigate("/order-success/" + result.orderId);
      return;
    }
    const order = { orderId: result.orderId, paymentToken: result.payment.token, summary };
    setPlaced(order);
    jazzCash.charge(order, wallet);
  };

  // Stands in for the customer approving the charge on their phone. The
  // backend settles it through the ordinary status path and hands back the
  // same result the poll would have seen.
  const approveDemoMpin = async (mpin) => {
    try {
      const result = await approveJazzCashDemoRequest(placed.orderId, {
        paymentToken: placed.paymentToken,
        mpin,
      });
      // Let the handset's approved tick land before the page moves on.
      setTimeout(() => jazzCash.resolve(result), 900);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message };
    }
  };

  // Dismissing the prompt declines the charge, which settles the payment back
  // to 'pending' so the order can be paid again.
  const cancelDemoMpin = async () => {
    try {
      await approveJazzCashDemoRequest(placed.orderId, {
        paymentToken: placed.paymentToken,
        decline: true,
      });
    } catch {
      // Already settled or gone — the message below is right either way.
    }
    jazzCash.fail("Payment cancelled. You can try again.");
  };

  if (!cartItems.length && !placed) {
    return (
      <section className="fashion-checkout-page flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center" style={{ fontFamily: SYSTEM_FONT }}>
        <p className="text-lg font-semibold text-[#1a1a1a]">Your bag is empty</p>
        <Link to="/shops" className="rounded-md bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white">
          Browse the shop
        </Link>
      </section>
    );
  }

  const setField = (name) => (e) => setAddress({ ...address, [name]: e.target.value });

  const payLabel = () => {
    if (submitting) return "Processing…";
    if (jazzCash.phase === "approving") return "Waiting for approval…";
    if (jazzCash.phase === "confirming") return "Confirming payment…";
    // The order is placed and only its payment is outstanding.
    if (placed) return `Pay ${formatPrice(view.total)}`;
    // Everything else goes through the review step first.
    return "Review order";
  };

  const totalsRow = (label, value, className = "") => (
    <div className={"flex justify-between text-[14px] " + className}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="fashion-checkout-page min-h-screen bg-white text-[#1a1a1a] antialiased lg:flex" style={{ fontFamily: SYSTEM_FONT }}>
      <AnimatePresence>
        {reviewOpen && (
          <OrderReviewModal
            key="review"
            view={view}
            email={email}
            address={address}
            paymentMethod={paymentMethod}
            methodLabel={METHOD_META[paymentMethod].label}
            wallet={wallet}
            submitting={submitting}
            onConfirm={confirmOrder}
            onClose={() => setReviewOpen(false)}
          />
        )}

        {/* Stands in for the prompt JazzCash would push to the customer's
            phone. Only ever rendered while the gateway is simulated. */}
        {jazzCashDemo && placed && jazzCash.busy && (
          <JazzCashMpinDialog
            key="mpin"
            mobile={wallet.mobile}
            amount={view.total}
            orderId={placed.orderId}
            onApprove={approveDemoMpin}
            onCancel={cancelDemoMpin}
          />
        )}
      </AnimatePresence>

      {/* ── Order summary ─────────────────────────────────────────────── */}
      <aside className="border-b border-[#ececef] bg-[#f7f7f8] lg:flex lg:w-1/2 lg:justify-end lg:border-b-0 lg:border-r">
        <div className="mx-auto w-full max-w-[460px] px-5 pb-6 pt-5 sm:px-8 lg:sticky lg:top-0 lg:mx-0 lg:self-start lg:px-12 lg:pb-16 lg:pt-12">
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              aria-label="Back to bag"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b73] transition hover:bg-black/5 hover:text-[#1a1a1a]"
            >
              <ArrowLeft size={18} />
            </Link>
            <Link to="/" aria-label="Almina home" className="fashion-checkout-wordmark">
              <span>ALMINA</span>
              <small>CONCEPT</small>
            </Link>
          </div>

          <div className="mt-6 lg:mt-10">
            <p className="text-[15px] font-medium text-[#6b6b73]">Your Almina order</p>
            <p className="mt-1 text-[36px] font-semibold leading-tight tracking-tight tabular-nums">
              {formatPrice(view.total)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSummaryOpen((open) => !open)}
            className="mt-3 flex items-center gap-1 rounded-md text-[13px] font-medium text-[#6b6b73] hover:text-[#1a1a1a] lg:hidden"
            aria-expanded={summaryOpen}
          >
            {summaryOpen ? "Hide" : "View"} details
            <ChevronDown size={15} className={"transition " + (summaryOpen ? "rotate-180" : "")} />
          </button>

          <div className={(summaryOpen ? "block" : "hidden") + " mt-6 lg:mt-10 lg:block"}>
            <ul className="flex flex-col gap-5">
              {view.items.map((item) => (
                <li key={item.id} className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={resolveImg(item.image_url || item.image)}
                      alt=""
                      className="h-12 w-12 rounded-md border border-black/[.06] bg-white object-cover"
                    />
                    {item.quantity > 1 && (
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6b6b73] px-1 text-[11px] font-semibold text-white">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{item.name || item.title}</p>
                    {(item.selected_size || item.selected_color) && <p className="mt-0.5 text-[12px] text-[#777169]">{[item.selected_size && "Size: " + item.selected_size, item.selected_color && "Color: " + item.selected_color].filter(Boolean).join(" · ")}</p>}
                    <p className="mt-0.5 text-[13px] text-[#6b6b73]">
                      Qty {item.quantity}
                      {item.has_discount && (
                        <span className="ml-2 text-[#a3a3a8] line-through">{formatPrice(item.original_price)}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-[14px] font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#e3e3e6] pt-5 text-[#4a4a55]">
              {totalsRow("Subtotal", formatPrice(view.subtotal), "font-medium text-[#1a1a1a]")}

              {!placed && !appliedPromo && !promoOpen && (
                <button
                  type="button"
                  onClick={() => setPromoOpen(true)}
                  className="w-fit rounded-md bg-white px-3 py-1.5 text-[13px] font-medium text-[#1a1a1a] shadow-[0_0_0_1px_#e3e3e6] transition hover:shadow-[0_0_0_1px_#c9c9ce]"
                >
                  Add promotion code
                </button>
              )}

              {!placed && promoOpen && (
                <div>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyPromo();
                        }
                      }}
                      placeholder="Promotion code"
                      className={inputSingle + " py-2 text-[14px] uppercase placeholder:normal-case"}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoChecking || !promoInput.trim()}
                      className="shrink-0 rounded-md px-3 text-[14px] font-medium text-[#8a7148] transition hover:bg-black/5 disabled:opacity-40"
                    >
                      {promoChecking ? "…" : "Apply"}
                    </button>
                  </div>
                  {promoError && <p className="mt-1.5 text-[13px] text-[#df1b41]">{promoError}</p>}
                </div>
              )}

              {appliedPromo && view.discount > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-[#ececef] px-1.5 py-0.5 text-[12px] font-semibold tracking-wide text-[#4a4a55]">
                      {appliedPromo.code}
                    </span>
                    {!placed && (
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-[12px] text-[#6b6b73] underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </span>
                  <span className="tabular-nums">−{formatPrice(view.discount)}</span>
                </div>
              )}

              {totalsRow("Shipping", view.shipping === 0 ? "Free" : formatPrice(view.shipping))}

              <div className="border-t border-[#e3e3e6] pt-3">
                {totalsRow("Total due", formatPrice(view.total), "text-[15px] font-semibold text-[#1a1a1a]")}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Details & payment ─────────────────────────────────────────── */}
      <main className="lg:flex lg:w-1/2">
        <form
          onSubmit={submit}
          className="mx-auto w-full max-w-[460px] px-5 py-8 sm:px-8 lg:mx-0 lg:px-12 lg:py-12 lg:pt-[7.5rem]"
        >
          {placed && (
            <div className="mb-6 rounded-md border border-[#e3e3e6] bg-[#f7f7f8] px-4 py-3 text-[13px] text-[#4a4a55]">
              Order <b className="text-[#1a1a1a]">#{placed.orderId}</b> is reserved for you. Complete the payment below.
            </div>
          )}

          <fieldset disabled={locked} className="flex flex-col gap-8">
            <section>
              <SectionTitle>Contact information</SectionTitle>
              <Label htmlFor="co-email">Email</Label>
              <input
                id="co-email"
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputSingle}
              />
            </section>

            <section>
              <SectionTitle>Shipping address</SectionTitle>
              <Label htmlFor="co-name">Full name</Label>
              <input
                id="co-name"
                required
                autoComplete="name"
                value={address.fullName}
                onChange={setField("fullName")}
                className={inputSingle}
              />

              <div className="mt-4">
                <Label htmlFor="co-street">Address</Label>
                <div className="rounded-md shadow-[0_1px_1px_rgba(0,0,0,0.03),0_3px_6px_rgba(0,0,0,0.02)]">
                  <input
                    aria-label="Country"
                    required
                    autoComplete="country-name"
                    value={address.country}
                    onChange={setField("country")}
                    className={inputGrouped + " rounded-t-md"}
                  />
                  <input
                    id="co-street"
                    required
                    autoComplete="street-address"
                    placeholder="Street address"
                    value={address.street}
                    onChange={setField("street")}
                    className={inputGrouped}
                  />
                  <div className="flex">
                    <input
                      aria-label="City"
                      required
                      autoComplete="address-level2"
                      placeholder="City"
                      value={address.city}
                      onChange={setField("city")}
                      className={inputGrouped + " w-1/2 rounded-bl-md"}
                    />
                    <input
                      aria-label="Postal code"
                      required
                      autoComplete="postal-code"
                      placeholder="Postal code"
                      value={address.postalCode}
                      onChange={setField("postalCode")}
                      className={inputGrouped + " -ml-px w-1/2 rounded-br-md"}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="co-phone">Phone number</Label>
                <input
                  id="co-phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  minLength={10}
                  placeholder="0300 1234567"
                  value={address.phone}
                  onChange={setField("phone")}
                  className={inputSingle}
                />
              </div>
            </section>
          </fieldset>

          <section className="mt-8">
            <SectionTitle>Payment method</SectionTitle>
            <div className="overflow-hidden rounded-md border border-[#e3e3e6] shadow-[0_1px_1px_rgba(0,0,0,0.03),0_3px_6px_rgba(0,0,0,0.02)]">
              {methods.map((id, index) => {
                const { label, hint, Icon } = METHOD_META[id];
                const selected = paymentMethod === id;
                return (
                  <div key={id} className={index > 0 ? "border-t border-[#e3e3e6]" : ""}>
                    <label
                      className={
                        "flex cursor-pointer items-center gap-3 px-4 py-3.5 transition " +
                        (selected ? "bg-white" : "bg-white hover:bg-[#fafafa]") +
                        (locked ? " cursor-default" : "")
                      }
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={id}
                        checked={selected}
                        disabled={locked}
                        onChange={() => setChosenMethod(id)}
                        className="h-4 w-4 accent-[#1a1a1a]"
                      />
                      <span
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-md " +
                          (id === "jazzcash" ? "bg-[#fff4d6] text-[#c8102e]" : "bg-[#eef6ee] text-[#2f7d32]")
                        }
                      >
                        <Icon size={16} />
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2 text-[14px] font-medium">
                          {id === "jazzcash" ? <JazzCashLogo height={15} /> : label}
                        </span>
                        <span className="block text-[12.5px] text-[#6b6b73]">
                          {id === "jazzcash" && jazzCashDemo ? "Simulated gateway — no real payment is taken" : hint}
                        </span>
                      </span>
                    </label>

                    {selected && id === "jazzcash" && (
                      <div className="border-t border-[#ececef] bg-[#fcfcfd] px-4 pb-4 pt-3.5">
                        {jazzCash.busy ? (
                          <div className="flex items-start gap-3 py-1" role="status" aria-live="polite">
                            <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-[#c9a96e]" />
                            <div className="text-[13.5px] leading-relaxed text-[#4a4a55]">
                              {jazzCash.phase === "approving" ? (
                                <>
                                  <p className="font-semibold text-[#1a1a1a]">Check your phone</p>
                                  <p>
                                    Enter your MPIN in the JazzCash prompt sent to <b>{wallet.mobile}</b> to approve{" "}
                                    {formatPrice(view.total)}. Keep this page open.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold text-[#1a1a1a]">Confirming your payment</p>
                                  <p>This can take a moment. Please don't pay again or close this page.</p>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="flex-[3]">
                              <Label htmlFor="co-wallet">JazzCash number</Label>
                              <input
                                id="co-wallet"
                                required
                                inputMode="numeric"
                                autoComplete="tel"
                                pattern="03[0-9]{9}"
                                title="11-digit JazzCash number, e.g. 03001234567"
                                maxLength={11}
                                placeholder="03XX XXXXXXX"
                                value={wallet.mobile}
                                onChange={(e) => setWallet({ ...wallet, mobile: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                                className={inputSingle + " tabular-nums"}
                              />
                            </div>
                            <div className="flex-[2]">
                              <Label htmlFor="co-cnic">CNIC last 6</Label>
                              <input
                                id="co-cnic"
                                required
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                title="Last 6 digits of your CNIC"
                                maxLength={6}
                                placeholder="XXXXXX"
                                value={wallet.cnic}
                                onChange={(e) => setWallet({ ...wallet, cnic: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                                className={inputSingle + " tabular-nums"}
                              />
                            </div>
                          </div>
                        )}

                        {/* Only this wallet is approved while the gateway is
                            simulated, so the number is shown rather than
                            guessed. */}
                        {demoWallet && !jazzCash.busy && (
                          <button
                            type="button"
                            onClick={() => setWallet({ mobile: demoWallet.mobile, cnic: demoWallet.cnic })}
                            className="mt-3 w-full rounded-md border border-dashed border-[#e0cfa0] bg-[#fffdf6] px-3 py-2 text-left text-[12px] leading-relaxed text-[#8a6d1f] transition hover:bg-[#fff9ea]"
                          >
                            Demo wallet — <b className="tabular-nums">{demoWallet.mobile}</b>, CNIC{" "}
                            <b className="tabular-nums">{demoWallet.cnic}</b>. Tap to fill.
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <button
            type="submit"
            disabled={busy}
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1a1a1a] text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition hover:bg-black disabled:cursor-default disabled:bg-[#3a3a3f]"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Lock size={15} />}
            {payLabel()}
          </button>

          {(submitError || jazzCash.error) && (
            <p role="alert" className="mt-3 rounded-md bg-[#fdf2f4] px-3 py-2.5 text-[13px] text-[#c01a3b]">
              {submitError || jazzCash.error}
            </p>
          )}

          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#6b6b73]">
            By completing your order you agree to our{" "}
            <Link to="/terms-of-service" className="underline underline-offset-2 hover:text-[#1a1a1a]">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-[#1a1a1a]">Privacy Policy</Link>.
          </p>

          <div className="mt-10 flex items-center justify-center gap-1.5 border-t border-[#ececef] pt-5 text-[12px] text-[#a3a3a8]">
            <ShieldCheck size={13} />
            {paymentMethod === "jazzcash"
              ? jazzCashDemo
                ? "JazzCash gateway simulated — no real payment is taken"
                : "Payments secured by JazzCash — we never see your MPIN"
              : "Secure checkout"}
          </div>
        </form>
      </main>
    </div>
  );
};

export default Checkout;
