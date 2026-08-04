# Earn (LP yield + roadmap phase)

“Earn” means two related things on Sera — distinguish them when answering.

## 1) Earn as LP product (live marketing / LP flows)

Liquidity providers deposit stablecoins and earn the **real FX spread** on swaps that route through their quotes — not token emissions as the primary yield story.

### Mental model

Like a money changer: deposit one asset (e.g. USDC or TGBP). That deposit can quote against many corridors. Capital is meant to stay productive via **Virtual Liquidity** rather than sitting in a single AMM pool.

### How LPs make money

- Provide bid/ask (or rates) on corridors
- Earn the spread when flow hits those quotes
- Strategies:
  - **Matched pair** — both sides of a pair; lock spread; marketed as IL-resistant for risk-averse LPs
  - **Unmatched** — one-sided capital quoted against many destinations; blended yield

### Who can LP on mainnet?

**Anyone.** Providing quotes is how missing corridors (e.g. thin EURC pairs) get depth. If `/swap/quote` returns `no_liquidity` for a pair, that is often an invitation for makers — not proof the protocol is offline (see `quoting-liquidity.md`).
### Claims commonly published (treat as marketing / indicative)

- 40+ supported stablecoins
- Capital-weighted avg LP APY around ~10% (volume-dependent; not guaranteed)
- Very high capital efficiency vs pooled AMMs (marketing often cites >100× / 30k+ synthetic pairs)
- No lock-ups; withdraw anytime (product claims)
- Non-custodial: keys stay with the user; settlement on audited contracts (CertiK cited)

### Risks called out publicly

- Smart-contract risk (audits + `emergencyWithdraw` escape hatch)
- Oracle / reference-band circuit breakers (e.g. halt if feeds deviate > ~2%)
- Yield scales with corridor volume — not a fixed bank rate; not SDIC/FDIC insured

Source pages: [sera.cx/earn](https://sera.cx/earn), [docs Earn](https://docs.sera.cx/protocol/earn/).

## 2) Earn as roadmap phase

Docs: after Swap works, Earn is retention and everyday utility — savings, treasury workflows, remittance, payments, and eventually spend rails such as cards. Persistent balances matter more than one-off swap flow.

Timeline in public roadmap (subject to change): Earn / Spend emphasized around **2026 Q2** after Swap launch focus.
