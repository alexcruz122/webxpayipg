import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";

const app = express();
app.use(bodyParser.json());

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
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
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
      address_line_one,
    } = req.body;

    // Mandatory field check
    const mandatoryFields = [order_id, amount, currency, email, first_name, last_name, contact_number, address_line_one];
    if (mandatoryFields.some(f => !f)) {
      return res.status(400).send("Missing mandatory fields");
    }

    // Prepare payload for Webxpay
    const payload = {
      secret_key: SECRET_KEY,
      merchant_id: MERCHANT_ID,
      process_currency: currency,
      cms: "Node.js",
      order_id,
      amount,
      email,
      first_name,
      last_name,
      contact_number,
      address_line_one
    };

    const plaintext = JSON.stringify(payload);
    const encrypted = encryptWithPublicKey(plaintext);

    // Return HTML form to auto-submit to Webxpay
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
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
