import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToImmediate } from "../utils/smoothScroll";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Goes through Lenis when it's running, so a glide still in progress
    // from the previous page can't carry on after the jump.
    scrollToImmediate(0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
