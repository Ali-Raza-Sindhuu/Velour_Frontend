import { LuSparkles } from "react-icons/lu";
import { useMemo } from "react";
import SampleProduct from "../SampleProduct";
import SectionHeader from "../SectionHeader";
import { useSelector } from "react-redux";


const ProductSection = () => {
  const products = useSelector((state) => state.products?.items);
  const sectionState = useSelector((state) => state.site.sections.find(s => s.id === "new-arrivals"));
  
  const content = sectionState?.content || {};

  const visibleProducts = useMemo(() => {
    const allProducts = products || [];
    const slugs = content?.product_slugs;
    if (slugs && typeof slugs === 'string') {
      const slugArray = slugs.split(",").map(s => s.trim()).filter(Boolean);
      return slugArray.map(slug => allProducts.find(p => p.slug === slug)).filter(Boolean);
    }
    return allProducts.slice(0, 6);
  }, [products, content]);

  return (
    <section className="page-section bg-[#f5f8fc]">
      <div className="page-inner flex flex-col gap-8 sm:gap-10">
        <SectionHeader
          badge={content.badge || "Fresh technology"}
          icon={<LuSparkles size={13} />}
          heading={content.heading || "Explore the latest in everyday tech"}
          subtext={content.subtext}
          ctaLabel={content.ctaLabel || "Shop Now"}
          ctaLink={content.ctaLink || "/shops"}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
          {visibleProducts.map((product, index) => (
            <SampleProduct key={product.id || index} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
