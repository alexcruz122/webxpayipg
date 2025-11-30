import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(bodyParser.json());
app.use(cors());

const MERCHANT_ID = process.env.WXP_MERCHANT_ID;
const SECRET_KEY = process.env.WXP_SECRET_KEY;

// Webxpay public key (from Webxpay Dashboard)
const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

function encryptPayload(payloadObj) {
  // Convert object to JSON and encrypt using Webxpay public key
  const plaintext = JSON.stringify(payloadObj);
  return crypto.publicEncrypt(
    { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(plaintext)
  ).toString("base64");
}

app.post("/create-payment", (req, res) => {
  const { amount, order_id, email, first_name, last_name, contact_number } = req.body;

  if (!amount || !order_id) return res.status(400).send("Missing amount or order_id");

  // Payload exactly as Webxpay requires
  const payload = {
    merchant_id: MERCHANT_ID,
    secret_key: SECRET_KEY,
    process_currency: "LKR",
    order_id,
    amount,
    email: email || "",
    first_name: first_name || "",
    last_name: last_name || "",
    contact_number: contact_number || ""
  };

  const encryptedPayment = encryptPayload(payload);

  const htmlForm = `
    <form id="redirectForm" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
      <input type="hidden" name="payment" value="${encryptedPayment}">
    </form>
    <script>document.getElementById('redirectForm').submit();</script>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(htmlForm);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
