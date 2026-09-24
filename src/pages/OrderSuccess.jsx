import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Package } from "lucide-react";
import { formatPrice } from "../utils/price";
import { resolveImg } from "../utils/resolveImg";
import FramedImage from "../components/ui/FramedImage";
import PageHeader from "../components/layout/PageHeader";

const OrderSuccess = () => {
  const { orderId } = useParams();

  const order = useSelector((state) => {
    const recentOrder = state.orders?.lastOrder;

    if (
      recentOrder &&
      String(recentOrder.id) === String(orderId)
    ) {
      return recentOrder;
    }

    return (state.orders?.orders || []).find(
      (o) => String(o.id) === String(orderId)
    );
  });

  if (!order) {
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-lg font-semibold text-black">
          We couldn't find that order
        </p>

        <Link
          to="/shops"
          className="text-sm text-black/60 underline"
        >
          Back to shop
        </Link>
      </section>
    );
  }

  const eta = new Date(order.date);

  eta.setDate(
    eta.getDate() +
      (order.shippingMethod === "express" ? 3 : 6)
  );

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner max-w-3xl">
        <PageHeader
          eyebrow="Confirmed"
          breadcrumbs={[{ label: "Bag", to: "/cart" }, { label: "Order confirmed" }]}
          title="Order Confirmed"
          subtitle={`Thank you — your order has been placed successfully. A confirmation has been sent to ${
            order.contact?.email || "your email"
          }.`}
        />

        <div className="mt-8 flex flex-col gap-1 rounded-2xl bg-[#f8f8f8] p-6 text-left">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-black/40">
                Order Number
              </p>

              <p className="mt-1 font-mono text-sm font-semibold text-black">
                {order.id}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.15em] text-black/40">
                Estimated Delivery
              </p>

              <p className="mt-1 text-sm font-medium text-black">
                {eta.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 py-4">
            {order.items.map((item) => (
              <div
                key={`${item.id}-${item.size ?? ""}`}
                className="flex items-center gap-4"
              >
                {/* Resolved backend image */}
                <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <FramedImage
                    depth={false}
                    src={resolveImg(
                      item.image ||
                        item.image_url ||
                        item.productImage ||
                        item.product_image ||
                        item.product?.image ||
                        item.product?.image_url
                    )}
                    alt={
                      item.title ||
                      item.name ||
                      "Product"
                    }
                    className="h-full w-full"
                  />
                </div>

                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">
                      {/* Cart lines carry `name`; orders read back from the
                          API carry `title`. */}
                      {item.title || item.name}
                    </p>

                    <p className="text-xs text-black/50">
                      {[item.selected_size && "Size: " + item.selected_size, item.selected_color && "Color: " + item.selected_color].filter(Boolean).join(" · ")}
                      {(item.selected_size || item.selected_color) && " · "}
                      Qty {item.quantity}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-black">
                    {formatPrice(
                      item.price * item.quantity
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between text-black/70">
              <span>Delivery Address</span>
            </div>

            <p className="text-black">
              {order.address?.fullName}
              <br />
              {order.address?.street},{" "}
              {order.address?.city}{" "}
              {order.address?.postalCode}
              <br />
              {order.address?.country}
            </p>
          </div>

          <div className="mt-4 flex justify-between border-t border-black/10 pt-4 text-base font-semibold text-black">
            <span>Total Paid</span>

            <span className="tabular-nums">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            to="/shops"
            className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-[13px] font-medium text-white transition hover:bg-black/90"
          >
            Continue Shopping
          </Link>

          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 text-sm text-black/60 underline hover:text-black"
          >
            <Package size={15} />
            Track this order
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OrderSuccess;
