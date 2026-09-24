import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Undo2 } from "lucide-react";
import { getReturnEligibility } from "../api/returnsApi";

// Shown on a signed-in customer's delivered order: start a return while the
// window is open, and follow any returns already requested.
const OrderReturnsCard = ({ orderId }) => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let active = true;
    getReturnEligibility(orderId)
      .then((data) => active && setInfo(data))
      .catch(() => {});
    return () => { active = false; };
  }, [orderId]);

  if (!info || (!info.can_request && !info.returns.length)) return null;

  return (
    <div className="mb-10 rounded-2xl border border-black/6 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5"><Undo2 size={16} /></span>
          <div>
            <p className="text-sm font-semibold text-black">Returns & exchanges</p>
            <p className="mt-0.5 text-xs text-black/55">
              {info.can_request
                ? `You can return or exchange items for ${info.order.days_left} more day${info.order.days_left === 1 ? "" : "s"}.`
                : info.message}
            </p>
          </div>
        </div>
        {info.can_request && (
          <Link to={`/returns?order=${orderId}`} className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">
            Return or exchange
          </Link>
        )}
      </div>
      {info.returns.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {info.returns.map((r) => (
            <Link key={r.rma} to={r.link} className="flex items-center justify-between rounded-xl bg-[#f8f8f8] px-4 py-3 text-sm hover:bg-black/5">
              <span className="font-medium">{r.rma}</span>
              <span className="flex items-center gap-1 text-xs capitalize text-black/55">
                {r.status.replace("_", " ")} <ChevronRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderReturnsCard;
