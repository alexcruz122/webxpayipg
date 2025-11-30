import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// STAGING Credentials
const MERCHANT_ID = "628246969186";
const SECRET_KEY = "bd5dad56-0dbe-45c7-a21c-2aa42cc58206";

const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDla3BZjh19LvuG+qYOF3gpcqCM
swXfkkNJ2zwxyenNn5hGgfN0cu3dXl9jg0gkUM/p9tNCQ6k9ULLm33SGi8Vo15k4
WI2uT9R0sBbV/U4Z3qB8RiTN0mG3qfBnl088iS3SIUcAWb+Y9SnW8N3PUTZTss13
sZx1THY1BzCnnBdHPwIDAQAB
-----END PUBLIC KEY-----
`;

// Encrypt order_id|amount using RSA PKCS#1 v1.5
function encryptPayment(plain) {
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plain)
  ).toString("base64");
}

app.post("/create-payment", (req, res) => {
  try {
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
      return res.status(400).send("Missing required fields.");
    }

    const encrypted = encryptPayment(`${order_id}|${amount}`);

    const html = `
      <html>
      <body onload="document.forms[0].submit();">
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
          <input type="hidden" name="return_url" value="https://alexcruz122.github.io/redtrexpaynow/">
        </form>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
