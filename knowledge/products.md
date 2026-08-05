# Products — Swap, Earn, Cashback, Pay, On Par, gSera, Card

## Product taxonomy (use this for “what products…”)

**End-user / app products** (in the Sera app at [app.sera.cx](https://app.sera.cx)):

| Product | Status | What it is |
|---|---|---|
| **Swap** | Live | Stablecoin FX CLOB + on-chain settlement |
| **Earn** | Live | LP / Virtual Liquidity — earn FX spread when quotes fill |
| **Cashback** | Live in app | Shop partner stores; cashback paid in **MYRT** |
| **On Par™** | Live feature | Same-peg stables at **1:1** (not “real FX rate”) |
| **gSera** | Live loyalty | Points from **referrals when referred people trade** (not content) |
| **Transfer / Wallet** | Live app rails | Move / hold balances in-app |
| **SeraPay** | Open rails | Merchant links / QR / checkout (`sera-cx/sera-pay`) |
| **Stablecoin Card** | Coming soon / waitlist | Marketing on sera.cx — **not live spend** |

**Developer tooling** (not peers of Swap/Earn for end users unless asked about building/integrating):

- REST API, **sera-mcp**, **sera-agents** / [agents.sera.cx](https://agents.sera.cx/) — developer tooling on the settlement rails

## Cashback (important)

- **UI:** [https://app.sera.cx/en/cashback](https://app.sera.cx/en/cashback)
- **Live merchants API:** `GET https://app.sera.cx/api/cashback/merchants` — live list (over any static list)
- Flow: choose a store → shop as usual → cashback tracked to wallet → paid after the store confirms the order
- Rewards currency: **MYRT**
- Rates are “up to” and can depend on category, region, and store rules; payout often ~45 days
- Fallback examples if live fetch fails (verify against API when possible): **Agoda** (Travel), **Trip.com** (Travel), **iHerb** (Health)
- Cashback is a live app feature at [app.sera.cx/en/cashback](https://app.sera.cx/en/cashback) (not primarily documented on docs.sera.cx)

## Earn (LP)

LPs deposit stables and earn the **FX spread** when swaps fill their quotes (primary story is spread, not emissions). **Virtual Liquidity** lets one deposit quote across multiple corridors.

- Product pages may show illustrative APYs — **not guarantees**
- Pages: [sera.cx/earn](https://sera.cx/earn), [docs Earn](https://docs.sera.cx/protocol/earn/)

## Pay (SeraPay)

Merchant payments: links, branded QR, dashboard, multi-currency checkout. Repo: https://github.com/sera-cx/sera-pay.

## On Par™

Same-peg stables at **1:1** regardless of issuer (e.g. USDT↔USDC). Cross-fiat families use live FX. [sera.cx/on-par](https://sera.cx/on-par)

## gSera

Loyalty points — **not** the settlement token.

**gSera:** referrals **only when referred people trade**. Content → **XP**, not gSera.

Hub: https://community.sera.cx/ only.

## Card

Homepage: “Coming soon / Waitlist open” — not a live spend product.

## Roadmap (non-binding marketing)

| Phase | Focus |
|---|---|
| Swap | CLOB + settle (**live**) |
| Earn | Retention / Pay / cards (later) |
| Lend | Credit / collateral (later) |

**Live core today:** Swap / `orderbook-contract-v2`.

## Keywords
products, product, swap, earn, cashback, cash back, stores, agoda, trip.com, iherb, myrt, pay, serapay, on par, same-peg, gsera, xp, card, waitlist, roadmap
