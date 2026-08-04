# Pay (SeraPay)

**SeraPay** (`sera-pay`) is Sera’s merchant payment application: create payment links, branded QR codes, and track payment activity from a web dashboard — settling via Sera’s multi-currency stablecoin FX rails.

## What merchants get

- Wallet-based merchant sign-in
- Dashboard: payment history, settings, menus, developer tools
- Branded QR / payment links (logo, color, style)
- Stablecoin checkout with rate display and payment status tracking
- Optional Cloudflare R2 for logos / menu images

## How it relates to the protocol

Pay is a **product on top of** Sera settlement — not a separate exchange. Checkout can involve quoting/swapping into the merchant’s preferred settlement stablecoin using Sera’s FX engine.

Open-source framing on sera.cx: “Payment rails — accept and settle in any of 120+ currency stablecoins” (marketing count; live token set comes from Sera’s registry / `/tokens`).

## Repo

- GitHub: `sera-cx/sera-pay`
- Stack: React/Vite client, Express API, Drizzle DB
- Needs Sera API config for live settlement (`SERA_API_BASE_URL`, etc.) — that is for running Pay, not for Ask Sera

## Related “pay” surfaces

- **x402-service** in `sera-agents` — agent-to-agent HTTP 402 → USDC pay → deliver FX swap
- **Stablecoin card** — waitlisted spend product on marketing site (not the same as SeraPay dashboard)
