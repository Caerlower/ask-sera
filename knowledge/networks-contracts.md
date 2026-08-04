# Networks, contracts, and config

Verified against live `GET /config` and docs.sera.cx. Prefer live `/config` over any static note.

## Bootstrap

`GET /config` needs no auth and is the authoritative bootstrap. It returns:

- `sera_address`, `vault_address`, `sor_address`
- `eip712_domain`: `{ name: "Sera", version: "1", chainId, verifyingContract: <sera_address> }`
- `limits.vl_batch`: `{ min: 2, max: 50 }`

**Never hardcode the EIP-712 domain** — read it at startup so mainnet/testnet switch cleanly.

## Mainnet (illustrative — re-check `/config`)

| Field | Value (as previously verified) |
|---|---|
| API base | `https://api.sera.cx/api/v1` |
| chain_id | `1` |
| sera_address | `0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198` |
| vault_address | `0xC7d4Fd2638e6630C8C61329878676b88A8A24D43` |
| sor_address | `0xa7A0cf7cd6f043fCA23f29d8ae5aae6b46e11c18` |

## Testnet / Sepolia (illustrative — re-check `/config`)

| Field | Value (as previously verified) |
|---|---|
| API base | `https://api.testnet.sera.cx/api/v1` |
| chain_id | `11155111` |
| sera_address | `0x83475A1bD98a8DC2DCd507A747e4DC85da241D6e` |
| vault_address | `0x3c7945840bAE0d7e7f3824Ebccef1962629250F0` |
| sor_address | `0x83c1368110B640A729f3810De5FBe94b99aa5668` |

## executor_id

`executor_id` comes from **`GET /health`**, not `/config`. Live mainnet has returned `executor_id: 0`. A drifting executor id invalidates every outstanding signed UUID — read it once at startup and cache carefully.
