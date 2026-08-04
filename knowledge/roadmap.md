# Protocol roadmap (high level)

Sera’s public docs describe four motions. Order matters: spot execution → useful balances → collateral → derivatives.

| Phase | Theme | Public timing cue |
|---|---|---|
| **Swap** | CLOB + on-chain settle; corridors; APIs | Current focus / 2026 Q1 launch framing |
| **Earn** | Retention: FX balances, Pay, cards, treasury utility | ~2026 Q2 Earn/Spend PMF framing |
| **Raise and Receive (Lend)** | Credit, reusable collateral, capital efficiency | ~2026 Q3 |
| **Accelerate** | Derivatives / risk markets | 2027+ |

## Live vs planned (important)

**Live today (Swap stack):** CLOB matching + on-chain settlement contracts (see `orderbook-contract-v2` / `/config`).

**Planned / not the current deployment:**

- FCICAMM (Function-Controlled Invariant Curve AMM) as complement to CLOB
- ERC-1155 position NFTs as programmable inventory objects for later derivatives
- Dutch auction AMM messaging on technology pages (“coming soon”)

Always prefer live `/config` and current docs over roadmap slides when answering “is X live?”.

Sources: [docs roadmap](https://docs.sera.cx/protocol/roadmap/), [docs swap](https://docs.sera.cx/protocol/swap/), [docs earn](https://docs.sera.cx/protocol/earn/).
