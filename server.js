const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const forge = require("node-forge");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const WEBXPAY_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9l2HykxDIDVZeyDPJU4pA0imf
3nWsvyJgb3zTsnN8B0mFX6u5squ5NQcnQ03L8uQ56b4/isHBgiyKwfMr4cpEpCTY
/t1WSdJ5EokCI/F7hCM7aSSSY85S7IYOiC6pKR4WbaOYMvAMKn5gCobEPtosmPLz
gh8Lo3b8UsjPq2W26QIDAQAB
-----END PUBLIC KEY-----
`;

app.post("/create-payment", async (req, res) => {
    try {
        const {
            order_id,
            amount,
            first_name,
            last_name,
            email,
            contact_number,
            address_one,
            address_two,
            city,
            state,
            postal_code,
            country
        } = req.body;

        const plaintext = `${order_id}|${amount}`;

        const publicKey = forge.pki.publicKeyFromPem(WEBXPAY_PUBLIC_KEY);
        const encrypted = publicKey.encrypt(plaintext, "RSAES-PKCS1-V1_5");
        const payment = Buffer.from(encrypted, "binary").toString("base64");

        const redirectForm = `
            <form id="payform" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
                <input type="hidden" name="first_name" value="${first_name}">
                <input type="hidden" name="last_name" value="${last_name}">
                <input type="hidden" name="email" value="${email}">
                <input type="hidden" name="contact_number" value="${contact_number}">
                <input type="hidden" name="address_line_one" value="${address_one}">
                <input type="hidden" name="address_line_two" value="${address_two}">
                <input type="hidden" name="city" value="${city}">
                <input type="hidden" name="state" value="${state}">
                <input type="hidden" name="postal_code" value="${postal_code}">
                <input type="hidden" name="country" value="${country}">
                <input type="hidden" name="process_currency" value="LKR">
                
                <input type="hidden" name="custom_fields" value="">
                <input type="hidden" name="enc_method" value="JCs3J+6oSz4V0LgE0zi/Bg==">
                <input type="hidden" name="secret_key" value="630be963-59e2-447a-8f3b-93b3d7a3bf25">

                <input type="hidden" name="payment" value="${payment}">
            </form>

            <script>
                document.getElementById('payform').submit();
            </script>
        `;

        res.status(200).send(redirectForm);

    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ error: err.toString() });
    }
});

app.get("/", (req, res) => {
    res.json({ message: "WebXPay Node Backend Running" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port " + port));
