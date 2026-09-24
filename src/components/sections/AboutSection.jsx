import { useRef } from "react";
import { useSelector } from "react-redux";
import { motion, useInView } from "framer-motion";
import {
  Crown,
  Heart,
  Layers,
  Users,
  InfinityIcon,
} from "lucide-react";
import { getCmsSection } from "../../utils/cms";
import { resolveImg } from "../../utils/resolveImg";
import FramedImage from "../ui/FramedImage";

const ICONS = {
  1: <InfinityIcon size={18} strokeWidth={1.5} className="text-white" />,
  2: <Heart size={18} strokeWidth={1.5} className="text-white" />,
  3: <Layers size={18} strokeWidth={1.5} className="text-white" />,
  4: <Users size={18} strokeWidth={1.5} className="text-white" />,
};

const AboutSection = () => {
  const ref = useRef(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-60px",
  });

  const pages = useSelector((state) => state.site.pages);

  const statsSection = getCmsSection(pages, "about", "stats") || {};
  const cards = statsSection.cards || [];

  return (
    <section className="page-section w-full bg-[#f8f8f8]">
      <div className="page-inner">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mb-10 flex flex-col items-start gap-4 text-left sm:mb-12 sm:gap-6 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-black/6 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black">
              <Crown
                size={13}
                className="text-white"
                strokeWidth={1.5}
              />
            </div>

            <span className="font-mono text-xs tracking-wide text-black">
              About Almina
            </span>
          </div>

          <p className="max-w-3xl font-display text-[clamp(1.75rem,3.2vw,2.75rem)] font-medium leading-[1.15] tracking-tight text-black">
            More than products â€” a commitment to dependable technology,
            clear choices and support that stays useful after checkout.
          </p>
        </motion.div>

        <div
          ref={ref}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
        >
          {cards.map((card, i) => (
            <motion.div
              key={card.id || i}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative aspect-[3/4] min-h-[280px] cursor-pointer overflow-hidden rounded-2xl"
            >
              <FramedImage
                src={resolveImg(card.image)}
                alt={card.label || "Almina"}
                className="absolute inset-0 transition-transform duration-700 hover:scale-105"
              />

              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75) 100%)",
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.95) 60%, black 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.95) 60%, black 100%)",
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2.5 p-4 sm:p-5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backdropFilter: "blur(8px)",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                >
                  {ICONS[card.id]}
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-price text-2xl font-bold tabular-nums text-white sm:text-3xl">
                    {card.stat}
                  </span>

                  <span className="text-center text-xs font-medium text-white/80">
                    {card.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

