// Shared handle to the storefront's Lenis instance (see
// components/layout/SmoothScroll.jsx). Null on pages without smooth
// scrolling (admin) or when the visitor prefers reduced motion.
let instance = null;

export const setLenis = (lenis) => {
  instance = lenis;
};

// Jump to a position without a glide — e.g. resetting to the top on a route
// change. Falls back to native scrolling when Lenis isn't running.
export const scrollToImmediate = (top = 0) => {
  if (instance) instance.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, left: 0, behavior: "instant" });
};
