import { tool } from "ai";
import { z } from "zod";
import {
  getConfig,
  getFxRate,
  getHealth,
  getMarkets,
  getTokens,
  groupTokensByFiat,
  resolveNetwork,
  swapQuote,
} from "@/lib/sera-api";

const networkSchema = z
  .enum(["mainnet", "sepolia"])
  .optional()
  .describe("Sera network. Default mainnet.");

/**
 * Read-only live tools (same public data as sera-mcp discovery tools).
 * No signing, no order placement, no withdrawals.
 */
export const liveTools = {
  list_currencies: tool({
    description:
      "Fetch the COMPLETE live list of supported stablecoins from Sera GET /tokens. Use whenever the user asks for all currencies, tokens, coins, or stablecoins — never invent or truncate the list. Optionally filter by fiat code (USD, EUR, SGD, …).",
    parameters: z.object({
      fiat: z
        .string()
        .optional()
        .describe("Optional ISO fiat filter, e.g. USD or EUR. Omit for the full registry."),
      network: networkSchema,
      include_addresses: z
        .boolean()
        .optional()
        .describe("If true, include token contract addresses. Default false for readability."),
    }),
    execute: async ({ fiat, network, include_addresses }) => {
      const net = resolveNetwork(network);
      const tokens = await getTokens(net);
      const filtered = fiat
        ? tokens.filter((t) => (t.fiat_currency ?? "").toUpperCase() === fiat.toUpperCase())
        : tokens;
      const sorted = [...filtered].sort((a, b) => a.symbol.localeCompare(b.symbol));
      return {
        network: net,
        source: "GET /tokens (live)",
        count: sorted.length,
        fiat_filter: fiat?.toUpperCase() ?? null,
        by_fiat: groupTokensByFiat(sorted),
        fiat_currencies: [...new Set(sorted.map((t) => (t.fiat_currency ?? "UNKNOWN").toUpperCase()))].sort(),
        tokens: sorted.map((t) => {
          const row: Record<string, string | number> = {
            symbol: t.symbol,
            name: t.name ?? t.symbol,
            fiat: (t.fiat_currency ?? "UNKNOWN").toUpperCase(),
            decimals: t.decimals,
          };
          if (include_addresses) row.address = t.address;
          return row;
        }),
      };
    },
  }),

  search_coins: tool({
    description:
      "Fuzzy-search live Sera tokens by symbol, name, or fiat tag (e.g. query='sgd' or 'euro'). Use when the user is looking for a specific coin, not the full catalog.",
    parameters: z.object({
      query: z.string().min(1).describe("Substring to match against symbol, name, or fiat."),
      network: networkSchema,
    }),
    execute: async ({ query, network }) => {
      const net = resolveNetwork(network);
      const tokens = await getTokens(net);
      const q = query.trim().toLowerCase();
      const matches = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          (t.name ?? "").toLowerCase().includes(q) ||
          (t.fiat_currency ?? "").toLowerCase().includes(q),
      );
      return {
        network: net,
        source: "GET /tokens (live search)",
        query,
        count: matches.length,
        matches: matches
          .sort((a, b) => a.symbol.localeCompare(b.symbol))
          .map((t) => ({
            symbol: t.symbol,
            name: t.name ?? t.symbol,
            fiat: (t.fiat_currency ?? "UNKNOWN").toUpperCase(),
            address: t.address,
            decimals: t.decimals,
          })),
      };
    },
  }),

  get_markets: tool({
    description:
      "Fetch the live trading-pair catalog from GET /markets. Pair existence ≠ currently tradeable depth — use get_swap_quote to check liquidity.",
    parameters: z.object({
      network: networkSchema,
      limit: z.number().int().min(1).max(200).optional().describe("Max markets to return (default 80)."),
    }),
    execute: async ({ network, limit }) => {
      const net = resolveNetwork(network);
      const markets = await getMarkets(net);
      const capped = markets.slice(0, limit ?? 80);
      return {
        network: net,
        source: "GET /markets (live)",
        count: markets.length,
        returned: capped.length,
        markets: capped,
      };
    },
  }),

  get_fx_rate: tool({
    description:
      "Fetch a live REFERENCE FX rate from GET /fx/rate using ISO fiat codes (USD, EUR, …). Not an executable trade price — use get_swap_quote for that.",
    parameters: z.object({
      base: z.string().min(2).max(8).describe("ISO base currency, e.g. USD"),
      quote: z.string().min(2).max(8).describe("ISO quote currency, e.g. EUR"),
      network: networkSchema,
    }),
    execute: async ({ base, quote, network }) => {
      const net = resolveNetwork(network);
      const rate = await getFxRate(base, quote, net);
      return { network: net, source: "GET /fx/rate (live, reference only)", base: base.toUpperCase(), quote: quote.toUpperCase(), rate };
    },
  }),

  get_health: tool({
    description: "Check live Sera API health via GET /health.",
    parameters: z.object({ network: networkSchema }),
    execute: async ({ network }) => {
      const net = resolveNetwork(network);
      const health = await getHealth(net);
      return { network: net, source: "GET /health (live)", health };
    },
  }),

  get_config: tool({
    description:
      "Fetch live protocol config from GET /config (contract addresses, EIP-712 domain). Prefer this over hardcoded addresses.",
    parameters: z.object({ network: networkSchema }),
    execute: async ({ network }) => {
      const net = resolveNetwork(network);
      const config = await getConfig(net);
      return { network: net, source: "GET /config (live)", config };
    },
  }),

  get_swap_quote: tool({
    description:
      "Request a live executable swap quote via POST /swap/quote. Use to check whether a token corridor has liquidity right now. Returns no_liquidity / NO_LIQUIDITY when makers are missing.",
    parameters: z.object({
      from_address: z.string().describe("ERC-20 from token address (checksum or lower)."),
      to_address: z.string().describe("ERC-20 to token address."),
      amount: z.string().describe("Amount in token raw units or as API expects (string)."),
      network: networkSchema,
    }),
    execute: async ({ from_address, to_address, amount, network }) => {
      const net = resolveNetwork(network);
      try {
        const quote = await swapQuote(
          { from_address, to_address, amount },
          net,
        );
        return { network: net, source: "POST /swap/quote (live)", ok: true, quote };
      } catch (e) {
        return {
          network: net,
          source: "POST /swap/quote (live)",
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  }),
};
