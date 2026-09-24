import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  Heart,
  Minus,
  Plus,
  Check,
  Send,
  Play,
} from "lucide-react";
import { fetchProductBySlug } from "../features/products/productsThunks";
import { openLogin } from "../store/slice/Uislice";
import { formatPrice, getDiscountInfo } from "../utils/price";
import { useShipping } from "../utils/shipping";
import { isSoldOut, maxQuantity, stockOf, useProductActions } from "../hooks/useProductActions";
import FramedImage from "../components/ui/FramedImage";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import ProductVideo from "../components/ui/ProductVideo";
import { getProductMedia } from "../utils/productMedia";
import { fetchProductReviewsRequest, submitReviewRequest } from "../api/reviewsApi";
import ProductOptions from "../components/products/ProductOptions";
import SizeGuide from "../components/products/SizeGuide";
import { getProductOptions, productOptionsAreSelected, selectedVariantStock } from "../utils/productOptions";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

// Real per-star breakdown, computed from the actual reviews for this
// product rather than a fabricated distribution.
const ratingBreakdown = (reviews) => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.round(r.rating);
    if (counts[star] !== undefined) counts[star] += 1;
  });
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: Math.round((counts[stars] / total) * 100),
  }));
};

// ─── Rating stars — amber is the one accent this page spends ─────────────
const RatingStars = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => {
      const filled = i + 1 <= Math.round(rating);
      return (
        <Star
          key={i}
          size={size}
          className={filled ? "fill-[#c9a96e] text-[#c9a96e]" : "text-[#000000]/15"}
        />
      );
    })}
  </div>
);

