import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "../../utils/smoothScroll";

// Light-touch smooth scrolling for the storefront (mounted in MainLayout, so
// the admin dashboard keeps native scrolling).
//
// Tuned to be felt, not noticed: a high lerp keeps the wheel responsive with
// only a short glide, touch devices keep their native momentum, and Lenis
// switches itself off for visitors who prefer reduced motion.
const SmoothScroll = () => {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.14,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      // Scrollable panels inside the cart drawer, quick view, search and
      // mobile menu scroll on their own instead of moving the page.
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      anchors: { offset: -96 },
    });
    setLenis(lenis);

    // Modals lock the page by setting body `overflow: hidden`. Mirror that
    // onto Lenis so the page behind a modal can't glide while it's open.
    const syncLock = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    syncLock();

    return () => {
      observer.disconnect();
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
};

export default SmoothScroll;
