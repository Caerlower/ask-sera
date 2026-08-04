import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

type KnowledgeChunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  tokens: Set<string>;
};

const STOP = new Set([
  "a", "an", "the", "and", "or", "to", "of", "in", "on", "for", "is", "are",
  "be", "as", "at", "by", "with", "from", "that", "this", "it", "you", "your",
  "we", "our", "can", "how", "what", "when", "where", "why", "do", "does",
  "if", "yes", "no", "which", "about", "vs", "than", "into", "over",
]);

/** Expand common user phrasings so retrieval hits the right docs. */
const ALIASES: Record<string, string[]> = {
  mainnet: ["ethereum", "live", "production", "deployed", "chain"],
  live: ["mainnet", "production", "deployed", "available"],
  chain: ["mainnet", "ethereum", "network", "chain_id", "sepolia"],
  ethereum: ["mainnet", "chain", "network"],
  gsera: ["loyalty", "points", "rewards", "referral", "xp"],
  xp: ["gsera", "badge", "community", "rank"],
  referral: ["gsera", "trade", "community"],
  earn: ["lp", "yield", "liquidity", "apy", "spread", "maker"],
  pay: ["serapay", "payment", "merchant", "checkout", "qr"],
  agent: ["agents", "mcp", "sera-agent", "sera-mcp"],
  agents: ["agent", "mcp", "sera-agent", "sera-mcp"],
  mcp: ["sera-mcp", "tools", "agent"],
  v1: ["router", "pricebook", "priceindex", "subgraph", "goldsky", "nft"],
  v2: ["vault", "eip-712", "signed", "sor", "batcher", "rest"],
  subgraph: ["goldsky", "graphql", "v1", "depths"],
  goldsky: ["subgraph", "graphql", "v1"],
  telegram: ["community", "group"],
  "t.me": ["telegram", "community"],
  docs: ["documentation", "community", "testnet"],
  deepwiki: ["docs", "community"],
  token2049: ["singapore", "sponsor", "sponsorship", "evangelist", "community"],
  "token-2049": ["token2049", "singapore", "sponsor"],
  sponsorship: ["sponsor", "token2049", "evangelist", "community"],
  sponsor: ["sponsorship", "token2049", "gold", "evangelist"],
  evangelist: ["token2049", "community", "gsera"],
  ambassador: ["community", "evangelist", "token2049"],
  community: ["evangelist", "telegram", "gsera", "xp"],
  quote: ["swap", "executable", "liquidity", "route_params"],
  quotes: ["quote", "swap", "executable"],
  quoting: ["quote", "swap", "liquidity"],
  fx: ["rate", "reference", "currency"],
  rate: ["fx", "reference"],
  liquidity: ["depth", "maker", "lp", "no_liquidity", "corridor"],
  depth: ["liquidity", "maker", "no_liquidity"],
  eurc: ["eur", "cross-currency", "liquidity", "no_liquidity"],
  usdc: ["usd", "stablecoin"],
  usdt: ["usd", "stablecoin", "on-par"],
  integrator: ["api", "quote", "swap", "error_code"],
  no_liquidity: ["liquidity", "depth", "maker", "corridor"],
  "no-liquidity": ["no_liquidity", "liquidity", "depth"],
  founder: ["douglas", "gan", "ceo", "company"],
  founders: ["founder", "douglas", "gan", "ceo"],
  ceo: ["founder", "douglas", "gan"],
  douglas: ["gan", "founder", "ceo"],
  gan: ["douglas", "founder", "ceo"],
  company: ["founder", "ceo", "singapore", "overview"],
  singapore: ["company", "headquarters"],
  linkedin: ["douglas", "gan", "founder", "profile", "company"],
  twitter: ["x.com", "douglas", "seraprotocol", "social"],
  "x.com": ["twitter", "douglas", "seraprotocol"],
};

const ALWAYS_INCLUDE = new Set(["assistant-policy.md"]);
const FALLBACK_SOURCES = new Set(["overview.md", "assistant-policy.md"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function expandQueryTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const a of ALIASES[t] ?? []) out.add(a);
  }
  return [...out];
}

