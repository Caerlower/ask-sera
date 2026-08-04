# Contributing

Thanks for helping improve Ask Sera. Prefer small, focused PRs.

## Setup

```bash
cp .env.example .env.local   # add GROQ_API_KEYS
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## What to work on

| Area | Notes |
|---|---|
| `knowledge/` | Highest impact — keep facts short, accurate, current |
| `lib/` | Retrieval, failover, prompts, live prefetch |
| UI | Accessibility, mobile, clarity |

### Knowledge rules

- Prefer editing an existing file over adding a new one
- Split sections with `##` (retrieval chunks on those)
- No invented APYs, TVL, ETAs, or addresses — use live APIs / `GET /config`
- Restart `pnpm dev` after edits, then re-test the question

Details: [knowledge/README.md](./knowledge/README.md).

### Code rules

- Match existing TypeScript / Next.js style
- Keep user-facing errors sanitized (`lib/errors.ts`)
- Never commit secrets
- Run `pnpm typecheck` and `pnpm build` when you change `app/` or `lib/`

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`)
2. One concern per PR when possible
3. Describe what changed and why
4. Link related issues

## Issues

Use the templates under `.github/ISSUE_TEMPLATE/`. Scrub any API keys from logs.

## License

Contributions are licensed under [MIT](./LICENSE).
