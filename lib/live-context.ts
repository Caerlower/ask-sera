import "server-only";

import {
  assetAlternation,
  findToken,
  getConfig,
  getFxRate,
  getHealth,
  getMarkets,
  getSimulatedSwapQuote,
  getTokens,
  groupTokensByFiat,
  isFiatCode,
  resolveNetwork,
  symbolToFiat,
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

export function wantsConfigQuery(query: string): boolean {
  return /\b(config|smart\s*contracts?|contract\s*addresses?|sera_address|vault_address|sor_address|batcher|eip-?712(?:\s*domain)?|verifying\s*contract)\b/i.test(
    query,
  );
}

function wantsRateOrQuote(q: string): boolean {
  return /\b(swap\s*rate|exchange\s*rate|fx\s*rate|mid\s*rate|quote|price|how much|convert|conversion|rate for|rate of|what(?:'s| is) (?:the )?(?:rate|price))\b/i.test(
    q,
  );
}

function wantsFxOnly(q: string): boolean {
  return (
    /\b(fx\s*rate|reference\s*(fx|rate)|mid\s*rate|reference\s*mid)\b/i.test(q) &&
    !/\b(swap|quote|executable|tradeable|tradable)\b/i.test(q)
  );
}

const ASSET = assetAlternation();

/**
 * Parse pairs like: USDC to SGD, USDC/XSGD, USD→SGD, 100 USDC for XSGD.
 */
function parseAssetPair(q: string): { from: string; to: string; amount?: string } | null {
  const amountFirst = q.match(
    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(${ASSET})\\s*(?:to|for|into|/|→|->|-|vs)\\s*(${ASSET})\\b`, "i"),
  );
  if (amountFirst) {
    return {
      amount: amountFirst[1],
      from: amountFirst[2]!.toUpperCase(),
      to: amountFirst[3]!.toUpperCase(),
    };
  }

  const pair =
    q.match(new RegExp(`\\b(${ASSET})\\s*(?:to|for|into|/|→|->|-|vs)\\s*(${ASSET})\\b`, "i")) ||
    q.match(
      new RegExp(
        `\\b(?:swap|rate|price|quote|fx|convert|conversion)\\b[^\\n]{0,40}\\b(${ASSET})\\b[^\\n]{0,16}\\b(${ASSET})\\b`,
        "i",
      ),
    );
  if (!pair) return null;

  const from = pair[1]!.toUpperCase();
  const to = pair[2]!.toUpperCase();
  if (from === to) return null;

  const amountOnly = q.match(/\b(\d+(?:\.\d+)?)\b/);
  return { from, to, amount: amountOnly?.[1] };
}

const SEARCH_STOP = new Set([
  "the", "all", "any", "for", "and", "can", "you", "sera", "what", "which", "this", "that", "with", "from", "have", "does", "support",
]);

function parseSearchCoin(q: string): string | null {
  const m = q.match(
    /\b(?:is|does|support|supported|available|find|search|look(?:ing)? for)\b.{0,24}\b([A-Za-z]{2,8})\b/i,
  );
  if (!m) return null;
  const token = m[1]!;
  if (SEARCH_STOP.has(token.toLowerCase())) return null;
  // Prefer known assets from the alternation
  if (!new RegExp(`^(?:${ASSET})$`, "i").test(token)) return null;
  return token;
}

async function buildRateSnapshot(
  fromRaw: string,
  toRaw: string,
  amount: string | undefined,
  network: SeraNetwork,
  opts: { fxOnly?: boolean } = {},
): Promise<LivePrefetch> {
  const sections: string[] = [];
  const labels: string[] = [];

  const fromTok = await findToken(fromRaw, network);
  const toTok = await findToken(toRaw, network);

  const fromFiat =
    (fromTok?.fiat_currency ?? symbolToFiat(fromRaw) ?? (isFiatCode(fromRaw) ? fromRaw : undefined))?.toUpperCase();
  const toFiat =
    (toTok?.fiat_currency ?? symbolToFiat(toRaw) ?? (isFiatCode(toRaw) ? toRaw : undefined))?.toUpperCase();

  let fxBlock: string | null = null;
  if (fromFiat && toFiat && fromFiat !== toFiat) {
    try {
      const rate = await getFxRate(fromFiat, toFiat, network);
      labels.push("fx");
      const mid = rate.rate ?? rate.mid ?? rate.price;
      fxBlock = [
        `### Reference FX mid`,
        `${fromFiat}/${toFiat}: **${String(mid ?? "n/a")}**`,
        opts.fxOnly
          ? "Reference mid (not a tradeable swap rate)."
          : "Secondary to any live swap rate — quiet clause only.",
      ].join("\n");
    } catch (err) {
      fxBlock = `### Reference FX failed\n\n${err instanceof Error ? err.message : String(err)}`;
    }
  } else if (fromFiat && toFiat && fromFiat === toFiat) {
    fxBlock = `### Same-peg\nBoth sides map to **${fromFiat}** — reference mid ~1.`;
  }

  // FX-only questions: skip the swap quote entirely
  if (opts.fxOnly) {
    if (fxBlock) sections.push(fxBlock);
    return {
      used: true,
      label: `live:rate:${labels.join("+") || "fx"}`,
      markdown: sections.join("\n\n") || "No FX data available.",
    };
  }

  let quoteBlock: string | null = null;
  if (fromTok && toTok) {
    try {
      const sim = await getSimulatedSwapQuote({
        fromSymbol: fromTok.symbol,
        toSymbol: toTok.symbol,
        amountHuman: amount ?? 100,
        network,
      });
      labels.push("quote");
      const gas =
        sim.quote.fee_breakdown &&
        typeof sim.quote.fee_breakdown === "object" &&
        "gas_cost_usd" in sim.quote.fee_breakdown
          ? String((sim.quote.fee_breakdown as { gas_cost_usd?: string }).gas_cost_usd)
          : null;
      quoteBlock = [
        `### Live swap rate (${network})`,
        "",
        `**1 ${sim.from.symbol} ≈ ${sim.human.impliedRate ?? "?"} ${sim.to.symbol}**`,
        `Live indicative quote · **${sim.human.input} ${sim.from.symbol}** → min **${sim.human.minOutput} ${sim.to.symbol}**${gas ? ` · gas ~$${gas}` : ""}.`,
        "",
        "Live indicative quote (not a probe/sim label). Headline = the bold rate. Size/fees can move fills. Ask Sera does not place the trade. Reference FX mid is optional as one quiet clause only.",
      ].join("\n");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      labels.push("quote-error");
      quoteBlock = [
        `### Live swap quote unavailable`,
        `Tried **${fromTok.symbol} → ${toTok.symbol}** at ~${amount ?? 100} ${fromTok.symbol}.`,
        msg,
        "If `no_liquidity`: no executable depth right now. Reference FX mid may be shown separately and labeled reference-only.",
      ].join("\n");
    }
  } else {
    quoteBlock = [
      "### Token resolve",
      fromTok ? `- From: **${fromTok.symbol}**` : `- From \`${fromRaw}\` not in live /tokens`,
      toTok ? `- To: **${toTok.symbol}**` : `- To \`${toRaw}\` not in live /tokens`,
      "No executable token quote in this snapshot.",
    ].join("\n");
  }

  if (quoteBlock) sections.push(quoteBlock);
  // When we have a live swap rate, fold FX mid into the quote instructions only — don't
  // give the model a competing "Reference FX" section that becomes the headline.
  if (fxBlock && !labels.includes("quote")) {
    sections.push(fxBlock);
  } else if (fxBlock && labels.includes("quote") && fromFiat && toFiat && fromFiat !== toFiat) {
    const midMatch = fxBlock.match(/\*\*([^*]+)\*\*/);
    if (midMatch && quoteBlock) {
      sections[0] = `${sections[0]}\n\nReference ${fromFiat}/${toFiat} mid ≈ ${midMatch[1]} (not the swap rate).`;
    }
  }

  return {
    used: true,
    label: `live:rate:${labels.join("+") || "partial"}`,
    markdown: sections.join("\n\n"),
  };
}

