import { Link } from "react-router-dom";
import { Home } from "lucide-react";

// Home icon, then "/"-separated steps; the last step is the current page.
//
// items: [{ label, to? }] â€” every step except the last should have `to`.
// tone: "dark" (on light backgrounds) | "light" (over images, e.g. heroes).

const TONES = {
  dark: { link: "text-black/45 hover:text-black", current: "text-black/80", sep: "text-black/20" },
  light: { link: "text-white/60 hover:text-white", current: "text-white", sep: "text-white/35" },
};

export default function Breadcrumbs({ items = [], tone = "dark", className = "" }) {
  const colors = TONES[tone] || TONES.dark;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-none">
        <li className="flex items-center">
          <Link to="/" className={`inline-flex items-center rounded-sm transition-colors ${colors.link}`}>
            <Home size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={colors.sep}>/</span>
              {isCurrent || !item.to ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={`max-w-[16rem] truncate ${isCurrent ? colors.current : colors.link}`}
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className={`rounded-sm transition-colors ${colors.link}`}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

