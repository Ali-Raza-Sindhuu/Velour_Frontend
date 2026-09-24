import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/ProductCard";
import { featuredProducts } from "@/data/products";
export default function FeaturedProducts() { return <section className="container py-20"><div className="mb-12 flex items-end justify-between"><div><p className="mb-2 text-sm text-muted-foreground">New Arrivals</p><h2 className="text-4xl font-semibold md:text-5xl">Fresh Off The Rack</h2></div><Button variant="outline" className="hidden rounded-none sm:inline-flex" asChild><Link to="/new-arrivals">View All</Link></Button></div><div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>; }
