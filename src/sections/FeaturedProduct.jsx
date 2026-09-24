import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { FEATURED_PRODUCTS } from "@/data/products";

export default function FeaturedProducts({
  eyebrow = "New Arrivals",
  heading = "Fresh Off The Rack",
  products = FEATURED_PRODUCTS,
  viewAllHref = "/new-arrivals",
}) {
  return (
    <section className="container py-20">
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{eyebrow}</p>
          <h2 className="font-sans font-semibold text-4xl md:text-5xl">
            {heading}
          </h2>
        </div>

        <Button
          variant="outline"
          className="hidden sm:inline-flex rounded-none"
          asChild
        >
          <a href={viewAllHref}>View All</a>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-10 text-center sm:hidden">
        <Button variant="outline" className="rounded-none" asChild>
          <a href={viewAllHref}>View All</a>
        </Button>
      </div>
    </section>
  );
}