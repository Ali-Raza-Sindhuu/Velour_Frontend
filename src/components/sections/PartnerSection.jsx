import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";
import { resolveImg } from "../../utils/resolveImg";

// Avatars/rating/trustText are editable from the admin Website Editor ->
// About page -> Partners/Trust section. Logos are an optional CMS field
// too (comma-separated image URLs) — none of this renders fabricated
// customer photos or unrelated brand logos when the admin hasn't set
// anything up yet.
const PartnersSection = ({
  avatars,
  logos,
  rating,
  ratingColor,
  trustText,
  tickerSpeed = 30,
  bg = "bg-[#f8f8f8]",
}) => {
  const avatarList = (avatars || []).filter(Boolean).map(resolveImg);
  const logoList = (logos || []).filter(Boolean);
  const displayRating = rating || null;
  const displayRatingColor = ratingColor || "#c9a96e";
  const displayTrustText = trustText || null;
  const tickerLogos = logoList.length ? [...logoList, ...logoList, ...logoList, ...logoList, ...logoList] : [];
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  if (!avatarList.length && !displayRating && !displayTrustText && !logoList.length) return null;

  return (
    <section ref={sectionRef} className={`page-x w-full overflow-hidden border-b border-black/6 ${bg}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="page-inner flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between md:py-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
          {avatarList.length > 0 && (
            <div className="flex items-center">
              {avatarList.map((src, i) => (
                <div
                  key={i}
                  className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white"
                  style={{
                    marginLeft: i > 0 ? "-10px" : 0,
                    zIndex: avatarList.length - i,
                  }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {avatarList.length > 0 && displayRating && (
            <div className="hidden md:block w-px h-5 bg-black/10" />
          )}

          {displayRating && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    fill={displayRatingColor}
                    stroke={displayRatingColor}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-black/40">{displayRating}</span>
            </div>
          )}

          {displayRating && displayTrustText && (
            <div className="hidden md:block w-px h-5 bg-black/10" />
          )}

          {displayTrustText && (
            <span className="text-xs font-medium text-black/60 tracking-wide">
              {displayTrustText}
            </span>
          )}
        </div>

        {logoList.length > 0 && (
          <div
            className="relative hidden md:block overflow-hidden"
            style={{
              width: "480px",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
            }}
          >
            <motion.ul
              className="flex items-center gap-10 will-change-transform"
              animate={{ x: [0, `-${logoList.length * 180}px`] }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                duration: tickerSpeed,
                ease: "linear",
              }}
            >
              {tickerLogos.map((logoSrc, i) => (
                <li
                  key={i}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 140, height: 36 }}
                >
                  <img
                    src={resolveImg(logoSrc)}
                    alt=""
                    className="w-full h-full object-contain opacity-30 hover:opacity-70 transition-opacity duration-300"
                    loading="lazy"
                  />
                </li>
              ))}
            </motion.ul>
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default PartnersSection;