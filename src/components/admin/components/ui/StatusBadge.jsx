// Central status -> style map. Add new statuses here rather than inline per page.
const STYLES = {
  // orders
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  processing: "bg-blue-50 text-blue-700 ring-blue-200",
  shipped: "bg-violet-50 text-violet-700 ring-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  refunded: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  // products
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  out_of_stock: "bg-red-50 text-red-700 ring-red-200",
  low_stock: "bg-amber-50 text-amber-700 ring-amber-200",
  // payments
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  submitted: "bg-sky-50 text-sky-700 ring-sky-200",
  partially_refunded: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  // fulfillment
  unconfirmed: "bg-amber-50 text-amber-700 ring-amber-200",
  unfulfilled: "bg-orange-50 text-orange-700 ring-orange-200",
  in_transit: "bg-violet-50 text-violet-700 ring-violet-200",
  // returns
  requested: "bg-amber-50 text-amber-700 ring-amber-200",
  shipped_back: "bg-violet-50 text-violet-700 ring-violet-200",
  received: "bg-blue-50 text-blue-700 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  exchange: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  store_credit: "bg-zs-beige text-zs-charcoal ring-zs-beigeLine",
  // reviews
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  flagged: "bg-red-50 text-red-700 ring-red-200",
  // promotions
  inactive: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  expired: "bg-zinc-100 text-zinc-500 ring-zinc-200",
  // money & stock
  refund_due: "bg-red-50 text-red-700 ring-red-200",
  due: "bg-red-50 text-red-700 ring-red-200",
  unpaid: "bg-amber-50 text-amber-700 ring-amber-200",
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  settled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  with_courier: "bg-amber-50 text-amber-700 ring-amber-200",
  reserved: "bg-blue-50 text-blue-700 ring-blue-200",
  released: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  // payment methods
  cod: "bg-zs-beige text-zs-charcoal ring-zs-beigeLine",
  jazzcash: "bg-orange-50 text-orange-700 ring-orange-200",
};

export const StatusBadge = ({ value }) => {
  const key = String(value || "pending").toLowerCase().replace(/\s+/g, "_");
  const style = STYLES[key] || "bg-zs-beige text-zs-charcoal ring-zs-beigeLine";
  return (
    <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset " + style}>
      {key.replace(/_/g, " ")}
    </span>
  );
};