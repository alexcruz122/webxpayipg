import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const MERCHANT_ID = process.env.WXP_MERCHANT_ID;
const SECRET_KEY = process.env.WXP_SECRET_KEY;

// Create signature (HMAC-SHA256)
function generateSignature(order_id, amount) {
  const data = MERCHANT_ID + order_id + amount;
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

app.post("/create-payment", (req, res) => {
  try {
    const {
      order_id,
      amount,
      currency,
      customer_name,
      customer_email,
      customer_phone,
      return_url,
      cancel_url,
    } = req.body;

    if (!order_id || !amount) {
      return res.status(400).send("Missing required fields");
    }

    const formattedAmount = Number(amount).toFixed(2);
    const signature = generateSignature(order_id, formattedAmount);

    // WebXPay staging form
    const htmlForm = `
      <form id="wpx_redirect" action="https://staging.webxpay.com/index.php?route=checkout/billing" method="POST">
        <input type="hidden" name="merchant_id" value="${MERCHANT_ID}">
        <input type="hidden" name="order_id" value="${order_id}">
        <input type="hidden" name="amount" value="${formattedAmount}">
        <input type="hidden" name="currency" value="${currency}">
        <input type="hidden" name="customer_name" value="${customer_name}">
        <input type="hidden" name="customer_email" value="${customer_email}">
        <input type="hidden" name="customer_phone" value="${customer_phone}">
        <input type="hidden" name="return_url" value="${return_url}">
        <input type="hidden" name="cancel_url" value="${cancel_url}">
        <input type="hidden" name="signature" value="${signature}">
      </form>

      <script>
        document.getElementById('wpx_redirect').submit();
      </script>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlForm);
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
