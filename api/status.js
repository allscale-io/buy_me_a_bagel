/**
 * /api/status — poll the status of an Allscale checkout intent.
 *
 * Used by the front-end's polling loop while it waits for the user to
 * complete payment on the hosted checkout page. Returns only the inner
 * `status` payload so the browser doesn't need to know about the full
 * Allscale response envelope.
 *
 * Note: the HMAC signature is calculated over an empty body string because
 * GET requests carry no body. The canonical string is built exactly as the
 * Allscale auth spec requires.
 */

import crypto from "crypto";

// Per-IP rate limit so a misbehaving client cannot fan out thousands of
// status checks per minute. The Map is local to the warm Vercel instance.
const rateLimit = new Map();
const RATE_LIMIT_MAX = 30;            // Status checks are cheap — allow more.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAP_CAP = 10_000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    if (rateLimit.size > RATE_LIMIT_MAP_CAP) {
      for (const [key, value] of rateLimit) {
        if (now - value.start > RATE_LIMIT_WINDOW_MS) {
          rateLimit.delete(key);
        }
      }
    }
    rateLimit.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const intentId = req.query.intent_id;
  if (!intentId || typeof intentId !== "string" || intentId.length > 128) {
    return res.status(400).json({ error: "Missing or invalid intent_id" });
  }

  const API_KEY = process.env.ALLSCALE_API_KEY;
  const API_SECRET = process.env.ALLSCALE_API_SECRET;
  const BASE_URL =
    process.env.ALLSCALE_BASE_URL || "https://openapi.allscale.io";

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  const method = "GET";
  const path = `/v1/checkout_intents/${encodeURIComponent(intentId)}/status`;
  const query = "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex");

  const canonical = [method, path, query, timestamp, nonce, bodyHash].join("\n");
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
