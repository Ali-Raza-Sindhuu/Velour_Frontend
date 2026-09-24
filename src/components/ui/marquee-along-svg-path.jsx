import { Children, useCallback, useEffect, useId, useMemo, useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

// Adapted from 21st.dev "marquee-along-svg-path". Ported to this codebase:
// plain JSX (no TypeScript / `cn`), `framer-motion` (the same library the
// original imports as `motion/react`), and a few correctness fixes:
//  • per-item hooks live in <PathItem> — the original called hooks inside
//    `.map()`, which breaks the Rules of Hooks;
//  • a drag only starts after the pointer moves a few pixels, so links and
//    buttons inside items can still be clicked or tapped;
//  • it pauses while off-screen and stays still for reduced-motion users
//    (dragging still works);
//  • scroll velocity reads the page scroll (which Lenis drives) by default.

const DRAG_THRESHOLD = 5;

const wrap = (min, max, value) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

const PathItem = ({
  child,
  path,
  baseOffset,
  position,
  easing,
  hidden,
  enableRollingZIndex,
  zIndexBase,
  zIndexRange,
  cssVariableInterpolation,
  grab,
  offsetRotate,
  onHoverChange,
}) => {
  const distance = useTransform(baseOffset, (value) => {
    const wrapped = wrap(0, 100, value + position);
    return easing ? easing(wrapped / 100) * 100 : wrapped;
  });
  const offsetDistance = useTransform(distance, (value) => `${value}%`);
  const zIndex = useTransform(distance, (value) =>
    enableRollingZIndex ? Math.floor(zIndexBase + (value / 100) * zIndexRange) : undefined
  );

  // Fixed-length list per mount, so these hooks run in a stable order.
  const cssVariables = {};
  for (const { property, from, to } of cssVariableInterpolation) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cssVariables[property] = useTransform(distance, [0, 100], [from, to]);
  }

  return (
    <motion.div
      className={`absolute left-0 top-0 ${grab ? "cursor-grab" : ""}`}
      style={{
        offsetPath: `path('${path}')`,
        offsetDistance,
        offsetRotate,
        zIndex: enableRollingZIndex ? zIndex : undefined,
        willChange: "offset-distance",
        backfaceVisibility: "hidden",
        ...cssVariables,
      }}
      aria-hidden={hidden || undefined}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {child}
    </motion.div>
  );
};

