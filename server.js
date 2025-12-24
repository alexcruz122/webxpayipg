import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// ---------------------------
// LIVE ENV VARIABLES (set these in Render)
// MERCHANT_ID
// SECRET_KEY
// ---------------------------
const { MERCHANT_ID, SECRET_KEY } = process.env;

// Public key (server-side safe)
const WEBXPAY_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyyQu5ZankdrZoeVDWoeYy5Sdj
6LTKVDQqLYMFb2jP5+KOD4zkORh9N0S9gkc2emjDK5qNLMo7NXP/gjsGzArh3M28
7hSBG757C2eFd7fxkPYBqB7aQB60ISqQ1fi8DyVn15fNwXRsU34L83gD3UwdJcaV
v/4NWsY+ZMvczkz+fwIDAQAB
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

  if (!order_id || !amount) return res.status(400).send("Missing order_id or amount");

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
// Webxpay callback route
// ---------------------------
app.post("/payment-success", (req, res) => {
  console.log("✅ Payment callback received:", req.body);

  // Optional: verify Webxpay signature here

  // Redirect user to your GitHub Pages success page
  res.redirect("https://redtrex.store/payment-success.html");
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 LIVE server running on ${PORT}`));
