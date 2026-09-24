import Breadcrumbs from "../ui/Breadcrumbs";

// `breadcrumbs` ([{ label, to? }], last = current page) replaces the eyebrow
// label — the trail already says where the visitor is.
const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  as: Tag = "h1",
}) => {
  const hasBreadcrumbs = breadcrumbs?.length > 0;
  return (
    <div className="mb-10 flex max-w-3xl flex-col items-start gap-4 rounded-[1.5rem] border border-[#dce7f2] bg-[linear-gradient(120deg,#fff_25%,#e6f5fc)] p-6 text-left shadow-[0_14px_35px_-24px_rgba(24,70,110,.35)] sm:mb-12 sm:p-8">
      {hasBreadcrumbs ? (
        <Breadcrumbs items={breadcrumbs} className="mb-1" />
      ) : (
        eyebrow && (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/40">
            {eyebrow}
          </span>
        )
      )}
      <Tag className="font-display text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.08] tracking-tight text-[#14213d] text-pretty">
        {title}
      </Tag>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-[#64748b] sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
