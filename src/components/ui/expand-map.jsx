import { useId, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { MapPin, Map as MapIcon } from "lucide-react";

// Adapted from 21st.dev "expand-map" (LocationMap). Ported to this codebase's
// conventions: plain JSX, the storefront palette (black / #f8f8f8 / gold
// #c9a96e) instead of shadcn theme tokens, a real <button> so it works from
// the keyboard, and reduced-motion support. The map itself is decorative —
// the address text is the real information.

const ACCENT = "#c9a96e";

// Road layout for the illustrated map: [x1, y1, x2, y2, strokeWidth, opacity].
const ROADS = [
  [0, 35, 100, 35, 4, 0.22], [0, 65, 100, 65, 4, 0.22],
  [30, 0, 30, 100, 3, 0.18], [70, 0, 70, 100, 3, 0.18],
  [0, 20, 100, 20, 1.5, 0.08], [0, 50, 100, 50, 1.5, 0.08], [0, 80, 100, 80, 1.5, 0.08],
  [15, 0, 15, 100, 1.5, 0.08], [45, 0, 45, 100, 1.5, 0.08], [55, 0, 55, 100, 1.5, 0.08], [85, 0, 85, 100, 1.5, 0.08],
];

// Building blocks: top, left, width, height (all %).
const BLOCKS = [
  [40, 10, 15, 20], [15, 35, 12, 15], [70, 75, 18, 18],
  [20, 80, 10, 25], [55, 5, 8, 12], [8, 75, 14, 10],
];

const COLLAPSED = { width: 260, height: 132 };
const EXPANDED = { width: 380, height: 260 };

export function LocationMap({ location, detail, label = "Ships from", className = "" }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);
  const patternId = useId();
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [7, -7]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-7, 7]), { stiffness: 300, damping: 30 });

  const handlePointerMove = (event) => {
    if (reduceMotion || event.pointerType !== "mouse" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(event.clientX - (rect.left + rect.width / 2));
    mouseY.set(event.clientY - (rect.top + rect.height / 2));
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const size = isExpanded ? EXPANDED : COLLAPSED;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 };

  return (
    <div
      ref={containerRef}
      className={`relative max-w-full ${className}`}
      style={{ perspective: 1000 }}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={handlePointerLeave}
    >
      <motion.button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
        aria-label={`${label}: ${location}${detail ? `, ${detail}` : ""}. ${isExpanded ? "Collapse" : "Expand"} map`}
        className="relative block max-w-full cursor-pointer select-none overflow-hidden rounded-2xl border border-black/8 bg-[#f8f8f8] text-left"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={false}
        animate={size}
        transition={spring}
      >
        {/* Collapsed: faint grid texture */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: isExpanded ? 0 : 0.06 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        </motion.div>

        {/* Expanded: illustrated street map with a pin */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[#efece6]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.08 }}
              aria-hidden="true"
            >
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                {ROADS.map(([x1, y1, x2, y2, width, opacity], i) => (
                  <motion.line
                    key={i}
                    x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                    stroke="#000"
                    strokeOpacity={opacity}
                    strokeWidth={width}
                    initial={{ pathLength: reduceMotion ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                  />
                ))}
              </svg>

              {BLOCKS.map(([top, left, width, height], i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-sm border border-black/5 bg-black/[0.07]"
                  style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.45 + i * 0.05 }}
                />
              ))}

              <motion.div
                className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-full"
                initial={{ scale: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -16 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: reduceMotion ? 0 : 0.3 }}
              >
                <span className="absolute left-1/2 top-full h-2 w-5 -translate-x-1/2 -translate-y-1 rounded-[50%] bg-black/15 blur-[2px]" />
                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-black text-white shadow-lg ring-4 ring-[#c9a96e]/35">
                  <MapPin size={17} strokeWidth={2} />
                </span>
              </motion.div>

              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#f8f8f8] via-[#f8f8f8]/80 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between">
            <motion.span
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-black shadow-sm"
              initial={false}
              animate={{ opacity: isExpanded ? 0 : 1 }}
              transition={{ duration: 0.25 }}
              aria-hidden="true"
            >
              <MapIcon size={15} strokeWidth={1.75} />
            </motion.span>

            <motion.span
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm"
              initial={false}
              animate={{ scale: isHovered && !reduceMotion ? 1.04 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/55">{label}</span>
            </motion.span>
          </div>

          <div className="space-y-1">
            <motion.p
              className="text-sm font-medium tracking-tight text-black"
              initial={false}
              animate={{ x: isHovered && !reduceMotion ? 3 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.p>

            <AnimatePresence initial={false}>
              {isExpanded && detail && (
                <motion.p
                  className="overflow-hidden text-xs leading-relaxed text-black/55"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {detail}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              className="h-px origin-left bg-gradient-to-r from-[#c9a96e] via-[#c9a96e]/40 to-transparent"
              initial={false}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.3 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

export default LocationMap;
