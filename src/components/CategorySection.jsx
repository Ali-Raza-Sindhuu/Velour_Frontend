const CATEGORIES = [
  {
    label: "Women",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
    href: "/women",
  },
  {
    label: "Men",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
    href: "/men",
  },
  {
    label: "Kids",
    image:
      "https://images.unsplash.com/photo-1503457574465-52ee5f1a0a7a?q=80&w=800&auto=format&fit=crop",
    href: "/kids",
  },
];

export default function CategorySection({
  eyebrow = "Shop By Category",
  heading = "Find Your Perfect Style",
  categories = CATEGORIES,
}) {
  return (
    <section className="container py-20 text-center">
      <p className="text-sm text-muted-foreground mb-2">{eyebrow}</p>
      <h2 className="font-sans font-semibold text-4xl md:text-5xl mb-12">
        {heading}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
        {categories.map((cat) => (
          <a
            key={cat.label}
            href={cat.href}
            className="group relative block h-[380px] overflow-hidden"
          >
            <img
              src={cat.image}
              alt={cat.label}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white px-6 py-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {cat.label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
