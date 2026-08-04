# What is Sera Protocol?

**Direct answer:** Sera is multi-currency settlement infrastructure for stablecoin FX. Apps and AI agents use it to quote, convert, and settle across ~40 stablecoins and ~22 fiat currencies (USD, SGD, MYR, JPY, EUR, GBP, BRL, MXN, IDR, and more) with non-custodial on-chain settlement on Ethereum.

## How to explain “What is Sera?” (use this depth by default)

When someone asks what Sera is, cover all of the following — not just the one-liner:

1. **Problem** — Cross-border FX and multi-stablecoin settlement is slow/expensive via banks; non-USD stables need real utility beyond trading.
2. **What Sera does** — Non-custodial CLOB + on-chain settlement for stablecoin FX corridors (Swap is the live phase).
3. **Who it’s for** — Merchants, remittance/payroll/PSPs, treasuries, and AI agents (via MCP / agents.sera.cx).
4. **Product surfaces** — briefly name Swap/API, Earn (LP spreads), Pay, Agents/MCP, On Par (same-peg 1:1), gSera (loyalty).
5. **Status** — Live on Ethereum Mainnet and Sepolia; not every corridor has depth yet.
6. **Company** — Founded by Douglas Gan (CEO); Singapore-associated; ~2025.

Keep it concrete. Skip marketing slogans.

**Founder & CEO:** Douglas Gan. Company base publicly associated with Singapore (founded ~2025). See `company.md`.

## Core surfaces

| Surface | Role |
|---|---|
| **Sera API** (`api.sera.cx`) | REST exchange: tokens, markets, FX, quotes, orders, vault, withdraw |
| **sera-mcp** | Model Context Protocol server — ~50+ tools so any agent host can use Sera |
| **sera-agents** | Templates, bundled CLI agent, x402 service, host integrations; site at [agents.sera.cx](https://agents.sera.cx) |
| **Contracts** (`orderbook-contract-v2`) | On-chain Sera, Vault, SOR, batcher |
| **sera-pay** | Merchant Pay product (links, QR, multi-currency checkout) |
| **Earn / On Par / gSera** | LP yield, same-peg 1:1 clearing, community loyalty points — see products-overview.md |
| **Ask Sera** (`sera-ask`) | Grounded Q&A + live public API reads (this app) |

See also: `products-overview.md`, `earn.md`, `pay.md`, `gsera.md`, `on-par.md`, `roadmap.md`, `v1-vs-v2.md`, `links.md`, `mainnet-liquidity.md`, `live-tools.md`, `quoting-liquidity.md`.

## Networks

| | Mainnet | Testnet (Sepolia) |
|---|---|---|
| API | `https://api.sera.cx/api/v1` | `https://api.testnet.sera.cx/api/v1` **or** `https://api-testnet.sera.cx/api/v1` |
| App | https://sera.cx/ | https://testnet.sera.cx/ |
| Docs | [docs.sera.cx](https://docs.sera.cx) | [docs.testnet.sera.cx](https://docs.testnet.sera.cx) (current REST/v2 guide) |
| chain_id | `1` | `11155111` |

Always bootstrap contracts from `GET /config` — never hardcode verifying contracts or the EIP-712 domain if you can avoid it.

**Status:** Sera is **live on Ethereum Mainnet** (`chain_id = 1`) and on **Sepolia** testnet (`11155111`). See `status-faq.md`.

**Architecture note:** official REST / MCP / Pay use **v2** signed-order + Vault. An older **v1** on-chain Router + PriceBook model also exists (GraphQL subgraph) — see `v1-vs-v2.md`. Do not confuse third-party sample apps with official products (`sample-repo.md`).

## What this assistant is for

- Explaining protocol concepts, signing, MCP tools, agents, and integration patterns
- **Live read tools** for catalogs and public market data (tokens, markets, FX reference, health, config, swap quotes) — same public REST data sera-mcp uses
- Distinguishing reference FX (`/fx/rate`) from executable quotes (`/swap/quote`)
- Pointing to the right repo / endpoint / tool
- Warning about known footguns (Order signing defaults, uuid_int, cancel ID types, pair-specific `no_liquidity`)

## What this assistant is NOT

- A trading bot that signs or places orders — use `sera-mcp` / `sera-agent` for execution
- A wallet or custodian — it never holds keys
- A substitute for authenticated account APIs (balances, withdraw) unless those are explicitly wired later
- A community link bot — Telegram/X only when the user asks about community or support
