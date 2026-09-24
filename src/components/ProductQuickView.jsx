import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Minus, Plus, X } from "lucide-react";
import FramedImage from "./ui/FramedImage";
import ProductVideo from "./ui/ProductVideo";
import { getProductMedia } from "../utils/productMedia";
import { formatPrice, getDiscountInfo } from "../utils/price";
import { useShipping } from "../utils/shipping";
import { isSoldOut, maxQuantity, stockOf, useProductActions } from "../hooks/useProductActions";
import { productOptionsAreSelected } from "../utils/productOptions";
import ProductOptions from "./products/ProductOptions";
import SizeGuide from "./products/SizeGuide";
import { getProductOptions, selectedVariantStock } from "../utils/productOptions";

const LOW_STOCK = 5;
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const StockStatus = ({ product, variant }) => {
  const stock = selectedVariantStock(product, variant) ?? stockOf(product);
  const { sizes, colors } = getProductOptions(product);
  if (product.variants?.length && ((sizes.length && !variant.size) || (colors.length && !variant.color))) {
    return <p className="text-sm text-black/55">Select {sizes.length && !variant.size ? "a size" : ""}{sizes.length && !variant.size && colors.length && !variant.color ? " and " : ""}{colors.length && !variant.color ? "a color" : ""} to check availability</p>;
  }
  const [dot, label] = stock <= 0
    ? ["bg-black/30", "Sold out"]
    : stock <= LOW_STOCK
      ? ["bg-amber-500", `Only ${stock} left`]
      : ["bg-emerald-600", "In stock"];
  return (
    <p className="flex items-center gap-2 text-sm text-black/70">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </p>
  );
};

