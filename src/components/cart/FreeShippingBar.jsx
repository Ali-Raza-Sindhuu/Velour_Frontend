import { formatPrice } from "../../utils/price";
import { useShipping } from "../../utils/shipping";

// Progress towards the admin-configured free-shipping threshold. Renders
// nothing when the store has no threshold, so no false promise is shown.
const FreeShippingBar = ({ subtotal, className = "" }) => {
  const { hasThreshold, remaining, progressPct } = useShipping(subtotal);
  if (!hasThreshold) return null;

  return (
    <div className={className}>
      <p className="mb-2.5 text-sm text-black/70">
        {remaining > 0 ? (
          <>
            Add <span className="font-semibold text-black tabular-nums">{formatPrice(remaining)}</span> more for free shipping.
          </>
        ) : (
          <span className="font-medium text-black">Your order ships free.</span>
        )}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[#c9a96e] transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};

export default FreeShippingBar;
