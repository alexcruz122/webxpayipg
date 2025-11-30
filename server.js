import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Load secrets
const MERCHANT_ID = process.env.WXP_MERCHANT_ID;
const SECRET_KEY = process.env.WXP_SECRET_KEY;

// Webxpay live public key
const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9l2HykxDIDVZeyDPJU4pA0imf
3nWsvyJgb3zTsnN8B0mFX6u5squ5NQcnQ03L8uQ56b4/isHBgiyKwfMr4cpEpCTY
/t1WSdJ5EokCI/F7hCM7aSSSY85S7IYOiC6pKR4WbaOYMvAMKn5gCobEPtosmPLz
gh8Lo3b8UsjPq2W26QIDAQAB
-----END PUBLIC KEY-----
`;

function encryptPayment(plaintext) {
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING // match PHP openssl_public_encrypt
    },
    Buffer.from(plaintext)
  ).toString("base64");
}

app.post("/create-payment", (req, res) => {
  const { order_id, amount, first_name, last_name, email, contact_number, address_line_one, process_currency } = req.body;

  if (!order_id || !amount || !first_name || !last_name || !email || !contact_number || !address_line_one) {
    return res.status(400).send("Missing mandatory fields");
  }

  // Encrypt only order_id|amount
  const payment = encryptPayment(`${order_id}|${amount}`);

  const htmlForm = `
    <form action="https://webxpay.com/index.php?route=checkout/billing" method="POST" id="redirectForm">
      <input type="hidden" name="first_name" value="${first_name}">
      <input type="hidden" name="last_name" value="${last_name}">
      <input type="hidden" name="email" value="${email}">
      <input type="hidden" name="contact_number" value="${contact_number}">
      <input type="hidden" name="address_line_one" value="${address_line_one}">
      <input type="hidden" name="process_currency" value="${process_currency}">
      <input type="hidden" name="cms" value="Node.js">
      <input type="hidden" name="secret_key" value="${SECRET_KEY}">
      <input type="hidden" name="payment" value="${payment}">
    </form>
    <script>document.getElementById('redirectForm').submit();</script>
  `;

  res.send(htmlForm);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
