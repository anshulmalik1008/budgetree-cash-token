// Example backend for the Budgetree cash token page.
// It serves index.html and exposes the 5 endpoints the page calls when CONFIG.TEST_MODE is false.
// Every TODO is where you connect your real SMS / OTP provider and payout provider.
//
// Run:  cd server-example && npm install && npm start   ->  http://localhost:3000

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

const otps = new Map(); // phone -> { code, expires, tries }  (use Redis or a DB in production)

// 1. Send OTP
app.post("/api/otp/send", async (req, res) => {
  const { phone, token } = req.body;
  if (!/^[6-9]\d{9}$/.test(phone || "")) return res.status(400).json({ message: "Enter a valid 10-digit mobile number." });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(phone, { code, expires: Date.now() + 5 * 60 * 1000, tries: 0 });
  // TODO: send `code` by SMS with your provider (MSG91, Twilio, Gupshup...).
  // For the browser's SMS auto-read, end the SMS with:  @your-domain.in #<code>
  console.log(`OTP for ${phone} (token ${token}): ${code}`);
  res.json({ ok: true });
});

// 2. Verify OTP
app.post("/api/otp/verify", (req, res) => {
  const { phone, code } = req.body;
  const rec = otps.get(phone);
  if (!rec || rec.expires < Date.now()) return res.status(400).json({ message: "This code has expired. Tap Resend OTP." });
  rec.tries++;
  if (rec.tries > 3) return res.status(429).json({ message: "Too many wrong attempts. Tap Resend OTP." });
  const verified = rec.code === code;
  if (verified) otps.delete(phone);
  res.json({ verified });
});

// 3. UPI name lookup
app.post("/api/payee/upi", async (req, res) => {
  const { vpa } = req.body;
  // TODO: call your payout provider's VPA validation API (Razorpay, Cashfree, Decentro...).
  res.json({ valid: true, name: "ACCOUNT HOLDER NAME" });
});

// 4. Bank account name lookup (penny-less verification)
app.post("/api/payee/bank", async (req, res) => {
  const { account, ifsc } = req.body;
  // TODO: call your provider's bank account verification API.
  res.json({ valid: true, name: "ACCOUNT HOLDER NAME", bank: "Bank name from IFSC" });
});

// 5. Payout
app.post("/api/payout", async (req, res) => {
  const { token, amount, method, upi, account, ifsc, email, location } = req.body;
  // TODO: check the token is unused and the amount matches, then create the payout with your provider.
  // Wait for the final status (or poll your provider) before responding.
  res.json({ status: "success", ref: "BTX" + Math.floor(1e6 + Math.random() * 9e6) });
  // On failure: res.json({ status: "failed", ref: "...", reason: "Human readable reason" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cash token page running on http://localhost:${PORT}`));
