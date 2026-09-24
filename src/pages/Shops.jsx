import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import HeroSection from "../components/sections/HeroSection";
import SampleProduct from "../components/SampleProduct";
import { Leaf, RotateCcw, Search, ShieldCheck, Truck, X } from "lucide-react";
import { getCmsSection, useCmsReady } from "../utils/cms";
import { resolveImg } from "../utils/resolveImg";
import { formatPrice } from "../utils/price";
import { useShipping } from "../utils/shipping";
import apiClient from "../api/apiClient";

const ALL_PRODUCTS_LABEL = "All Products";
const fallbackHeroImage = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2200&q=90";

const SORTS = {
  featured: { label: "Featured", compare: null },
  "price-asc": { label: "Price: low to high", compare: (a, b) => Number(a.price) - Number(b.price) },
  "price-desc": { label: "Price: high to low", compare: (a, b) => Number(b.price) - Number(a.price) },
  name: { label: "Name: A to Z", compare: (a, b) => (a.name || "").localeCompare(b.name || "") },
};

const Shops = () => {
  const ALL_PRODUCTS = useSelector((state) => state.products?.items);
  const loading = useSelector((state) => state.products.loading);
  const pages = useSelector((state) => state.site.pages);
  const cmsReady = useCmsReady();
  const shipping = useShipping(0);

  // Category and sort live in the URL so a filtered view can be shared and
  // survives the back button (e.g. returning from a product page).
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("category") || ALL_PRODUCTS_LABEL;
  const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "featured";
  const [query, setQuery] = useState("");

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  // Category chips are pulled live from the real category catalog (the same
  // one managed in admin -> Categories) instead of a hardcoded, easily
  // stale list â€” so a category only shows here if it actually exists.
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let cancelled = false;
    apiClient.get("/categories").then((res) => {
      if (cancelled) return;
      const names = (res.data?.data || []).map((c) => c.name).filter(Boolean);
      setCategories(names);
    }).catch(() => {
      // Filter bar just falls back to "All Products" if this fails.
    });
    return () => { cancelled = true; };
  }, []);

  // Content editable from the admin Website Editor -> Shop / Catalog page
  const header = getCmsSection(pages, "shop", "header") || {};
  const promos = getCmsSection(pages, "shop", "promos") || {};
  // Fallback only once the CMS has confirmed there's no header image.
  const heroImage = cmsReady ? resolveImg(header.image) || fallbackHeroImage : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (ALL_PRODUCTS || []).filter((product) => {
      const categoryName = product.category_name || product.category || "";
      const productName = product.name || product.title || "";
      const matchesCategory = active === ALL_PRODUCTS_LABEL || categoryName === active;
      const matchesQuery = !q || productName.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
    const compare = SORTS[sort].compare;
    return compare ? [...list].sort(compare) : list;
  }, [ALL_PRODUCTS, active, query, sort]);

  const hasFilters = active !== ALL_PRODUCTS_LABEL || query.trim() !== "";
  const clearFilters = () => {
    setQuery("");
    setParam("category", null);
  };

  const trust = [
    {
      icon: <Truck size={22} strokeWidth={1.5} />,
      title: shipping.hasThreshold ? "Free shipping" : "Nationwide delivery",
      desc: shipping.hasThreshold ? `On orders over ${formatPrice(shipping.threshold)}` : "Delivered to your door",
    },
    { icon: <RotateCcw size={22} strokeWidth={1.5} />, title: "Easy returns", desc: "30-day hassle-free returns" },
    { icon: <Leaf size={22} strokeWidth={1.5} />, title: "Quality checked", desc: "Inspected before dispatch" },
    { icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: "Secure checkout", desc: "SSL encrypted payments" },
  ];

  return (
    <div className="fashion-shop-page">
      <HeroSection
        mode="shop"
        ready={cmsReady}
        image={heroImage}
        imagePosition="center center"
        mobileImagePosition="90% 20%"
        badge={{ label: header.badgeLabel || "Almina", text: header.badgeText || "A wardrobe for every day" }}
        heading={header.title || "Find pieces that feel like you"}
        subtext={header.subtitle || "Thoughtful clothing, easy layers and new favourites for every day."}
      />

      {promos.banner_text && (
        <div className="bg-black px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
          {promos.banner_text}
        </div>
      )}

      <section className="page-section bg-white">
        <div className="page-inner flex flex-col gap-8 sm:gap-10">

          {/* Search, filters and sort */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative w-full max-w-md">
                <span className="sr-only">Search products</span>
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the collection..."
                  className="w-full rounded-full border border-black/10 py-3 pl-11 pr-10 text-sm text-black outline-none transition focus:border-black/40 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <label className="flex items-center gap-2 text-sm text-black/55">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setParam("sort", e.target.value, "featured")}
                  className="cursor-pointer rounded-full border border-black/10 bg-white py-2.5 pl-4 pr-9 text-sm text-black outline-none transition focus:border-black/40"
                >
                  {Object.entries(SORTS).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {[ALL_PRODUCTS_LABEL, ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setParam("category", cat, ALL_PRODUCTS_LABEL)}
                  aria-pressed={active === cat}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${active === cat ? "border-black bg-black text-white" : "border-black/15 text-black/60 hover:border-black/50 hover:text-black"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {!loading && (
              <p className="text-sm text-black/45" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
              </p>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-square animate-pulse rounded-2xl bg-black/5" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-black/5" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-black/5" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#f8f8f8] px-6 py-16 text-center">
              <p className="text-base font-medium text-black">No products match your search</p>
              <p className="max-w-sm text-sm text-black/50">Try another name, or browse the full catalog.</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <SampleProduct key={product.id || product.slug} {...product} />
              ))}
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-6 border-t border-black/10 pt-10 sm:grid-cols-4">
            {trust.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-2 text-center">
                <span className="text-black/60">{item.icon}</span>
                <p className="text-sm font-semibold text-black">{item.title}</p>
                <p className="text-xs text-black/50">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
};

export default Shops;


