import { ArrowRight, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "../SectionHeader";

const CollectionStory = () => {
  return (
    <section className="page-section bg-[#f8f8f8]">
      <div className="page-inner flex flex-col gap-6 sm:gap-8 md:gap-10">
        <SectionHeader
          badge="Our Story"
          icon={<Layers size={13} />}
          heading="Behind every scent, a purpose"
          ctaLabel="Learn more"
          ctaLink="/about"
        />

        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-16">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[240px] sm:h-[320px] md:h-[400px] lg:h-[480px] xl:h-[540px]">
            <img
              src="https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1400&q=85"
              alt="IT Store technology story"
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute bottom-3 left-3 rounded-2xl border border-white/20 bg-white/15 px-3 py-2 backdrop-blur-md sm:bottom-4 sm:left-4 sm:px-4 sm:py-3">
              <span className="block font-mono text-[10px] tracking-widest text-white uppercase sm:text-xs">
                IT Store
              </span>
              <span className="block text-[10px] text-white/70 sm:text-xs">
                Fine fragrance
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5 sm:gap-6 md:gap-8">
            <span className="font-mono text-[10px] tracking-widest text-black/30 uppercase sm:text-xs">
              Our Philosophy
            </span>

            <h2 className="font-display text-2xl leading-tight text-black sm:text-3xl md:text-4xl lg:text-5xl">
              Fragrance that stays
              <br />
              close, so you
              <br />
              don't have to.
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-black/50 sm:text-base md:text-[1.05rem]">
              Velour collections are built around one idea — timeless cuts,
              honest materials, and details that reveal themselves slowly over
              time. Nothing loud. Nothing wasted.
            </p>

            <div className="grid grid-cols-3 gap-3 border-y border-black/6 py-4 sm:gap-6 sm:py-5 md:gap-8 md:py-6">
              {[
                ["12+", "Collections"],
                ["340", "Signature notes"],
                ["10M+", "Moments scented"],
              ].map(([num, label], i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="font-price text-lg font-bold tabular-nums text-black sm:text-xl md:text-2xl">
                    {num}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-black/30 uppercase sm:text-xs">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/about"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 sm:px-6 sm:py-3"
            >
              Read our Story <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollectionStory;
