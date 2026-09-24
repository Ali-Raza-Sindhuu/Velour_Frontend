import { Link } from "react-router-dom";
import { Truck, RotateCcw, Clock, Globe } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useSelector } from "react-redux";
import { formatPrice } from "../utils/price";

const RETURN_STEPS = [
  { title: "Start online", desc: "Open the returns page with your order number and email, pick the items and tell us why — add photos if something arrived damaged or wrong." },
  { title: "Get approved", desc: "We review requests within 1–2 business days and email you the return address and packing instructions." },
  { title: "Ship it back", desc: "Send the parcel within 14 days of approval and add the courier and tracking number on your return page." },
  { title: "Refund, credit or exchange", desc: "Once it passes inspection we refund your original payment method (or the account you gave us for cash on delivery), issue store credit, or ship your exchange." },
];

const ShippingReturns = () => {
  // Rates come from admin → Settings → Shipping, the same values checkout charges.
  const shipping = useSelector((state) => state.site?.storeInfo?.shipping) || {};
  const flatRate = Number(shipping.flatRate ?? 200);
  const threshold = Number(shipping.freeThreshold ?? 0);
  const tiers = [
    {
      label: "Standard delivery",
      time: "5–7 business days",
      cost: threshold > 0
        ? `Free over ${formatPrice(threshold)}, otherwise ${formatPrice(flatRate)}`
        : `Flat ${formatPrice(flatRate)}`,
    },
  ];

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Support"
          breadcrumbs={[{ label: "Shipping & returns" }]}
          title="Shipping & Returns"
          subtitle="Clear, simple policies — because good service is part of good design."
        />

        {/* Shipping */}
        <div className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
              <Truck size={18} />
            </div>
            <h2 className="text-xl font-semibold text-black">Shipping</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tiers.map((tier) => (
              <div key={tier.label} className="rounded-2xl bg-[#f8f8f8] p-6">
                <p className="font-medium text-black">{tier.label}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-black/60">
                  <Clock size={14} /> {tier.time}
                </p>
                <p className="mt-1 text-sm text-black/60">{tier.cost}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-black/10 p-5">
            <Globe size={18} className="mt-0.5 shrink-0 text-black/50" />
            <p className="text-sm text-black/60">
              We currently deliver within Pakistan. Delivery estimates begin from the day
              your order is confirmed, not the day it's placed, and orders placed on weekends or holidays
              are processed the next business day.
            </p>
          </div>
        </div>

        {/* Returns */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
              <RotateCcw size={18} />
            </div>
            <h2 className="text-xl font-semibold text-black">Returns</h2>
          </div>

          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-black/60">
            We want you to love what you ordered. Eligible items must be unworn, in their original condition, and have
            their tags attached for a change-of-mind return. If an item arrives damaged or isn't what you ordered, let
            us know so we can help. Your order page shows whether it is within the return window; exchanges are subject
            to availability and the options offered when you submit a request.
          </p>

          <Link to="/returns" className="mb-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-medium text-white">
            Start a return or exchange
          </Link>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {RETURN_STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4 rounded-2xl bg-[#f8f8f8] p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-black">{step.title}</p>
                  <p className="mt-1 text-sm text-black/60">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingReturns;
