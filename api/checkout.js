import crypto from "crypto";

// Currency string → Allscale enum mapping
const CURRENCY_ENUM = {
  USD: 1,
  EUR: 44,
  GBP: 48,
  CAD: 27,
  AUD: 9,
  JPY: 72,
  CNY: 31,
  SGD: 126,
  HKD: 57,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, message, supporter_name } = req.body;

  if (!amount || amount <= 0 || amount > 10000) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const API_KEY = process.env.ALLSCALE_API_KEY;
  const API_SECRET = process.env.ALLSCALE_API_SECRET;
  const BASE_URL =
    process.env.ALLSCALE_BASE_URL || "https://openapi.allscale.io";
  const CURRENCY = process.env.ALLSCALE_CURRENCY || "USD";

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  const currencyEnum = CURRENCY_ENUM[CURRENCY] || 1;
  const amountCents = Math.round(amount * 100);

  const body = JSON.stringify({
    currency: currencyEnum,
    amount_cents: amountCents,
    order_id: `bagel_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    order_description: message || "Buy me a bagel",
    user_name: supporter_name || null,
    extra: { source: "buy_me_a_bagel" },
  });

  // Build HMAC-SHA256 signature per Allscale auth spec
  const method = "POST";
  const path = "/v1/checkout_intents/";
  const query = "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");

  const canonical = [method, path, query, timestamp, nonce, bodyHash].join(
    "\n"
  );
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(canonical)
    .digest("base64");

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": `v1=${signature}`,
      },
      body: body,
    });

    const data = await response.json();

    if (data.code !== 0) {
      console.error("Allscale error:", data);
      return res
        .status(400)
        .json({ error: data.error?.message || "Checkout failed" });
    }

    return res.status(200).json({
      checkout_url: data.payload.checkout_url,
      intent_id: data.payload.allscale_checkout_intent_id,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout" });
  }
}
