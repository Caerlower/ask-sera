# Agents, MCP, and Ask Sera live data

## sera-mcp

Official Model Context Protocol server (~50+ tools). Repo: https://github.com/sera-cx/sera-mcp · site: https://agents.sera.cx/

```bash
git clone https://github.com/sera-cx/sera-mcp && cd sera-mcp
npm install && npm run build
# Claude example:
# claude mcp add sera --scope user --env SERA_NETWORK=mainnet --env POLICY_PRESET=standard -- node $(pwd)/dist/index.js
```

Remote keyless: `https://agents.sera.cx/mcp` (smaller tool set).

Categories: discovery, FX analytics, liquidity scan, quote/execute, maker ladder, treasury, orders (incl. VL), tx builders, admin (`doctor`).

Rules: prefer `get_quote` over `get_fx_rate`; use `simulate: true` while exploring; return `route_params` + `uuid` for wallet signing unless local signer enabled. Default `SERA_SIGNER_MODE=external` (no key on server). Policy presets cap notional/slippage/symbols.

## sera-agents

Templates + CLI + x402: https://github.com/sera-cx/sera-agents

- **Install MCP** · **Build** templates (`chat-cli`, `web-chat`, `webhook-agent`, `market-maker`) · **Run** `sera-agent/` CLI · **x402-service**
- Gateway: `agents.sera.cx` — `/rates`, `/corridors`, `/quote`, `/settle`, `/mcp`, `/openapi.json` (keyless read/prepare; settle returns unsigned EIP-712)

Ask Sera explains. sera-agent / mcp execute.

## Ask Sera live prefetch

Three layers, all server-side (prefetch — not Groq tool-calling):

| Layer | When | Source |
|---|---|---|
| Live REST | catalogs / FX / health / config | public Sera API |
| Firecrawl | product / team / community / docs pages | allowlisted official URLs (TTL + weekly cron) |
| Exa | announcements / “what’s new” | recent official Sera domains (tweets via Firecrawl → x.com/seraprotocol) |

REST question map:

| Question | Prefetch |
|---|---|
| All currencies/tokens | `GET /tokens` — full list |
| Is X supported? | token search |
| Pairs | `GET /markets` |
| FX / swap rate (e.g. USDC→SGD) | Live indicative \`POST /swap/quote\` (primary). FX mid only if they ask for reference/FX, or as a quiet aside. Present as live indicative quote (not a probe/sim label). |
| Contracts/domain | `GET /config` |
| API up? | `GET /health` |

Fiat names in rate questions map to preferred tokens (SGD→XSGD, USD→USDC). Same read path as MCP `get_fx_rate` / `get_quote(simulate)` — Ask Sera explains, it does not execute.

Full currency lists: every symbol from the live snapshot (no “and ~N more”). Point to `/tokens` only when the live fetch failed. Does not sign, place orders, or read private balances. Default network: mainnet (`SERA_NETWORK` / `SERA_API_BASE` optional).

## Keywords
mcp, sera-mcp, sera-agent, agents, agents.sera.cx, x402, doctor, get_quote, live tokens, list currencies
