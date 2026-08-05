# What is Sera Protocol?

Sera is **multi-currency settlement infrastructure for stablecoin FX**: quote, convert, and settle stablecoin corridors with **non-custodial on-chain settlement on Ethereum**.

## Core facts

- **Live product phase:** Swap (CLOB + settlement).
- **Networks:** Ethereum Mainnet (`chain_id=1`) and Sepolia (`11155111`).
- **Team:** Multi-person engineering/ops team. No single public founder/CEO on official pages.
- Founder answers: no named founder; ~12 engineers; backgrounds across FX/treasury/sovereign wealth/MM/HFT/actuarial/fintech/banking/DeFi/infra; 11 countries; three disciplines; angels = advisors (not employers roster).
- Compound “what is Sera + founder”: protocol section then team section.
- **Surfaces:** Swap (live), Earn (LP), Cashback (app — MYRT), On Par (same-peg), gSera (loyalty), Pay; Card = waitlist. MCP/agents = developer tooling, not end-user products.
- Marketing materials also cite ~40 stablecoins / many fiat corridors; treat counts as approximate — prefer live `GET /tokens` for the current list.
- Corridor depth varies; not every pair is always tradeable.

## Product map

| Surface | Role |
|---|---|
| Swap / API | Live FX CLOB + REST (`api.sera.cx`) |
| Earn | LP yield from FX spreads (Virtual Liquidity) |
| Cashback | Partner stores; cashback in MYRT — [app.sera.cx/en/cashback](https://app.sera.cx/en/cashback) |
| Pay | Merchant links / QR / checkout (`sera-cx/sera-pay`) |
| On Par™ | Same-peg stables at 1:1 |
| gSera | Loyalty points from referrals when they trade (not from content); XP is separate |
| Card | Coming soon / waitlist — not live |
| MCP / Agents | Developer tooling (`agents.sera.cx`) — not an end-user product |

## Networks

| | Mainnet | Sepolia |
|---|---|---|
| API | `https://api.sera.cx/api/v1` | `https://api.testnet.sera.cx/api/v1` or `https://api-testnet.sera.cx/api/v1` |
| App | https://sera.cx/ | https://testnet.sera.cx/ |
| Docs | https://docs.sera.cx | https://docs.testnet.sera.cx |
| chain_id | `1` | `11155111` |

Bootstrap contracts from `GET /config`. Prefer **v2** (Vault + signed orders). Legacy **v1** (Router/PriceBook + Goldsky) still exists — do not mix them.

## Company links (when asked)

| Profile | URL |
|---|---|
| Company LinkedIn | https://www.linkedin.com/company/seraprotocol |
| Company X | https://x.com/seraprotocol |
| Team page | https://www.sera.cx/team |

## Ask Sera vs trading tools

- **Ask Sera** — grounded Q&A + optional live public reads (`/tokens`, `/markets`, `/fx/rate`, `/health`, `/config`).
- **sera-mcp / sera-agent** — quotes and settlement tooling. Ask Sera does not sign or place orders.

## Keywords
what is sera, overview, team, company, live, mainnet, product, protocol
