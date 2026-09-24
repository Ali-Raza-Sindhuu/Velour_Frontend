import { Link } from "react-router-dom";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

const SectionHeader = ({
  badge,
  icon,
  heading,
  subtext,
  ctaLabel,
  ctaLink,
  ctaOnClick,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="flex max-w-2xl flex-col gap-4">
        {badge && (
          <Badge className="w-fit gap-2 border border-black/10 bg-white pl-1 pr-3 py-1 text-black/80 shadow-sm">
            {icon && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                {icon}
              </span>
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
              {badge}
            </span>
          </Badge>
        )}

        <h2 className="font-display text-[clamp(2rem,4vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-black text-pretty">
          {heading}
        </h2>

        {subtext && (
          <p className="text-sm sm:text-base text-black/50 leading-relaxed">
            {subtext}
          </p>
        )}
      </div>

      {ctaLabel &&
        (ctaLink ? (
          <Button asChild className="w-fit shrink-0">
            <Link to={ctaLink}>{ctaLabel}</Link>
          </Button>
        ) : (
          <Button onClick={ctaOnClick} className="w-fit shrink-0">
            {ctaLabel}
          </Button>
        ))}
    </div>
  );
};

export default SectionHeader;