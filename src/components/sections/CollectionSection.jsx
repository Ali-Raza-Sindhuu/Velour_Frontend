import { useSelector } from "react-redux";
import CollectionCard from "../CollectionCard";
import SectionHeader from "../SectionHeader";
import { BsCollection } from "react-icons/bs";
import { resolveImg } from "../../utils/resolveImg";

const CollectionSection = () => {
  const sectionState = useSelector((state) =>
    state.site.sections.find((s) => s.id === "collections")
  );

  const content = sectionState?.content || {};
  const cards = content?.cards || [];

  return (
    <section className="page-section bg-[#f8f8f8]">
      <div className="page-inner flex flex-col gap-6 sm:gap-8 lg:gap-10">

        <SectionHeader
          badge={content.badge || "Our Collections"}
          icon={<BsCollection size={13} />}
          heading={content.heading || ""}
          subtext={content.subtext || ""}
          ctaLabel={content.ctaLabel || "Shop all items"}
          ctaLink={content.ctaLink || "/shops"}
        />

        {cards.map((card, i) => {
          const images = (
            Array.isArray(card.images)
              ? card.images
              : String(card.images || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
          ).map(resolveImg);

          return (
            <CollectionCard
              key={card.id || i}
              images={images}
              wearType={card.wearType}
              wearBadge={card.wearBadge}
              title1={card.title1}
              title2={card.title2}
              priceFrom={card.priceFrom}
              priceTo={card.priceTo}
              description={card.description}
              link={card.link}
              reverse={!!card.reverse}
            />
          );
        })}

      </div>
    </section>
  );
};

export default CollectionSection;