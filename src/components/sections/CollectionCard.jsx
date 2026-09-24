import { ArrowRight, Layers } from "lucide-react";
import SectionHeader from "../SectionHeader";
import { Link } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const COLLECTIONS = [
  {
    label: "Woody & Oud",
    name: "Midnight Woods",
    desc: "Clean cuts and muted tones inspired by the stillness of winter landscapes.",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85",
    tag: "New arrival",
  },
  {
    label: "Fresh & Citrus",
    name: "Sunlit Citrus",
    desc: "Relaxed silhouettes built for the city — soft fabrics, sharp details.",
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85",
    tag: "Bestseller",
  },
  {
    label: "Floral & Amber",
    name: "Velvet Bloom",
    desc: "Premium essentials that carry you from morning light to evening ease.",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1200&q=85",
    tag: "Limited",
  },
];

const CollectionCard = () => {
  return (
    <section className="bg-[#f8f8f8] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-8 sm:py-10 md:py-12 lg:py-14 xl:py-16">
      <div className="flex w-full flex-col gap-6 sm:gap-8 md:gap-10">
        <SectionHeader
          badge="Current Collections"
          icon={<Layers size={13} />}
          heading={
            <>
              Curated scents, <br className="hidden sm:block" /> made to linger
            </>
          }
          ctaLabel="View all"
          ctaLink="/collections"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 lg:gap-5 xl:gap-6">
          {COLLECTIONS.map((col, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl cursor-pointer aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]"
            >
              <img
                src={col.image}
                alt={col.name}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              <Badge className="absolute left-3 top-3 border border-white/20 bg-white/15 text-white backdrop-blur-sm sm:left-4 sm:top-4">
                {col.tag}
              </Badge>

              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-5 md:p-6">
                <span className="font-mono text-[10px] tracking-widest text-white/50 uppercase sm:text-xs">
                  {col.label}
                </span>

                <h4 className="font-display text-xl font-medium tracking-tight text-white sm:text-2xl lg:text-[1.65rem]">
                  {col.name}
                </h4>

                <p className="text-xs leading-relaxed text-white/65 sm:text-sm">
                  {col.desc}
                </p>

                <Button asChild size="sm" variant="outline" className="mt-2 w-fit border-transparent bg-white text-black hover:bg-white/90 sm:mt-3">
                  <Link to="/collections">
                    Explore <ArrowRight size={12} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionCard;
