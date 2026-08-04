# Order signing and uuid_int (critical)

These are the highest-friction integration details. Getting them wrong yields opaque `400 signature mismatch` errors.

## EIP-712 Order struct

```
Order(
  address user,
  uint48 expiration,
  uint48 feeBps,
  address recipient,
  address fromToken,
  address toToken,
  uint256 fromAmount,
  uint256 toAmount,
  uint256 initialDepositAmount,
  uint256 uuid
)
```

`POST /orders` only sends a subset of fields in the HTTP body. The client and server must derive the remaining signed fields **identically**.

### Canonical derived values (verified against live `/verify-signature`)

| Field | Required value | Trap |
|---|---|---|
| `feeBps` | **`0`** | Non-zero fails |
| `recipient` | **zero address** `0x0000…0000` | Using the owner address fails |
| `initialDepositAmount` | **`0`** | Non-zero fails |
| `uuid` | the composite `uuid_int` | — |
| `user` | the owner address | — |

## Amount / side derivation

For a market with `base_address` / `quote_address`, quantity `q` and price `p`:

| side | fromToken | toToken | fromAmount | toAmount |
|---|---|---|---|---|
| `bid` | quote (`to_address`) | base | `q × p` (quote decimals) | `q` (base decimals) |
| `ask` | base (`from_address`) | quote | `q` (base decimals) | `q × p` (quote decimals) |

In the **request body**, `from_address` is always market base and `to_address` always market quote, regardless of side. The fromToken/toToken flip happens only inside the signed struct.

### Rounding

`q × p` is truncated with **ROUND_DOWN** (not half-up / banker's round). Wrong rounding → intermittent signature failures.

## uuid_int layout

```
[255:252] Executor (4 bit)
[251:124] Order ID (128 bit, full UUID4)
[123:12]  Group ID (112 bit = UUID4 >> 16)
[11:0]    Leg ID (12 bit)
```

```text
raw = int(UUID(order_id))
group_id = raw >> 16
uuid_int = (executor_id << 252) | (raw << 124) | (group_id << 12) | leg_id
```

- Standalone orders: `group_id = own_uuid >> 16`, `leg_id = 0`
- VL leg `i`: `group_id` from **leg 0's** UUID4, `leg_id = i`
- Carry `uuid_int` as a **decimal string** in JSON (uint256)

## Cancel ID trap

- `CancelOrder.orderId` is **`uint256`** — the composite `uuid_int`, not the UUID string
- `CancelVLBatch.vlBatchId` is **`string`** — UUID string of `order_ids[0]`

## Swaps

Sign `route_params` **exactly** as returned by `/swap/quote` — no client-side normalization.
