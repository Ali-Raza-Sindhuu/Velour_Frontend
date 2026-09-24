import { useEffect, useRef, useState } from "react";
import { MessageCircleDashed, Quote } from "lucide-react";
import { LiaStarSolid } from "react-icons/lia";
import review01 from "../../assets/review_01.avif";
import review11 from "../../assets/review_02.avif";
import review21 from "../../assets/review_03.avif";
import review31 from "../../assets/review_04.avif";
import review41 from "../../assets/review_05.avif";

const REVIEWS = [
  { avatar: review01, name: "Hania Farooq", role: "Fragrance Enthusiast", text: "Noir Oud has become my signature scent. The projection is incredible and the smoky oud settles into something warm and refined by evening. Compliments every single time I wear it.", rating: 5 },
  { avatar: review11, name: "Zara Malik", role: "Beauty Blogger", text: "Citrus Bloom is exactly what I look for in a daytime perfume. Fresh, clean and it lasts well past lunch without turning sharp. My go-to for the office now.", rating: 5 },
  { avatar: review21, name: "Bilal Ahmed", role: "Perfume Collector", text: "Velvet Rose Extrait is easily one of the most well-balanced rose fragrances I own. The saffron and vanilla dry-down is luxurious without being heavy. Bottle design is beautiful too.", rating: 5 },
  { avatar: review31, name: "Areeba Khan", role: "Content Creator", text: "Amber Santal is my cold-weather staple. The sandalwood and cardamom combination feels cozy and expensive at the same time. Longevity is genuinely 8+ hours on my skin.", rating: 5 },
  { avatar: review41, name: "Usman Tariq", role: "Regular Customer", text: "Ordered White Musk after seeing it recommended for everyday wear and it did not disappoint. Light, skin-close, and the pear top note is a lovely surprise. Fast delivery as well.", rating: 5 },
];

const AUTOPLAY_DELAY = 4000;
const RESUME_AFTER_INTERACTION = 3500;

const ReviewSection = () => {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startScroll: 0, moved: false });

  const [active, setActive] = useState(0);

  const scrollToIndex = (index) => {
    const track = trackRef.current;
    const card = cardRefs.current[index];
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  };

  const goTo = (index) => {
    const clamped = (index + REVIEWS.length) % REVIEWS.length;
    setActive(clamped);
    scrollToIndex(clamped);
  };

  // Autoplay — advances one card at a time, pauses while the user is
  // interacting (dragging, touching, or manually scrolling) and resumes a
  // little while after they stop.
  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActive((prev) => {
        const next = (prev + 1) % REVIEWS.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_DELAY);
    return () => clearInterval(timer);
  }, []);

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };
  const scheduleResume = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => { pausedRef.current = false; }, RESUME_AFTER_INTERACTION);
  };

  // Keeps the active dot in sync with wherever the user scrolls to,
  // whether that's a native touch swipe, trackpad, or the drag handlers
  // below — picks whichever card's left edge is closest to the viewport.
  const handleScroll = () => {
    pause();
    scheduleResume();
    const track = trackRef.current;
    if (!track) return;
    const trackLeft = track.scrollLeft;
    let closest = 0;
    let closestDistance = Infinity;
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const distance = Math.abs(card.offsetLeft - track.offsetLeft - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = i;
      }
    });
    setActive(closest);
  };

  // Desktop mouse-drag-to-scroll — native scroll containers only respond
  // to touch/trackpad by default, so this lets mouse users grab and pull
  // the row horizontally too.
  const onPointerDown = (e) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { dragging: true, startX: e.clientX, startScroll: track.scrollLeft, moved: false };
    pause();
  };
  const onPointerMove = (e) => {
    const track = trackRef.current;
    if (!track || !dragState.current.dragging) return;
    const delta = e.clientX - dragState.current.startX;
    if (Math.abs(delta) > 4) dragState.current.moved = true;
    track.scrollLeft = dragState.current.startScroll - delta;
  };
  const endDrag = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    handleScroll();
    scheduleResume();
  };

  return (
    <section className="page-section bg-[#f8f8f8]">
      <div className="page-inner flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
        <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
          <span className="inline-flex items-center gap-2 overflow-hidden rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm">
            <span className="rounded-full bg-black p-2 text-white">
              <MessageCircleDashed size={13} />
            </span>
            <span className="pr-3">Customer Reviews</span>
          </span>

          <h2 className="font-display text-[clamp(2rem,4vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-black">
            Real People. Real Results.
          </h2>

          <p className="max-w-2xl text-sm leading-relaxed text-black/50 sm:text-base">
            Experience the difference through the words of customers who value
            long-lasting, finely composed fragrances.
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white p-4 sm:p-6">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onTouchStart={pause}
            onTouchEnd={scheduleResume}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {REVIEWS.map((r, i) => (
              <article
                key={r.name}
                ref={(el) => (cardRefs.current[i] = el)}
                className="flex w-[85%] flex-none snap-start flex-col gap-4 rounded-2xl border border-black/5 p-5 sm:w-[47%] sm:p-6 lg:w-[31%]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                      <img src={r.avatar} alt={r.name} className="h-full w-full object-cover" draggable={false} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-black">{r.name}</p>
                      <p className="text-xs text-black/40">{r.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <LiaStarSolid key={s} size={13} className={s < r.rating ? "text-[#c9a96e]" : "text-black/10"} />
                    ))}
                  </div>
                </div>

                <p className="flex-1 text-left text-sm leading-relaxed text-black/70">{r.text}</p>

                <Quote size={26} strokeWidth={1.5} className="ml-auto text-[#c9a96e]" />
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to review ${i + 1}`}
                onClick={() => { pause(); goTo(i); scheduleResume(); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-6 bg-[#c9a96e]" : "w-1.5 bg-black/15 hover:bg-black/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;