import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../ui/Breadcrumbs";

const PAGE_HERO_PADDING = "page-x";
const INNER_MODES = ["contact", "about", "shop"];

const HeroSection = ({
  image = "",
  badge,
  heading,
  subtext,
  primaryLink = "/shops",
  primaryLabel = "See Collection",
  secondaryLink = "/contact",
  secondaryLabel = "Contact us",
  mode = "hero",
  showScrollCue = true,
  children,
  imagePosition = "center center",
  textAlign = "left",
  overlay = 55,
  ready = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedImage, setLoadedImage] = useState(null);
  const imageLoaded = Boolean(image) && loadedImage === image;
  const handleImageLoad = useCallback((event) => setLoadedImage(event.currentTarget.getAttribute("src")), []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const sectionRef = useRef(null);
  const isHomeHero = mode === "hero";
  const isInner = INNER_MODES.includes(mode);
  const align = isHomeHero ? textAlign : "left";
  const alignClass =
    align === "center"
      ? "items-center text-center"
      : align === "right"
        ? "items-end text-right"
        : "items-start text-left";
  const showPrimaryCtas = isHomeHero;
  const pageModeDefaultBadge = {
    contact: "Contact",
    about: "About",
    shop: "Shop",
  };
  const badgeLabel = badge?.label || pageModeDefaultBadge[mode];

  // Text animates in only once the page's real (CMS) content is known, so a
  // first visit never flashes placeholder copy that's about to be replaced.
  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!isHomeHero) return;
    const handleMouseMove = (e) => {
      if (!sectionRef.current || window.innerWidth < 1024) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMousePos({ x: x * 10, y: y * 10 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isHomeHero]);

  if (!isHomeHero && !isInner) return null;

  // Show the heading on exactly two lines: split a text heading at the word
  // boundary that gives the most even halves. Non-text headings render as-is.
  const headingLines = (() => {
    if (typeof heading !== "string") return [heading];
    const words = heading.trim().split(/\s+/);
    if (words.length < 2) return [heading];
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  })();

  const reveal = (delay, from = "translate-y-4") => ({
    className: isLoaded ? "translate-y-0 opacity-100" : `${from} opacity-0`,
    style: { transitionDelay: `${delay}ms` },
  });

  return (
    <section
      ref={sectionRef}
      className="relative -mt-16 flex min-h-[68svh] w-full overflow-hidden bg-[#050505] md:-mt-20 md:h-[75dvh] md:min-h-[540px]"
    >
      {/* Full-bleed image: fills the entire hero (width and height) on every
          screen size. Nothing is painted until the real image has loaded. */}
      {image && (
        <div
          className={`absolute inset-0 z-0 transition-[opacity,scale] duration-[1.4s] ease-out ${
            imageLoaded ? "scale-[1.04] opacity-100" : "scale-110 opacity-0"
          }`}
        >
          <img
            key={image}
            src={image}
            alt=""
            loading="eager"
            fetchPriority="high"
            onLoad={handleImageLoad}
            className="h-full w-full object-cover"
            style={{
              objectPosition: imagePosition,
              transform: isHomeHero && imageLoaded
                ? `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)`
                : undefined,
              transition: "transform 0.6s ease-out",
            }}
          />
        </div>
      )}

      {/* Readability overlays */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
        style={{
          background: `linear-gradient(to right, rgba(5,5,5,${overlay / 100}) 0%, rgba(5,5,5,${Math.max(overlay - 25, 0) / 100}) 45%, rgba(5,5,5,0.1) 70%, transparent 100%)`,
        }}
      />
      {/* Phones: text sits at the bottom, so the shade rises from the bottom. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] md:hidden"
        style={{
          background:
            "linear-gradient(to top, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.65) 38%, rgba(5,5,5,0.15) 70%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-2/5 md:block"
        style={{
          background: "linear-gradient(to top, rgba(5,5,5,0.75) 0%, transparent 100%)",
        }}
      />

      <div
        className={`relative z-10 mr-auto flex w-full max-w-7xl flex-col justify-end ${PAGE_HERO_PADDING} pb-12 pt-28 md:justify-center md:pb-0 md:pt-24 ${alignClass}`}
      >
        <div className="w-full max-w-4xl xl:max-w-5xl">
          {isInner && (
            <Breadcrumbs
              tone="light"
              items={[{ label: pageModeDefaultBadge[mode] }]}
              className={`mb-6 transition-all duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            />
          )}

          {badgeLabel && (
            <div
              className={`mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-700 sm:mb-7 ${reveal(150).className}`}
              style={reveal(150).style}
            >
              <span className="rounded-full bg-white px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-900">
                {badgeLabel}
              </span>
              {badge?.text && (
                <span className="pr-3 text-[11px] font-medium text-white/75">
                  {badge.text}
                </span>
              )}
            </div>
          )}

          <h1
            className={`font-display text-pretty text-[clamp(1.75rem,4.2vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.35)] transition-all duration-1000 ${reveal(300, "translate-y-8").className}`}
            style={reveal(300, "translate-y-8").style}
          >
            {headingLines.map((line, i) => (
              <span key={i} className="block sm:whitespace-nowrap">
                {line}
              </span>
            ))}
          </h1>

          <div
            className={`my-6 h-px w-16 rounded-full bg-gradient-to-r from-[#c9a96e] to-white/10 transition-all duration-700 sm:my-8 sm:w-24 ${
              isLoaded ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
            }`}
            style={{
              transitionDelay: "500ms",
              transformOrigin: align === "right" ? "right" : "left",
            }}
          />

          {subtext && (
            <p
              className={`max-w-md text-[15px] font-normal leading-[1.75] text-white/75 transition-all duration-700 sm:text-base ${reveal(550).className}`}
              style={reveal(550).style}
            >
              {subtext}
            </p>
          )}

          {showPrimaryCtas && (
            <div
              className={`mt-8 flex flex-col gap-3 transition-all duration-700 sm:mt-10 sm:flex-row sm:items-center ${reveal(700).className}`}
              style={reveal(700).style}
            >
              <Link
                to={primaryLink}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-[13px] font-medium text-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:bg-neutral-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97]"
              >
                {primaryLabel}
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
              {isHomeHero && (
                <Link
                  to={secondaryLink}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-8 py-3.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97]"
                >
                  {secondaryLabel}
                </Link>
              )}
            </div>
          )}

          {children && (
            <div
              className={`mt-8 transition-all duration-700 ${reveal(700).className}`}
              style={reveal(700).style}
            >
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Scroll cue (home hero, desktop only) */}
      {isHomeHero && showScrollCue && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 transition-opacity duration-700 md:block ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "1000ms" }}
        >
          <div className="flex h-10 w-6 justify-center rounded-full border border-white/40 pt-2">
            <span className="h-2 w-px animate-bounce rounded-full bg-white/80 motion-reduce:animate-none" />
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;