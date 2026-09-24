import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import video from "../../assets/video_shop.mp4";
import { resolveImg } from "../../utils/resolveImg";

const DEFAULTS = {
  heading: "A fragrance for every memory",
  subtext:
    "We create expressive, long-lasting scents from nuanced notes and treasured ingredients—made to become part of your signature.",
  primaryLabel: "More About Us",
  primaryLink: "/about",
  secondaryLabel: "Contact Us",
  secondaryLink: "/contact",
  video_url: "",
};

const VideoSection = () => {
  const videoRef = useRef(null);

  const sectionState = useSelector((state) =>
    state.site.sections.find((s) => s.id === "brand-film")
  );

  const content = {
    ...DEFAULTS,
    ...(sectionState?.content || {}),
  };

  const videoSrc = resolveImg(content.video_url) || video;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();

      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc]);

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={videoSrc}
        loop
        preload="auto"
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 50%" }}
      />

      <div className="absolute inset-0 bg-black/45" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

      <div className="page-x relative z-10 mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col items-start justify-center py-14 text-left sm:min-h-[75vh] md:min-h-[80vh]">
        <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-white/15 bg-white/10 px-1 py-1 backdrop-blur-md">
          <div className="rounded-full bg-white px-3 py-1">
            <span className="font-display text-xs font-medium tracking-tight text-black">
              IT Store
            </span>
          </div>

          <span className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/90 sm:text-[12px]">
            Fine fragrance
          </span>
        </div>

        <div className="mt-6 max-w-3xl">
          <h2 className="font-display text-pretty text-[clamp(2.1rem,4.6vw,4.25rem)] font-medium leading-[1.08] tracking-tight text-white">
            {content.heading}
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/78 sm:text-base md:text-lg">
            {content.subtext}
          </p>
        </div>

        <div className="mt-8 flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row">
          <Link
            to={content.primaryLink}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-[13px] font-medium tracking-tight text-black transition-all duration-300 hover:bg-white/90 sm:w-auto"
          >
            {content.primaryLabel}
          </Link>

          <Link
            to={content.secondaryLink}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-[13px] font-medium tracking-tight text-white backdrop-blur-md transition-all duration-300 hover:bg-white/15 sm:w-auto"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.10)" }}
          >
            {content.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
