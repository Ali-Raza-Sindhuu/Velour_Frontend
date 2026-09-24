import pool from "../../config/db.js";
import { config } from "../../config/env.js";
import { sendNoticeEmail } from "../../utils/email.js";
import { getReturnSettings } from "../../utils/storeSettings.js";

const appUrl = () => config.appUrl.replace(/\/$/, "");
const formatDate = (date) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Customer emails for shipped / delivered. Runs after the status change is
// committed and never throws.
export async function notifyOrderStatus(orderId, status) {
  try {
    const [[order]] = await pool.query("SELECT id, email, delivered_at FROM orders WHERE id = ?", [orderId]);
    if (!order?.email) return;

    if (status === "shipped" || status === "tracking_updated") {
      const [[shipment]] = await pool.query(
        "SELECT courier_name, tracking_number, tracking_url FROM shipments WHERE order_id = ? ORDER BY id DESC LIMIT 1",
        [orderId]
      );
      const details = [];
      if (shipment?.courier_name) details.push(["Courier", shipment.courier_name]);
      if (shipment?.tracking_number) details.push(["Tracking number", shipment.tracking_number]);
      const updated = status === "tracking_updated";
      await sendNoticeEmail(order.email, {
        subject: updated ? `Tracking updated for order #${order.id} - ZeeScents` : `Your order #${order.id} is on its way - ZeeScents`,
        title: updated ? "Tracking Updated" : "Your Order Has Shipped",
        paragraphs: [
          updated
            ? `We've updated the tracking details for order #${order.id}. Please use the details below.`
            : `Good news: order #${order.id} has been handed to the courier and is on its way to you.`,
          ...(shipment?.tracking_number && !shipment?.tracking_url ? [`You can track it on the ${shipment.courier_name} website or app using the tracking number below.`] : []),
          ...(!shipment?.tracking_number ? ["Our rider will contact you on your phone number before delivery."] : []),
        ],
        details,
        cta: shipment?.tracking_url
          ? { href: shipment.tracking_url, label: "Track your parcel" }
          : { href: `${appUrl()}/orders/${order.id}`, label: "View your order" },
      });
    }

    if (status === "delivered") {
      const settings = await getReturnSettings();
      const deadline = new Date(new Date(order.delivered_at || Date.now()).getTime() + settings.windowDays * 86400000);
      await sendNoticeEmail(order.email, {
        subject: `Order #${order.id} delivered - ZeeScents`,
        title: "Your Order Was Delivered",
        paragraphs: [
          `Order #${order.id} has been delivered. We hope you love it.`,
          `If something isn't right, you can start a return or exchange online until ${formatDate(deadline)}. Unopened items can be returned for any reason; damaged, leaking or wrong items are always covered.`,
        ],
        cta: { href: `${appUrl()}/returns?order=${order.id}`, label: "Start a return or exchange" },
      });
    }
  } catch (error) {
    console.error(`Order status email for #${orderId} failed:`, error.message);
  }
}
