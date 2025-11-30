import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Load secrets from environment variables
const MERCHANT_ID = process.env.WXP_MERCHANT_ID;
const SECRET_KEY = process.env.WXP_SECRET_KEY;

// Webxpay public key
const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

// Only include mandatory fields for encryption
function encryptPayload(payloadObj) {
  try {
    const plaintext = JSON.stringify(payloadObj);
    return crypto.publicEncrypt(
      { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(plaintext)
    ).toString("base64");
  } catch (err) {
    console.error("RSA encryption error:", err);
    throw err;
  }
}

app.post("/create-payment", (req, res) => {
  try {
    const { order_id, amount, currency } = req.body;

    if (!order_id || !amount || !currency) {
      return res.status(400).send("Missing mandatory fields");
    }

    // Encrypt only essential fields to avoid RSA size errors
    const payload = {
      merchant_id: MERCHANT_ID,
      secret_key: SECRET_KEY,
      process_currency: currency,
      order_id,
      amount
    };

    const encrypted = encryptPayload(payload);

    // Return HTML form
    const htmlForm = `
      <form id="redirectForm" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
        <input type="hidden" name="payment" value="${encrypted}">
      </form>
      <script>document.getElementById('redirectForm').submit();</script>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlForm);

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
