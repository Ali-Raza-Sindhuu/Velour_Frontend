import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SampleProduct from "../SampleProduct";
import SectionHeader from "../SectionHeader";
import { Crown } from "lucide-react";

const BestSeller = () => {
  const products = useSelector(state => state.products?.items) || [];
  const sectionState = useSelector((state) => state.site.sections.find(s => s.id === "best-sellers"));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const content = sectionState?.content || {};

  let visibleProducts = [];
  const slugs = content.product_slugs;
  if (slugs && typeof slugs === 'string') {
    const slugArray = slugs.split(",").map(s => s.trim()).filter(Boolean);
    visibleProducts = slugArray.map(slug => products.find(p => p.slug === slug)).filter(Boolean);
  } else {
    visibleProducts = products.slice(0, 3);
  }

  if (isMobile) {
    visibleProducts = visibleProducts.slice(0, 3);
  }

  return (
    <section className="page-section bg-[#eef7fc]">
      <div className="page-inner flex flex-col gap-8 sm:gap-10">
        <SectionHeader
          badge={content.badge || "Popular picks"}
          icon={<Crown size={13} />}
          heading={content.heading || "The gear customers come back for"}
          subtext={content.subtext}
          ctaLabel={content.ctaLabel || "Shop Now"}
          ctaLink={content.ctaLink || "/shops"}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <SampleProduct key={product.slug} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
