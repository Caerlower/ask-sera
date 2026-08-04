# On Par™

**On Par™** is Sera’s same-peg stablecoin clearing: any two stablecoins that share the same fiat peg should swap at **1:1**, regardless of issuer.

Examples:

- USD family: USDT ↔ USDC ↔ PYUSD ↔ …
- EUR family: EURC ↔ EURS ↔ …
- BRL family: BRZ ↔ BRLA ↔ …

## Why it exists

Same-peg coins often trade off-par across venues with slippage. Sera’s CLOB aims to concentrate liquidity at par for same-peg pairs with atomic on-chain settlement.

## Mechanics (product framing)

- **Virtual Liquidity**: one deposit can fan across many on-par destinations (marketing: up to ~20 pairs per deposit capacity sharing)
- **Smart Order Routing**: pair against a same-family anchor; reach the wider network; between fiat families, use live FX (not 1:1)
- Inside a family, triangular coherence keeps same-peg pairs at par; between families, market FX applies

## Use cases called out publicly

1. Instant 1:1 fungibility for a newly listed stablecoin in its family
2. Accept any same-peg coin, settle into the merchant/treasury preferred coin
3. Pay many recipients each in their preferred same-peg coin
4. Sweep many balances into one outgoing payment
5. Cross-currency FX on the same engine (par inside families, FX between them)

Source: [sera.cx/on-par](https://sera.cx/on-par)
