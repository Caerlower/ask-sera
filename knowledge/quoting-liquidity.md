# Quoting, FX rates, and liquidity (integrator guide)

This is the canonical guide for questions about quotes, `no_liquidity`, `/fx/rate`, and mainnet depth.

## Reference rate vs executable quote

| | `GET /fx/rate` | `POST /swap/quote` |
|---|---|---|
| Input | ISO currency codes (`base=USD&quote=EUR`) | Token / market pair amounts |
| Meaning | Reference mid/band style FX with bid/ask asymmetry | Executable route + `route_params` for signing |
| Auth | Public | Public |
| Failure modes | Endpoint/network issues | `NO_LIQUIDITY`, `QUOTE_STALE`, `AMOUNT_BELOW_MIN`, precision errors, … |
| Use when | Analytics, display, comparison | Anything you might trade or settle |

**Never treat a healthy `/fx/rate` as proof that a token corridor is tradeable.** MCP rule of thumb: prefer `get_quote` / `prepare_swap` for prices; `get_fx_rate` is reference-only.

## Interpreting `no_liquidity` / `NO_LIQUIDITY`

Typical meaning on a live mainnet: **no market maker / LP is quoting that corridor right now** (or depth is insufficient for the size), not that Ethereum is down and not that the Sera contracts are broken.

Diagnostic pattern that appeared in integrator reports (2026-07-29, historical):

- Same-peg **USDC ↔ USDT** returned a full tradeable quote → swap engine healthy.
- Cross-currency **USDC ↔ EURC** returned `no_liquidity` → thin/missing EUR-corridor makers.
- `GET /fx/rate` could be healthy at the same time an unrelated endpoint (e.g. `POST /api-keys`) returned **503** — check endpoint health separately from pair depth.

## What integrators should do

1. **Quote path:** always call `POST /swap/quote` (or batch) for the exact tokens/size you intend to settle. Branch on `error_code`, not free-text `detail`.
2. **On `NO_LIQUIDITY`:** treat as pair-specific. Options: try a smaller size, an alternate corridor, a same-peg On Par path if that fits the user goal, or wait/add LP depth. Do **not** spin-retry as if it were a transient 5xx unless `/health` or other pairs are also failing.
3. **On 5xx / 503:** retry with backoff, check `GET /health`, and treat as endpoint availability — independent of whether FX rates look fine.
4. **Before signing:** quotes can go `QUOTE_STALE`; sign `route_params` exactly as returned; sync clock via `GET /system/time`.
5. **Supplying depth:** on mainnet **anyone can be an LP** (Earn / Virtual Liquidity). Deposit stables and quote corridors; yield is the real FX spread when flow hits those quotes. Sera has stated they were adding EURC (and similar) LPs — **no public hard ETA**; always re-probe live quotes.

## How Ask Sera should answer this class of question

- Verdict first: depth/MM issue vs outage vs auth/config bug.
- Separate `/fx/rate` from `/swap/quote`.
- Give the integrator branch (quote check → error_code → alternate corridor / LP).
- Mention Jul 2026 notes only as historical evidence, then “re-check live.”
- No Telegram footer. No marketing closer.

## Keywords

fx rate, /fx/rate, swap quote, /swap/quote, no_liquidity, NO_LIQUIDITY, depth, corridor, executable, reference rate, EURC, USDC, USDT, integrator, market maker, LP
