export const StatCard = ({ label, value, icon: Icon, trend, tone = "default" }) => {
  const trendPositive = typeof trend === "number" ? trend >= 0 : null;
  return (
    <div className="rounded-3xl border border-zs-beigeLine bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zs-charcoal/45">{label}</p>
        {Icon ? (
          <span className={"flex h-10 w-10 items-center justify-center rounded-xl " + (tone === "gold" || tone === "primary" ? "bg-zs-gold/15 text-zs-gold" : "bg-zs-beige text-zs-charcoal/70")}>
            <Icon size={18} strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="zs-display mt-3 text-[1.85rem] font-semibold leading-none text-zs-charcoal">{value}</p>
      {trendPositive !== null ? (
        <p className={"mt-2 text-xs font-medium " + (trendPositive ? "text-zs-success" : "text-zs-danger")}>
          {trendPositive ? "▲" : "▼"} {Math.abs(trend)}% vs last period
        </p>
      ) : null}
    </div>
  );
};