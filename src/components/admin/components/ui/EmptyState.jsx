export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zs-beigeLine bg-white/60 px-6 py-16 text-center">
    {Icon ? <Icon size={28} strokeWidth={1.25} className="mb-4 text-zs-gold" /> : null}
    <p className="zs-display text-lg font-medium text-zs-charcoal">{title}</p>
    {description ? <p className="mt-1.5 max-w-sm text-sm text-zs-charcoal/55">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
