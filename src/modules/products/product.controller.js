import { ProductService } from "./product.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";
import { NewsletterService } from "../newsletter/newsletter.service.js";
import { sendNewsletterEmail } from "../../utils/email.js";
import { config } from "../../config/env.js";
import { MAX_IMAGE_BYTES } from "../../config/multer.js";
import fs from "fs";
import path from "path";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

const announceNewProduct = async (product) => {
  if (product.status !== "active") return;
  const recipients = await NewsletterService.recipientEmails();
  const productUrl = `${config.appUrl.replace(/\/$/, "")}/shop/${encodeURIComponent(product.slug)}`;
  await sendNewsletterEmail(recipients, {
    subject: `New at Almina: ${product.name}`,
    html: `<h1>New arrival: ${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.description || "A new piece is now available in the collection.")}</p>
      <p><a href="${productUrl}">Discover ${escapeHtml(product.name)}</a></p>`,
  });
};

// Builds the final ordered image-url list (cover first, max 5) from the
// multipart contract: `images` files (new uploads, in gallery order) plus
// `image_slots` — a JSON array with one entry per final image, each either
// the string "new" (consume the next uploaded file) or an existing image's
// URL to keep as-is. Falls back to the old single-image contract
// (req.files[0] / body.image_url) when the client doesn't send
// image_slots, so any older caller still works.
function resolveImageUrls(req) {
  const files = req.files?.images || [];

  if (!req.body.image_slots) {
    const single = files[0] ? `/uploads/${files[0].filename}` : req.body.image_url;
    return single ? [single] : [];
  }

  let slots;
  try {
    slots = JSON.parse(req.body.image_slots);
  } catch {
    const error = new Error("Invalid image_slots payload");
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > 5) {
    const error = new Error("A product needs between 1 and 5 images");
    error.status = 400;
    throw error;
  }

  let fileIndex = 0;
  return slots.map((slot) => {
    if (slot === "new") {
      const file = files[fileIndex++];
      if (!file) {
        const error = new Error("Missing uploaded file for an image slot");
        error.status = 400;
        throw error;
      }
      return `/uploads/${file.filename}`;
    }
    return slot; // existing URL, kept as-is
  });
}

// Product reel/demo video. A new upload in the `video` field wins; otherwise
// `video_url` in the body is the currently saved video to keep (an
// /uploads path or an external URL). Neither means the product has no video.
function resolveVideoUrl(req) {
  const file = req.files?.video?.[0];
  if (file) return `/uploads/${file.filename}`;
  const kept = String(req.body.video_url || "").trim();
  return kept || null;
}

// Every file multer wrote for this request, so a failed save leaves nothing
// orphaned on disk.
const uploadedFiles = (req) => Object.values(req.files || {}).flat();

function resolveVariants(req) {
  if (req.body.variants == null || req.body.variants === "") return undefined;
  try {
    const variants = JSON.parse(req.body.variants);
    if (!Array.isArray(variants)) throw new Error();
    return variants;
  } catch {
    throw Object.assign(new Error("Invalid product variants payload"), { status: 400 });
  }
}

const removeUploads = (files) =>
  Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));

// Only files this app uploaded as product videos are ever deleted —
// never external URLs or anything outside the uploads folder.
const removeStoredVideo = async (videoUrl) => {
  const match = /^\/uploads\/(vid_[\w.-]+)$/.exec(String(videoUrl || ""));
  if (!match) return;
  await fs.promises.unlink(path.join(process.cwd(), "uploads", match[1])).catch(() => {});
};

// Multer's size cap is sized for video; hold images to their own limit.
function assertImageSizes(req) {
  const oversized = (req.files?.images || []).find((file) => file.size > MAX_IMAGE_BYTES);
  if (oversized) {
    const error = new Error(`Each product image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`);
    error.status = 400;
    throw error;
  }
}

export class ProductController {
  static async getPublicProducts(req, res, next) {
    try {
      const { products, pagination } = await ProductService.getPublicProducts(req.query);
      return sendSuccess(res, products, null, 200, pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getAllAdminProducts(req, res, next) {
    try {
      const products = await ProductService.getAllAdminProducts();
      return sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  static async getProductBySlug(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(req.params.slug);
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      assertImageSizes(req);
      const imageUrls = resolveImageUrls(req);
      const productData = { ...req.body, imageUrls, variants: resolveVariants(req), video_url: resolveVideoUrl(req) };
      const product = await ProductService.createProduct(productData, req.user?.id);
      // Delivery is best-effort: the product is already published even if
      // SMTP is temporarily unavailable.
      void announceNewProduct(product).catch((error) =>
        console.error("New-product newsletter error:", error.message)
      );
      return sendCreated(res, product);
    } catch (error) {
      await removeUploads(uploadedFiles(req));
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      assertImageSizes(req);
      const imageUrls = resolveImageUrls(req);
      const previousVideo = await ProductService.getVideoUrl(req.params.id);
      const video_url = resolveVideoUrl(req);
      const productData = { ...req.body, imageUrls, variants: resolveVariants(req), video_url };
      const product = await ProductService.updateProduct(req.params.id, productData, req.user?.id);
      // The saved video was replaced or removed — free the old file.
      if (previousVideo && previousVideo !== video_url) await removeStoredVideo(previousVideo);
      return sendSuccess(res, product);
    } catch (error) {
      await removeUploads(uploadedFiles(req));
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const previousVideo = await ProductService.getVideoUrl(req.params.id);
      await ProductService.deleteProduct(req.params.id);
      await removeStoredVideo(previousVideo);
      return sendSuccess(res, null, "Product deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}
