# What is Sera Protocol?

Sera is **multi-currency settlement infrastructure for stablecoin FX**: quote, convert, and settle stablecoin corridors with **non-custodial on-chain settlement on Ethereum**.

## Core facts

- **Live product phase:** Swap (CLOB + settlement).
- **Networks:** Ethereum Mainnet (`chain_id=1`) and Sepolia (`11155111`).
- **Founder & CEO:** Douglas Gan.
- **Surfaces:** Swap/API, Earn (LP), Pay, Agents/MCP, On Par (same-peg), gSera (loyalty points — not the settlement token).
- Marketing materials also cite ~40 stablecoins / many fiat corridors; treat counts as approximate — prefer live `GET /tokens` for the current list.
- Corridor depth varies; not every pair is always tradeable.

## Product map

| Surface | Role |
|---|---|
| Swap / API | Live FX CLOB + REST (`api.sera.cx`) |
| Earn | LP yield from FX spreads (Virtual Liquidity) |
| Pay | Merchant links / QR / checkout (`sera-cx/sera-pay`) |
| Agents | MCP + templates + gateway (`agents.sera.cx`) |
| On Par™ | Same-peg stables at 1:1 |
| gSera | Loyalty points from referrals when they trade (not from content); XP is separate |
| Card | Separate waitlist product (when mentioned on product sites) |

## Networks

| | Mainnet | Sepolia |
|---|---|---|
| API | `https://api.sera.cx/api/v1` | `https://api.testnet.sera.cx/api/v1` or `https://api-testnet.sera.cx/api/v1` |
| App | https://sera.cx/ | https://testnet.sera.cx/ |
| Docs | https://docs.sera.cx | https://docs.testnet.sera.cx |
| chain_id | `1` | `11155111` |

Bootstrap contracts from `GET /config`. Prefer **v2** (Vault + signed orders). Legacy **v1** (Router/PriceBook + Goldsky) still exists — do not mix them.

## Founder / company links (when asked)

| Profile | URL |
|---|---|
| LinkedIn | https://www.linkedin.com/in/douglasgan |
| X | https://x.com/DouglasGan |
| Company LinkedIn | https://www.linkedin.com/company/seraprotocol |
| Company X | https://x.com/seraprotocol |

## Ask Sera vs trading tools

- **Ask Sera** — grounded Q&A + optional live public reads (`/tokens`, `/markets`, `/fx/rate`, `/health`, `/config`).
- **sera-mcp / sera-agent** — quotes and settlement tooling. Ask Sera does not sign or place orders.

## Keywords
what is sera, overview, founder, douglas gan, ceo, live, mainnet, product, protocol
