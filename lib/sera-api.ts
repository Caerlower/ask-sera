/**
 * Thin public Sera REST client for Ask Sera live prefetch.
 * Same catalogs as sera-mcp read endpoints (tokens, markets, fx, health, config).
 */

export type SeraNetwork = "mainnet" | "sepolia";

export type SeraToken = {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
  fiat_currency?: string;
};

export type SeraMarket = {
  market_id?: string;
  base_address?: string;
  quote_address?: string;
  base_symbol?: string;
  quote_symbol?: string;
  active?: boolean;
  [key: string]: unknown;
};

const BASES: Record<SeraNetwork, string> = {
  mainnet: "https://api.sera.cx/api/v1",
  sepolia: "https://api-testnet.sera.cx/api/v1",
};

type CacheEntry<T> = { at: number; value: T };

const cache = new Map<string, CacheEntry<unknown>>();

function ttlGet<T>(key: string, ttlMs: number): T | undefined {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() - hit.at > ttlMs) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function ttlSet<T>(key: string, value: T): T {
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function resolveNetwork(network?: string): SeraNetwork {
  const n = (network ?? process.env.SERA_NETWORK ?? "mainnet").toLowerCase();
  return n === "sepolia" || n === "testnet" ? "sepolia" : "mainnet";
}

function apiBase(network?: string): string {
  const override = process.env.SERA_API_BASE?.trim();
  if (override) return override.replace(/\/+$/, "");
  return BASES[resolveNetwork(network)];
}

async function seraFetch<T>(
  path: string,
  init: {
    network?: string;
    method?: "GET" | "POST";
    query?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  const base = apiBase(init.network);
  const url = new URL(base + path);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = json as { error_code?: string; detail?: string; message?: string } | null;
    throw new Error(
      `Sera API ${res.status} ${path}: ${err?.error_code ?? ""} ${err?.detail ?? err?.message ?? text.slice(0, 200)}`.trim(),
    );
  }

  return json as T;
}

const KNOWN_FIAT: Record<string, string> = {
  USDC: "USD",
  USDT: "USD",
  DAI: "USD",
  FRAX: "USD",
  PYUSD: "USD",
  EURC: "EUR",
  EURS: "EUR",
  XSGD: "SGD",
  JPYC: "JPY",
  MYRT: "MYR",
  TGBP: "GBP",
  BRZ: "BRL",
  BRLA: "BRL",
  BRLV: "BRL",
  IDRT: "IDR",
  MXNB: "MXN",
  MXNT: "MXN",
  CADC: "CAD",
  QCAD: "CAD",
  NZDD: "NZD",
  TRYB: "TRY",
  ITRY: "TRY",
  VCHF: "CHF",
  CHFAU: "CHF",
  AEDZ: "AED",
  AUDD: "AUD",
  AUDF: "AUD",
  AUDM: "AUD",
  AUDX: "AUD",
  AXCNH: "CNH",
  CNGN: "NGN",
  WARS: "ARS",
  WCLP: "CLP",
  WCOP: "COP",
  WPEN: "PEN",
  ZARP: "ZAR",
};

const FIAT_CODES = [
  "USD", "EUR", "GBP", "JPY", "SGD", "MYR", "IDR", "MXN", "BRL", "CAD",
  "AUD", "NZD", "CHF", "TRY", "AED", "CNH", "CNY", "NGN", "ARS", "CLP",
  "COP", "PEN", "ZAR", "HKD", "KRW", "INR", "THB", "PHP", "VND",
];

function guessFiat(symbol: string): string | undefined {
  const s = symbol.toUpperCase();
  if (KNOWN_FIAT[s]) return KNOWN_FIAT[s];
  for (const code of FIAT_CODES) {
    if (s === code || s.startsWith(code) || s.endsWith(code)) return code;
  }
  return undefined;
}

export async function getTokens(network?: string): Promise<SeraToken[]> {
  const net = resolveNetwork(network);
  const key = `tokens:${net}`;
  const cached = ttlGet<SeraToken[]>(key, 60_000);
  if (cached) return cached;

  const data = await seraFetch<{ tokens?: SeraToken[] } | SeraToken[]>("/tokens", { network: net });
  const list = Array.isArray(data) ? data : (data.tokens ?? []);
  const enriched = list.map((t) => ({
    ...t,
    fiat_currency: t.fiat_currency ?? guessFiat(t.symbol),
  }));
  return ttlSet(key, enriched);
}

export async function getMarkets(network?: string): Promise<SeraMarket[]> {
  const net = resolveNetwork(network);
  const key = `markets:${net}`;
  const cached = ttlGet<SeraMarket[]>(key, 5 * 60_000);
  if (cached) return cached;

  const data = await seraFetch<{ markets?: SeraMarket[] } | SeraMarket[]>("/markets", { network: net });
  const list = Array.isArray(data) ? data : (data.markets ?? []);
  return ttlSet(key, list);
}

export async function getFxRate(base: string, quote: string, network?: string) {
  return seraFetch<Record<string, unknown>>("/fx/rate", {
    network,
    query: { base: base.toUpperCase(), quote: quote.toUpperCase() },
  });
}

export async function getHealth(network?: string) {
  return seraFetch<Record<string, unknown>>("/health", { network });
}

export async function getConfig(network?: string) {
  const net = resolveNetwork(network);
  const key = `config:${net}`;
  const cached = ttlGet<Record<string, unknown>>(key, 60 * 60_000);
  if (cached) return cached;
  const data = await seraFetch<Record<string, unknown>>("/config", { network: net });
  return ttlSet(key, data);
}

export function groupTokensByFiat(tokens: SeraToken[]) {
  const byFiat = new Map<string, string[]>();
  for (const t of tokens) {
    const fiat = (t.fiat_currency ?? "UNKNOWN").toUpperCase();
    const arr = byFiat.get(fiat) ?? [];
    arr.push(t.symbol);
    byFiat.set(fiat, arr);
  }
  for (const [k, v] of byFiat) byFiat.set(k, v.sort());
  return Object.fromEntries([...byFiat.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
