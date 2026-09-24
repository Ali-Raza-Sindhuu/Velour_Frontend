import { useMemo, useState } from "react";
import { formatPrice } from "../../../../utils/price";

// Bar chart of real orders per day.
// `trend`: [{ date: 'YYYY-MM-DD', orders: number, revenue: number }, ...]
// from GET /admin/sales-trend. Dates can be picked (presets or custom range),
// but only within the range the API actually returned.

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayKey = (v) => (typeof v === "string" ? v.slice(0, 10) : toKey(new Date(v)));
const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (a, b) =>
  Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const label = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const OrdersTrendChart = ({ trend = [] }) => {
  const [range, setRange] = useState({ preset: 30 }); // { preset } or { from, to }
  const [hoverIndex, setHoverIndex] = useState(null);

  // Real API rows -> { "YYYY-MM-DD": { orders, revenue } }
  const byDay = useMemo(() => {
    const map = {};
    trend.forEach((p) => {
      const k = dayKey(p.date);
      const cur = map[k] || { orders: 0, revenue: 0 };
      cur.orders += Number(p.orders || 0);
      cur.revenue += Number(p.revenue || 0);
      map[k] = cur;
    });
    return map;
  }, [trend]);

  // Selectable bounds come from the data the API returned.
  const { minDate, maxDate } = useMemo(() => {
    const keys = Object.keys(byDay).sort();
    const today = toKey(new Date());
    const max = keys.length && keys[keys.length - 1] > today ? keys[keys.length - 1] : today;
    const thirtyAgo = addDays(max, -29);
    const min = keys.length && keys[0] < thirtyAgo ? keys[0] : thirtyAgo;
    return { minDate: min, maxDate: max };
  }, [byDay]);

  let start;
  let end;
  if (range.preset) {
    end = maxDate;
    start = addDays(maxDate, -(range.preset - 1));
    if (start < minDate) start = minDate;
  } else {
    start = range.from < minDate ? minDate : range.from;
    end = range.to > maxDate ? maxDate : range.to;
    if (start > end) start = end;
  }

  // One bar per day in range; days without orders are 0.
  const bars = useMemo(() => {
    const n = diffDays(start, end) + 1;
    return Array.from({ length: n }, (_, i) => {
      const key = addDays(start, i);
      const row = byDay[key];
      return { key, orders: row?.orders || 0, revenue: row?.revenue || 0 };
    });
  }, [start, end, byDay]);

  if (!trend.length) {
    return <p className="flex h-44 items-center justify-center text-sm text-zs-charcoal/40">No orders in this period yet.</p>;
  }

  const totalOrders = bars.reduce((s, b) => s + b.orders, 0);
  const totalRevenue = bars.reduce((s, b) => s + b.revenue, 0);
  const rawMax = Math.max(...bars.map((b) => b.orders), 1);
  const max = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(max * t));
  const labelEvery = Math.max(1, Math.ceil(bars.length / 7));

  const changeFrom = (v) => {
    if (!v) return;
    setRange({ from: v, to: v > end ? v : end });
  };
  const changeTo = (v) => {
    if (!v) return;
    setRange({ from: v < start ? v : start, to: v });
  };

  const hovered = hoverIndex != null ? bars[hoverIndex] : null;
  const tipPos =
    hoverIndex == null ? "" : hoverIndex < 2 ? "" : hoverIndex > bars.length - 3 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-zs-beige p-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setRange({ preset: p.days })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range.preset === p.days
                  ? "bg-white text-zs-primary shadow-sm"
                  : "text-zs-charcoal/50 hover:text-zs-charcoal"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zs-charcoal/60">
          <input
            type="date"
            value={start}
            min={minDate}
            max={maxDate}
            onChange={(e) => changeFrom(e.target.value)}
            className="rounded-lg border border-zs-beigeLine bg-white px-2.5 py-1.5 text-xs text-zs-charcoal outline-none focus:border-zs-primary"
          />
          <span>to</span>
          <input
            type="date"
            value={end}
            min={minDate}
            max={maxDate}
            onChange={(e) => changeTo(e.target.value)}
            className="rounded-lg border border-zs-beigeLine bg-white px-2.5 py-1.5 text-xs text-zs-charcoal outline-none focus:border-zs-primary"
          />
        </div>
      </div>

      <p className="mb-4 text-xs text-zs-charcoal/45">
        <b className="text-sm text-zs-charcoal">{totalOrders}</b> {totalOrders === 1 ? "order" : "orders"} ·{" "}
        <b className="text-zs-charcoal/70">{formatPrice(totalRevenue)}</b> · {label(start)} – {label(end)}
      </p>

      {/* Chart */}
      <div className="flex gap-3">
        <div className="flex h-44 flex-col justify-between text-right text-[10px] leading-none text-zs-charcoal/40">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 flex-col justify-between">
            {ticks.map((_, i) => (
              <div key={i} className="border-t border-dashed border-zs-beigeLine" />
            ))}
          </div>

          {/* bars */}
          <div className="relative flex h-44 items-end gap-[3px]" onMouseLeave={() => setHoverIndex(null)}>
            {bars.map((b, i) => (
              <div
                key={b.key}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHoverIndex(i)}
              >
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: b.orders ? `${(b.orders / max) * 100}%` : "2px",
                    background: b.orders ? "var(--zs-gold)" : "var(--zs-beige-line)",
                    opacity: b.orders && hoverIndex != null && hoverIndex !== i ? 0.55 : 1,
                  }}
                />
              </div>
            ))}

            {hovered && (
              <div
                className={`pointer-events-none absolute z-10 rounded-xl border border-zs-beigeLine bg-white px-3 py-2 text-xs shadow-zs ${tipPos}`}
                style={{
                  left: `${((hoverIndex + 0.5) / bars.length) * 100}%`,
                  bottom: `calc(${(hovered.orders / max) * 100}% + 10px)`,
                }}
              >
                <p className="font-semibold text-zs-charcoal">{label(hovered.key)}</p>
                <p className="text-zs-charcoal/60">
                  {hovered.orders} {hovered.orders === 1 ? "order" : "orders"}
                </p>
                <p className="text-zs-charcoal/60">{formatPrice(hovered.revenue)}</p>
              </div>
            )}
          </div>

          {/* x labels */}
          <div className="mt-2 flex gap-[3px]">
            {bars.map((b, i) => (
              <span key={b.key} className="relative flex-1 text-[10px] text-zs-charcoal/40">
                {i % labelEvery === 0 && (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{label(b.key)}</span>
                )}
              </span>
            ))}
            <span className="invisible text-[10px]">.</span>
          </div>
        </div>
      </div>
    </div>
  );
};