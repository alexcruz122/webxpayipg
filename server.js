import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Load secrets from environment variables
const MERCHANT_ID = process.env.WXP_MERCHANT_ID;
const SECRET_KEY = process.env.WXP_SECRET_KEY;

// Webxpay live public key (replace with your actual key)
const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

function encryptWithPublicKey(plaintext) {
  const buffer = Buffer.from(plaintext);
  // RSA 1024-bit max for PKCS1 ~ 117 bytes, use smaller payload
  if (buffer.length > 100) {
    throw new Error("Data too large for RSA key size");
  }
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  ).toString("base64");
}

app.post("/create-payment", (req, res) => {
  try {
    const {
      order_id,
      amount,
      currency,
      first_name,
      last_name,
      email,
      contact_number,
      address_line_one,
    } = req.body;

    if (!order_id || !amount || !currency) {
      return res.status(400).send("Missing mandatory fields");
    }

    // Encrypt only order_id|amount
    const plaintext = `${order_id}|${amount}`;
    const encrypted = encryptWithPublicKey(plaintext);

    // Generate HTML form for redirect
    const htmlForm = `
      <form id="redirectForm" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
        <input type="hidden" name="payment" value="${encrypted}">
        <input type="hidden" name="first_name" value="${first_name}">
        <input type="hidden" name="last_name" value="${last_name}">
        <input type="hidden" name="email" value="${email}">
        <input type="hidden" name="contact_number" value="${contact_number}">
        <input type="hidden" name="address_line_one" value="${address_line_one}">
        <input type="hidden" name="process_currency" value="${currency}">
        <input type="hidden" name="secret_key" value="${SECRET_KEY}">
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
