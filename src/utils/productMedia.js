import { resolveImg } from "./resolveImg";

// A product's gallery in display order: the cover image first, then the
// reel/demo video (when one has been uploaded), then the remaining images.
// Used by the quick view and the product page so both show the same order.
//
// Only direct video files can play inline without controls, so a legacy
// link to a video *page* (YouTube etc.) is left out rather than breaking
// the gallery.
const PLAYABLE_VIDEO = /^\/uploads\/vid_|\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export const isPlayableVideo = (url) => PLAYABLE_VIDEO.test(String(url || ""));

export const getProductMedia = (product) => {
  if (!product) return [];
  const images = (product.images?.length ? product.images : [product.image_url])
    .map(resolveImg)
    .filter(Boolean)
    .map((src) => ({ type: "image", src }));

  if (!isPlayableVideo(product.video_url)) return images;

  const video = { type: "video", src: resolveImg(product.video_url), poster: images[0]?.src };
  return [...images.slice(0, 1), video, ...images.slice(1)];
};
