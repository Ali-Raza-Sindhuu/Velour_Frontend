import { useSelector } from "react-redux";
import {
  AlertCircle,
  Calendar,
  CombineIcon,
  FingerprintIcon,
  Hexagon,
  Pentagon,
  Shirt,
  Sparkles,
  Star,
} from "lucide-react";
import { GiClothesline, GiTiger } from "react-icons/gi";
import StyleCard from "../StyleCard";
import { BsInfinity } from "react-icons/bs";
import { IoAnalyticsSharp } from "react-icons/io5";
import { MdDashboard, MdDoubleArrow } from "react-icons/md";
import { PiFunction } from "react-icons/pi";
import { FcTreeStructure } from "react-icons/fc";
import { BiColorFill } from "react-icons/bi";

const fragranceImage = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
const style01 = fragranceImage("photo-1541643600914-78b084683601");
const style02 = fragranceImage("photo-1594035910387-fea47794261f");
const style11 = fragranceImage("photo-1615634260167-c8cdede054de");
const style12 = fragranceImage("photo-1592945403244-b3fbafd7f539");
const style21 = fragranceImage("photo-1563170351-be82bc888aa4");
const style22 = fragranceImage("photo-1585386959984-a41552231693");
const style31 = fragranceImage("photo-1590736969955-71cc94901144");
const style32 = fragranceImage("photo-1557170334-a9632e77c6e4");
const style41 = fragranceImage("photo-1595425970377-c9703cf48b6d");
const style42 = fragranceImage("photo-1608528577891-eb055944f2e7");
const style51 = fragranceImage("photo-1619994403073-2cec844b8e63");
const style52 = fragranceImage("photo-1547887538-e3a2f32cb1cc");

// Icons and feature tags stay code-defined (they aren't practical to store as
// JSON), but title/description/images per card are editable via CMS content.
const CARD_TEMPLATES = [
  { id: 1, title: "Everyday Freshness", description: "Light, clean fragrances designed to feel effortless from morning through evening.", style01, style02, features: [{ icon: Shirt, content: "All-day scent" }, { icon: Star, content: "Comfort" }, { icon: Sparkles, content: "Soft trail" }] },
  { id: 2, title: "Modern Compositions", description: "Contemporary notes balance brightness, depth and warmth for an expressive signature.", style01: style11, style02: style12, features: [{ icon: BiColorFill, content: "Balance fit" }, { icon: Pentagon, content: "Modern" }, { icon: FcTreeStructure, content: "Structured" }] },
  { id: 3, title: "Effortless Layering", description: "Notes unfold naturally from first spray to dry-down, creating an intuitive scent journey.", style01: style21, style02: style22, features: [{ icon: MdDashboard, content: "Versatile" }, { icon: Star, content: "Easy to Style" }, { icon: CombineIcon, content: "Layered" }] },
  { id: 4, title: "Daily Essentials", description: "Essential scents to complement your daily rituals and memorable moments.", style01: style31, style02: style32, features: [{ icon: Hexagon, content: "Core pieces" }, { icon: Calendar, content: "Everyday" }, { icon: GiClothesline, content: "Wearable" }] },
  { id: 5, title: "Lasting Design", description: "Thoughtful compositions focused on balance, longevity and real-life wearability.", style01: style41, style02: style42, features: [{ icon: FingerprintIcon, content: "Practical" }, { icon: PiFunction, content: "Functional" }, { icon: MdDoubleArrow, content: "Adaptable" }] },
  { id: 6, title: "Clean Aesthetic", description: "Refined fragrances that feel close to the skin and become unmistakably yours.", style01: style51, style02: style52, features: [{ icon: IoAnalyticsSharp, content: "Clean Lines" }, { icon: AlertCircle, content: "Minimal" }, { icon: BsInfinity, content: "Timeless" }] },
];

const StyleWearSection = () => {
  const sectionState = useSelector((state) => state.site.sections.find((s) => s.id === "fragrance-guide"));
  const content = sectionState?.content || {};
  const overrides = content.cards || [];

  const cards = CARD_TEMPLATES.map((template) => {
    const override = overrides.find((o) => o.id === template.id);
    return override
      ? { ...template, title: override.title || template.title, description: override.description || template.description, style01: override.style01 || template.style01, style02: override.style02 || template.style02 }
      : template;
  });

  const row1 = cards.slice(0, 3);
  const row2 = cards.slice(3, 6);

  return (
    <section className="bg-[#f8f8f8] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-12 sm:py-16 md:py-20">
      <div className="flex w-full flex-col gap-8 sm:gap-10">
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm overflow-hidden">
            <span className="bg-black rounded-full p-2 text-white">
              <GiTiger size={13} />
            </span>
            <span className="pr-3">{content.badge || "What defines our scents"}</span>
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-wide text-black">
            {content.heading || "Where scent meets memory"}
          </h2>

          <p className="max-w-2xl text-sm sm:text-base text-black/50 leading-relaxed">
            {content.subtext || "Thoughtful fragrance design blending memorable notes, balance and versatility for every kind of moment."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:gap-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {row1.map((card) => (
              <StyleCard key={card.id} card={card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-3">
            {row2.map((card) => (
              <StyleCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StyleWearSection;