const MarqueeAlongSvgPath = ({
  children,
  className = "",

  path,
  pathId,
  preserveAspectRatio = "xMidYMid meet",
  showPath = false,
  pathClassName = "",

  width = "100%",
  height = "100%",
  viewBox = "0 0 100 100",

  baseVelocity = 5,
  direction = "normal",
  easing,
  slowdownOnHover = false,
  slowDownFactor = 0.3,
  slowDownSpringConfig = { damping: 50, stiffness: 400 },

  useScrollVelocity = false,
  scrollAwareDirection = false,
  scrollSpringConfig = { damping: 50, stiffness: 400 },
  scrollContainer,

  repeat = 3,

  draggable = false,
  dragSensitivity = 0.2,
  dragVelocityDecay = 0.96,
  dragAwareDirection = false,
  grabCursor = false,

  enableRollingZIndex = true,
  zIndexBase = 1,
  zIndexRange = 10,

  cssVariableInterpolation = [],

  // "auto" turns items to follow the path; "0deg" keeps them upright.
  offsetRotate = "auto",

  responsive = false,
}) => {
  const container = useRef(null);
  const marqueeContainerRef = useRef(null);
  const baseOffset = useMotionValue(0);
  const generatedId = useId();
  const id = pathId || `marquee-path-${generatedId.replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion();
  const inView = useInView(container, { margin: "200px 0px" });

  // Scale the fixed-size marquee into its wrapper (direct DOM writes, no re-renders).
  useEffect(() => {
    if (!responsive) return undefined;
    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);
    const originalWidth = vbWidth || 100;
    const originalHeight = vbHeight || 100;

    const updateScale = () => {
      const wrapper = container.current;
      const marquee = marqueeContainerRef.current;
      if (!wrapper || !marquee) return;
      const scale = Math.min(wrapper.clientWidth / originalWidth, wrapper.clientHeight / originalHeight);
      const offsetX = (wrapper.clientWidth - originalWidth * scale) / 2;
      const offsetY = (wrapper.clientHeight - originalHeight * scale) / 2;
      marquee.style.width = `${originalWidth}px`;
      marquee.style.height = `${originalHeight}px`;
      marquee.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      marquee.style.transformOrigin = "top left";
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [responsive, viewBox]);

  const items = useMemo(() => {
    const childrenArray = Children.toArray(children);
    const total = childrenArray.length * repeat;
    return childrenArray.flatMap((child, childIndex) =>
      Array.from({ length: repeat }, (_, repeatIndex) => {
        const itemIndex = repeatIndex * childrenArray.length + childIndex;
        return {
          child,
          repeatIndex,
          key: `${childIndex}-${repeatIndex}`,
          position: (itemIndex * 100) / total,
        };
      })
    );
  }, [children, repeat]);

  const { scrollY } = useScroll(scrollContainer ? { container: scrollContainer } : undefined);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, scrollSpringConfig);
  const defaultVelocity = useMotionValue(0);
  const velocityFactor = useTransform(
    useScrollVelocity ? smoothVelocity : defaultVelocity,
    [0, 1000],
    [0, 5],
    { clamp: false }
  );

  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const dragVelocity = useRef(0);
  const directionFactor = useRef(direction === "normal" ? 1 : -1);
  const hoverFactorValue = useMotionValue(1);
  const smoothHoverFactor = useSpring(hoverFactorValue, slowDownSpringConfig);

  useAnimationFrame((_, delta) => {
    if (!inView) return;

    if (isDragging.current && draggable) {
      baseOffset.set(baseOffset.get() + dragVelocity.current);
      dragVelocity.current *= 0.9;
      if (Math.abs(dragVelocity.current) < 0.01) dragVelocity.current = 0;
      return;
    }

    hoverFactorValue.set(isHovered.current && slowdownOnHover ? slowDownFactor : 1);

    const velocity = reduceMotion ? 0 : baseVelocity;
    let moveBy = directionFactor.current * velocity * (delta / 1000) * smoothHoverFactor.get();

    if (scrollAwareDirection && !isDragging.current) {
      if (velocityFactor.get() < 0) directionFactor.current = -1;
      else if (velocityFactor.get() > 0) directionFactor.current = 1;
    }
    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    if (draggable) {
      moveBy += dragVelocity.current;
      if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
        directionFactor.current = Math.sign(dragVelocity.current);
      }
      if (Math.abs(dragVelocity.current) > 0.01) dragVelocity.current *= dragVelocityDecay;
      else dragVelocity.current = 0;
    }

    baseOffset.set(baseOffset.get() + moveBy);
  });

  // Dragging — only claims the pointer after it has actually moved, so a
  // plain click/tap on an item still reaches its link.
  const pointer = useRef({ id: null, startX: 0, startY: 0, x: 0, y: 0, moved: false });

  const handlePointerDown = (event) => {
    if (!draggable || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false };
  };

  const handlePointerMove = (event) => {
    const state = pointer.current;
    if (!draggable || state.id !== event.pointerId) return;

    if (!isDragging.current) {
      const travelled = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
      if (travelled < DRAG_THRESHOLD) return;
      isDragging.current = true;
      state.moved = true;
      dragVelocity.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
      if (grabCursor) event.currentTarget.style.cursor = "grabbing";
    }

    const deltaX = event.clientX - state.x;
    const deltaY = event.clientY - state.y;
    const magnitude = Math.hypot(deltaX, deltaY);
    dragVelocity.current = (deltaX > 0 ? magnitude : -magnitude) * dragSensitivity;
    state.x = event.clientX;
    state.y = event.clientY;
  };

  const handlePointerUp = (event) => {
    if (!draggable || pointer.current.id !== event.pointerId) return;
    pointer.current.id = null;
    if (!isDragging.current) return;
    isDragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (grabCursor) event.currentTarget.style.cursor = "";
  };

  // Swallow the click that ends a drag so it doesn't open an item.
  const handleClickCapture = (event) => {
    if (pointer.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      pointer.current.moved = false;
    }
  };

  const handleHoverChange = useCallback((hovered) => {
    isHovered.current = hovered;
  }, []);

  return (
    <div
      ref={container}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
      className={`relative ${draggable ? "touch-pan-y select-none" : ""} ${className}`}
    >
      <div ref={marqueeContainerRef} className="relative" style={{ contain: "layout style" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          viewBox={viewBox}
          preserveAspectRatio={preserveAspectRatio}
          className="h-full w-full"
          aria-hidden="true"
        >
          <path
            id={id}
            d={path}
            stroke={showPath ? "currentColor" : "none"}
            fill="none"
            className={pathClassName}
          />
        </svg>

        {items.map(({ child, repeatIndex, key, position }) => (
          <PathItem
            key={key}
            child={child}
            path={path}
            baseOffset={baseOffset}
            position={position}
            easing={easing}
            hidden={repeatIndex > 0}
            enableRollingZIndex={enableRollingZIndex}
            zIndexBase={zIndexBase}
            zIndexRange={zIndexRange}
            cssVariableInterpolation={cssVariableInterpolation}
            grab={draggable && grabCursor}
            offsetRotate={offsetRotate}
            onHoverChange={handleHoverChange}
          />
        ))}
      </div>
    </div>
  );
};

export default MarqueeAlongSvgPath;
