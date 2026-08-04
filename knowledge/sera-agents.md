# sera-agents — templates and agent products

Repo for templates, examples, docs, and x402 integrations on top of `sera-mcp`. Live site: [agents.sera.cx](https://agents.sera.cx)

## Four paths

| Path | For | Artifact |
|---|---|---|
| **A — Install** | Existing agent stack | `sera-mcp` (or remote `https://agents.sera.cx/mcp`) |
| **B — Build** | New agent product | `templates/{chat-cli, web-chat, webhook-agent, market-maker}` |
| **C — Run** | Out-of-the-box CLI | `sera-agent/` |
| **D — Protocol** | Agent only knows x402 | `x402-service/` |

## Bundled sera-agent

Interactive terminal chat wired to Sera MCP. Example prompts:

- "What stablecoins do you support for SGD?"
- "How much USDC to deliver exactly 5,000 MYR?"
- "Run find_deals at 25 bps"

This agent is a **settlement / FX operator**, not a docs Q&A bot. Ask Sera (`sera-ask`) is the docs/developer assistant; `sera-agent` is for live tooling.

## Host integrations

Under `integrations/`: OpenClaw (MCP + clawhub skill + plugin), Hermes (MCP + skill), NanoClaw, Virtuals/GAME, X agents, standard MCP hosts (Cursor, Claude Desktop, ChatGPT, Cline, …).

## agents-gateway

Public HTTP + MCP at `agents.sera.cx`: `/rates`, `/corridors`, `/quote`, `/settle`, `/mcp`, `/openapi.json`. Keyless read/prepare; settle returns unsigned EIP-712 typed data.

## Skills in-repo

- OpenClaw clawhub: `integrations/openclaw/clawhub/SKILL.md` (settlement skill; publish status may lag)
- Hermes: `integrations/hermes/sera/SKILL.md`

These teach agents to call MCP tools — they are not documentation Q&A skills.
