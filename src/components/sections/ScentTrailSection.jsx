import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Wind } from "lucide-react";
import MarqueeAlongSvgPath from "../ui/marquee-along-svg-path";
import FramedImage from "../ui/FramedImage";
import { resolveImg } from "../../utils/resolveImg";

// "Scent trail" — the store's own bottles and scent families drifting along
// a curling, wisp-like path, the way a fragrance trails behind someone.
// Built from live catalogue data (products + their categories), so it never
// shows stock imagery and stays current as the admin adds products.

const MAX_PRODUCTS = 9;

// Pieces spread along the path. With a small catalogue the sequence is
// cycled to fill it; the repeats are hidden from keyboard and screen readers
// so each product is only announced once.

// A long swoosh with a loop for wide screens, and a taller S-curve for
// phones so the bottles stay a comfortable, tappable size.
const TRAILS = {
  wide: {
    viewBox: "0 0 996 330",
    path: "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5",
    aspect: "aspect-[996/330]",
    tile: 92,
    velocity: 2.2,
    fill: 15,
  },
  narrow: {
    viewBox: "0 0 400 540",
    path: "M-30 70C90 10 300 20 330 130C360 240 90 230 70 330C50 430 250 470 430 440",
    aspect: "aspect-[400/540]",
    tile: 96,
    velocity: 2.6,
    fill: 10,
  },
};

const subscribe = (callback) => {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const useIsWide = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 768px)").matches, () => true);

const BottleTile = ({ product, size, copy, onBroken }) => (
  <Link
    to={`/shop/${product.slug}`}
    aria-label={product.name}
    aria-hidden={copy || undefined}
    tabIndex={copy ? -1 : undefined}
    draggable={false}
    className="group/tile relative block origin-center transition-transform duration-300 ease-out hover:scale-110 focus-visible:scale-110"
    style={{ width: size, height: size, transform: "scale(var(--trail-scale, 1))" }}
  >
    <FramedImage
      src={resolveImg(product.images?.[0] || product.image_url)}
      alt=""
      draggable={false}
      depth={false}
      onError={() => onBroken(product.id)}
      className="h-full w-full rounded-[22px] bg-[#ededed] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
    />
    <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
      {product.name}
    </span>
  </Link>
);

const NoteChip = ({ name, copy }) => (
  <Link
    to={`/shops?category=${encodeURIComponent(name)}`}
    aria-hidden={copy || undefined}
    tabIndex={copy ? -1 : undefined}
    draggable={false}
    className="flex origin-center items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/10 transition-[scale,background-color] duration-300 hover:scale-105 hover:bg-black hover:text-white"
    style={{ transform: "scale(var(--trail-scale, 1))" }}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-[#c9a96e]" aria-hidden="true" />
    {name}
  </Link>
);

const ScentTrailSection = () => {
  const products = useSelector((state) => state.products?.items);
  const trail = TRAILS[useIsWide() ? "wide" : "narrow"];
  // Products whose image fails to load drop out, rather than leaving an
  // empty tile drifting along the trail.
  const [broken, setBroken] = useState(() => new Set());
  const markBroken = useCallback((id) => {
    setBroken((current) => (current.has(id) ? current : new Set(current).add(id)));
  }, []);

  // Alternate bottles with scent-family chips: bottle, bottle, chip, …
  const items = useMemo(() => {
    const withImages = (products || [])
      .filter((product) => (product.image_url || product.images?.length) && !broken.has(product.id))
      .slice(0, MAX_PRODUCTS);
    const families = [...new Set(withImages.map((product) => product.category_name).filter(Boolean))];
    const sequence = [];
    withImages.forEach((product, index) => {
      sequence.push({ type: "bottle", product });
      if (index % 2 === 1 && families.length) {
        sequence.push({ type: "note", name: families[((index - 1) / 2) % families.length] });
      }
    });
    if (!sequence.length) return [];

    const count = Math.max(sequence.length, trail.fill);
    return Array.from({ length: count }, (_, i) => ({
      ...sequence[i % sequence.length],
      key: `trail-${i}`,
      copy: i >= sequence.length,
    }));
  }, [products, broken, trail.fill]);

  // Needs a handful of real products to read as a trail.
  if (items.filter((item) => !item.copy && item.type === "bottle").length < 3) return null;

  return (
    <section className="page-section overflow-hidden bg-white">
      <div className="page-inner flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white py-1 pl-1 pr-3 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
              <Wind size={13} />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/80">Scent trail</span>
          </span>
          <h2 className="font-display text-[clamp(2rem,4vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-balance text-black">
            Follow the trail
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-black/50 sm:text-base">
            Every bottle leaves something behind. Hover to slow the trail, drag to steer it, and tap a scent to explore it.
          </p>
        </div>

        <div className={`relative -mx-4 sm:mx-0 ${trail.aspect}`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,110,0.12)_0%,transparent_65%)]"
          />
          <MarqueeAlongSvgPath
            key={trail.viewBox}
            path={trail.path}
            viewBox={trail.viewBox}
            responsive
            showPath
            pathClassName="text-[#c9a96e]/45 [stroke-dasharray:2_9] [stroke-linecap:round] [stroke-width:2]"
            baseVelocity={trail.velocity}
            slowdownOnHover
            slowDownFactor={0.2}
            draggable
            grabCursor
            dragSensitivity={0.08}
            repeat={1}
            offsetRotate="0deg"
            cssVariableInterpolation={[{ property: "--trail-scale", from: 0.72, to: 1.08 }]}
            className="h-full w-full"
          >
            {items.map((item) =>
              item.type === "bottle"
                ? <BottleTile key={item.key} product={item.product} size={trail.tile} copy={item.copy} onBroken={markBroken} />
                : <NoteChip key={item.key} name={item.name} copy={item.copy} />
            )}
          </MarqueeAlongSvgPath>
        </div>
      </div>
    </section>
  );
};

export default ScentTrailSection;
