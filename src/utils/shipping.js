import { useSelector } from "react-redux";

// Mirrors the server's rule in Backend/src/modules/orders/order.service.js
// (flat rate unless a free-shipping threshold is set and reached), so the
// bag, drawer and checkout always quote the same shipping the order is
// actually charged.
const DEFAULT_SHIPPING = { flatRate: 200, freeThreshold: 0 };

export const useShipping = (subtotal) => {
  const settings = useSelector((state) => state.site?.storeInfo?.shipping) || DEFAULT_SHIPPING;
  const flatRate = Number(settings.flatRate ?? DEFAULT_SHIPPING.flatRate);
  const threshold = Number(settings.freeThreshold ?? 0);
  const hasThreshold = threshold > 0;
  const isFree = hasThreshold && subtotal >= threshold;

  return {
    cost: subtotal === 0 || isFree ? 0 : flatRate,
    threshold,
    hasThreshold,
    remaining: hasThreshold ? Math.max(threshold - subtotal, 0) : 0,
    progressPct: hasThreshold ? Math.min((subtotal / threshold) * 100, 100) : 0,
  };
};
