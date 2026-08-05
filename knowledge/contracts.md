# Contracts, networks, and v1 vs v2

## Bootstrap — always `GET /config`

Authoritative fields include: `sera_address`, `vault_address`, `sor_address`, EIP-712 domain `{name:"Sera", version:"1", chainId, verifyingContract}`, `limits.vl_batch`. `executor_id` comes from **`GET /health`**. Prefer live `/config` over hardcoding.

## v2 addresses (snapshot — prefer live `/config`)

Live `GET /config` returns **Sera**, **Vault**, and **SeraSOR** only. Those three are authoritative.

| | Mainnet | Sepolia |
|---|---|---|
| Sera | `0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198` | `0x83475A1bD98a8DC2DCd507A747e4DC85da241D6e` |
| Vault | `0xC7d4Fd2638e6630C8C61329878676b88A8A24D43` | `0x3c7945840bAE0d7e7f3824Ebccef1962629250F0` |
| SeraSOR | `0xa7A0cf7cd6f043fCA23f29d8ae5aae6b46e11c18` | `0x83c1368110B640A729f3810De5FBe94b99aa5668` |
| SeraBatcher (repo/docs; **not** in `/config`) | `0x1f4b366f4145A92978df4bEeb6BdE71bC652F034` | `0x29F99C5dc36D555933700BE3dffEa6e721a27f0a` |

There are no official `SeraMCP` / `SeraPay` settlement contract addresses in `/config`. MCP and Pay are clients of these rails.

Roles: **Sera** matching/settlement · **Vault** custody · **SOR** `executeIntent` · **Batcher** batch match (when listed in repo).

Repo: https://github.com/sera-cx/orderbook-contract-v2 (PolyForm Noncommercial). Powers REST, mcp, Pay.

## v1 vs v2

| | v2 (prefer for new work) | v1 (legacy) |
|---|---|---|
| Stack | Signed orders + Vault + REST | Router / PriceBook / NFT limits |
| Clients | sera-mcp, SeraPay, official REST | Older tutorials / Goldsky subgraph |
| Price | Quotes / book | `priceIndex` + `minPrice`/`tickSpace` |

Sepolia v1 addresses (verify on explorer; **not** a substitute for v2 `/config`): Router `0x82bfe1b31b6c1c3d201a0256416a18d93331d99e`, Market Factory `0xe54648526027e236604f0d91413a6aad3a80c01e`, Order Canceller `0x53ad1ffcd7afb1b14c5f18be8f256606efb11b1b`.

## Goldsky GraphQL (v1 only)

```
POST https://api.goldsky.com/api/public/project_cmicv6kkbhyto01u3agb155hg/subgraphs/sera-pro/1.0.9/gn
```

For v1 markets/depths/openOrders — **not** for v2 Vault/VL/SOR (use REST).

## Planned (not live v2)

Docs/roadmap have mentioned FCICAMM and ERC-1155 position NFTs as planned — not the live v2 deployment.

## Keywords
config, vault, sor, batcher, contract, mainnet, sepolia, chain_id, v1, v2, goldsky, graphql, subgraph