/** True when the query is a rate/price/quote intent. */
export function isRateQuery(query: string): boolean {
  const q = query.toLowerCase();
  return Boolean(
    parseAssetPair(query) &&
      (wantsRateOrQuote(q) ||
        /\b(usdc|usdt|xsgd|eurc|sgd|usd|eur|gbp|myr|jpyc)\b/i.test(query)),
  );
}

/**
 * True only for FX-focused turns (skip Firecrawl/Exa noise).
 * Compound briefings that also ask contracts/cashback/tweets/news/overview
 * return false so other layers still run.
 */
export function isPureRateQuery(query: string): boolean {
  if (!isRateQuery(query)) return false;
  if (wantsConfigQuery(query)) return false;
  if (
    /\b(cashback|cash back|tweet|tweets|twitter|x\.com|on x|socials?|@seraprotocol|announce|announcement|news|founder|founders|ceo|team|contract addresses?|smart contracts?|what is sera|sera protocol|overview|product|products|mcp|agents?|token ?2049|community)\b/i.test(
      query,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Fetch live public Sera data based on the user question.
 * Prefer this over Groq native tool-calling (unreliable on the hosted chat models).
 */
export async function prefetchLiveContext(query: string): Promise<LivePrefetch | null> {
  const q = query.toLowerCase();
  const network: SeraNetwork = resolveNetwork();

  try {
    // Markets / lists before bare pair→rate so "USDC/EURC pairs" isn't stolen.
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

    // Rate/quote questions — "swap rate for USDC to SGD"
    const pair = parseAssetPair(query);
    if (pair && wantsRateOrQuote(q)) {
      return await buildRateSnapshot(pair.from, pair.to, pair.amount, network, {
        fxOnly: wantsFxOnly(q),
      });
    }
    // Bare "USDC to XSGD" / "USD/SGD" as rate intent (not when other list intents win)
    if (
      pair &&
      /\b(usdc|usdt|xsgd|eurc|sgd|usd|eur|gbp|myr|jpyc)\b/i.test(query) &&
      !wantsFullCurrencyList(q) &&
      !wantsHealth(q)
    ) {
      return await buildRateSnapshot(pair.from, pair.to, pair.amount, network, {
        fxOnly: wantsFxOnly(q),
      });
    }

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
          `Count: **${sorted.length}**. Full list below.`,
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

    if (wantsHealth(q)) {
      const health = await getHealth(network);
      return {
        used: true,
        label: "live:/health",
        markdown: `### Live health — GET /health (${network})\n\n\`\`\`json\n${JSON.stringify(health, null, 2)}\n\`\`\``,
      };
    }

    // Config is fetched separately via prefetchConfigContext so compound
    // questions (rate + contracts) can attach both snapshots.
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      used: true,
      label: "live:error",
      markdown: `### Live API prefetch failed\n\nCould not reach Sera public API: ${message}`,
    };
  }

  return null;
}

/** Live Mainnet + Sepolia addresses from GET /config (both networks). */
export async function prefetchConfigContext(
  query: string,
): Promise<LivePrefetch | null> {
  if (!wantsConfigQuery(query)) return null;

  try {
    const [mainnet, sepolia] = await Promise.all([
      getConfig("mainnet"),
      getConfig("sepolia"),
    ]);

    const addr = (cfg: Record<string, unknown>, key: string) => {
      const v = cfg[key];
      return typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v) ? v : null;
    };

    const mSera = addr(mainnet, "sera_address");
    const mVault = addr(mainnet, "vault_address");
    const mSor = addr(mainnet, "sor_address");
    const sSera = addr(sepolia, "sera_address");
    const sVault = addr(sepolia, "vault_address");
    const sSor = addr(sepolia, "sor_address");

    const sepoliaOk =
      sSera &&
      sVault &&
      sSor &&
      sSera.toLowerCase() !== mSera?.toLowerCase();

    return {
      used: true,
      label: "live:/config",
      markdown: [
        "### Live config — GET /config",
        "",
        "**Sera Protocol contract addresses** (live `GET /config`)",
        "",
        "**Ethereum Mainnet** (`chain_id=1`)",
        "",
        "| Contract | Address |",
        "|---|---|",
        mSera ? `| Sera | \`${mSera}\` |` : null,
        mVault ? `| Vault | \`${mVault}\` |` : null,
        mSor ? `| SeraSOR | \`${mSor}\` |` : null,
        "",
        "**Sepolia** (`chain_id=11155111`)",
        "",
        "| Contract | Address |",
        "|---|---|",
        sepoliaOk
          ? [
              `| Sera | \`${sSera}\` |`,
              `| Vault | \`${sVault}\` |`,
              `| SeraSOR | \`${sSor}\` |`,
            ].join("\n")
          : "| — | Sepolia `/config` unavailable |",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      used: true,
      label: "live:/config:error",
      markdown: `### Live config fetch failed\n\nCould not reach GET /config: ${message}`,
    };
  }
}
