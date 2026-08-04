# Live data tools (Ask Sera)

Ask Sera can call the **public** Sera REST API at answer time (same catalogs as official `sera-mcp` read tools). It does **not** need an API key for these.

Live data is **prefetched server-side** from the user question (not via fragile LLM tool-calling on Groq Llama).

## When live data is fetched

| User asks… | Prefetch |
|---|---|
| All currencies / tokens / stablecoins | `GET /tokens` — complete list |
| Is XSGD / EURC supported? | `GET /tokens` search |
| What pairs exist? | `GET /markets` |
| What’s USD/EUR right now? | `GET /fx/rate` (reference only) |
| Contract addresses / domain | `GET /config` |
| Is the API up? | `GET /health` |

Never answer “here are a few… and ~N more” for a full-list request. Never tell the user to call `GET /tokens` themselves unless the live fetch failed.

## What Ask Sera still does NOT do

- Place orders, sign EIP-712, withdraw, or read private balances (those need keys / `sera-mcp` execution mode)

## Network

Default **mainnet** (`https://api.sera.cx/api/v1`). Optional `SERA_NETWORK=sepolia` or `SERA_API_BASE` override.

## Keywords

list currencies, all tokens, all stablecoins, live api, get /tokens, markets, fx rate
