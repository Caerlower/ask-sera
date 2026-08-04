# Smart contracts

Sera has **v1** (Router/PriceBook CLOB) and **v2** (Sera/Vault/SOR/Batcher) stacks — see `v1-vs-v2.md`.

## v2 (powers REST API, sera-mcp, SeraPay) — live mainnet + Sepolia

Key pieces:

- **Sera** — signed-order matching / settlement
- **Vault** — per-user custody
- **SeraSOR** — smart order routing (`executeIntent`)
- **SeraBatcher** — batch match wrappers (best-effort, fill-or-kill, mixed / SOR)

Snapshot addresses (always re-check `GET /config`):

| Contract | Mainnet | Sepolia |
|---|---|---|
| Sera | `0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198` | `0x83475A1bD98a8DC2DCd507A747e4DC85da241D6e` |
| Vault | `0xC7d4Fd2638e6630C8C61329878676b88A8A24D43` | `0x3c7945840bAE0d7e7f3824Ebccef1962629250F0` |
| SeraSOR | `0xa7A0cf7cd6f043fCA23f29d8ae5aae6b46e11c18` | `0x83c1368110B640A729f3810De5FBe94b99aa5668` |
| SeraBatcher | `0x1f4b366f4145A92978df4bEeb6BdE71bC652F034` | `0x29F99C5dc36D555933700BE3dffEa6e721a27f0a` |

Repo: https://github.com/sera-cx/orderbook-contract-v2 (PolyForm Noncommercial — not OSI open source). Audits under the repo's audit tree; CertiK cited publicly.

## Security-relevant themes (v2)

- Signature caching on partial fills after first EIP-712 / EIP-1271 verification
- Signed SOR recipient enforcement
- Dual withdraw: delayed `emergencyWithdraw` (~24h) or instant dual-sig
- Fee-on-transfer / rebasing tokens not supported
- Admin often transferred to Timelock before renouncing deployer

## v1 (historical on-chain CLOB)

On-chain Router + PriceBook + NFT limit orders; market data via Goldsky subgraph. See `graphql-subgraph.md` and `v1-vs-v2.md`. Prefer v2 REST for new official integrations.
