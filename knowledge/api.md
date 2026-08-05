# REST API, auth, and signing

## Bases

- Mainnet: `https://api.sera.cx/api/v1`
- Testnet: `https://api.testnet.sera.cx/api/v1` **or** `https://api-testnet.sera.cx/api/v1` (sera-mcp sepolia uses hyphen)
- Docs: https://docs.testnet.sera.cx/ (REST/v2) · https://docs.sera.cx/ (product)

## Auth

`Authorization: Bearer {api_key}:{api_secret}` — colon-joined pair. Secret only at key creation; max 10 keys/wallet.

### Public (no auth)

`/health`, `/system/time`, `/tokens`, `/markets`, `/config`, `/fx/rate`,  
`POST /swap/quote`, `/swap/quote/batch`, `/verify-signature`, `/orders/preview`

### Auth required (examples)

Balances, place/cancel orders, withdraw, transfers, API key admin.

## FX vs executable quote

| | `GET /fx/rate` | `POST /swap/quote` |
|---|---|---|
| Input | ISO codes `USD`/`EUR` | Token pair + size |
| Meaning | Reference FX | Executable + `route_params` |
| `no_liquidity` | No | Yes |

A healthy `/fx/rate` is reference mid only — it does not prove a corridor is tradeable.

## Signing (EIP-712 Order) — footguns

```
Order(user, expiration, feeBps, recipient, fromToken, toToken,
      fromAmount, toAmount, initialDepositAmount, uuid)
```

Canonical derived defaults: `feeBps=0`, `recipient=0x000…000`, `initialDepositAmount=0`, `uuid=uuid_int`.

- Body: `from_address` = market base, `to_address` = market quote always; flip only inside signed struct for side.
- Bid: quote→base amounts `q×p` / `q`. Ask: base→quote `q` / `q×p`. `q×p` truncated **ROUND_DOWN**.
- **uuid_int** bit layout: executor(4) | order UUID(128) | group(112) | leg(12). Carry as **decimal string**.
- Cancel order ID = **uint256 uuid_int** (not UUID string). VL batch cancel ID = **string** UUID of `order_ids[0]`.
- Sign `route_params` from quote **exactly**. Sync clock via `GET /system/time` (~5 min).
- Filters often want **lowercase** addresses; signed payloads use **EIP-55**.
- `gas_mode`: `receive_less` | `pay_more`. Some deposits use ERC-2612 Permit.
- `executor_id` from **`GET /health`** (not `/config`).

## Virtual Liquidity & withdraw

- VL batch size 2–50 (`limits.vl_batch` from `/config`); same `fromToken`; `vl_batch_id = order_ids[0]`.
- Cancelling one sibling does not unfreeze collateral — VL cancel or wait terminal.
- Instant withdraw: `withdraw_request` → `withdraw_build` → user signs tx → `withdraw_send`.

## Rate limits & errors

| Group | ~Limit |
|---|---|
| read | 10/s |
| trade | 5/s |
| cancel / builders | 2/s |

Cancel has ~5 min per-order cooldown (429).

Branch on `error_code`: `INSUFFICIENT_EQUITY`, `STP_BLOCKED`, `QUOTE_STALE`, `INTENT_DEADLINE_EXPIRED`, `SLIPPAGE_EXCEEDED`, `NO_LIQUIDITY`, `AMOUNT_BELOW_MIN`, `INVALID_PRECISION`, `ALLOWANCE_INSUFFICIENT`, `PAIR_INACTIVE`, `TRANSIENT_SETTLEMENT_FAILURE`.

Markets often use `rounding_mode: "reject_extra_precision"`.

## Keywords
api, auth, bearer, fx rate, swap quote, eip-712, uuid_int, route_params, gas_mode, error_code, vl, withdraw, rate limit
