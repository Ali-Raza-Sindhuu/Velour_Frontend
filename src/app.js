import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

// Route imports — every module now follows routes -> controller -> service
import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import customerRoutes from "./modules/users/customer.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import fulfillmentRoutes from "./modules/fulfillment/fulfillment.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import promoRoutes from "./modules/promotions/promotion.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import cmsRoutes from "./modules/cms/cms.routes.js";
import contactRoutes from "./modules/contact/contact.routes.js";
import newsletterRoutes from "./modules/newsletter/newsletter.routes.js";
import returnRoutes from "./modules/returns/returns.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import financeRoutes from "./modules/finance/finance.routes.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use("/api/uploads", express.static("uploads"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api/", limiter);

// Health check
app.get("/api/health", (req, res) => res.json({ success: true, message: "ZeeScents API is running" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/fulfillment", fulfillmentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promotions", promoRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/finance", financeRoutes);

// Catch-all 404 for unknown API routes
app.use("/api", notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;