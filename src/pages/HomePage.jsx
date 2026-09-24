import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CategorySection from "@/components/sections/CategorySection";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import Hero from "@/components/sections/Hero";
import Newsletter from "@/components/sections/Newsletter";

export default function HomePage() {
  return <div className="min-h-screen bg-white"><AnnouncementBar /><Navbar /><main><Hero /><CategorySection /><FeaturedProducts /><Newsletter /></main><Footer /></div>;
}
