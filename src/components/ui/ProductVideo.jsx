import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { paintEdgeFill } from "./edgeFill";

// Inline product reel: plays automatically, muted and looping, with no
// player controls — it reads as a moving product photo.
//
// Framing matches FramedImage: if the video's shape is close to the frame's
// it fills it; otherwise (usually a portrait reel in a square or landscape
// frame) the whole video is shown and the gap is filled by extending the
// colours of the video's own edges, taken from its first frame (edgeFill.js).
// It's drawn once to a tiny canvas — no second video decode — and a canvas
// displays fine even when the video is served from another origin.
//
// It only plays while on screen, and for visitors who prefer reduced motion
// it waits on its first frame with a small play button instead.

const cropFraction = (a, b) => 1 - Math.min(a, b) / Math.max(a, b);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ProductVideo({ src, label = "", className = "", tolerance = 0.005 }) {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const backdropRef = useRef(null);
  const [videoRatio, setVideoRatio] = useState(null);
  const [frameRatio, setFrameRatio] = useState(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(!reducedMotion);

  // Track the frame's shape.
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

  // Play only while visible (and while the visitor hasn't paused it).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && playing) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [playing, src]);

  const loaded = videoRatio !== null;
  const fits = loaded && frameRatio !== null && cropFraction(videoRatio, frameRatio) <= tolerance;
  const framed = loaded && frameRatio !== null && !fits;

  // Extend the video's edges into the gap (painted from its first frame).
  useEffect(() => {
    if (!framed || !ready) return;
    const video = videoRef.current;
    paintEdgeFill(backdropRef.current, video, video?.videoWidth, video?.videoHeight, frameRatio);
  }, [framed, ready, frameRatio]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div ref={frameRef} className={`relative overflow-hidden bg-[#ededed] ${className}`}>
      <canvas
        ref={backdropRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-[1.06] blur-[10px] transition-opacity duration-500 ${
          framed && ready ? "opacity-100" : "opacity-0"
        }`}
      />

      {!failed && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          muted
          loop
          playsInline
          autoPlay={!reducedMotion}
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noplaybackrate nofullscreen"
          aria-label={label ? `${label} video` : "Product video"}
          onLoadedMetadata={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget;
            if (videoWidth && videoHeight) setVideoRatio(videoWidth / videoHeight);
          }}
          onLoadedData={() => {
            setReady(true);
          }}
          onError={() => setFailed(true)}
          onContextMenu={(event) => event.preventDefault()}
          className={`relative h-full w-full transition-opacity duration-500 ${framed ? "object-contain" : "object-cover"} ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Only offered to visitors who turned motion off — everyone else just sees it play. */}
      {reducedMotion && ready && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause video" : "Play video"}
          className="absolute bottom-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black shadow-sm transition hover:bg-white"
        >
          {playing ? <Pause size={15} /> : <Play size={15} className="translate-x-px" />}
        </button>
      )}
    </div>
  );
}
