# 🥯 Buy Me a Bagel

A non-custodial, stablecoin-powered alternative to Buy Me a Coffee. Powered by [Allscale Checkout](https://allscale.io).

Payments go **directly to your wallet** — no middleman, no custody, no platform fees skimming your support.

[![Buy Me a Bagel](badge/badge.svg)](https://github.com/allscale-io/buy_me_a_bagel)

## How it works

1. Fork this repo
2. Update `config.js` with your Allscale API key and wallet address
3. Deploy anywhere (GitHub Pages, Vercel, Netlify, etc.)
4. Share your page or add the badge to your GitHub profile

Supporters pay in stablecoins (USDC, USDT) on the chain of your choice. Funds land in your wallet instantly via Allscale Checkout.

## Quick start

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/buy_me_a_bagel.git
cd buy_me_a_bagel
```

Edit `config.js`:

```js
const CONFIG = {
  name: "Your Name",
  bio: "I build cool things on the internet.",
  allscaleApiKey: "YOUR_ALLSCALE_API_KEY",  // from https://allscale.io
  walletAddress: "0xYOUR_WALLET_ADDRESS",
  chain: "base",           // ethereum, base, polygon, arbitrum
  stablecoin: "USDC",      // USDC, USDT
  presets: [3, 5, 10, 25],
  // ...
};
```

Open `index.html` in a browser — that's it. No build step, no dependencies.

## Deploy

**GitHub Pages:** Settings > Pages > Source: main branch > Save

**Vercel/Netlify:** Import the repo and deploy. Zero config needed.

## Add the badge to your GitHub

Add this to any README:

```md
[![Buy Me a Bagel](https://raw.githubusercontent.com/YOUR_USERNAME/buy_me_a_bagel/main/badge/badge.svg)](https://YOUR_USERNAME.github.io/buy_me_a_bagel)
```

## Configuration

| Option | Description |
|---|---|
| `name` | Your display name |
| `bio` | Short tagline |
| `avatar` | Avatar image URL (blank = bagel icon) |
| `allscaleApiKey` | Your Allscale Commerce API key |
| `walletAddress` | Your wallet address (receives payments directly) |
| `chain` | Chain to receive on: `ethereum`, `base`, `polygon`, `arbitrum` |
| `stablecoin` | `USDC` or `USDT` |
| `presets` | Array of preset dollar amounts |
| `allowCustomAmount` | Allow supporters to enter any amount |
| `theme` | `light` or `dark` |
| `socials` | `{ twitter, github, website }` |

## Why non-custodial?

Traditional platforms like Buy Me a Coffee hold your funds and take a cut. Buy Me a Bagel uses Allscale Checkout to route stablecoin payments directly to your wallet. You own your money from the moment it's sent.

## License

MIT
