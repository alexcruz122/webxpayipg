import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();

// ---------------------------
// Middleware
// ---------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ---------------------------
// LIVE ENV VARIABLES (set in Render)
// MERCHANT_ID
// SECRET_KEY
// ---------------------------
const { MERCHANT_ID, SECRET_KEY } = process.env;

// Public key (live)
const WEBXPAY_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

if (!MERCHANT_ID || !SECRET_KEY) {
  console.error("❌ Missing LIVE environment variables");
  process.exit(1);
}

// ---------------------------
// Helper: encrypt order_id|amount
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
// Test endpoint
// ---------------------------
app.get("/", (req, res) => {
  res.send("Webxpay LIVE backend running");
});

// ---------------------------
// Create payment endpoint
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

  if (!order_id || !amount)
    return res.status(400).send("Missing order_id or amount");

  const encrypted = encryptPayment(`${order_id}|${amount}`);

  const html = `
  <html>
    <body onload="document.forms[0].submit()">
      <form action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
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
        <input type="hidden" name="return_url" value="https://webxpayipg.onrender.com/payment-success">
      </form>
    </body>
  </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ---------------------------
// Payment success endpoint (GET, POST, OPTIONS)
// ---------------------------
app.options("/payment-success", (req, res) => {
  res.sendStatus(200);
});

app.all("/payment-success", (req, res) => {
  const { order_id, amount } = req.body || req.query;

  if (!order_id || !amount) {
    console.warn("⚠️ Payment callback missing order_id or amount");
    return res.redirect("https://www.redtrex.store/payment-success");
  }

  const date = new Date().toLocaleDateString();
  const method = "WebXPay";

  // Redirect to your GitHub Pages success page with order info
  res.redirect(
    `https://www.redtrex.store/payment-success?order_id=${encodeURIComponent(
      order_id
    )}&amount=${encodeURIComponent(amount)}&date=${encodeURIComponent(
      date
    )}&method=${encodeURIComponent(method)}`
  );
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 LIVE server running on ${PORT}`));
