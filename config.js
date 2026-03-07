// =============================================
// Buy Me a Bagel - Configuration
// Fork this repo and update these values!
// =============================================

const CONFIG = {
  // Your display name
  name: "Your Name",

  // Short bio or tagline
  bio: "I build cool things on the internet.",

  // Avatar image URL (or leave empty for default bagel icon)
  avatar: "",

  // Your Allscale Commerce API key
  // Get one at https://allscale.io
  allscaleApiKey: "YOUR_ALLSCALE_API_KEY",

  // Allscale Checkout URL (default works for most users)
  allscaleCheckoutUrl: "https://checkout.allscale.io",

  // Stablecoin to accept (e.g., "USDC", "USDT")
  stablecoin: "USDC",

  // Chain to receive payments on (e.g., "ethereum", "base", "polygon", "arbitrum")
  chain: "base",

  // Your wallet address (payments go directly here - non-custodial!)
  walletAddress: "",

  // Preset bagel amounts (in USD)
  presets: [3, 5, 10, 25],

  // Allow custom amounts
  allowCustomAmount: true,

  // Social links (leave empty to hide)
  socials: {
    twitter: "",
    github: "",
    website: "",
  },

  // Theme: "light" or "dark"
  theme: "light",
};
