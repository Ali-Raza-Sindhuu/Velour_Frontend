// "Edge extension" fill for media shown whole inside a frame of a different
// shape. Instead of a blurred copy of the picture (which reads as a muddy
// shadow), the image's own outer strip is stretched outward to fill the gap,
// so a studio shot on a plain background simply continues to the frame's
// edge and the gap disappears.
//
// Painted into a small canvas that CSS scales up (the scaling smooths it).
// Only drawImage is used — never pixel reads — so it works for images and
// videos served from any origin without CORS headers.

const CANVAS_WIDTH = 32; // low on purpose: wider averaging = smooth gradients, no streaks
const EDGE_FRACTION = 0.04; // outer 4% of the image is averaged and extended

// source: a loaded <img> or <video>; mediaW/H: its intrinsic size;
// frameRatio: frame width / height.
export function paintEdgeFill(canvas, source, mediaW, mediaH, frameRatio) {
  if (!canvas || !source || !mediaW || !mediaH || !frameRatio) return;

  const W = CANVAS_WIDTH;
  const H = Math.max(1, Math.round(W / frameRatio));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, W, H);

  const mediaRatio = mediaW / mediaH;
  const pillarbox = mediaRatio < frameRatio; // gaps left & right
  const iw = pillarbox ? H * mediaRatio : W;
  const ih = pillarbox ? H : W / mediaRatio;
  const ix = (W - iw) / 2;
  const iy = (H - ih) / 2;

  try {
    // The picture itself sits in the middle so the fill flows into it.
    ctx.drawImage(source, ix, iy, iw, ih);

    if (pillarbox) {
      const edge = Math.max(1, Math.round(mediaW * EDGE_FRACTION));
      ctx.drawImage(source, 0, 0, edge, mediaH, 0, 0, ix + 0.5, H);
      ctx.drawImage(source, mediaW - edge, 0, edge, mediaH, ix + iw - 0.5, 0, W - (ix + iw) + 0.5, H);
    } else {
      const edge = Math.max(1, Math.round(mediaH * EDGE_FRACTION));
      ctx.drawImage(source, 0, 0, mediaW, edge, 0, 0, W, iy + 0.5);
      ctx.drawImage(source, 0, mediaH - edge, mediaW, edge, 0, iy + ih - 0.5, W, H - (iy + ih) + 0.5);
    }
  } catch {
    // Source not drawable yet — the frame's plain background shows instead.
  }
}
