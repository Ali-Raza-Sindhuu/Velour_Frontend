import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppCTA from "./WhatsAppCTA";
import SmoothScroll from "./SmoothScroll";

const MainLayout = () => {
  return (
    <div className="it-store-shell min-h-screen">
      <SmoothScroll />
      <Navbar />
      <main className="pt-16 md:pt-20">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppCTA />
    </div>
  );
};

export default MainLayout;
