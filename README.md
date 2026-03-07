# Buy Me a Bagel

A non-custodial, stablecoin-powered alternative to Buy Me a Coffee. Powered by [Allscale Checkout](https://allscale.io).

Payments are settled in **USDT** and go **directly to your wallet** — no middleman, no custody.

[![Buy Me a Bagel](badge/badge.svg)](https://github.com/allscale-io/buy_me_a_bagel)

## How it works

1. Supporter picks a bagel amount on your page
2. Your server creates a checkout intent via Allscale API
3. Supporter is redirected to Allscale's hosted checkout page
4. They pay with USDT (via AllScale wallet or any crypto wallet)
5. Funds land in your wallet. Done.

## Quick start

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/buy_me_a_bagel.git
cd buy_me_a_bagel

# 2. Set your API credentials
cp .env.example .env
# Edit .env with your Allscale API Key and Secret

# 3. Customize your page
# Edit config.js with your name, bio, presets, theme

# 4. Deploy to Vercel
npm i -g vercel
vercel
```

## Configuration

### `config.js` — Frontend (public, safe to commit)

| Option | Description |
|---|---|
| `name` | Your display name |
| `bio` | Short tagline |
| `avatar` | Avatar image URL (blank = bagel icon) |
| `currency` | Display currency label (e.g. `"USD"`) |
| `currencySymbol` | Display symbol (e.g. `"$"`) |
| `presets` | Array of preset dollar amounts |
| `allowCustomAmount` | Allow supporters to enter any amount |
| `theme` | `"light"` or `"dark"` |
| `socials` | `{ twitter, github, website }` |

### `.env` — Backend (secret, never commit)

| Variable | Description |
|---|---|
| `ALLSCALE_API_KEY` | Your Allscale API key |
| `ALLSCALE_API_SECRET` | Your Allscale API secret |
| `ALLSCALE_BASE_URL` | `https://openapi-sandbox.allscale.io` (test) or `https://openapi.allscale.io` (prod) |
| `ALLSCALE_CURRENCY` | Fiat currency code: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`, `CNY`, `SGD`, `HKD` |

## Deploy

### Vercel (recommended)

1. Fork this repo
2. Import to [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard (from `.env`)
4. Deploy — zero config needed

### Other platforms

The `api/checkout.js` is a standard Vercel serverless function. To adapt for other platforms (Netlify, Cloudflare Workers, etc.), port the signing logic from that file into your platform's function format.

## Add the badge to your GitHub

```md
[![Buy Me a Bagel](https://raw.githubusercontent.com/YOUR_USERNAME/buy_me_a_bagel/main/badge/badge.svg)](https://your-bagel-page.vercel.app)
```

## Architecture

```
Browser                    Your Server (Vercel)              Allscale
  |                              |                              |
  |-- POST /api/checkout ------->|                              |
  |                              |-- HMAC-signed POST --------->|
  |                              |<-- { checkout_url } ---------|
  |<-- { checkout_url } ---------|                              |
  |                              |                              |
  |-- redirect to checkout_url -------------------------------->|
  |                         (user pays on Allscale page)        |
  |                              |<-- webhook (payment done) ---|
```

- **API Secret never touches the browser** — signing happens server-side
- **Non-custodial** — Allscale routes USDT directly to your wallet
- **Zero dependencies** — pure HTML/CSS/JS frontend, Node.js crypto for signing

## License

MIT
