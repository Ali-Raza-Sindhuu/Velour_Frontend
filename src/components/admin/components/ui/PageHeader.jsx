export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="zs-display text-3xl font-semibold text-zs-charcoal sm:text-[2rem]">{title}</h1>
      {description ? <p className="mt-1.5 max-w-xl text-sm text-zs-charcoal/60">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
  </div>
);
