# Mainnet liquidity & API notes (community report, 2026-07-29)

Time-stamped integrator + founder context. Treat as **historical status**, not a live dashboard — always re-check with `POST /swap/quote`, `GET /health`, and current docs.

Full integrator playbook: `quoting-liquidity.md`.

## Reported by integrators (2026-07-29)

From Blake Sieders (fax.money) to Sera:

- `POST /api-keys` was returning consistent **`503 Service temporarily unavailable`** (well-formed signed create requests; not a validation error). At that moment `/fx/rate` had already recovered while `/api-keys` had not.
- `GET /fx/rate` — **recovered**; returning live reference data (e.g. USD/EUR with 24h change). Remember: this is **not** an executable swap quote.
- Mainnet **`USDC ↔ EURC`** on `POST /swap/quote` returned **`no_liquidity`** (also observed earlier ~2026-07-21).
- Same day, mainnet **`USDC ↔ USDT`** (same USD peg) returned a **full tradeable quote** — so the swap engine itself was healthy; the gap was **cross-currency / non-USD corridor depth**, not total outage.

## Official response (Douglas Gan, Sera, same day)

> On mainnet anyone can be a liquidity provider, we’re adding liquidity providers for eurc and a few others.

Interpretation for answers:

1. Mainnet Swap is live; same-peg pairs may quote while some cross-currency pairs (e.g. USD↔EUR stables) can still show `NO_LIQUIDITY` / `no_liquidity` until more LPs quote those corridors.
2. Anyone can provide liquidity on mainnet (see Earn / LP flows / Virtual Liquidity).
3. Sera stated they were actively adding LPs for EURC and other non-USD assets — **no hard public ETA** was given; don’t invent a date.
4. Ephemeral 503s on specific endpoints (e.g. `/api-keys`) can happen independently of FX rate health — suggest retry, check `/health`, and report if persistent.

## How Ask Sera should answer

- “Is mainnet broken?” → Not necessarily; check pair-specific liquidity and endpoint health separately.
- “Why no_liquidity on USDC/EURC?” → Often thin or missing MM depth on that corridor; same-peg pairs may still work; LPs can quote; team has said they’re adding EURC (and similar) LPs. Re-check live.
- “`/fx/rate` works but swap doesn’t” → Expected possible split: reference FX ≠ executable depth.
- Do **not** invent current APY, TVL, or claim every corridor is deep.
- Do **not** tell integrators to blindly retry `no_liquidity` as if it were a 503.

## Keywords

no_liquidity, NO_LIQUIDITY, EURC, USDC, USDT, mainnet depth, market maker, LP, api-keys 503, fx/rate, swap quote
