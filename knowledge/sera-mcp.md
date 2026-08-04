# sera-mcp — tools for agents

`sera-mcp` is the core Model Context Protocol server for Sera. It exposes Sera Protocol as tools any MCP host can call (Claude Code, Cursor, ChatGPT, OpenAI Agents SDK, OpenClaw, Hermes, NanoClaw, etc.).

Companion: [sera-agents](https://github.com/sera-cx/sera-agents) · site: [agents.sera.cx](https://agents.sera.cx)

## Install (local full server)

```bash
git clone https://github.com/sera-cx/sera-mcp
cd sera-mcp && npm install && npm run build

claude mcp add sera --scope user \
  --env SERA_NETWORK=mainnet \
  --env POLICY_PRESET=standard \
  -- node $(pwd)/dist/index.js
```

Default install needs **zero env vars** for read/quote exploration. Execution requires signer configuration and policy.

## Remote keyless gateway

```bash
claude mcp add --transport http sera https://agents.sera.cx/mcp
```

Public gateway exposes a smaller tool set (rates, corridors, quote, settle-intent) without local install.

## Tool categories (names may be prefixed `sera_` / `sera.` depending on host)

| Category | Examples |
|---|---|
| Discovery | `list_currencies`, `search_coins`, `get_coin_metadata`, `get_markets` |
| FX & analytics | `get_fx_rate`, `compare_to_external_fx`, `multi_source_mid`, `spread_radar`, `fx_history`, `fx_volatility` |
| Liquidity | `scan_markets`, `find_deals`, `probe_depth`, `round_trip_cost`, `infer_book`, `market_health` |
| Quote & execute | `get_quote`, `prepare_swap`, `batch_quote`, `execute_swap`, `quote_recipient_amount`, `limit_watcher` |
| Maker | `maker_quote_ladder` |
| Treasury | `get_balances`, `treasury_value`, `exposure_report`, `rebalance_plan`, `pay_invoice` |
| Orders | `place_order`, `place_vl_batch`, `cancel_order`, `cancel_all_orders`, `list_orders`, `get_fills` |
| Tx builders | `build_approve`, `build_deposit`, `build_transfer`, `send_tx`, `withdraw_*` |
| Admin | `doctor`, `verify_signature`, `permit_metadata` |

## Operating rules for agents

- Prefer `get_quote` for prices; `get_fx_rate` is reference-only
- Use `simulate: true` while exploring
- For execution, return `route_params` + `uuid` for the user's wallet to sign unless local signer mode is explicitly enabled
- Run `doctor` to self-check connectivity and config

## Policy / safety defaults

- `SERA_SIGNER_MODE=external` by default — server holds no private key
- Policy presets (`starter` / `standard` / …) cap notional, slippage, symbol whitelist
- Network URLs are hardcoded; custom base URL requires an explicit allow flag