// ─── Write a review — star picker + comment, posted to the real backend ───
const WriteReview = ({ productId, isAuthenticated, onSubmitted }) => {
  const dispatch = useDispatch();
  const [comment, setComment] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      dispatch(openLogin());
      return;
    }
    if (!comment.trim() || selectedRating === 0) return;

    setSubmitting(true);
    setError("");
    try {
      await submitReviewRequest({ product_id: productId, rating: selectedRating, comment: comment.trim() });
      setSubmitted(true);
      setComment("");
      setSelectedRating(0);
      onSubmitted?.();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-[#f8f8f8] p-6 sm:p-8">
      <h3 className="text-lg font-medium text-black">Write a review</h3>
      <p className="mt-1 text-sm text-[#000000]/55">
        {isAuthenticated
          ? "Share what you thought — it helps other shoppers decide."
          : "Log in to write a review — only customers who've purchased this product can review it."}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            const filled = value <= (hoverRating || selectedRating);
            return (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                onClick={() => setSelectedRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={filled ? "fill-[#c9a96e] text-[#c9a96e]" : "text-[#000000]/20"}
                />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us how it wears, how long it lasts, and how it made you feel..."
          rows={4}
          className="w-full resize-none rounded-lg border border-[#000000]/12 bg-white px-4 py-3 text-sm text-[#000000] outline-none placeholder:text-[#000000]/35 focus:border-[#000000]/35"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 gap-2 px-6"
          >
            {submitted ? (
              <>
                <Check size={16} /> Submitted
              </>
            ) : (
              <>
                <Send size={15} /> {isAuthenticated ? (submitting ? "Submitting..." : "Submit Review") : "Log in to review"}
              </>
            )}
          </Button>
          {submitted && (
            <span className="text-sm text-[#000000]/50">Thanks for your feedback!</span>
          )}
        </div>
      </form>
    </div>
  );
};

// ─── Reviews section — real summary/list, and the review form ────────────
const ReviewsSection = ({ productId, isAuthenticated }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avg_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchProductReviewsRequest(productId)
      .then((res) => {
        setReviews(res.data || []);
        setSummary(res.summary || { avg_rating: 0, total_reviews: 0 });
      })
      .catch(() => {
        setReviews([]);
        setSummary({ avg_rating: 0, total_reviews: 0 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const breakdown = ratingBreakdown(reviews);
  const rating = Number(summary.avg_rating) || 0;
  const totalReviews = Number(summary.total_reviews) || 0;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-medium tracking-tight text-black sm:text-[28px]">
        Reviews ({totalReviews.toLocaleString()})
      </h2>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Summary — left */}
        <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-center sm:gap-10 lg:w-[45%] lg:flex-col lg:items-start lg:gap-6">
          <div className="flex shrink-0 flex-col items-start gap-1.5">
            <span className="text-4xl font-medium tabular-nums text-black">{totalReviews ? rating.toFixed(1) : "—"}</span>
            <RatingStars rating={rating} size={15} />
            <span className="text-xs text-[#000000]/45">
              {totalReviews ? `Based on ${totalReviews.toLocaleString()} reviews` : "No reviews yet — be the first"}
            </span>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2">
            {breakdown.map((row) => (
              <div key={row.stars} className="flex items-center gap-3">
                <span className="w-3 text-xs text-[#000000]/50">{row.stars}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#000000]/8">
                  <div
                    className="h-full rounded-full bg-[#c9a96e]"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-[#000000]/40">
                  {row.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Write a review — right, alongside the summary */}
        <div className="w-full lg:w-[55%]">
          <WriteReview productId={productId} isAuthenticated={isAuthenticated} onSubmitted={load} />
        </div>
      </div>

      {/* Individual reviews */}
      {!loading && reviews.length > 0 && (
        <div className="flex flex-col divide-y divide-[#000000]/8 border-t border-[#000000]/8">
          {reviews.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#000000]">
                  {r.first_name} {r.last_name?.[0] ? `${r.last_name[0]}.` : ""}
                </span>
                <span className="text-xs text-[#000000]/40">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <RatingStars rating={r.rating} size={13} />
              {r.comment && <p className="text-sm text-[#000000]/70">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const ProductSkeleton = () => (
  <section className="bg-white">
    <div className="mx-auto max-w-[1200px] animate-pulse px-5 pb-10 pt-8 sm:pt-10">
      <div className="mb-6 h-4 w-48 rounded bg-black/5" />
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="aspect-square w-full rounded-2xl bg-black/5 lg:w-[46%]" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-9 w-3/4 rounded bg-black/5" />
          <div className="h-4 w-40 rounded bg-black/5" />
          <div className="h-7 w-32 rounded bg-black/5" />
          <div className="mt-6 h-12 w-full rounded-full bg-black/5" />
          <div className="h-12 w-full rounded-full bg-black/5" />
        </div>
      </div>
    </div>
  </section>
);

const ProductDetails = ({ breadcrumbBase = "/shops" }) => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState({ size: "", color: "" });

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { currentProduct: product, loading } = useSelector((state) => state.products);
  const [reviewSummary, setReviewSummary] = useState({ avg_rating: 0, total_reviews: 0 });
  const { addToBag, buyNow, toggleWish, isWishlisted, pending, error } = useProductActions(product);
  const shipping = useShipping(0);
  const optionsReady = productOptionsAreSelected(product, variant);
  const variantStock = selectedVariantStock(product, variant);
  const maxQty = variantStock !== null ? Math.max(1, Math.min(10, variantStock)) : maxQuantity(product);

  useEffect(() => {
    if (product?.id) {
      fetchProductReviewsRequest(product.id)
        .then((res) => setReviewSummary(res.summary || { avg_rating: 0, total_reviews: 0 }))
        .catch(() => setReviewSummary({ avg_rating: 0, total_reviews: 0 }));
    }
  }, [product?.id]);

  useEffect(() => {
    if (slug) dispatch(fetchProductBySlug(slug));
    setActiveImage(0);
    setQuantity(1);
    setVariant({ size: "", color: "" });
  }, [dispatch, slug]);

  useEffect(() => {
    if (product?.name) document.title = `${product.name} | Almina`;
    return () => { document.title = "Almina | Clothing, considered"; };
  }, [product?.name]);

  useEffect(() => setQuantity((current) => Math.min(current, maxQty)), [maxQty]);

  // `currentProduct` still holds the previous product while the next one
  // loads, so treat a slug mismatch as loading rather than flashing it.
  if (loading || (product && product.slug !== slug)) return <ProductSkeleton />;

  if (!product) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-white text-center">
        <p className="text-lg font-medium text-black">We couldn't find this item</p>
        <Link to={breadcrumbBase} className="text-sm text-black/60 underline">
          Back to shop
        </Link>
      </section>
    );
  }

  // Cover first, then the reel (if uploaded), then the other images.
  const media = getProductMedia(product);
  const activeMedia = media[activeImage] || media[0];
  const soldOut = isSoldOut(product);
  const stock = variantStock ?? stockOf(product);
  const currentSoldOut = variantStock !== null ? variantStock <= 0 : soldOut;

  const rating = Number(reviewSummary.avg_rating) || 0;
  const totalReviews = Number(reviewSummary.total_reviews) || 0;

  const handleQuantity = (delta) =>
    setQuantity((prev) => Math.min(maxQty, Math.max(1, prev + delta)));

  const categoryLink = product.category_slug
    ? `${breadcrumbBase}?category=${encodeURIComponent(product.category_name)}`
    : null;

  return (
    <section className="bg-white pt-8 sm:pt-10">
      <div className="mx-auto max-w-[1200px] px-5 pb-8 sm:pb-10">
        {/* Breadcrumb */}
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Shop", to: breadcrumbBase },
            ...(categoryLink ? [{ label: product.category_name, to: categoryLink }] : []),
            { label: product.name },
          ]}
        />

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          {/* ─── LEFT: Image Gallery ──────────────────────────────────── */}
          <div className="flex w-full flex-col gap-3 lg:sticky lg:top-28 lg:w-[46%] lg:self-start">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#ededed]">
              {activeMedia?.type === "video" ? (
                <ProductVideo
                  key={activeMedia.src}
                  src={activeMedia.src}
                  poster={activeMedia.poster}
                  label={product.name}
                  className="h-full w-full"
                />
              ) : activeMedia ? (
                <FramedImage
                  key={activeMedia.src}
                  src={activeMedia.src}
                  alt={product.name}
                  loading="eager"
                  className="h-full w-full"
                />
              ) : null}
              {soldOut && (
                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-black shadow-sm">
                  Sold out
                </span>
              )}
            </div>

            {media.length > 1 && (
              <div className="flex w-full gap-2.5 overflow-x-auto pb-1">
                {media.map((item, index) => (
                  <button
                    key={`${item.src}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={item.type === "video" ? "Show video" : `Show image ${index + 1}`}
                    aria-current={activeImage === index}
                    className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg bg-[#ededed] ring-1 transition ${
                      activeImage === index ? "ring-black" : "ring-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <FramedImage src={item.type === "video" ? item.poster : item.src} depth={false} className="h-full w-full" />
                    {item.type === "video" && (
                      <span className="absolute inset-0 grid place-items-center bg-black/25" aria-hidden="true">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-black">
                          <Play size={11} className="translate-x-px" fill="currentColor" />
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── RIGHT: Product Details ───────────────────────────────── */}
          <div className="flex w-full flex-col gap-5 lg:w-[54%]">
            <div className="flex flex-col gap-3">
              {product.category_name && (
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">{product.category_name}</p>
              )}
              <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.1] tracking-tight text-balance text-black">
                {product.name}
              </h1>

              <a href="#reviews" className="flex w-fit items-center gap-2.5">
                <RatingStars rating={rating} />
                <span className="text-sm font-medium text-black">{totalReviews ? rating.toFixed(1) : "—"}</span>
                <span className="text-sm text-black/40">
                  {totalReviews ? `(${totalReviews.toLocaleString()} reviews)` : "(No reviews yet)"}
                </span>
              </a>
            </div>

            {/* Pricing + stock */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-5">
              {(() => {
                const { original, final, hasDiscount, percent } = getDiscountInfo(product);
                return hasDiscount ? (
                  <span className="flex items-baseline gap-3">
                    <span className="text-2xl font-semibold tabular-nums text-black">{formatPrice(final)}</span>
                    <span className="text-base text-black/35 line-through">{formatPrice(original)}</span>
                    <Badge className="bg-gradient-to-r from-rose-600 to-orange-500 text-white">-{percent}% off</Badge>
                  </span>
                ) : (
                  <span className="text-2xl font-semibold tabular-nums text-black">{formatPrice(original)}</span>
                );
              })()}
              <span className="flex items-center gap-2 text-sm text-black/65">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${currentSoldOut ? "bg-black/30" : stock <= 5 ? "bg-amber-500" : "bg-emerald-600"}`}
                />
                {currentSoldOut ? "Sold out" : !optionsReady && product.variants?.length ? "Select size and color" : stock <= 5 ? `Only ${stock} left` : "In stock"}
              </span>
            </div>

            {getProductOptions(product).sizes.length > 0 && <SizeGuide availableSizes={getProductOptions(product).sizes} />}
            <ProductOptions product={product} value={variant} onChange={setVariant} />

            {/* Quantity */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-black">Quantity</span>
              <div className="flex items-center rounded-full border border-black/15">
                <button
                  type="button"
                  onClick={() => handleQuantity(-1)}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-black/60 transition-colors hover:text-black disabled:opacity-30"
                  disabled={currentSoldOut || quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums text-black" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantity(1)}
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center text-black/60 transition-colors hover:text-black disabled:opacity-30"
                  disabled={currentSoldOut || quantity >= maxQty}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => addToBag(quantity, variant)}
                  disabled={currentSoldOut || Boolean(pending) || !optionsReady}
                  variant="outline"
                  size="lg"
                  className="h-12 flex-1 border-black text-[15px] hover:bg-black hover:text-white disabled:border-black/15 disabled:text-black/35 disabled:hover:bg-white"
                >
                  {soldOut ? "Sold out" : pending === "add" ? "Adding…" : "Add to bag"}
                </Button>

                <Button
                  type="button"
                  onClick={toggleWish}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                  aria-pressed={isWishlisted}
                  size="icon"
                  className={`h-12 w-12 shrink-0 ${
                    isWishlisted
                      ? "bg-black text-white hover:bg-black/90"
                      : "bg-white text-black ring-1 ring-black/15 hover:bg-white hover:ring-black/35"
                  }`}
                >
                  <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => buyNow(quantity, variant)}
              disabled={currentSoldOut || Boolean(pending) || !optionsReady}
                size="lg"
                className="h-12 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[15px] disabled:from-black/20 disabled:to-black/20"
              >
                {pending === "buy" ? "Taking you to checkout…" : "Buy it now"}
              </Button>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Shipping / returns / checkout */}
            <div className="grid grid-cols-1 divide-y divide-black/8 border-y border-black/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex items-center gap-2.5 py-3 sm:justify-center sm:py-4">
                <Truck size={15} className="text-black/50" />
                <span className="text-[13px] text-black/65">
                  {shipping.hasThreshold ? `Free shipping over ${formatPrice(shipping.threshold)}` : "Nationwide delivery"}
                </span>
              </div>
              <div className="flex items-center gap-2.5 py-3 sm:justify-center sm:py-4">
                <RotateCcw size={15} className="text-black/50" />
                <Link to="/shipping-returns" className="text-[13px] text-black/65 hover:text-black">Easy returns</Link>
              </div>
              <div className="flex items-center gap-2.5 py-3 sm:justify-center sm:py-4">
                <ShieldCheck size={15} className="text-black/50" />
                <span className="text-[13px] text-black/65">Secure checkout</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-medium text-black">Description</h2>
                <p className="max-w-[65ch] whitespace-pre-line text-sm leading-relaxed text-black/65">
                  {product.description}
                </p>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && (
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-medium text-black">Specifications</h2>
                <p className="max-w-[65ch] whitespace-pre-line text-sm leading-relaxed text-black/65">
                  {product.specifications}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ─── Reviews (full width, own breathing room) ────────────────── */}
        <div id="reviews" className="mt-16 scroll-mt-28 border-t border-black/10 pt-14 sm:mt-20 sm:pt-16">
          <ReviewsSection productId={product.id} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </section>
  );
};

export default ProductDetails;
