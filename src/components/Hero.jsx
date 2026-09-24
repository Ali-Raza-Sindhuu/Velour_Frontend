import { Button } from "@/components/ui/button";

export default function Hero({
  eyebrow = "New Season Collection",
  heading = ["Style That Moves", "With You"],
  ctaLabel = "Explore Collection",
  onCtaClick,
  imageUrl = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1600&auto=format&fit=crop",
}) {
  return (
    <section className="relative w-full h-[520px] md:h-[640px] overflow-hidden">
      <img
        src={imageUrl}
        alt="Couple wearing new season styles"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/25 via-transparent to-transparent" />

      <div className="relative container h-full flex flex-col justify-center max-w-xl">
        <p className="text-sm md:text-base text-black/70 mb-3">{eyebrow}</p>
        <h1 className="font-sans font-semibold text-5xl md:text-6xl leading-[1.05] text-black mb-8">
          {heading.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <Button size="lg" className="w-fit rounded-none" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      </div>
    </section>
  );
}