const Gallery = ({ media, name }) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const hasMany = media.length > 1;
  const current = media[index];

  const count = media.length;
  const go = useCallback((step) => {
    setDirection(step);
    setIndex((current) => (current + step + count) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  return (
    <div className="relative h-[42dvh] min-h-64 shrink-0 overflow-hidden bg-[#ededed] sm:h-full sm:min-h-0">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          drag={hasMany ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) go(1);
            else if (info.offset.x > 50) go(-1);
          }}
          className={`absolute inset-0 ${hasMany ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          {current?.type === "video" ? (
            <ProductVideo src={current.src} poster={current.poster} label={name} className="h-full w-full" />
          ) : (
            <FramedImage
              src={current?.src}
              alt={hasMany ? `${name}, image ${index + 1} of ${media.length}` : name}
              loading="eager"
              draggable={false}
              className="h-full w-full"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {hasMany && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/80 text-white shadow transition hover:bg-black active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/80 text-white shadow transition hover:bg-black active:scale-95"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {media.map((item, i) => (
              <button
                key={`${item.src}-${i}`}
                type="button"
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                aria-label={item.type === "video" ? "Show video" : `Show image ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-black" : "w-1.5 bg-black/25 hover:bg-black/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const QuickViewPanel = ({ product, onClose }) => {
  const dialogRef = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState({ size: "", color: "" });
  const { addToBag, buyNow, toggleWish, isWishlisted, pending, error } = useProductActions(product);
  const shipping = useShipping(0);

  const soldOut = isSoldOut(product);
  const maxQty = maxQuantity(product);
  const media = getProductMedia(product);
  const optionsReady = productOptionsAreSelected(product, variant);
  const variantStock = selectedVariantStock(product, variant);
  const currentStock = variantStock ?? stockOf(product);
  const currentMaxQty = Math.max(1, Math.min(maxQty, currentStock));

  useEffect(() => setQuantity((current) => Math.min(current, currentMaxQty)), [currentMaxQty]);

  // Focus the dialog on open, keep Tab inside it, lock page scroll, and hand
  // focus back to whatever opened it (the eye button) on close. Callers pass
  // a stable onClose, so this runs once per open.
  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const handleAdd = async () => {
    if (optionsReady && await addToBag(quantity, variant)) onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:grid sm:h-[min(88dvh,620px)] sm:grid-cols-[1.1fr_1fr] sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-black shadow-sm transition hover:bg-white active:scale-95 sm:right-4 sm:top-4"
        >
          <X size={18} />
        </button>

        <Gallery media={media} name={product.name} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-5 sm:px-8 sm:py-9">
          {product.category_name && (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">{product.category_name}</p>
          )}
          <h2 id="quick-view-title" className="mt-1.5 pr-10 text-2xl font-medium leading-tight tracking-tight text-balance text-black sm:text-[28px]">
            {product.name}
          </h2>
          {(() => {
            const { original, final, hasDiscount, percent } = getDiscountInfo(product);
            return hasDiscount ? (
              <p className="mt-3 flex items-baseline gap-2.5">
                <span className="text-xl font-semibold tabular-nums text-black">{formatPrice(final)}</span>
                <span className="text-sm text-black/35 line-through">{formatPrice(original)}</span>
                <span className="rounded-full bg-zs-danger/10 px-2 py-0.5 text-[11px] font-semibold text-zs-danger">-{percent}%</span>
              </p>
            ) : (
              <p className="mt-3 text-xl font-semibold tabular-nums text-black">{formatPrice(original)}</p>
            );
          })()}

          {product.description && (
            <p className="mt-5 line-clamp-3 max-w-[60ch] text-sm leading-6 text-black/65">{product.description}</p>
          )}
          <Link
            to={`/shop/${product.slug}`}
            onClick={onClose}
            className="group mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-black underline decoration-black/30 underline-offset-4 transition hover:decoration-black"
          >
            View full details
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="mt-6">
            <StockStatus product={product} variant={variant} />
          </div>

          {getProductOptions(product).sizes.length > 0 && <SizeGuide availableSizes={getProductOptions(product).sizes} />}
          <ProductOptions product={product} value={variant} onChange={setVariant} />

          <div className="mt-6 border-t border-black/10 pt-6">
            <p className="mb-2.5 text-sm font-medium text-black">Quantity</p>
            <div className="flex gap-3">
              <div className="flex h-12 shrink-0 items-center rounded-full border border-black/15">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={soldOut || quantity <= 1}
                  className="grid h-full w-11 place-items-center text-black/70 transition hover:text-black disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <span className="w-7 text-center text-sm font-medium tabular-nums text-black" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(currentMaxQty, q + 1))}
                  disabled={soldOut || (variantStock !== null && variantStock <= 0) || quantity >= currentMaxQty}
                  className="grid h-full w-11 place-items-center text-black/70 transition hover:text-black disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                  disabled={soldOut || (variantStock !== null && variantStock <= 0) || Boolean(pending) || !optionsReady}
                className="h-12 flex-1 rounded-full border border-black bg-white text-sm font-medium text-black transition hover:bg-black hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:border-black/15 disabled:bg-white disabled:text-black/35"
              >
                {soldOut ? "Sold out" : pending === "add" ? "Adding…" : "Add to bag"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => buyNow(quantity, variant)}
              disabled={soldOut || (variantStock !== null && variantStock <= 0) || Boolean(pending) || !optionsReady}
              className="mt-3 h-12 w-full rounded-full bg-black text-sm font-medium text-white transition hover:bg-black/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20"
            >
              {pending === "buy" ? "Taking you to checkout…" : "Buy it now"}
            </button>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={toggleWish}
                aria-pressed={isWishlisted}
                className="inline-flex items-center gap-2 text-black/70 transition hover:text-black"
              >
                <Heart size={16} className={isWishlisted ? "fill-black text-black" : ""} />
                {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
              </button>
              {shipping.hasThreshold && (
                <span className="text-xs text-black/45">Free shipping over {formatPrice(shipping.threshold)}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function ProductQuickView({ product, open, onClose }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && product && <QuickViewPanel key={product.id} product={product} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  );
}
