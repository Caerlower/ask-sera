# REST API extras

Complement to `api-auth-fx.md`. Prefer live docs.testnet.sera.cx / docs.sera.cx if they disagree.

## Testnet base URLs

Both appear in official clients:

- `https://api.testnet.sera.cx/api/v1`
- `https://api-testnet.sera.cx/api/v1` (`sera-mcp` sepolia default)

Mainnet: `https://api.sera.cx/api/v1`

## Public endpoints (no auth)

`/health`, `/system/time`, `/tokens`, `/markets`, `/config`, `/fx/rate`,  
`POST /swap/quote`, `/swap/quote/batch`, `/verify-signature`, `/orders/preview`

## Practical signing notes

- Sync clock with `GET /system/time` (timestamps within ~5 minutes of server)
- Expiration/deadline: future and ≤ ~365 days (API enforced window)
- **Address casing**: read filters often want **lowercase** `owner_address`; signed payloads use **checksummed** EIP-55 — don't mix
- Gas on swaps: `gas_mode` `receive_less` | `pay_more` — taker does not need ETH for gas
- Sign `route_params` from quote **exactly** (no client rebuild)
- Deposit may use ERC-2612 Permit for some tokens (USDC, EURC, …)

## Rate limits (documented)

| Group | Limit |
|---|---|
| read (`/orders`, `/balances`, `/fills`) | ~10 req/s |
| trade (`/orders`, `/swap`) | ~5 req/s |
| cancel / transfer builders | ~2 req/s |

Cancel has a **~5 minute per-order cooldown** after placement (HTTP 429).

## Useful `error_code` values

Branch on `error_code`, not the human `detail` string:

`INSUFFICIENT_EQUITY`, `STP_BLOCKED`, `QUOTE_STALE`, `INTENT_DEADLINE_EXPIRED`, `SLIPPAGE_EXCEEDED`, `NO_LIQUIDITY`, `AMOUNT_BELOW_MIN`, `INVALID_PRECISION`, `ALLOWANCE_INSUFFICIENT`, `PAIR_INACTIVE`, `TRANSIENT_SETTLEMENT_FAILURE`

`NO_LIQUIDITY` / `no_liquidity` on mainnet often means **no MM depth for that pair right now**, not that the whole chain is down — see `quoting-liquidity.md` and `mainnet-liquidity.md`.

Do not treat `no_liquidity` like a transient 503: check another pair / size, consider an alternate corridor, or supply LP depth. Use retries for 5xx/`/health` failures, not as the default response to empty books.
## Markets precision

`markets[].rounding_mode` is typically `"reject_extra_precision"` — amounts/prices with extra decimals or non-canonical strings are rejected **before** signature checks.

## Contract snapshot (v2) — re-check `/config`

| | Mainnet | Sepolia |
|---|---|---|
| Sera | `0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198` | `0x83475A1bD98a8DC2DCd507A747e4DC85da241D6e` |
| Vault | `0xC7d4Fd2638e6630C8C61329878676b88A8A24D43` | `0x3c7945840bAE0d7e7f3824Ebccef1962629250F0` |
| SeraSOR | `0xa7A0cf7cd6f043fCA23f29d8ae5aae6b46e11c18` | `0x83c1368110B640A729f3810De5FBe94b99aa5668` |
| SeraBatcher | `0x1f4b366f4145A92978df4bEeb6BdE71bC652F034` | `0x29F99C5dc36D555933700BE3dffEa6e721a27f0a` |

## Keywords

rate limit, error_code, STP, quote stale, gas_mode, orders/preview, api-testnet, lowercase address, no_liquidity
