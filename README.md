# Buy Me a Bagel 🥯

**A non-custodial, open-source alternative to Buy Me a Coffee.**

Supporters pay in fiat-denominated amounts. Payments settle as **USDT stablecoin directly to your wallet** — no platform holds your money, ever.

[![Buy Me a Bagel](badge/badge.svg)](https://github.com/allscale-io/buy_me_a_bagel)

---

## Why This Exists

Platforms like Buy Me a Coffee, Patreon, and Ko-fi all work the same way: your supporters' money goes to **the platform first**, and then the platform pays you — minus fees, on their schedule, after hitting their minimum payout threshold.

Buy Me a Bagel flips this model:

| | Buy Me a Coffee | Buy Me a Bagel |
|---|---|---|
| **Who holds the funds?** | The platform | Your wallet directly |
| **Payout delay** | Days to weeks | Instant (on-chain confirmation) |
| **Platform fees** | 5% | None from this app (only network gas fees) |
| **Minimum payout** | Yes ($5-$10+) | No minimum |
| **Account freezing risk** | Yes — platform can freeze/ban your account | No — funds go straight to your wallet |
| **KYC to receive funds** | Required | Not required by this app |
| **Currency** | Fiat (USD) | USDT stablecoin (pegged 1:1 to USD) |

### What "Non-Custodial" Means

**Custodial** = someone else holds your money for you (a bank, PayPal, Buy Me a Coffee). They control when and whether you can access it.

**Non-custodial** = money goes directly to a wallet you control. No intermediary can freeze, delay, or take a cut of your funds after they're sent.

With Buy Me a Bagel, when someone buys you a bagel, the USDT lands in **your** crypto wallet. Not Allscale's wallet, not this app's wallet — yours. The Allscale checkout page simply facilitates the payment and routes it to you.

### Why Stablecoin?

USDT is a stablecoin pegged to the US dollar. $1 = 1 USDT. Unlike Bitcoin or Ethereum, stablecoin value doesn't fluctuate. Your supporters think in dollars, you receive dollars — just on a blockchain instead of a bank.

---

## Deploy Your Own (Step by Step)

Total time: ~10 minutes. No crypto knowledge required to set up.

### Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier works)
- An [Allscale](https://allscale.io) account (to get API credentials and set your receiving wallet)

---

### Step 1: Get Your Allscale API Credentials

1. Go to [allscale.io](https://allscale.io) and create an account
2. In your Allscale dashboard, set up your **receiving wallet address** — this is the crypto wallet where payments will be sent
3. Generate an **API Key** and **API Secret** — you'll need these in Step 4

> **Important:** Your API Secret is like a password. Never share it or commit it to GitHub.

---

### Step 2: Fork This Repo

1. Click the **Fork** button at the top-right of [this repo](https://github.com/allscale-io/buy_me_a_bagel)
2. This creates your own copy under your GitHub account

---

### Step 3: Customize Your Page

Edit `config.js` in your forked repo (you can do this directly on GitHub by clicking the file, then the pencil icon):

```js
const CONFIG = {
  // Your display name — shown at the top of the page
  name: "Jane Doe",

  // Short bio — one line under your name
  bio: "I make videos about cooking and open-source software.",

  // Avatar URL — paste a link to your profile picture
  // Leave empty "" to use the default bagel icon
  avatar: "https://example.com/your-photo.jpg",

  // What currency your supporters see (display only)
  currency: "USD",
  currencySymbol: "$",

  // Preset amounts — the quick-select buttons on your page
  presets: [1, 3, 5, 10],

  // Let supporters type their own amount
  allowCustomAmount: true,

  // Social links — leave empty to hide
  socials: {
    twitter: "janedoe",        // just the handle, no @
    github: "janedoe",         // just the username
    website: "https://jane.dev",
  },

  // "light" or "dark"
  theme: "light",
};
```

Commit the changes.

---

### Step 4: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** and select your forked `buy_me_a_bagel` repo
3. Before clicking Deploy, expand **"Environment Variables"** and add these four variables:

| Variable | Value |
|---|---|
| `ALLSCALE_API_KEY` | Your API key from Step 1 |
| `ALLSCALE_API_SECRET` | Your API secret from Step 1 |
| `ALLSCALE_BASE_URL` | `https://openapi-sandbox.allscale.io` (for testing) or `https://openapi.allscale.io` (for real payments) |
| `ALLSCALE_CURRENCY` | `USD` (or `EUR`, `GBP`, `CAD`, `AUD`, `JPY`, `CNY`, `SGD`, `HKD`) |

4. Click **Deploy**
5. Done. Vercel gives you a URL like `your-project.vercel.app` — that's your Buy Me a Bagel page.

> **Tip:** Start with the sandbox URL to test everything. Switch to the production URL when you're ready to receive real payments.

---

### Step 5 (Optional): Custom Domain

In your Vercel project dashboard, go to **Settings → Domains** to add a custom domain like `bagel.yourdomain.com`.

---

## Add the Badge to Your GitHub Profile or Repo

Paste this in any `README.md`, replacing the URL with your deployed page:

```md
[![Buy Me a Bagel](https://raw.githubusercontent.com/YOUR_USERNAME/buy_me_a_bagel/main/badge/badge.svg)](https://your-bagel-page.vercel.app)
```

---

## How It Works (Technical)

```
Supporter's Browser          Your Vercel Server              Allscale API
       |                            |                            |
       |-- picks $5, clicks btn --> |                            |
       |                            |-- HMAC-signed request ---> |
       |                            |<-- { checkout_url } -----  |
       |<-- opens checkout tab -----|                            |
       |                                                         |
       |-- pays on Allscale checkout page ---------------------->|
       |                                                         |
       |                            |-- polls payment status --> |
       |<-- "Thank you!" ---------- |<-- confirmed ------------ |
       |                                                         |
       |   Funds arrive in YOUR wallet. Done.                    |
```

**Key points:**

- Your **API secret never leaves the server** — HMAC signing happens in the serverless function, not in the browser
- **No database needed** — the app is stateless. Allscale handles payment state.
- **No dependencies** — the frontend is plain HTML/CSS/JS. The backend uses only Node.js built-in `crypto`.
- **Rate limited** — the checkout endpoint allows max 5 requests per minute per IP to prevent abuse

---

## Project Structure

```
├── index.html          # The donation page (static HTML)
├── config.js           # Your name, bio, presets, theme (edit this)
├── app.js              # Frontend logic (amount selection, checkout flow, status polling)
├── assets/style.css    # Styling (light + dark theme)
├── api/
│   ├── checkout.js     # Serverless function: creates Allscale checkout intent
│   └── status.js       # Serverless function: polls payment status
├── badge/badge.svg     # Embeddable badge for your GitHub
├── .env.example        # Template for environment variables
├── vercel.json         # Vercel routing config
└── package.json        # Project metadata (no runtime dependencies)
```

---

## Configuration Reference

### `config.js` (public, safe to commit)

| Option | Type | Description |
|---|---|---|
| `name` | string | Your display name |
| `bio` | string | Short tagline shown under your name |
| `avatar` | string | URL to your avatar image (empty = bagel icon) |
| `currency` | string | Display currency label, e.g. `"USD"` |
| `currencySymbol` | string | Display symbol, e.g. `"$"` |
| `presets` | number[] | Quick-select dollar amounts |
| `allowCustomAmount` | boolean | Show the custom amount input field |
| `theme` | string | `"light"` or `"dark"` |
| `socials` | object | `{ twitter, github, website }` — leave empty to hide |

### `.env` (secret, never commit)

| Variable | Description |
|---|---|
| `ALLSCALE_API_KEY` | Your Allscale API key |
| `ALLSCALE_API_SECRET` | Your Allscale API secret |
| `ALLSCALE_BASE_URL` | `https://openapi-sandbox.allscale.io` (test) or `https://openapi.allscale.io` (prod) |
| `ALLSCALE_CURRENCY` | Fiat currency code: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`, `CNY`, `SGD`, `HKD` |

---

## Deploying Without Vercel

The `api/checkout.js` and `api/status.js` are standard Vercel serverless functions. To run on other platforms:

- **Netlify Functions** — move the files to `netlify/functions/`, adjust the export format
- **Cloudflare Workers** — port the handler to the Workers `fetch` event format
- **Self-hosted Node.js** — wrap the handlers in an Express/Fastify server

The core logic is the HMAC-SHA256 signing in `api/checkout.js` — everything else is standard HTTP.

---

## FAQ

**Do my supporters need a crypto wallet?**
Yes, supporters currently pay with crypto through Allscale's checkout page. More payment methods are coming soon.

**What if I don't have a crypto wallet?**
You don't need one. Just create an account on Allscale and you'll have a wallet ready to receive payments. Get started at [app.allscale.io](https://app.allscale.io).

**Is this really free?**
This app charges nothing. Allscale charges a 0.5% transaction fee — negligible compared to the 5%+ that traditional platforms take.

**Can someone take down my page or freeze my funds?**
Your page runs on your own Vercel deployment — you control it. Once funds are sent to your wallet on-chain, no one can reverse or freeze them. You also stay anonymous — no personal information is required to receive payments.

---

## License

MIT — fork it, customize it, make it yours.
