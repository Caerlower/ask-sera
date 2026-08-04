# Maintaining Ask Sera knowledge

Ask Sera only knows what is in `knowledge/*.md`. It does **not** crawl docs.sera.cx or GitHub at runtime.

## Official vs third-party

- Put **official** protocol/product facts in topic files (`status-faq`, `earn`, `sera-mcp`, …).
- `sample-repo.md` exists only to warn that community sample apps are **not** official Sera products.
- Never add “Sera ships telegram bot X” unless it is an official `sera-cx` / sera.cx surface.

## When an answer is wrong or thin

1. Reproduce the question in the UI.
2. Check whether a matching fact exists under `knowledge/`.
   - Missing → add or update a markdown file (prefer FAQ-style clear statements).
   - Present but missed → improve headings/keywords or retrieval (see `lib/knowledge.ts`).
3. Restart `npm run dev` after big knowledge edits (module cache).
4. Re-ask the same question.

## How to add a topic

1. Create `knowledge/<topic>.md` with a clear `#` title and `##` sections.
2. Lead with a direct answer in the first paragraph (“**Yes.** Sera is live on Ethereum Mainnet…”).
3. Add a short “Keywords” / alias line for slang users might type.
4. Link official sources (`docs.sera.cx`, `sera.cx/...`) for the user to verify.
5. Keep live vs roadmap explicit.
6. For integrator/API gotchas, prefer or extend `quoting-liquidity.md`, `signing-orders.md`, or `rest-api-extras.md` instead of burying facts only in overview.

## Core specialist files

| File | Use when |
|---|---|
| `company.md` | Founder, CEO, HQ, general company FAQ |
| `assistant-policy.md` | Always — answer quality bar |
| `quoting-liquidity.md` | `/fx/rate` vs `/swap/quote`, `no_liquidity`, corridor depth |
| `mainnet-liquidity.md` | Dated Jul 2026 community + founder notes |
| `status-faq.md` | Is it live? which chain? |
| `community.md` | Telegram / socials only |
## Good chunk style

```md
# What is X?

**One-sentence direct answer.**

## Details
...

## Keywords
x, alias, slang
```

Chunks split on `##` headings — put the critical fact near the top of a section.

## Periodic refresh

Re-check against:

- `GET https://api.sera.cx/api/v1/config`
- [docs.sera.cx](https://docs.sera.cx)
- Product pages: earn, on-par, agents.sera.cx, ambassador.sera.cx

Update addresses and “live vs planned” language whenever the protocol ships a phase change.

## Do not

- Paste entire unreviewed marketing pages without marking indicative APYs
- Invent tokenomics, contract addresses, or claim something is live without a source
- Put secrets in knowledge files
