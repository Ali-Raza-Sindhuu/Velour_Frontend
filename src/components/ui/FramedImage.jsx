import { useCallback, useEffect, useRef, useState } from "react";
import { paintEdgeFill } from "./edgeFill";

// Shows a store-owner-uploaded image inside a fixed frame WITHOUT EVER
// CUTTING IT, whatever its size or orientation.
//
// Once the image loads we compare its shape to the frame's:
//  • same shape (within `tolerance`, a fraction of a percent by default) →
//    it fills the frame edge to edge.
//  • different shape → the whole image is shown, and the leftover space is
//    filled by extending the colours of the image's own outer edge (see
//    edgeFill.js). On studio shots with a plain background this is
//    seamless — the background just continues to the frame's edge.
//
// The wrapper takes the caller's sizing/positioning via `className` (e.g.
// "absolute inset-0" or "h-20 w-20 rounded-xl"). A broken or missing image
// renders an empty frame instead of the browser's broken-image icon.

const cropFraction = (imageRatio, frameRatio) =>
  1 - Math.min(imageRatio, frameRatio) / Math.max(imageRatio, frameRatio);

// A mask that fades the contained picture's own edges (only on the sides
// that border a gap) over ~3% of its size. Percentages are of the frame.
const FEATHER = 0.03;
function edgeFeatherMask(imageRatio, frameRatio) {
  const pillarbox = imageRatio < frameRatio;
  const span = pillarbox ? imageRatio / frameRatio : frameRatio / imageRatio; // picture size / frame size
  const start = ((1 - span) / 2) * 100;
  const end = 100 - start;
  const fade = span * FEATHER * 100;
  const direction = pillarbox ? "to right" : "to bottom";
  return `linear-gradient(${direction}, transparent ${start}%, #000 ${start + fade}%, #000 ${end - fade}%, transparent ${end}%)`;
}

export default function FramedImage({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  style,
  position,
  tolerance = 0.005,
  loading = "lazy",
  fetchPriority,
  onLoad,
  onError,
  draggable,
}) {
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const fillRef = useRef(null);
  const [imageRatio, setImageRatio] = useState(null);
  const [frameRatio, setFrameRatio] = useState(null);
  const [failed, setFailed] = useState(false);

  // Reset when the image changes.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setImageRatio(null);
    setFailed(false);
  }

  // Track the frame's shape — it changes with the viewport.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const measure = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (width && height) setFrameRatio(width / height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback((event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth && naturalHeight) setImageRatio(naturalWidth / naturalHeight);
    onLoad?.(event);
  }, [onLoad]);

  // An image already in the browser cache can finish loading before React
  // attaches onLoad; pick its size up directly in that case.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth && imageRatio === null) {
      setImageRatio(img.naturalWidth / img.naturalHeight);
      onLoad?.({ currentTarget: img });
    }
  }, [src, imageRatio, onLoad]);

  const loaded = imageRatio !== null;
  const fits = loaded && frameRatio !== null && cropFraction(imageRatio, frameRatio) <= tolerance;
  const framed = loaded && frameRatio !== null && !fits;

  // Feather the photo's edges on the gap sides only, so it melts into the
  // extended fill instead of ending on a visible seam.
  const featherMask = framed ? edgeFeatherMask(imageRatio, frameRatio) : undefined;

  // Extend the image's edges into the gap whenever the shapes differ.
  useEffect(() => {
    if (!framed) return;
    const img = imgRef.current;
    paintEdgeFill(fillRef.current, img, img?.naturalWidth, img?.naturalHeight, frameRatio);
  }, [framed, frameRatio, imageRatio, src]);

  return (
    <div
      ref={frameRef}
      className={`${/\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`}
      style={style}
    >
      {src && !failed && (
        <>
          {framed && (
            <canvas
              ref={fillRef}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-[1.06] blur-[10px]"
            />
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding="async"
            draggable={draggable}
            onLoad={handleLoad}
            onError={() => {
              setFailed(true);
              onError?.();
            }}
            className={`relative h-full w-full transition-opacity duration-500 ease-out ${
              framed ? "object-contain" : "object-cover"
            } ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
            style={{
              ...(position ? { objectPosition: position } : null),
              ...(featherMask ? { maskImage: featherMask, WebkitMaskImage: featherMask } : null),
            }}
          />
        </>
      )}
    </div>
  );
}
