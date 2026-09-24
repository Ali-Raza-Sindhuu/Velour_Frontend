import { sendError } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
  // Expected refusals (bad input, not found, not allowed) get one line;
  // only real failures get the full stack.
  const expected = err.status >= 400 && err.status < 500;
  if (expected) console.warn(`${req.method} ${req.originalUrl} → ${err.status}: ${err.message}`);
  else console.error("Error:", err);

  // Handle specific database errors (like duplicates)
  if (err.code === "ER_DUP_ENTRY") {
    return sendError(res, "A record with that information already exists.", 400);
  }

  // Upload limits (multer) — tell the admin exactly what to change.
  if (err.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "That file is too large. Product videos can be up to 200MB and images up to 50MB.",
      LIMIT_FILE_COUNT: "Too many files. A product can have up to 5 images and 1 video.",
      LIMIT_UNEXPECTED_FILE: "Too many files. A product can have up to 5 images and 1 video.",
    };
    return sendError(res, messages[err.code] || err.message, 400);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token.", 401);
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, "Token expired.", 401);
  }

  // Default error
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";
  
  return sendError(res, message, statusCode);
};

// Also catch 404s
export const notFoundHandler = (req, res, next) => {
  return sendError(res, "API route not found", 404);
};
