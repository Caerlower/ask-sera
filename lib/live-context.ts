import {
  getConfig,
  getFxRate,
  getHealth,
  getMarkets,
  getTokens,
  groupTokensByFiat,
  resolveNetwork,
  type SeraNetwork,
} from "@/lib/sera-api";

type LivePrefetch = {
  used: boolean;
  label: string;
  markdown: string;
};

function wantsFullCurrencyList(q: string): boolean {
  const asksList = /\b(list|show|name|give|all|every|complete|full|enumerate)\b/.test(q);
  const aboutAssets =
    /\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?|assets?)\b/.test(q);
  const supported =
    /\b(what|which)\b.{0,40}\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?)\b.{0,40}\b(support|swap|available|trade)/.test(
      q,
    ) ||
    /\b(supported|available)\b.{0,30}\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?)\b/.test(q) ||
    /\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?)\b.{0,30}\b(we can|can we|you can)?\s*(swap|trade|use)\b/.test(
      q,
    );
  return (asksList && aboutAssets) || supported;
}

function wantsMarkets(q: string): boolean {
  return /\b(market|pair|pairs|trading pair)s?\b/.test(q) && /\b(list|show|all|available|what|which)\b/.test(q);
}

function wantsHealth(q: string): boolean {
  return /\b(health|api (up|down|status)|is (the )?api)\b/.test(q);
}

function wantsConfig(q: string): boolean {
  return /\b(config|contract address|sera_address|vault_address|eip-?712 domain)\b/.test(q);
}

function parseFxPair(q: string): { base: string; quote: string } | null {
  const m =
    q.match(/\b([a-z]{3})\s*[\/→\-]+\s*([a-z]{3})\b/i) ||
    q.match(/\b(?:fx|rate|price)\b.{0,20}\b([a-z]{3})\b.{0,12}\b([a-z]{3})\b/i);
  if (!m) return null;
  return { base: m[1]!.toUpperCase(), quote: m[2]!.toUpperCase() };
}

function parseSearchCoin(q: string): string | null {
  const m = q.match(
    /\b(?:is|does|support|find|search|look(?:ing)? for)\b.{0,20}\b([A-Z]{2,8}|xsgd|eurc|usdc|usdt|jpyc|myrt|tgbp)\b/i,
  );
  if (!m) return null;
  // Avoid matching generic words
  const token = m[1]!;
  if (/^(the|all|any|for|and|can|you|sera)$/i.test(token)) return null;
  return token;
}

/**
 * Fetch live public Sera data based on the user question.
 * Prefer this over Groq native tool-calling (unreliable on llama-3.3-70b).
 */
export async function prefetchLiveContext(query: string): Promise<LivePrefetch | null> {
  const q = query.toLowerCase();
  const network: SeraNetwork = resolveNetwork();

  try {
    if (wantsFullCurrencyList(q)) {
      const tokens = await getTokens(network);
      const sorted = [...tokens].sort((a, b) => a.symbol.localeCompare(b.symbol));
      const byFiat = groupTokensByFiat(sorted);
      const fiatLines = Object.entries(byFiat)
        .map(([fiat, syms]) => `- **${fiat}** (${syms.length}): ${syms.join(", ")}`)
        .join("\n");
      const flat = sorted.map((t) => t.symbol).join(", ");

      return {
        used: true,
        label: "live:/tokens",
        markdown: [
          `### Live registry — GET /tokens (${network})`,
          `Count: **${sorted.length}**. Output every symbol. Do not truncate.`,
          "",
          "By fiat:",
          fiatLines,
          "",
          `All symbols: ${flat}`,
        ].join("\n"),
      };
    }

    const search = parseSearchCoin(query);
    if (search && /\b(support|supported|available|find|search|have|list)\b/.test(q)) {
      const tokens = await getTokens(network);
      const needle = search.toLowerCase();
      const matches = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(needle) ||
          (t.name ?? "").toLowerCase().includes(needle) ||
          (t.fiat_currency ?? "").toLowerCase().includes(needle),
      );
      return {
        used: true,
        label: "live:/tokens?search",
        markdown: [
          `### Live search — GET /tokens (${network})`,
          `Query: \`${search}\` · matches: **${matches.length}**`,
          matches.length
            ? matches
                .map(
                  (t) =>
                    `- **${t.symbol}** — ${(t.fiat_currency ?? "?").toUpperCase()} · \`${t.address}\` · decimals ${t.decimals}`,
                )
                .join("\n")
            : "No matching tokens in the live registry.",
        ].join("\n"),
      };
    }

    if (wantsMarkets(q)) {
      const markets = await getMarkets(network);
      const sample = markets.slice(0, 60);
      return {
        used: true,
        label: "live:/markets",
        markdown: [
          `### Live markets — GET /markets (${network})`,
          `**Count: ${markets.length}** (showing first ${sample.length}). Pair existence ≠ currently tradeable depth.`,
          "```json",
          JSON.stringify(sample, null, 2).slice(0, 8000),
          "```",
        ].join("\n"),
      };
    }

    if (wantsHealth(q)) {
      const health = await getHealth(network);
      return {
        used: true,
        label: "live:/health",
        markdown: `### Live health — GET /health (${network})\n\n\`\`\`json\n${JSON.stringify(health, null, 2)}\n\`\`\``,
      };
    }

    if (wantsConfig(q)) {
      const config = await getConfig(network);
      return {
        used: true,
        label: "live:/config",
        markdown: `### Live config — GET /config (${network})\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      };
    }

    const fx = parseFxPair(q);
    if (fx && /\b(fx|rate|price|mid)\b/.test(q)) {
      const rate = await getFxRate(fx.base, fx.quote, network);
      return {
        used: true,
        label: "live:/fx/rate",
        markdown: [
          `### Live FX reference — GET /fx/rate (${network})`,
          `Pair: **${fx.base}/${fx.quote}** (reference only — not an executable swap quote).`,
          "```json",
          JSON.stringify(rate, null, 2),
          "```",
        ].join("\n"),
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      used: true,
      label: "live:error",
      markdown: `### Live API prefetch failed\n\nCould not reach Sera public API: ${message}\n\nAnswer from knowledge only, and say the live fetch failed.`,
    };
  }

  return null;
}
