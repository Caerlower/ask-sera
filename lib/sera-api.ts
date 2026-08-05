import "server-only";

/**
 * Thin public Sera REST client for Ask Sera live prefetch.
 * Same catalogs as sera-mcp read endpoints (tokens, markets, fx, health, config)
 * plus simulated POST /swap/quote for executable rate discovery (never signs/executes).
 */

export type SeraNetwork = "mainnet" | "sepolia";

export type SeraToken = {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
  fiat_currency?: string;
  currency?: string;
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

export type SwapQuoteResponse = {
  uuid?: string;
  route_params?: {
    maxInputAmount?: string;
    minOutputAmount?: string;
    inputToken?: string;
    outputToken?: string;
    [key: string]: unknown;
  };
  fee_breakdown?: Record<string, unknown>;
  expires_at?: number;
  error_code?: string;
  detail?: string;
  [key: string]: unknown;
};

const BASES: Record<SeraNetwork, string> = {
  mainnet: "https://api.sera.cx/api/v1",
  sepolia: "https://api-testnet.sera.cx/api/v1",
};

const SIMULATE_OWNER = "0x000000000000000000000000000000000000dEaD";

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
  const net = resolveNetwork(network);
  const defaultNet = resolveNetwork(undefined);

  // SERA_API_BASE only overrides the *default* network (SERA_NETWORK).
  // Explicit fetches for the other network must keep the built-in base —
  // otherwise getConfig("mainnet") + getConfig("sepolia") both hit mainnet
  // and Sepolia addresses collapse / look "unavailable".
  if (net !== defaultNet) {
    const perNet =
      net === "sepolia"
        ? process.env.SERA_API_BASE_SEPOLIA?.trim()
        : process.env.SERA_API_BASE_MAINNET?.trim();
    if (perNet) return perNet.replace(/\/+$/, "");
    return BASES[net];
  }

  const override =
    (net === "sepolia"
      ? process.env.SERA_API_BASE_SEPOLIA?.trim()
      : process.env.SERA_API_BASE_MAINNET?.trim()) ||
    process.env.SERA_API_BASE?.trim();
  if (override) return override.replace(/\/+$/, "");
  return BASES[net];
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

/** Preferred on-chain symbol when the user names a fiat code. */
const FIAT_PREFERRED_TOKEN: Record<string, string> = {
  USD: "USDC",
  SGD: "XSGD",
  EUR: "EURC",
  GBP: "TGBP",
  JPY: "JPYC",
  MYR: "MYRT",
  BRL: "BRZ",
  CAD: "CADC",
  AUD: "AUDD",
  CHF: "VCHF",
  IDR: "IDRT",
  MXN: "MXNT",
  TRY: "TRYB",
  AED: "AEDZ",
  NZD: "NZDD",
  NGN: "CNGN",
  ZAR: "ZARP",
};

const KNOWN_FIAT: Record<string, string> = {
  USDC: "USD",
  USDT: "USD",
  DAI: "USD",
  FRAX: "USD",
  PYUSD: "USD",
  EURC: "EUR",
  EURS: "EUR",
  EUROC: "EUR",
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

export function symbolToFiat(symbol: string): string | undefined {
  return guessFiat(symbol.toUpperCase());
}

export function isFiatCode(code: string): boolean {
  return FIAT_CODES.includes(code.toUpperCase());
}

/** Alternation for pair parsing — derived from known tokens + fiat codes. */
export function assetAlternation(): string {
  const symbols = [...new Set([...Object.keys(KNOWN_FIAT), ...FIAT_CODES])].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
  return symbols.join("|");
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
    fiat_currency: t.fiat_currency ?? t.currency ?? guessFiat(t.symbol),
  }));
  return ttlSet(key, enriched);
}

export async function findToken(symbolOrFiat: string, network?: string): Promise<SeraToken | null> {
  const tokens = await getTokens(network);
  const needle = symbolOrFiat.toUpperCase();

  const exact = tokens.find((t) => t.symbol.toUpperCase() === needle);
  if (exact) return exact;

  if (isFiatCode(needle)) {
    const preferred = FIAT_PREFERRED_TOKEN[needle];
    if (preferred) {
      const pref = tokens.find((t) => t.symbol.toUpperCase() === preferred);
      if (pref) return pref;
    }
    return tokens.find((t) => (t.fiat_currency ?? "").toUpperCase() === needle) ?? null;
  }

  return null;
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

function toRawAmount(human: number | string, decimals: number): string {
  const n = typeof human === "string" ? Number(human) : human;
  if (!Number.isFinite(n) || n <= 0) throw new Error(`invalid amount: ${human}`);
  const [whole, frac = ""] = n.toFixed(decimals).split(".");
  return BigInt(whole + frac.padEnd(decimals, "0").slice(0, decimals)).toString();
}

function fromRawAmount(raw: string | number | undefined, decimals: number): string {
  if (raw === undefined || raw === null) return "0";
  const s = String(raw);
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  const out = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${out}` : out;
}

/**
 * Simulated executable quote (burn address) — price discovery only.
 * Ask Sera never signs or executes.
 */
export async function getSimulatedSwapQuote(opts: {
  fromSymbol: string;
  toSymbol: string;
  amountHuman?: number | string;
  network?: string;
}): Promise<{
  from: SeraToken;
  to: SeraToken;
  amountHuman: string;
  quote: SwapQuoteResponse;
  human: { input: string; minOutput: string; impliedRate: string | null };
}> {
  const from = await findToken(opts.fromSymbol, opts.network);
  const to = await findToken(opts.toSymbol, opts.network);
  if (!from) throw new Error(`Unknown from token/fiat: ${opts.fromSymbol}`);
  if (!to) throw new Error(`Unknown to token/fiat: ${opts.toSymbol}`);

  const amountHuman = opts.amountHuman ?? 100;
  const rawAmount = toRawAmount(amountHuman, from.decimals);
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 300;

  const quote = await seraFetch<SwapQuoteResponse>("/swap/quote", {
    network: opts.network,
    method: "POST",
    body: {
      from_token: from.address,
      to_token: to.address,
      from_amount: rawAmount,
      owner_address: SIMULATE_OWNER,
      recipient: SIMULATE_OWNER,
      expiration,
      gas_mode: "receive_less",
    },
  });

  const input = fromRawAmount(quote.route_params?.maxInputAmount ?? rawAmount, from.decimals);
  const minOutput = fromRawAmount(quote.route_params?.minOutputAmount, to.decimals);
  const inN = Number(input);
  const outN = Number(minOutput);
  const impliedRate =
    Number.isFinite(inN) && inN > 0 && Number.isFinite(outN)
      ? (outN / inN).toFixed(6)
      : null;

  return {
    from,
    to,
    amountHuman: String(amountHuman),
    quote,
    human: { input, minOutput, impliedRate },
  };
}

export async function getHealth(network?: string) {
  return seraFetch<Record<string, unknown>>("/health", { network });
}

export async function getConfig(network?: string) {
  const net = resolveNetwork(network);
  const base = apiBase(net);
  const key = `config:${net}:${base}`;
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
