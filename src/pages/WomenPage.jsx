import { useMemo, useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/Navbar";
import FilterSortBar from "@/components/products/FilterSortBar";
import Pagination from "@/components/products/Pagination";
import ProductGrid from "@/components/products/ProductGrid";
import CategoryHero from "@/components/sections/CategoryHero";
import Newsletter from "@/components/sections/Newsletter";
import { womenCategoryFilters, womenProducts } from "@/data/products";

const pageSize = 8;

export default function WomenPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortValue, setSortValue] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const filteredProducts = useMemo(() => {
    const products = activeFilter === "All" ? [...womenProducts] : womenProducts.filter((product) => product.category === activeFilter);
    if (sortValue === "price-asc") products.sort((a, b) => a.price - b.price);
    if (sortValue === "price-desc") products.sort((a, b) => b.price - a.price);
    if (sortValue === "newest") products.sort((a, b) => Number(b.tag === "New") - Number(a.tag === "New"));
    return products;
  }, [activeFilter, sortValue]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changeFilter = (filter) => { setActiveFilter(filter); setCurrentPage(1); };
  const changeSort = (sort) => { setSortValue(sort); setCurrentPage(1); };
  return <div className="min-h-screen bg-white"><AnnouncementBar /><Navbar /><main><CategoryHero title="Women" description="Considered pieces for everyday movement — from tailored basics to statement layers." /><FilterSortBar filters={womenCategoryFilters} activeFilter={activeFilter} onFilterChange={changeFilter} sortValue={sortValue} onSortChange={changeSort} resultCount={filteredProducts.length} /><div className="container py-12"><ProductGrid products={pageProducts} /></div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /><Newsletter /></main><Footer /></div>;
}
