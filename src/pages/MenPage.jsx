import { useMemo, useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import CategoryHero from "@/components/sections/CategoryHero";
import FilterSortBar from "@/components/products/FilterSortBar";
import ProductGrid from "@/components/products/ProductGrid";
import Pagination from "@/components/products/Pagination";
import Newsletter from "@/components/sections/Newsletter";
import Footer from "@/components/layout/Footer";
import { MEN_PRODUCTS, MEN_CATEGORY_FILTERS } from "@/data/menProducts";

const PAGE_SIZE = 8;

export default function MenPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortValue, setSortValue] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result =
      activeFilter === "All"
        ? [...MEN_PRODUCTS]
        : MEN_PRODUCTS.filter((p) => p.category === activeFilter);

    if (sortValue === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sortValue === "price-desc") result.sort((a, b) => b.price - a.price);
    if (sortValue === "newest")
      result.sort((a, b) => (b.tag === "New" ? 1 : 0) - (a.tag === "New" ? 1 : 0));

    return result;
  }, [activeFilter, sortValue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setSortValue(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />
      <CategoryHero
        title="Men"
        description="Tailored basics and everyday layers, built for versatility."
        imageUrl="https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1600&auto=format&fit=crop"
        breadcrumb={["Home", "Men"]}
      />
      <FilterSortBar
        filters={MEN_CATEGORY_FILTERS}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        sortValue={sortValue}
        onSortChange={handleSortChange}
        resultCount={filtered.length}
      />

      <div className="container py-12">
        <ProductGrid products={paginated} columns={4} />
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <Newsletter />
      <Footer />
    </div>
  );
}