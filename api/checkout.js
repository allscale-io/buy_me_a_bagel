/**
 * /api/checkout — create an Allscale checkout intent for a tip.
 *
 * Validates the request body, signs the outbound call with HMAC-SHA256,
 * and forwards the user's amount/message to Allscale. On success, returns
 * the hosted-checkout URL the browser should open in a new tab.
 *
 * Notes for operators:
 *   - This is a Vercel serverless function. The in-memory `rateLimit` map
 *     only protects a single warm instance; for multi-region deploys,
 *     upgrade to an external store such as Upstash Redis.
 *   - The HMAC body is built from the same JSON string sent over the wire,
 *     so any transformation of `body` here would invalidate the signature.
 */

import crypto from "crypto";

// --- Rate limiting ----------------------------------------------------------
// In-memory token bucket per IP. Sufficient for the demo deployment where a
// single Vercel instance handles all traffic. In production replace with an
// external store (Redis, KV) so the limit survives cold starts.
const rateLimit = new Map();
const RATE_LIMIT_MAX = 5;              // Max requests per window per IP.
const RATE_LIMIT_WINDOW_MS = 60_000;   // 1 minute window.
const RATE_LIMIT_MAP_CAP = 10_000;     // Defensive cap so the Map cannot grow forever.

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    // Periodically evict stale entries so the Map cannot leak memory.
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

// --- Currency mapping -------------------------------------------------------
// ISO 4217 code → Allscale enum integer. Keep in sync with the Allscale API.
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

// --- Input validation -------------------------------------------------------
// Strict bounds for the amount field. The lower bound matches Allscale's
// 0.10 USDT minimum; the upper bound is a sanity cap that protects against
// fat-finger tips.
const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 10000;
const MAX_MESSAGE_LEN = 280;

function isValidAmount(value) {
  return typeof value === "number" && Number.isFinite(value)
    && value >= MIN_AMOUNT && value <= MAX_AMOUNT;
}

function sanitizeMessage(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_MESSAGE_LEN);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeSupporterName(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, 64);
  return trimmed.length > 0 ? trimmed : undefined;
}

// --- Handler ----------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Client IP — trust the first entry in `x-forwarded-for` because we run
  // behind Vercel's edge. In another deployment, override this with the
  // platform's actual IP header (e.g. `cf-connecting-ip`).
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests, try again shortly" });
  }

  const { amount, message, supporter_name } = req.body || {};

  if (!isValidAmount(amount)) {
    return res.status(400).json({
      error: `Invalid amount. Must be a number between ${MIN_AMOUNT} and ${MAX_AMOUNT}.`,
    });
  }

  const safeMessage = sanitizeMessage(message);
  const safeSupporterName = sanitizeSupporterName(supporter_name);

  const API_KEY = process.env.ALLSCALE_API_KEY;
  const API_SECRET = process.env.ALLSCALE_API_SECRET;
  const BASE_URL =
    process.env.ALLSCALE_BASE_URL || "https://openapi.allscale.io";
  const CURRENCY = process.env.ALLSCALE_CURRENCY || "USD";

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  const currencyEnum = CURRENCY_ENUM[CURRENCY] || CURRENCY_ENUM.USD;
  const amountCents = Math.round(amount * 100);

  // Build the exact JSON that will be signed and sent. Re-stringify here so
  // the signature matches the wire payload byte-for-byte.
  const body = JSON.stringify({
    currency: currencyEnum,
    amount_cents: amountCents,
    order_id: `bagel_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    order_description: safeMessage || "Buy me a bagel",
    user_name: safeSupporterName || null,
    extra: { source: "buy_me_a_bagel" },
  });

  // Build HMAC-SHA256 signature per Allscale auth spec.
  const method = "POST";
  const path = "/v1/checkout_intents/";
  const query = "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");

  const canonical = [method, path, query, timestamp, nonce, bodyHash].join("\n");
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
      body,
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
