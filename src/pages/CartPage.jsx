import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

import { removeFromCartThunk as removeFromCart, updateQuantityThunk } from "../features/cart/cartThunks";
import { validatePromoRequest } from "../api/promotionsApi";

import { formatPrice } from "../utils/price";
import { resolveImg } from "../utils/resolveImg";
import { useShipping } from "../utils/shipping";
import PageHeader from "../components/layout/PageHeader";
import FreeShippingBar from "../components/cart/FreeShippingBar";
import FramedImage from "../components/ui/FramedImage";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = useSelector((state) => state.cart?.items) || [];

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discount, discount_type, discount_value }
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discount = appliedPromo?.discount || 0;

  // Same rule the checkout and the server use (admin → Settings → Shipping).
  const { cost: shipping } = useShipping(subtotal);

  const total = Math.max(
    subtotal - discount + shipping,
    0
  );

  const handleApplyPromo = async (e) => {
    e.preventDefault();

    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setPromoChecking(true);
    setPromoError("");
    try {
      const result = await validatePromoRequest(code, subtotal);
      setAppliedPromo({
        code: result.promo_code,
        discount: result.discount,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      });
    } catch (error) {
      setAppliedPromo(null);
      setPromoError(error.response?.data?.message || "That code isn't valid.");
    } finally {
      setPromoChecking(false);
    }
  };

  // =========================
  // EMPTY CART
  // =========================

  if (items.length === 0) {
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eeeeee]">
          <ShoppingBag
            size={26}
            className="text-black/40"
          />
        </div>

        <p className="text-xl font-semibold text-black">
          Your bag is empty
        </p>

        <p className="max-w-xs text-sm text-black/50">
          Looks like you haven't added anything yet.
          Explore the collection to find something
          you'll love.
        </p>

        <Button asChild size="lg" className="mt-2">
          <Link to="/shops">Continue Shopping</Link>
        </Button>
      </section>
    );
  }

  // =========================
  // CART
  // =========================

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">

        <PageHeader
          eyebrow="Bag"
          breadcrumbs={[{ label: "Bag" }]}
          title="Your Bag"
          subtitle="Review your pieces, apply a code, and continue to checkout."
        />

        <FreeShippingBar subtotal={subtotal} className="mb-8 rounded-2xl bg-[#f8f8f8] p-5" />

        <div className="flex flex-col gap-10 lg:flex-row">

          {/* =========================
              ITEMS
          ========================= */}

          <div className="flex-1 divide-y divide-black/8">

            {items.map((item) => (
              <div
                key={`${item.id}-${item.size ?? ""}-${item.color ?? ""}`}
                className="flex gap-4 py-6 first:pt-0"
              >
                <Link to={`/shop/${item.slug}`} className="shrink-0">
                  <FramedImage
                    src={resolveImg(item.image_url || item.image)}
                    alt={(item.name || item.title)}
                    depth={false}
                    className="h-28 w-24 rounded-xl bg-[#ededed]"
                  />
                </Link>

                <div className="flex flex-1 flex-col justify-between">

                  {/* Product Information */}

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <Link to={`/shop/${item.slug}`} className="font-medium text-black hover:underline">
                        {(item.name || item.title)}
                      </Link>

                      {(item.selected_size || item.size) && (
                        <p className="mt-1 text-xs text-black/50">
                          Size: {item.selected_size || item.size}
                        </p>
                      )}

                      {(item.selected_color || item.color) && (
                        <p className="text-xs text-black/50">
                          Color: {item.selected_color || item.color}
                        </p>
                      )}

                      {item.has_discount && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums">
                          <span className="text-black/50">{formatPrice(item.price)} each</span>
                          <span className="text-black/30 line-through">{formatPrice(item.original_price)}</span>
                        </p>
                      )}
                    </div>

                    {/* Remove */}

                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() =>
                        dispatch(removeFromCart(item.id))
                      }
                      className="text-black/40 transition hover:text-black"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                  {/* Quantity + Price */}

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3 rounded-full border border-black/10 px-2.5 py-1.5">

                      {/* Decrease */}

                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => dispatch(updateQuantityThunk({ itemId: item.id, quantity: item.quantity - 1 }))}
                        disabled={item.quantity <= 1}
                        className="text-black/60 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus size={14} />
                      </button>

                      {/* Quantity */}

                      <span className="font-price text-sm font-medium tabular-nums text-black">
                        {item.quantity}
                      </span>

                      {/* Increase */}

                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => dispatch(updateQuantityThunk({ itemId: item.id, quantity: item.quantity + 1 }))}
                        disabled={item.stock_quantity != null && item.quantity >= item.stock_quantity}
                        className="text-black/60 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus size={14} />
                      </button>

                    </div>

                    {/* Item Total */}

                    <p className="font-price text-sm font-semibold tabular-nums text-black">
                      {formatPrice(
                        item.price * item.quantity
                      )}
                    </p>

                  </div>
                </div>
              </div>
            ))}

          </div>

          {/* =========================
              ORDER SUMMARY
          ========================= */}

          <div className="w-full shrink-0 lg:w-[360px]">

            <Card className="sticky top-24 flex flex-col gap-5 rounded-2xl border-none bg-[#f8f8f8] p-6 shadow-none">

              <h2 className="text-lg font-semibold text-black">
                Order Summary
              </h2>

              {/* Promo */}

              <form
                onSubmit={handleApplyPromo}
                className="flex flex-col gap-2"
              >
                <div className="flex gap-2">

                  <Input
                    type="text"
                    value={promoInput}
                    onChange={(e) =>
                      setPromoInput(e.target.value)
                    }
                    placeholder="Promo code"
                    className="flex-1 rounded-xl"
                  />

                  <Button
                    type="submit"
                    disabled={promoChecking}
                    className="rounded-xl px-4"
                  >
                    {promoChecking ? "Checking…" : "Apply"}
                  </Button>

                </div>

                {promoError && (
                  <p className="text-xs text-red-500">
                    {promoError}
                  </p>
                )}

                {appliedPromo && (
                  <p className="text-xs text-[#8a7148]">
                    Code {appliedPromo.code} applied (
                    {appliedPromo.discount_type === "percentage"
                      ? `${appliedPromo.discount_value}% off`
                      : `${formatPrice(appliedPromo.discount_value)} off`}
                    )
                  </p>
                )}

                <p className="text-[11px] text-black/35">
                  Have a promo code? Enter it above.
                </p>
              </form>

              {/* Price Breakdown */}

              <div className="flex flex-col gap-2 border-t border-black/10 pt-4 text-sm">

                <div className="flex justify-between text-black/70">
                  <span>Subtotal</span>

                  <span className="tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-[#8a7148]">
                    <span>Discount</span>

                    <span className="tabular-nums">
                      -{formatPrice(discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-black/70">
                  <span>Shipping</span>

                  <span className="tabular-nums">
                    {shipping === 0
                      ? "Free"
                      : formatPrice(shipping)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-semibold text-black">
                  <span>Total</span>

                  <span className="tabular-nums">
                    {formatPrice(total)}
                  </span>
                </div>

              </div>

              {/* Checkout */}

              <Button
                type="button"
                onClick={() => navigate("/checkout", { state: { appliedPromo } })}
                size="lg"
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5"
              >
                Proceed to Checkout
              </Button>

              {/* Continue Shopping */}

              <Link
                to="/shops"
                className="text-center text-sm text-black/50 underline hover:text-black"
              >
                Continue Shopping
              </Link>

            </Card>
          </div>

        </div>
      </div>
    </section>
  );
};

export default CartPage;
