# Liquidity, FX rates, and `no_liquidity`

## Reference vs executable

| Endpoint | Meaning |
|---|---|
| `GET /fx/rate` | Reference FX (ISO currency codes) |
| `POST /swap/quote` | Executable quote; can return `NO_LIQUIDITY` / `no_liquidity` |

A healthy `/fx/rate` does **not** prove a corridor is tradeable.

## What `no_liquidity` means

Usually: insufficient **maker/LP depth** for that pair or size — not “chain down” and not automatically a contract failure. Same-peg pairs can quote while a cross-currency pair returns `no_liquidity`.

Integrator pattern:

1. Call `/swap/quote` for the exact tokens/size; branch on `error_code`.
2. On `NO_LIQUIDITY`: change size/corridor or wait for LP depth — do not spin-retry like a 503.
3. On 5xx: backoff; check `GET /health`.
4. Before signing: watch `QUOTE_STALE`; sign `route_params` exactly.

Anyone can LP on mainnet (see Earn).

## Historical note (2026-07-29) — re-check live

Dated integrator thread (Blake Sieders) + Douglas Gan reply — **historical**, not a live dashboard:

- `/fx/rate` recovered; `POST /api-keys` sometimes **503**.
- Mainnet **USDC↔EURC** `/swap/quote` → `no_liquidity` (also seen ~2026-07-21).
- Same day **USDC↔USDT** returned a tradeable quote.
- Douglas: anyone can LP; team working on more EURC (and similar) LP — **no hard ETA stated**.

## Keywords
no_liquidity, NO_LIQUIDITY, eurc, depth, corridor, market maker, fx/rate, swap/quote
