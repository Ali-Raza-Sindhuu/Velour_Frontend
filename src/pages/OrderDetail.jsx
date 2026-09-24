import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "../features/orders/ordersThunks";
import { ArrowUpRight, CheckCircle2, PackageCheck, Truck, ClipboardList, XCircle } from "lucide-react";
import { formatPrice } from "../utils/price";
import { OrderTimeline } from "../components/OrderTimeline";
import OrderReturnsCard from "../components/OrderReturnsCard";
import { LocationMap } from "../components/ui/expand-map";
import PageHeader from "../components/layout/PageHeader";
import { resolveImg } from "../utils/resolveImg";
import FramedImage from "../components/ui/FramedImage";
import { Button } from "../components/ui/button";

// Matches the backend's real order status enum (see 002_orders_payments.sql:
// pending | processing | shipped | delivered | cancelled). The old version
// of this page used invented keys ("Packed" was never a real status) that
// never actually matched what the backend sends, so the tracker silently
// never advanced past step one — this list is the source of truth for both
// the compact stage strip and the detailed timeline below.
const STATUS_FLOW = [
  {
    key: "pending",
    label: "Order Placed",
    icon: ClipboardList,
    description: "We've received your order and it's being reviewed.",
  },
  {
    key: "processing",
    label: "Processing",
    icon: PackageCheck,
    description: "Your items are being prepared and packed for shipment.",
  },
  {
    key: "shipped",
    label: "Shipped",
    icon: Truck,
    description: "Your order has left our facility and is on its way.",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: CheckCircle2,
    description: "Your order has been delivered. Enjoy!",
  },
];

