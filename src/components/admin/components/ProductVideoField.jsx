import { useEffect, useRef, useState } from "react";
import { Film, RefreshCw, Trash2, UploadCloud, AlertTriangle } from "lucide-react";
import { resolveImg } from "../../../utils/resolveImg";

// Reel / demo video for a product. Shown second in the storefront gallery
// (after the cover image) and in the quick view, playing muted on a loop.
//
// value: null | { file?: File, url?: string, preview: string }
//   file → a new upload; url → the video already saved on the product.

export const MAX_VIDEO_MB = 200;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const LONG_REEL_SECONDS = 90;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDuration = (seconds) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const ProductVideoField = ({ value, onChange, onPlayableChange, onError, uploadProgress }) => {
  const inputRef = useRef(null);
  const [meta, setMeta] = useState(null); // { width, height, duration }
  const [unplayable, setUnplayable] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Free the object URL made for a local preview once it's replaced.
  useEffect(() => {
    const preview = value?.file ? value.preview : null;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [value]);

  const pick = (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      onError("Choose an MP4, MOV or WEBM video.");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      onError(`That video is ${formatSize(file.size)} — the limit is ${MAX_VIDEO_MB} MB. Try exporting it at 1080p.`);
      return;
    }
    setMeta(null);
    setUnplayable(false);
    onPlayableChange(true);
    onChange({ file, preview: URL.createObjectURL(file) });
  };

  const clear = () => {
    setMeta(null);
    setUnplayable(false);
    onPlayableChange(true);
    onChange(null);
  };

  const orientation = meta
    ? meta.height > meta.width * 1.05 ? "Portrait" : meta.width > meta.height * 1.05 ? "Landscape" : "Square"
    : null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zs-charcoal">
        Product reel <span className="font-normal text-zs-charcoal/40">(optional)</span>
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {value ? (
          <div className="relative aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-xl border border-zs-beigeLine bg-black">
            <video
              key={value.preview}
              src={value.file ? value.preview : resolveImg(value.url)}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
              onLoadedMetadata={(event) => {
                const { videoWidth, videoHeight, duration } = event.currentTarget;
                setMeta({ width: videoWidth, height: videoHeight, duration });
                // Audio-only or undecodable video tracks report 0×0.
                if (!videoWidth || !videoHeight) {
                  setUnplayable(true);
                  onPlayableChange(false);
                }
              }}
              onError={() => {
                setUnplayable(true);
                onPlayableChange(false);
              }}
            />
            {typeof uploadProgress === "number" && value.file && (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5">
                <div className="h-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-zs-gold transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="mt-1 text-center text-[10px] font-medium text-white">Uploading {uploadProgress}%</p>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
            className={`flex aspect-[9/16] w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-2 text-center transition-colors ${
              dragOver ? "border-zs-gold bg-zs-gold/10 text-zs-gold" : "border-zs-beigeLine bg-zs-beige/30 text-zs-charcoal/45 hover:border-zs-gold hover:text-zs-gold"
            }`}
          >
            <UploadCloud size={20} />
            <span className="text-[11px] font-medium">Add a reel</span>
            <span className="text-[10px] leading-tight opacity-70">or drop a video here</span>
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs text-zs-charcoal/55">
          {value && meta && !unplayable && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-zs-charcoal/75">
              <Film size={13} className="text-zs-gold" />
              <span>{formatDuration(meta.duration)}</span>
              <span aria-hidden="true">·</span>
              <span>{meta.width}×{meta.height}</span>
              <span aria-hidden="true">·</span>
              <span>{orientation}</span>
              {value.file && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatSize(value.file.size)}</span>
                </>
              )}
            </p>
          )}

          {unplayable ? (
            <p className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                This video can't be played in this browser, so many shoppers wouldn't see it either. iPhone videos
                recorded in "High Efficiency" often do this — export it as MP4 (H.264), or set iPhone Settings → Camera →
                Formats → <strong>Most Compatible</strong> and record again.
              </span>
            </p>
          ) : (
            <>
              <p>
                Shown second in the product gallery and in the quick view, playing silently on a loop. Portrait (9:16)
                reels look best.
              </p>
              <p className="text-zs-charcoal/40">MP4, MOV or WEBM · up to {MAX_VIDEO_MB} MB · 1080p recommended</p>
              {meta && orientation === "Landscape" && (
                <p className="text-amber-700">Landscape works, but a portrait reel fills the gallery better.</p>
              )}
              {meta && meta.duration > LONG_REEL_SECONDS && (
                <p className="text-amber-700">Shorter reels (15–60 seconds) load faster for shoppers.</p>
              )}
            </>
          )}

          {value && (
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zs-beigeLine px-3 py-1.5 font-medium text-zs-charcoal/70 transition-colors hover:border-zs-gold hover:text-zs-gold"
              >
                <RefreshCw size={13} /> Replace
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zs-beigeLine px-3 py-1.5 font-medium text-zs-charcoal/70 transition-colors hover:border-red-300 hover:text-zs-danger"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
};
