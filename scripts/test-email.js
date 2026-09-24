import "dotenv/config";
import { verifyEmailConfiguration } from "../src/utils/email.js";
import nodemailer from "nodemailer";
import { config } from "../src/config/env.js";

const recipient = process.env.TEST_EMAIL;
if (!recipient) throw new Error("Set TEST_EMAIL to an inbox you control before sending a real test email.");

await verifyEmailConfiguration();
const result = await nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  auth: { user: config.mail.user, pass: config.mail.pass },
}).sendMail({
  from: config.mail.from,
  to: recipient,
  subject: "ZeeScents email delivery test",
  text: "This is a real ZeeScents SMTP configuration test. If you received it, outbound email is working.",
});
console.log(`Email accepted by SMTP server: ${result.messageId}`);
