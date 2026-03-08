import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const intentId = req.query.intent_id;
  if (!intentId) {
    return res.status(400).json({ error: "Missing intent_id" });
  }

  const API_KEY = process.env.ALLSCALE_API_KEY;
  const API_SECRET = process.env.ALLSCALE_API_SECRET;
  const BASE_URL =
    process.env.ALLSCALE_BASE_URL || "https://openapi.allscale.io";

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  const method = "GET";
  const path = `/v1/checkout_intents/${intentId}/status`;
  const query = "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex");

  const canonical = [method, path, query, timestamp, nonce, bodyHash].join(
    "\n"
  );
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(canonical)
    .digest("base64");

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "X-API-Key": API_KEY,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": `v1=${signature}`,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res
        .status(400)
        .json({ error: data.error?.message || "Status check failed" });
    }

    return res.status(200).json({ status: data.payload });
  } catch (err) {
    console.error("Status check error:", err);
    return res.status(500).json({ error: "Failed to check status" });
  }
}
