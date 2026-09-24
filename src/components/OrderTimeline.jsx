import { Check, Clock, X } from "lucide-react";

// A small, dependency-free timeline for order tracking. Mirrors the shape of
// the shadcn Timeline component (items with id/title/description/timestamp/
// status) but written in plain JSX/Tailwind to match how the rest of this
// codebase is built — no TypeScript, class-variance-authority, or
// @radix-ui/react-scroll-area here, so those weren't pulled in.
//
// item.status: "completed" | "active" | "pending" | "error"
// item.content: optional node rendered under the description (e.g. a map).

const STATUS_ICON_WRAPPER = {
  completed: "border-black bg-black text-white",
  active: "border-[#c9a96e] bg-white text-[#c9a96e]",
  pending: "border-black/15 bg-white text-black/25",
  error: "border-red-300 bg-red-50 text-red-500",
};

const CONNECTOR_COLOR = {
  completed: "bg-black",
  active: "bg-black/15",
  pending: "bg-black/10",
  error: "bg-red-200",
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const StatusIcon = ({ status }) => {
  if (status === "completed") return <Check size={13} />;
  if (status === "error") return <X size={13} />;
  if (status === "active") return <Clock size={13} className="animate-pulse" />;
  return <div className="h-1.5 w-1.5 rounded-full bg-current" />;
};

export const OrderTimeline = ({ items, className = "" }) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
          {index < items.length - 1 && (
            <div
              className={`absolute left-[13px] top-7 h-full w-px ${CONNECTOR_COLOR[item.status] || CONNECTOR_COLOR.pending}`}
            />
          )}

          <div
            className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
              STATUS_ICON_WRAPPER[item.status] || STATUS_ICON_WRAPPER.pending
            }`}
          >
            <StatusIcon status={item.status} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className={`text-sm font-semibold ${item.status === "pending" ? "text-black/35" : "text-black"}`}>
                {item.title}
              </p>
              {item.timestamp && (
                <time className="text-xs text-black/40">{formatTimestamp(item.timestamp)}</time>
              )}
            </div>
            {item.description && (
              <p className={`text-xs leading-relaxed ${item.status === "pending" ? "text-black/30" : "text-black/50"}`}>
                {item.description}
              </p>
            )}
            {item.content && <div className="mt-3">{item.content}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderTimeline;