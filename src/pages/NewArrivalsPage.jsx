import { useMemo, useState } from "react"
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import CategoryHero from "@/components/sections/CategoryHero";
import FilterSortBar from "@/components/products/FilterSortBar";
import ProductGrid from "@/components/products/ProductGrid";
import Pagination from "@/components/products/Pagination";
import Newsletter from "@/components/sections/Newsletter";
import Footer from "@/components/layout/Footer";
import { WOMEN_PRODUCTS } from "@/data/womenProducts";
import { MEN_PRODUCTS } from "@/data/menProducts";
import { KIDS_PRODUCTS } from "@/data/kidsProducts";

const PAGE_SIZE = 8;

// Tag each product with its source department, then filter to "New"
const ALL_NEW_ARRIVALS = [
  ...WOMEN_PRODUCTS.map((p) => ({ ...p, department: "Women" })),
  ...MEN_PRODUCTS.map((p) => ({ ...p, department: "Men" })),
  ...KIDS_PRODUCTS.map((p) => ({ ...p, department: "Kids" })),
].filter((p) => p.tag === "New");

const DEPARTMENT_FILTERS = ["All", "Women", "Men", "Kids"];

export default function NewArrivalsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortValue, setSortValue] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result =
      activeFilter === "All"
        ? [...ALL_NEW_ARRIVALS]
        : ALL_NEW_ARRIVALS.filter((p) => p.department === activeFilter);

    if (sortValue === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sortValue === "price-desc") result.sort((a, b) => b.price - a.price);
    // "newest" is meaningless here since all items are already New — no-op

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
        title="New Arrivals"
        description="The latest additions, fresh in across every department."
        imageUrl="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop"
        breadcrumb={["Home", "New Arrivals"]}
      />
      <FilterSortBar
        filters={DEPARTMENT_FILTERS}
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
