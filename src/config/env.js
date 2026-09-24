import dotenv from "dotenv";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";
const configuredEnvPath = process.env.DOTENV_CONFIG_PATH;
const defaultEnvPath = isProduction && fs.existsSync(".env.production") ? ".env.production" : ".env";
dotenv.config({ path: configuredEnvPath || defaultEnvPath });


const requiredInProduction = [
  "JWT_SECRET", "DB_HOST", "DB_USER", "DB_NAME", "FRONTEND_URL", "APP_URL", "BACKEND_URL",
  "CLIENT_ID", "CLIENT_SECRET", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM",
];

if (isProduction) {
  const missing = requiredInProduction.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required production environment variable(s): ${missing.join(", ")}`);
  }
}

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    // Never allow the app to boot in production while signing tokens with a
    // publicly-known default secret — that's an authentication bypass risk.
    throw new Error(
      "JWT_SECRET environment variable is required in production. Set it before starting the server."
    );
  }
  console.warn(
    "[config] JWT_SECRET is not set — using an insecure development-only default. " +
    "Set JWT_SECRET in your .env before deploying."
  );
}

export const config = {
  port: process.env.PORT || 8000,
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "zeescents_db",
  },
  jwtSecret: process.env.JWT_SECRET || "dev_only_insecure_secret",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`,
  google: {
    clientId: process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
  },
  jazzCash: (() => {
    const mode = String(process.env.JAZZCASH_ENV || "sandbox").toLowerCase();
    const live = mode === "production";
    // JAZZCASH_ENV=demo stands in for the gateway while we wait on real
    // sandbox credentials: nothing leaves the server and any well-formed
    // wallet number is approved. It is for showing the flow, never for
    // taking money — see jazzcashDemo.js.
    const demo = mode === "demo";
    if (demo) {
      console.warn("[jazzcash] DEMO MODE — payments are simulated and always approve. Do not deploy with JAZZCASH_ENV=demo.");
    }
    const host = live ? "https://payments.jazzcash.com.pk" : "https://sandbox.jazzcash.com.pk";
    return {
      demo,
      // In demo mode only this one wallet is approved, so the simulated
      // gateway can sit on a public site without a passer-by being able to
      // fake a paid order with their own number.
      demoMobile: (process.env.JAZZCASH_DEMO_MOBILE || "03064423884").replace(/\D/g, ""),
      demoCnic: (process.env.JAZZCASH_DEMO_CNIC || "123456").replace(/\D/g, ""),
      merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
      password: process.env.JAZZCASH_PASSWORD || "",
      integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "",
      walletUrl: process.env.JAZZCASH_WALLET_URL || `${host}/ApplicationAPI/API/Payment/DoMWalletTransaction`,
      inquiryUrl: process.env.JAZZCASH_INQUIRY_URL || `${host}/ApplicationAPI/API/PaymentInquiry/Inquire`,
      refundUrl: process.env.JAZZCASH_REFUND_URL || `${host}/ApplicationAPI/API/Purchase/domwalletrefundtransaction`,
      merchantMpin: process.env.JAZZCASH_MERCHANT_MPIN || "",
    };
  })(),
  mail: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true").toLowerCase() === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "",
  },
};
