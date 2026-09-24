import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// SECURITY: the saved file's extension must come from this fixed map, never
// from file.originalname or the client-declared mimetype directly. Both are
// attacker-controlled — a request can claim any Content-Type and any
// filename it likes. express.static() serves files by extension, so
// trusting either one lets an attacker upload e.g. "x.html" (or "x.svg",
// which can carry an inline <script>) declared as image/png, and get it
// served back as real HTML/SVG from your own origin — stored XSS. Mapping
// through this allowlist means the extension on disk can only ever be one
// of the safe values below, regardless of what the request claims.
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};
// Deliberately excludes image/svg+xml: SVG is XML and can embed <script> or
// event-handler attributes that execute when the file is opened directly —
// a real risk for product photos / CMS media where no one actually needs
// vector uploads. If SVG support is ever needed, it must be sanitized
// server-side (strip <script>, on*, foreignObject) before being accepted,
// not just allowed through here.

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSIONS[file.mimetype];
    const hash = crypto.randomBytes(8).toString("hex");
    const prefix = file.mimetype.startsWith("video/") ? "vid" : "img";
    cb(null, `${prefix}_${Date.now()}_${hash}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only the exact mimetypes we have a safe extension mapping for
  // (see MIME_EXTENSIONS above) — not a broad "starts with image/" check,
  // which would also let image/svg+xml through.
  if (MIME_EXTENSIONS[file.mimetype]) {
    cb(null, true);
  } else {
    const error = new Error("Only JPG, PNG, WEBP, GIF images (or MP4/WEBM/MOV video) are allowed!");
    error.status = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  // Images are typically small; video needs more headroom. Multer applies
  // this as a single ceiling, so it's sized for video and is still a
  // perfectly reasonable cap for images.
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter
});

// ─── Product media: gallery images + one reel/demo video ────────────────────
// Phone-shot reels in good quality (1080p, 30–60s) commonly land between
// 40MB and 150MB, so the ceiling here is sized for that. Multer only supports
// one fileSize limit per instance, so images get their own (lower) cap
// enforced in the product controller after upload — see MAX_IMAGE_BYTES.
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50MB

// Each field only accepts its own kind of file: images in `images`, video in
// `video`. Stops a video being slipped in as a gallery "image" and vice versa.
const productMediaFilter = (req, file, cb) => {
  const allowed = MIME_EXTENSIONS[file.mimetype];
  const isVideo = file.mimetype.startsWith("video/");
  if (allowed && file.fieldname === "video" && isVideo) return cb(null, true);
  if (allowed && file.fieldname === "images" && !isVideo) return cb(null, true);

  const error = new Error(
    file.fieldname === "video"
      ? "The product video must be an MP4, WEBM or MOV file."
      : "Product images must be JPG, PNG, WEBP or GIF files."
  );
  error.status = 400;
  cb(error, false);
};

export const productMediaUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 6 },
  fileFilter: productMediaFilter,
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);
// ─── Return photos: up to 4 images showing damage / the wrong item ─────────
export const returnPhotosUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => {
    if (MIME_EXTENSIONS[file.mimetype] && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(Object.assign(new Error("Photos must be JPG, PNG, WEBP or GIF images."), { status: 400 }), false);
  },
}).array("photos", 4);

// ─── Courier receipts: one image or PDF per shipment ───────────────────────
// Same rule as above: the extension on disk comes from this fixed map, never
// from the client's filename. PDFs are allowed here (and only here).
const RECEIPT_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB

// The declared Content-Type is client-controlled, so the file's first bytes
// must also match what it claims to be.
const RECEIPT_SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(8).toString("hex");
    cb(null, `receipt_${Date.now()}_${hash}${RECEIPT_EXTENSIONS[file.mimetype]}`);
  },
});

const receiptMulter = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "receipt" && RECEIPT_EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(Object.assign(new Error("The courier receipt must be a JPG, PNG, WEBP image or a PDF."), { status: 400 }), false);
  },
}).single("receipt");

const deleteQuietly = (filePath) => fs.promises.unlink(filePath).catch(() => {});

// Express middleware: parses the multipart body (fields land in req.body, the
// file in req.file) and rejects files whose contents don't match their type.
// Plain JSON requests pass straight through with no req.file.
export const receiptUpload = (req, res, next) => {
  receiptMulter(req, res, async (err) => {
    if (err) {
      const messages = {
        LIMIT_FILE_SIZE: "The receipt can be up to 10MB.",
        LIMIT_FILE_COUNT: "Attach one receipt file.",
        LIMIT_UNEXPECTED_FILE: "Attach the receipt in the \"receipt\" field, one file only.",
      };
      return res.status(err.status || 400).json({ success: false, message: messages[err.code] || err.message });
    }
    if (!req.file) return next();
    try {
      const handle = await fs.promises.open(req.file.path, "r");
      const head = Buffer.alloc(12);
      try { await handle.read(head, 0, 12, 0); } finally { await handle.close(); }
      if (!RECEIPT_SIGNATURES[req.file.mimetype]?.(head)) {
        await deleteQuietly(req.file.path);
        return res.status(400).json({ success: false, message: "That file doesn't look like a valid JPG, PNG, WEBP or PDF." });
      }
      next();
    } catch (error) {
      await deleteQuietly(req.file.path);
      next(error);
    }
  });
};