import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Package } from "lucide-react";
import { fetchOrders } from "../features/orders/ordersThunks";
import { formatPrice } from "../utils/price";
import PageHeader from "../components/layout/PageHeader";
import FramedImage from "../components/ui/FramedImage";
import { resolveImg } from "../utils/resolveImg";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/button";

import { Card } from "../components/ui/card";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-amber-50 text-amber-700",
  Shipped: "bg-blue-50 text-blue-700",
  Delivered: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};

const OrderRow = ({ order }) => (
  <Card asChild className="rounded-2xl border-black/6 p-5 transition hover:border-black/15 hover:shadow-md">
    <Link
      to={`/orders/${order.id}`}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8f8f8]">
          {order.items?.[0]?.image ? (
            <FramedImage src={resolveImg(order.items[0].image)} depth={false} className="h-full w-full" />
          ) : (
            <Package size={18} className="text-black/30" />
          )}
        </div>
        <div>
          <p className="font-mono text-sm font-semibold text-black">Order #{order.id}</p>
          <p className="mt-0.5 text-xs text-black/45">
            {new Date(order.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
        <Badge className={STATUS_STYLES[order.status] || "bg-black/5 text-black/60"}>
          {order.status}
        </Badge>
        <span className="text-sm font-semibold text-black">{formatPrice(order.total)}</span>
      </div>
    </Link>
  </Card>
);

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Account"
          breadcrumbs={[{ label: "My orders" }]}
          title="My Orders"
          subtitle="Track and review everything you've ordered from Almina."
        />

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#f8f8f8]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
            {error}
          </div>
        ) : !orders?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 py-16 text-center">
            <Package size={28} className="text-black/25" />
            <p className="text-sm font-medium text-black">No orders yet</p>
            <p className="max-w-xs text-sm text-black/45">
              When you place an order, it'll show up here so you can track it.
            </p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/shops">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Orders;
