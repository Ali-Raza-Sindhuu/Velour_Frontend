import { useEffect, useId, useRef, useState } from "react";

// Numbered, editorial-style accordion. On devices with a mouse, resting on a
// question opens it (after a short pause, so sweeping the pointer across the
// list doesn't make rows jump); tapping and keyboard focus work everywhere.
// Questions are large and faded until active; answers ease open.
//
// items: [{ q: string, a: string }]

const HOVER_DELAY = 110;
const hasFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

export default function HoverAccordion({ items, defaultOpen = 0, className = "" }) {
  const [open, setOpen] = useState(items.length ? defaultOpen : null);
  const hoverTimer = useRef(null);
  const baseId = useId();

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const hoverOpen = (index) => {
    if (!hasFinePointer()) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(index), HOVER_DELAY);
  };

  return (
    <div className={`border-t border-black/10 ${className}`} onMouseLeave={() => clearTimeout(hoverTimer.current)}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={index} className="border-b border-black/10" onMouseEnter={() => hoverOpen(index)}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen && !hasFinePointer() ? null : index)}
                onFocus={() => setOpen(index)}
                className="group flex w-full items-start gap-3 py-5 text-left sm:gap-5 sm:py-6"
              >
                <span
                  className={`mt-1 w-6 shrink-0 font-mono text-[11px] tabular-nums transition-colors duration-500 sm:mt-2 sm:text-xs ${
                    isOpen ? "text-[#c9a96e]" : "text-black/30"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-pretty font-display text-[clamp(1.3rem,2.6vw,2.25rem)] font-medium leading-[1.12] tracking-tight transition-colors duration-500 ease-out ${
                    isOpen ? "text-black" : "text-black/25 group-hover:text-black/45"
                  }`}
                >
                  {item.q}
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p
                  className={`max-w-[62ch] pb-6 pl-9 text-sm leading-relaxed text-black/60 transition-all duration-500 ease-out sm:pl-11 sm:text-base ${
                    isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                  }`}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