/** Multi-word phrases that should heavily boost matching chunks. */
function queryPhrases(query: string): string[] {
  const q = query.toLowerCase();
  const phrases: string[] = [];
  const candidates = [
    "no_liquidity",
    "no liquidity",
    "fx/rate",
    "/fx/rate",
    "swap/quote",
    "/swap/quote",
    "api-keys",
    "virtual liquidity",
    "on par",
    "same peg",
    "same-peg",
    "route_params",
    "error_code",
    "sera-mcp",
    "sera-agent",
    "eip-712",
    "eip712",
    "token2049",
    "token 2049",
    "evangelist trips",
    "gold sponsor",
    "community.sera.cx",
  ];
  for (const p of candidates) {
    if (q.includes(p)) phrases.push(p);
  }
  return phrases;
}

function splitChunks(source: string, raw: string): KnowledgeChunk[] {
  const parts = raw.split(/\n(?=## )/);
  const chunks: KnowledgeChunk[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!.trim();
    if (!part) continue;
    const titleMatch = part.match(/^#+ (.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? source;
    const id = `${source}#${i}`;
    const tokens = new Set(tokenize(`${source}\n${title}\n${part}`));
    chunks.push({ id, source, title, text: part, tokens });
  }

  return chunks;
}

let cache: { stamp: string; chunks: KnowledgeChunk[] } | null = null;

function knowledgeStamp(dir: string): string {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
  return files
    .map((f) => {
      const s = statSync(join(dir, f));
      return `${f}:${s.mtimeMs}:${s.size}`;
    })
    .join("|");
}

function loadKnowledge(): KnowledgeChunk[] {
  const dir = join(process.cwd(), "knowledge");
  const stamp = knowledgeStamp(dir);
  if (cache?.stamp === stamp) return cache.chunks;

  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  const all: KnowledgeChunk[] = [];

  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    all.push(...splitChunks(file, raw));
  }

  cache = { stamp, chunks: all };
  return all;
}

function preferSources(query: string): string[] {
  const q = query.toLowerCase();
  const preferred: string[] = [];

  if (
    /\b(no[_ ]?liquidity|fx\/?rate|swap\/?quote|eurc|market.?maker|depth|corridor|executable|reference rate|integrator)\b/.test(
      q,
    ) ||
    /\b(usdc|usdt).{0,40}(eurc|eur)\b/.test(q) ||
    /\b(quote|quoting|liquidity).{0,40}(mainnet|pair|swap)\b/.test(q)
  ) {
    preferred.push("liquidity.md", "api.md", "products.md", "overview.md");
  }

  if (/\b(mainnet|testnet|sepolia|chain|ethereum|live|deploy|is sera)\b/.test(q)) {
    preferred.push("overview.md", "contracts.md", "products.md");
  }
  if (/\b(gsera|loyalty|points|xp|referral|referrals)\b/.test(q)) {
    preferred.push("products.md", "community.md");
  }
  if (/\b(earn|lp|yield|apy|liquidity provider|virtual liquidity)\b/.test(q)) {
    preferred.push("products.md", "liquidity.md");
  }
  if (/\b(pay|serapay|merchant|checkout|qr)\b/.test(q)) preferred.push("products.md");
  if (/\b(on par|on-par|same-peg|1:1)\b/.test(q)) preferred.push("products.md", "liquidity.md");
  if (/\b(mcp|sera-mcp|sera-agent|agent)\b/.test(q)) preferred.push("agents.md");
  if (/\b(sign|order|uuid|eip-712|eip712|error_code|gas_mode|route_params)\b/.test(q)) {
    preferred.push("api.md");
  }
  if (/\b(v1|v2|router|priceindex|pricebook|vault|subgraph|goldsky|graphql|contract|config)\b/.test(q)) {
    preferred.push("contracts.md");
  }
  if (/\b(sample|third.?party|unofficial|seraprotocol-sample)\b/.test(q)) {
    preferred.push("community.md");
  }
  if (/\b(telegram|t\.me|community|discord|twitter|linkedin|support|contact|group chat|social|ambassador|token ?2049|sponsor|sponsorship|evangelist)\b/.test(q)) {
    preferred.push("community.md", "overview.md", "products.md");
  }
  if (
    /\b(founder|founders|ceo|douglas|gan|who (founded|started|created|built|runs)|headquarters|hq|based|singapore|team|about (the )?compan|who is behind|linkedin|twitter)\b/.test(
      q,
    )
  ) {
    preferred.push("overview.md", "community.md");
  }
  if (/\b(api-keys|503|health|rate.?limit|api)\b/.test(q)) {
    preferred.push("api.md", "liquidity.md", "agents.md");
  }
  if (/\b(deepwiki|docs\.|official link|where.*(docs|api))\b/.test(q)) {
    preferred.push("community.md", "overview.md");
  }
  if (/\b(what is sera|sera protocol|overview|product|tell me about sera|explain sera)\b/.test(q)) {
    preferred.push("overview.md", "products.md");
  }
  if (
    /\b(all|list|show|name).{0,20}\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?)\b/.test(q) ||
    /\b(currenc(?:y|ies)|tokens?|coins?|stablecoins?).{0,30}\b(swap|trade|supported|available)\b/.test(q) ||
    /\b(live (api|data|tool)|get \/tokens)\b/.test(q)
  ) {
    preferred.push("agents.md", "api.md");
  }

  if (preferred.length === 0) {
    preferred.push("overview.md", "products.md");
  }

  return preferred;
}

export function retrieveKnowledge(query: string, limit = 8): KnowledgeChunk[] {
  const chunks = loadKnowledge();
  const qTokens = expandQueryTokens(tokenize(query));
  const phrases = queryPhrases(query);
  const qLower = query.toLowerCase();

  if (qTokens.length === 0) {
    return chunks
      .filter((c) => FALLBACK_SOURCES.has(c.source))
      .slice(0, limit);
  }

  const scored = chunks.map((chunk) => {
    let score = 0;
    const titleLower = chunk.title.toLowerCase();
    const sourceLower = chunk.source.toLowerCase();
    const textLower = chunk.text.toLowerCase();

    for (const t of qTokens) {
      if (chunk.tokens.has(t)) score += 1;
      if (titleLower.includes(t)) score += 2.5;
      if (sourceLower.includes(t.replace(/-/g, ""))) score += 1.5;
    }

    for (const phrase of phrases) {
      if (textLower.includes(phrase) || titleLower.includes(phrase)) score += 4;
      if (sourceLower.includes(phrase.replace(/\//g, "").replace(/ /g, ""))) score += 2;
    }

    if (chunk.source === "liquidity.md" && /\b(quote|liquidity|fx|eurc|depth)\b/.test(qLower)) {
      score += 3;
    }
    if (chunk.source === "assistant-policy.md") score += 0.25;

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.chunk);
  const byId = new Map(top.map((c) => [c.id, c]));

  for (const source of preferSources(query)) {
    const hit = scored.find((s) => s.chunk.source === source && s.score > 0)
      ?? scored.find((s) => s.chunk.source === source);
    if (hit && !byId.has(hit.chunk.id)) {
      byId.set(hit.chunk.id, hit.chunk);
    }
  }

  for (const source of ALWAYS_INCLUDE) {
    const policyChunks = chunks.filter((c) => c.source === source);
    for (const policy of policyChunks) {
      if (![...byId.values()].some((c) => c.source === source)) {
        byId.set(policy.id, policy);
      }
    }
  }

  const merged = [...byId.values()];
  if (merged.length === 0) {
    return chunks.filter((c) => FALLBACK_SOURCES.has(c.source));
  }

  const scoreMap = new Map(scored.map((s) => [s.chunk.id, s.score]));
  merged.sort((a, b) => {
    const policyBoost = (c: KnowledgeChunk) => (c.source === "assistant-policy.md" ? 1000 : 0);
    return policyBoost(b) + (scoreMap.get(b.id) ?? 0) - (policyBoost(a) + (scoreMap.get(a.id) ?? 0));
  });

  return merged.slice(0, limit + 3);
}

export function formatRetrievedContext(chunks: KnowledgeChunk[]): string {
  const body = chunks
    .map((c, i) => `### Source ${i + 1}: ${c.source} — ${c.title}\n\n${c.text}`)
    .join("\n\n---\n\n");

  return [
    "Ground truth for this turn. Prefer specialist docs (liquidity, api, agents, contracts) over overview when they apply.",
    "If notes are dated community snapshots, say to re-check live APIs. Do not invent ETAs or current depth.",
    "",
    body,
  ].join("\n");
}
