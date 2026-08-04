# Ask Sera

Grounded Q&A assistant for **Sera Protocol** — protocol, products, API, agents, and live public market data.

**Not** a trading bot. Live quotes / settlement → [`sera-mcp`](https://github.com/sera-cx/sera-mcp) or [agents.sera.cx](https://agents.sera.cx).

Built with Next.js + Groq. Designed for **Vercel**.

## Local run

```bash
cp .env.example .env.local
# set GROQ_API_KEY=
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_MODEL` | No | Default `llama-3.3-70b-versatile` |
| `SERA_NETWORK` | No | `mainnet` (default) or `sepolia` |
| `SERA_API_BASE` | No | Override Sera REST base URL |

Never commit `.env` / `.env.local`.

## Deploy on Vercel

1. Import this repo as a Vercel project.
2. Set `GROQ_API_KEY` (and optional vars above).
3. Deploy. Suggested hostname: `ask.sera.cx`.

## Architecture

```
Browser chat UI
    │  POST /api/chat
    ▼
Keyword retrieval over knowledge/*.md
  + optional live public Sera API prefetch (tokens, markets, fx, …)
    │
    ▼
Groq stream — llama-3.3-70b-versatile (Vercel AI SDK)
```

| Path | Role |
|---|---|
| `app/` | Next.js App Router UI + API |
| `knowledge/` | Curated markdown corpus |
| `lib/` | Retrieval, live prefetch, prompts |
| `components/` | Chat UI |

## Updating knowledge

See [`knowledge/README.md`](./knowledge/README.md). Edit markdown under `knowledge/`, restart `npm run dev`, re-test.

## License

Private / as designated by Sera Protocol.
