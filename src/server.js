import app from "./app.js";
import { config } from "./config/env.js";
import pool from "./database/connection.js";
import { ReturnsService } from "./modules/returns/returns.service.js";
import { OrderService } from "./modules/orders/order.service.js";

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected successfully.");
    
    const server = app.listen(config.port, "0.0.0.0", () => {
      console.log(`Server running on port ${config.port}`);
    });
    // Node aborts a request after 5 minutes by default — too short for an
    // admin uploading a 100MB+ product video on a slow connection.
    server.requestTimeout = 20 * 60 * 1000;

    // Return reminders and expiry.
    const housekeeping = () => ReturnsService.runHousekeeping().catch((e) => console.error("[returns] housekeeping failed:", e.message));
    setTimeout(housekeeping, 30 * 1000);
    setInterval(housekeeping, 60 * 60 * 1000).unref();

    // Unpaid online orders give their reserved stock back after the hold time.
    const releaseUnpaid = () => OrderService.autoCancelUnpaid().catch((e) => console.error("[orders] auto-cancel failed:", e.message));
    setTimeout(releaseUnpaid, 45 * 1000);
    setInterval(releaseUnpaid, 5 * 60 * 1000).unref();
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
