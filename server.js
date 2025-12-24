import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();

// ---------------------------
// Middleware (REQUIRED)
// ---------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 🔴 REQUIRED for WebXPay POST
app.use(cors());

// ---------------------------
// ENV VARIABLES (Render)
// ---------------------------
const { MERCHANT_ID, SECRET_KEY } = process.env;

if (!MERCHANT_ID || !SECRET_KEY) {
  console.error("❌ Missing MERCHANT_ID or SECRET_KEY");
  process.exit(1);
}

// ---------------------------
// WebXPay LIVE Public Key
// ---------------------------
const WEBXPAY_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

// ---------------------------
// Encrypt helper
// ---------------------------
function encryptPayment(plain) {
  return crypto.publicEncrypt(
    {
      key: WEBXPAY_PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plain)
  ).toString("base64");
}

// ---------------------------
// Health check
// ---------------------------
app.get("/", (req, res) => {
  res.send("✅ WebXPay LIVE backend running");
});

// ---------------------------
// Create payment
// ---------------------------
app.post("/create-payment", (req, res) => {
  const {
    order_id,
    amount,
    currency = "LKR",
    first_name = "",
    last_name = "",
    email = "",
    contact_number = "",
    address_line_one = "",
  } = req.body;

  if (!order_id || !amount) {
    return res.status(400).send("Missing order_id or amount");
  }

  // Encrypt order_id|amount
  const encrypted = encryptPayment(`${order_id}|${amount}`);

  const html = `
<!DOCTYPE html>
<html>
  <body onload="document.forms[0].submit()">
    <form
      action="https://www.webxpay.com/index.php?route=checkout/billing"
      method="POST"
    >
      <input type="hidden" name="merchant_id" value="${MERCHANT_ID}">
      <input type="hidden" name="payment" value="${encrypted}">
      <input type="hidden" name="secret_key" value="${SECRET_KEY}">
      <input type="hidden" name="enc_method" value="JCs3J+6oSz4V0LgE0zi/Bg==">

      <input type="hidden" name="first_name" value="${first_name}">
      <input type="hidden" name="last_name" value="${last_name}">
      <input type="hidden" name="email" value="${email}">
      <input type="hidden" name="contact_number" value="${contact_number}">
      <input type="hidden" name="address_line_one" value="${address_line_one}">
      <input type="hidden" name="process_currency" value="${currency}">

      <!-- 🔴 MUST point to BACKEND -->
      <input
        type="hidden"
        name="return_url"
        value="https://webxpayipg.onrender.com/payment-success">
    </form>
  </body>
</html>
`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ---------------------------
// WebXPay return / callback
// ---------------------------
app.all("/payment-success", (req, res) => {
  console.log("✅ WebXPay callback received");

  const data = req.method === "POST" ? req.body : req.query;

  const order_id = data.order_id || "UNKNOWN";
  const amount = data.amount || "0";
  const status = data.status || "UNKNOWN";

  // 🔁 Redirect to frontend
  res.redirect(
    `https://www.redtrex.store/payment-success?order_id=${encodeURIComponent(
      order_id
    )}&amount=${encodeURIComponent(amount)}&status=${encodeURIComponent(
      status
    )}`
  );
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 WebXPay LIVE server running on port ${PORT}`);
});
