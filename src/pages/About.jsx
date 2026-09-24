import { useSelector } from "react-redux";
import AboutSection from "../components/sections/AboutSection";
import HeroSection from "../components/sections/HeroSection";
import PartnersSection from "../components/sections/PartnerSection";
import { getCmsSection, useCmsReady } from "../utils/cms";
import { resolveImg } from "../utils/resolveImg";

const fallbackImage = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2200&q=90";

const About = () => {
  const pages = useSelector((state) => state.site.pages);
  const cmsReady = useCmsReady();
  // Editable from the admin Website Editor -> About Us page
  const story = getCmsSection(pages, "about", "story") || {};
  const partners = getCmsSection(pages, "about", "partners") || {};

  return (
    <div className="fashion-about-page">
      <HeroSection
        mode="about"
        ready={cmsReady}
        image={cmsReady ? resolveImg(story.image) || fallbackImage : ""}
        badge={{ label: story.badgeLabel || "About Almina", text: story.badgeText || "Clothing made personal" }}
        heading={story.title || "Clothing for the way you live"}
        subtext={story.content || "We create thoughtful pieces that make getting dressed feel easy, personal and entirely your own."}
      />
      <PartnersSection
        trustText={partners.trustText}
        rating={partners.rating}
        ratingColor={partners.ratingColor}
        avatars={typeof partners.avatars === "string" ? partners.avatars.split(",").map((s) => s.trim()).filter(Boolean) : undefined}
        logos={typeof partners.logos === "string" ? partners.logos.split(",").map((s) => s.trim()).filter(Boolean) : undefined}
      />
      <AboutSection />
    </div>
  );
};

export default About;

