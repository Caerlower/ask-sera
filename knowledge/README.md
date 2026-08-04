# Knowledge pack

Ask Sera answers from these markdown files (plus optional live public API prefetch). It does **not** crawl the web.

| File | Topic |
|---|---|
| `assistant-policy.md` | Answer rules (always loaded) |
| `overview.md` | What Sera is, status, founder |
| `products.md` | Earn, Pay, On Par, gSera, roadmap |
| `api.md` | REST auth, signing, errors |
| `liquidity.md` | FX vs quote, `no_liquidity` |
| `agents.md` | MCP, agents, live prefetch |
| `contracts.md` | Networks, addresses, v1/v2 |
| `community.md` | Community hub, Token2049 (stated facts only) |

## Editing rules (keep this sanity-checked)

1. **Facts only** — copy what official pages/docs/APIs state. No inferred process, no guessed deadlines, no invented side-event weeks.
2. Prefer updating an existing file over adding a new one.
3. Use `##` headings (retrieval splits on them).
4. Put critical facts near the top of each section.
5. Snapshot addresses → always say re-check `GET /config`.
6. Marketing numbers (APY, “~40 stables”) → label as approximate / non-guarantee.
7. Restart `pnpm dev` after edits, then re-test the question.

See [CONTRIBUTING.md](../CONTRIBUTING.md).
