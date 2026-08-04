# Auth, endpoints, and FX

## Auth

`Authorization: Bearer {api_key}:{api_secret}` — a **colon-joined pair**, not a single token.

`api_secret` is returned only at key creation; max 10 active keys per wallet.

### Public (no auth)

`/health`, `/system/time`, `/tokens`, `/markets`, `/config`, `/fx/rate`,  
`POST /swap/quote`, `POST /verify-signature`

### Auth required (examples)

`GET /balances`, `GET /permit/metadata`, order placement, withdraw flows, etc.

## Endpoint groups

**System** — `GET /health` · `/system/time` · `/tokens` · `/markets` · `/fx/rate` · `/permit/metadata` · `/config` · `POST /verify-signature`

**Trading** — `POST /swap/quote` · `/swap/quote/batch` · `/swap` · `/orders` · `/orders/cancel` · `DELETE /orders/cancel-all` · `/orders/vl/batch` · `/orders/vl/cancel`

**Orders/Fills** — `GET /orders` · `/orders/{order_id}` · `/fills` · `/fills/{order_id}`

**Account** — balances, approve, deposit, tx/send, withdraw (+ build/send), transfer (+ send)

**API keys** — create / list / revoke / self-revoke / verify

## FX rate vs swap quote (do not conflate)

`GET /fx/rate` takes **ISO currency codes**, not token addresses:

```
GET /fx/rate?base=USD&quote=EUR
```

| | `/fx/rate` | `/swap/quote` |
|---|---|---|
| Role | Reference FX | Executable trade quote |
| Inputs | Fiat codes (USD, EUR, …) | Token pair + size |
| Can return `no_liquidity`? | No (not a book quote) | Yes — pair/size depth |

For executable prices use `POST /swap/quote` (or MCP `get_quote` / `prepare_swap`). See `quoting-liquidity.md`.
## Virtual Liquidity (VL)

- Batch size 2–50 siblings (`limits.vl_batch` from `/config`)
- All siblings must resolve to the same `fromToken`
- `vl_batch_id` = `order_ids[0]`
- Cancelling one sibling does **not** unfreeze collateral budget — use VL cancel or wait for all siblings to terminalize

## Withdraw

Dual-signature instant withdraw:

1. `withdraw_request` — user signs WithdrawIntent; executor co-signs
2. `withdraw_build` — returns unsigned `executeInstantWithdrawDualSig` tx
3. User signs raw tx locally
4. `withdraw_send` — broadcast
