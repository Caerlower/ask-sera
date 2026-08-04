# Live status and networks (FAQ)

## Is Sera live?

**Yes.** Sera Protocol is live on **Ethereum Mainnet** and also available on **Ethereum Sepolia** testnet.

| Network | Status | chain_id | API |
|---|---|---|---|
| Ethereum Mainnet | **Live** | `1` | `https://api.sera.cx/api/v1` |
| Ethereum Sepolia | Testnet | `11155111` | `https://api.testnet.sera.cx/api/v1` (also `https://api-testnet.sera.cx/api/v1` in some official clients) |

## Who founded Sera?

**Douglas Gan** — Founder & CEO. See `company.md` for company / HQ / general facts.

## Docs to prefer for integrations

- **REST + v2 contracts:** https://docs.testnet.sera.cx/
- **Product / roadmap / Earn:** https://docs.sera.cx/
- **Testnet app:** https://testnet.sera.cx/
- Full curated list: `links.md`

## Mainnet liquidity (important)

Mainnet Swap is live, but **not every corridor has depth**.

- Same-peg pairs (e.g. USDC↔USDT) may return tradeable quotes.
- Some cross-currency pairs (e.g. USDC↔EURC) can return `no_liquidity` until market makers quote them.
- Sera has stated anyone can LP on mainnet and that they are adding LPs for EURC and other assets (community update 2026-07-29 — historical; see `mainnet-liquidity.md` and `quoting-liquidity.md`).
- Always verify with a live `POST /swap/quote`. Do not infer tradeability from `GET /fx/rate` alone.

## `/fx/rate` vs `/swap/quote` (quick FAQ)

**Q: FX looks fine — why can’t I swap USDC→EURC?**  
A: `/fx/rate` is a reference rate for fiat codes. Executable liquidity is `/swap/quote`. Missing makers on that token corridor → `no_liquidity`.

**Q: Is that an API bug?**  
A: Usually no — pair-specific depth. Confirm other pairs and `GET /health` before calling it an outage.

## Which chain?

Settlement and contracts run on **Ethereum** (mainnet chain id `1`). This is not a separate L2 deployment for the core orderbook stack described in current docs.

## How to confirm addresses?

Call public `GET /config` on the chosen API base. That response is authoritative for `sera_address`, `vault_address`, `sor_address`, and the EIP-712 domain. Static notes in this knowledge pack may lag; prefer `/config` for integrations.

## Is Swap live or still roadmap?

**Swap / CLOB settlement is the live phase.** Later phases (Earn retention products, Lend, Derivatives, FCICAMM, ERC-1155 positions) are roadmap / partial product surfaces — say “live vs planned” carefully (see `roadmap.md`).

## Keywords for retrieval

live, mainnet, testnet, sepolia, ethereum, chain, chain_id, deployed, production, launch, available, network, no_liquidity, fx rate, swap quote
