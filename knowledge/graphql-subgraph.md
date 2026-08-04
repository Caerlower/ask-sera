# Goldsky GraphQL subgraph (v1 market data)

Public **v1** on-chain order book indexer (not the v2 REST API).

## Endpoint

```
POST https://api.goldsky.com/api/public/project_cmicv6kkbhyto01u3agb155hg/subgraphs/sera-pro/1.0.9/gn
```

- Auth: none (public)
- Content-Type: `application/json` with `{ "query", "variables?" }`

## Common query types

| Query | Use |
|---|---|
| `market(id)` / `markets` | Pair metadata: tokens, `quoteUnit`, fees, `minPrice`, `tickSpace`, latest price |
| `depths` | Order book levels (`priceIndex`, `price`, `rawAmount`, `isBid`) |
| `openOrders` | User resting orders |
| `chartLogs` | OHLCV (`intervalType` e.g. `1d`) |
| `tokens` | Token registry by symbol |

## When NOT to use this

- Building on **v2 REST** (official `sera-mcp`, SeraPay) → use `GET /markets`, `/tokens`, `/orders`, `/swap/quote` instead
- Expecting Vault balances / VL batches / SOR intents → those are v2-only concepts

## Keywords

subgraph, goldsky, graphql, depth, orderbook, chartLogs, openOrders, v1
