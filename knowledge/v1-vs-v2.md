# Sera v1 vs v2 (critical)

Sera has **two different trading architectures**. Mixing them up is the #1 source of bad answers.

## Quick rule

| Need | Use |
|---|---|
| New integrations, official `sera-mcp`, SeraPay, limit/swap via REST | **v2** — EIP-712 signed orders + Vault + `api.sera.cx` / testnet REST |
| Older on-chain Router / PriceBook / NFT order flows + Goldsky depth/charts | **v1** — historical / still-indexed CLOB model |

**v2 is live on Ethereum Mainnet and Sepolia** and powers the official REST API, `sera-mcp`, and SeraPay.

## v1 — on-chain CLOB

- Contracts: Router, OrderBook, PriceBook, Market Factory
- Orders live on-chain at a `priceIndex`; limit orders can be NFTs
- Price math: `price = minPrice + (tickSpace * priceIndex)` (18-decimal internal)
- Amounts use `rawAmount` / `quoteUnit` conversions
- Market data historically via Goldsky GraphQL subgraph (markets, depths, openOrders, chartLogs) — see `graphql-subgraph.md`
- Typical flow: approve Router → `limitBid`/`limitAsk` → poll indexer → `claim`

Sepolia v1 addresses sometimes cited in community notes (verify on explorer before use — **not** a substitute for v2 `/config`):

| Contract | Sepolia |
|---|---|
| Router | `0x82bfe1b31b6c1c3d201a0256416a18d93331d99e` |
| Market Factory | `0xe54648526027e236604f0d91413a6aad3a80c01e` |
| Order Canceller | `0x53ad1ffcd7afb1b14c5f18be8f256606efb11b1b` |

## v2 — signed-order + Vault (current official stack)

- Contracts: `Sera`, `Vault`, `SeraSOR`, `SeraBatcher` (`orderbook-contract-v2`)
- Users sign EIP-712 `Order` / `Intent` off-chain; executor matches; Vault settles
- **No** `priceIndex`, PriceBook, or NFT orders
- Virtual Liquidity batches, SOR multi-hop, dual-sig withdraw
- Prefer `GET /config` for addresses; REST handles matching/routing
- License note: contract repo is **PolyForm Noncommercial** (not OSI “open source”); `sera-pay` / agents repos may be MIT — don't conflate

## Keywords

v1, v2, router, pricebook, priceIndex, goldsky, subgraph, vault, eip-712, signed order, orderbook-contract-v2
