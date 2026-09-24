import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  MapPin,
  Pencil,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  selectCartItems,
  selectCartTotal,
  clearCart,
  // NOTE: swap these for whatever your cartSlice actually exports —
  // this file assumes a single quantity-setting action.
  updateQty,
} from "@/store/slices/cartSlice";

const SHIPPING_FLAT_RATE = 15;
const PROMO_CODES = { SAVE15: 15 };

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartTotal);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [editingAddress, setEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [promoInput, setPromoInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");

  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const shipping = items.length > 0 ? SHIPPING_FLAT_RATE : 0;
  const vat = 0;
  const total = Math.max(subtotal + shipping + vat - promoDiscount, 0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleQtyChange = (item, delta) => {
    const nextQty = item.qty + delta;
    if (nextQty < 1) return;
    dispatch(updateQty({ id: item.id, size: item.size, qty: nextQty }));
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      setPromoDiscount(PROMO_CODES[code]);
      setPromoError("");
    } else {
      setPromoDiscount(0);
      setPromoError("That code isn't valid.");
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setOrderPlaced(true);
    dispatch(clearCart());
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <AnnouncementBar />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
          <h1 className="font-display text-3xl font-semibold mb-3">Thank you for your order!</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            A confirmation email has been sent to {form.email || "your inbox"}. Your order is being processed.
          </p>
          <Link to="/" className="bg-foreground text-background rounded-full px-8 py-3 text-sm font-medium">
            Continue Shopping
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <AnnouncementBar />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
          <h1 className="font-display text-2xl font-semibold mb-3">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Add something you love before checking out.</p>
          <Link to="/" className="bg-foreground text-background rounded-full px-8 py-3 text-sm font-medium">
            Shop Now
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <div className="container py-10 max-w-6xl mx-auto px-6">
        {/* Breadcrumb */}
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-sm font-semibold text-foreground mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Home / Products
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-10 border-b border-border/60 mb-10">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-foreground -mb-px">
            <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
            <span className="text-sm font-medium">Customer Information</span>
          </div>
          <div className="flex items-center gap-2 pb-3 text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
            <span className="text-sm font-medium">Payment Details</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-16">
          {/* Left column */}
          <div>
            <h1 className="font-display text-2xl font-semibold mb-1">Check Out Your Items</h1>
            <p className="text-sm text-muted-foreground mb-6">
              For a better experience, check your item and choose your shipping before ordering.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <label className="border border-border rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-foreground">
                <span className="text-muted-foreground">👤</span>
                <div className="flex flex-col w-full">
                  <span className="text-xs text-muted-foreground">First Name</span>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="text-sm font-medium outline-none w-full"
                  />
                </div>
              </label>
              <label className="border border-border rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-foreground">
                <span className="text-muted-foreground">👤</span>
                <div className="flex flex-col w-full">
                  <span className="text-xs text-muted-foreground">Last Name</span>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    className="text-sm font-medium outline-none w-full"
                  />
                </div>
              </label>
            </div>

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="border border-border rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground w-full mb-6"
            />

            {/* Delivery address */}
            <div className="border border-border rounded-2xl p-5 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium mb-1">Delivery Address</p>
                    {!editingAddress ? (
                      <p className="text-sm text-muted-foreground">
                        {[form.address, form.city, form.postalCode].filter(Boolean).join(", ") ||
                          "Add your delivery address"}
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAddress((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Edit delivery address"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {editingAddress && (
                <div className="flex flex-col gap-3 mt-4">
                  <input
                    name="address"
                    placeholder="Street address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="city"
                      placeholder="City"
                      value={form.city}
                      onChange={handleChange}
                      required
                      className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    />
                    <input
                      name="postalCode"
                      placeholder="Postal code"
                      value={form.postalCode}
                      onChange={handleChange}
                      required
                      className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    />
                  </div>
                  <input
                    name="country"
                    placeholder="Country"
                    value={form.country}
                    onChange={handleChange}
                    required
                    className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  />
                </div>
              )}
            </div>

            {/* Payment method */}
            <h2 className="font-display text-lg font-semibold mb-1">Payment Method</h2>
            <p className="text-sm text-muted-foreground mb-4">Select how you'd like to pay for your order.</p>

            <div className="flex flex-col gap-3">
              <PaymentOption
                icon={<Banknote className="w-5 h-5 text-muted-foreground" />}
                label="Cash on Delivery"
                value="cod"
                selected={paymentMethod === "cod"}
                onSelect={setPaymentMethod}
              />
              <PaymentOption
                icon={<CreditCard className="w-5 h-5 text-muted-foreground" />}
                label="Online Payment (Credit/Debit Card)"
                value="card"
                selected={paymentMethod === "card"}
                onSelect={setPaymentMethod}
              />
              <PaymentOption
                icon={<Smartphone className="w-5 h-5 text-muted-foreground" />}
                label="Mobile Wallet Payment"
                value="wallet"
                selected={paymentMethod === "wallet"}
                onSelect={setPaymentMethod}
              />

              {paymentMethod === "card" && (
                <p className="text-xs text-muted-foreground px-1">
                  Card payment isn't connected yet — placing an order will simulate a successful purchase.
                </p>
              )}
            </div>
          </div>

          {/* Right column — order summary */}
          <div className="bg-muted/30 rounded-2xl p-6 h-fit">
            <h2 className="font-display text-lg font-semibold mb-1">Current Order</h2>
            <p className="text-xs text-muted-foreground mb-5">The sum of all total payments for goods there</p>

            <div className="flex flex-col gap-4 mb-6">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.size ?? "default"}`}
                  className="bg-white rounded-xl border border-border/60 p-3 flex gap-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{item.name}</p>
                      <p className="text-sm font-medium whitespace-nowrap">
                        ${(item.price * item.qty).toFixed(2)}
                      </p>
                    </div>
                    {item.size && <p className="text-xs text-muted-foreground">Size: {item.size}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Quantity :</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item, 1)}
                        className="w-6 h-6 rounded-full border border-border flex items-center justify-center"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-4 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item, -1)}
                        className="w-6 h-6 rounded-full border border-border flex items-center justify-center"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 pt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 mb-3">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Promo code"
                className="flex-1 border border-border rounded-full px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground bg-white"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="border border-foreground rounded-full px-4 py-2 text-sm font-medium"
              >
                Apply
              </button>
            </div>
            {promoError && <p className="text-xs text-destructive mb-2">{promoError}</p>}

            <div className="flex flex-col gap-2 text-sm mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{itemCount}x</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code Promo</span>
                  <span>- ${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Service</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vat (0%)</span>
                <span>${vat.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="bg-foreground text-background rounded-full py-3.5 text-sm font-medium mt-5 w-full"
            >
              Pay ${total.toFixed(2)}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

function PaymentOption({ icon, label, value, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-center justify-between gap-3 border rounded-2xl px-4 py-3.5 text-left transition-colors ${
        selected ? "border-foreground" : "border-border"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </span>
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
          selected ? "border-foreground" : "border-border"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-foreground" />}
      </span>
    </button>
  );
}