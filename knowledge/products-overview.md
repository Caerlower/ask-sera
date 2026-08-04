# Sera product map

Sera is more than a swap API. Public surfaces people ask about:

| Surface | What it is | Where |
|---|---|---|
| **Swap / Settle** | Non-custodial stablecoin FX CLOB + on-chain settlement (live phase) | [docs.sera.cx](https://docs.sera.cx), app on sera.cx |
| **Earn** | LP yield from FX spreads via Virtual Liquidity; also the roadmap “Earn / Spend” phase (savings, pay, cards) | [sera.cx/earn](https://sera.cx/earn), [docs Earn](https://docs.sera.cx/protocol/earn/) |
| **Pay** | Merchant payment rails — links, QR, checkout settling in multi-currency stablecoins (`sera-pay`) | GitHub `sera-cx/sera-pay` |
| **Agents** | MCP, templates, x402, gateway for AI agents | [agents.sera.cx](https://agents.sera.cx), `sera-mcp`, `sera-agents` |
| **On Par™** | Same-peg stablecoins swap at 1:1 (USDT↔USDC, EURC↔EURS, etc.) | [sera.cx/on-par](https://sera.cx/on-par) |
| **gSera** | Community loyalty points (not the settlement engine) — earned for trades, liquidity, referrals | Ambassador / community program |
| **Issuers** | Multi-currency stablecoin distribution + corridor liquidity for issuers | [sera.cx/issuers](https://sera.cx/issuers) |
| **Card (coming)** | Stablecoin card / spend rails on the waitlist | Marketing site |

## Roadmap phases (docs)

1. **Swap** (current focus) — CLOB execution + on-chain settlement
2. **Earn** — retention: FX balances, pay, cards, treasury utility
3. **Raise and Receive (Lend)** — credit / reusable collateral
4. **Accelerate (Derivatives)** — hedging / structured exposure

FCICAMM and ERC-1155 position NFTs are **planned**, not the live `orderbook-contract-v2` deployment.

## Ask Sera vs trading agents

- **Ask Sera** explains products, protocol, and integration.
- **sera-mcp / sera-agent / agents.sera.cx** perform live quotes and settlement tooling.
