import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load secrets from environment variables
const MERCHANT_ID = process.env.WXP_MERCHANT_ID;  // your Webxpay merchant ID
const SECRET_KEY = process.env.WXP_SECRET_KEY;    // your Webxpay secret key

// Webxpay public key
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----`;

// Encrypt payment string with Webxpay public key
function encryptPaymentString(plaintext) {
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING, // Webxpay uses PKCS1
    },
    Buffer.from(plaintext)
  ).toString("base64");
}

app.post("/create-payment", (req, res) => {
  try {
    const {
      order_id,
      amount,
      currency,
      email,
      first_name,
      last_name,
      contact_number,
      address_line_one
    } = req.body;

    if (!order_id || !amount || !currency || !email || !first_name || !last_name || !contact_number || !address_line_one) {
      return res.status(400).send("Missing mandatory fields");
    }

    // Build payment string per Webxpay spec: order_id|amount
    const paymentString = `${order_id}|${amount}`;
    const encryptedPayment = encryptPaymentString(paymentString);

    // HTML form to submit to Webxpay
    const htmlForm = `
      <form id="redirectForm" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
        <input type="hidden" name="merchant_id" value="${MERCHANT_ID}">
        <input type="hidden" name="secret_key" value="${SECRET_KEY}">
        <input type="hidden" name="payment" value="${encryptedPayment}">
        <input type="hidden" name="process_currency" value="${currency}">
        <input type="hidden" name="cms" value="Node.js">
        <input type="hidden" name="first_name" value="${first_name}">
        <input type="hidden" name="last_name" value="${last_name}">
        <input type="hidden" name="email" value="${email}">
        <input type="hidden" name="contact_number" value="${contact_number}">
        <input type="hidden" name="address_line_one" value="${address_line_one}">
      </form>
      <script>document.getElementById('redirectForm').submit();</script>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlForm);

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