const OrderDetail = () => {
  const { orderId } = useParams();
  const order = useSelector((state) => {
    const fromList = (state.orders?.orders || []).find((o) => String(o.id) === String(orderId));
    if (fromList) return fromList;
    // Guests (and anyone tracking an order right after checkout, before the
    // authenticated order list has loaded) only have it in `lastOrder` —
    // without this fallback the "Track this order" link on the confirmation
    // page landed here to a permanent "We couldn't find that order".
    const { lastOrder } = state.orders || {};
    if (lastOrder && String(lastOrder.id) === String(orderId)) return lastOrder;
    return null;
  });
  const storeInfo = useSelector((state) => state.site.storeInfo);
  const ordersLoading = useSelector((state) => state.orders?.loading);
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const dispatch = useDispatch();

  // Opened straight from an email link, or revisited later: load the latest
  // status and tracking rather than relying on a list fetched elsewhere.
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchOrders());
  }, [dispatch, isAuthenticated, orderId]);

  if (!order && ordersLoading) {
    return <section className="min-h-[70vh] bg-white" aria-busy="true" />;
  }

  if (!order) {
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-lg font-semibold text-black">We couldn't find that order</p>
        <Button asChild variant="link">
          <Link to="/orders">Back to orders</Link>
        </Button>
      </section>
    );
  }

  const normalizedStatus = String(order.status || "pending").toLowerCase();
  const isCancelled = normalizedStatus === "cancelled";
  const currentStageIndex = Math.max(
    0,
    STATUS_FLOW.findIndex((s) => s.key === normalizedStatus),
  );

  const eta = new Date(order.date);
  eta.setDate(eta.getDate() + (order.shippingMethod === "express" ? 3 : 6));

  // Build the detailed vertical timeline. We only attach a real timestamp to
  // "Order Placed" (the one date we actually have) and to "Delivered" when
  // it hasn't happened yet (shown as an estimate) — every other step's exact
  // time isn't tracked by the backend, so we don't invent one.
  const timelineItems = STATUS_FLOW.map((stage, i) => {
    let status = "pending";
    if (!isCancelled) {
      if (i < currentStageIndex || normalizedStatus === "delivered") status = "completed";
      else if (i === currentStageIndex) status = "active";
    }
    return {
      id: stage.key,
      title: stage.label,
      description: stage.description,
      status,
      timestamp:
        {
          pending: order.date,
          processing: order.confirmed_at,
          shipped: order.shipped_at,
          delivered: order.delivered_at || (status !== "completed" ? eta : null),
        }[stage.key] || null,
    };
  });

  // Tracking from the shipment the store created when it handed the parcel
  // to the courier.
  const shipment = order.shipment;
  const shippedStage = timelineItems.find((item) => item.id === "shipped");
  if (shipment && shippedStage && ["shipped", "delivered"].includes(normalizedStatus)) {
    const ownRider = shipment.courier === "Own delivery";
    shippedStage.description = ownRider
      ? "Your order is out with our own rider, who will call you before delivery."
      : `Handed to ${shipment.courier}${shipment.tracking_number ? ` — tracking number ${shipment.tracking_number}` : ""}.`;
    if (shipment.tracking_url) {
      shippedStage.content = (
      <Button asChild size="sm" className="w-fit">
        <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">
          <Truck size={13} /> Track your parcel <ArrowUpRight size={12} />
        </a>
      </Button>
      );
    }
  }

  // The journey starts at the store: the first step shows where the order
  // ships from, using the address set in admin → Settings → Store details.
  // Hidden until an address has been entered, rather than showing a fake one.
  const storeAddress = String(storeInfo?.address || "").trim();
  if (storeAddress) {
    const parts = storeAddress.split(",").map((part) => part.trim()).filter(Boolean);
    const locality = parts.length > 2 ? parts.slice(-2).join(", ") : storeAddress;
    const detail = parts.length > 2 ? storeAddress : storeInfo?.name || null;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`;

    timelineItems[0].content = (
      <div className="flex flex-col gap-2.5">
        <LocationMap location={locality} detail={detail} label="Ships from" />
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-black/50 underline decoration-black/20 underline-offset-4 transition hover:text-black hover:decoration-black"
        >
          View on Google Maps <ArrowUpRight size={12} />
        </a>
      </div>
    );
  }

  if (isCancelled) {
    timelineItems.splice(1, timelineItems.length - 1, {
      id: "cancelled",
      title: "Order Cancelled",
      description: "This order was cancelled. Contact support if you have any questions.",
      status: "error",
      timestamp: order.date,
    });
  }

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <div>
          <PageHeader
            eyebrow="Order"
            breadcrumbs={[{ label: "My orders", to: "/orders" }, { label: `Order ${order.id}` }]}
            title={`Order ${order.id}`}
            subtitle={`Placed ${new Date(order.date).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
          />
        </div>

        {isCancelled ? (
          <div className="my-10 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <XCircle size={20} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">This order was cancelled.</p>
          </div>
        ) : (
          /* Compact at-a-glance stage strip */
          <div className="my-10 flex items-center justify-between">
            {STATUS_FLOW.map((stage, i) => {
              const Icon = stage.icon;
              const reached = i <= currentStageIndex;
              return (
                <div key={stage.key} className="flex flex-1 flex-col items-center gap-2 text-center">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div className={`h-px flex-1 ${reached ? "bg-black" : "bg-black/10"}`} />
                    )}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        reached ? "bg-black text-white" : "bg-black/5 text-black/30"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`h-px flex-1 ${i < currentStageIndex ? "bg-black" : "bg-black/10"}`} />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${reached ? "text-black" : "text-black/35"}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed tracking timeline */}
        <div className="mb-10 rounded-2xl border border-black/6 bg-white p-6">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-black/40">
            Order Timeline
          </p>
          <OrderTimeline items={timelineItems} />
        </div>

        {normalizedStatus === "delivered" && <OrderReturnsCard orderId={order.id} />}

        <div className="rounded-2xl bg-[#f8f8f8] p-6">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-4">
            {order.items.map((item) => (
              <div key={`${item.id}-${item.size ?? ""}`} className="flex items-center gap-4">
                <FramedImage
                  src={resolveImg(item.image)}
                  alt={item.title}
                  depth={false}
                  className="h-16 w-14 shrink-0 rounded-lg bg-white"
                />
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{item.title}</p>
                    <p className="text-xs text-black/50">
                      {[item.selected_size && "Size: " + item.selected_size, item.selected_color && "Color: " + item.selected_color].filter(Boolean).join(" · ")}
                      {(item.selected_size || item.selected_color) && " · "}
                      Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-black">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-black/40">Shipping To</p>
              <p className="mt-2 text-sm text-black">
                {order.address?.fullName}
                <br />
                {order.address?.street}, {order.address?.city} {order.address?.postalCode}
                <br />
                {order.address?.country}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-black/40">Payment</p>
              <p className="mt-2 text-sm capitalize text-black">
                {{ cod: "Cash on Delivery", jazzcash: "JazzCash", exchange: "Exchange (no charge)" }[order.payment_method || order.paymentMethod] || "—"}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.15em] text-black/40">Total</p>
              <p className="mt-2 text-base font-semibold text-black">{formatPrice(order.total)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderDetail;
