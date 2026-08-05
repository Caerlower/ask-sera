/**
 * Live cashback merchants from the Sera app API.
 * Source of truth: GET https://app.sera.cx/api/cashback/merchants
 */

import "server-only";

export const CASHBACK_APP_URL = "https://app.sera.cx/en/cashback";
export const CASHBACK_MERCHANTS_URL = "https://app.sera.cx/api/cashback/merchants";

export type CashbackMerchant = {
  merchant_id: string;
  name: string;
  category?: string;
  headline_rate?: string;
  best_rate?: string;
  rate_note?: string;
  payout_days?: number;
  cookie_days?: number;
  available?: boolean;
};

export function wantsCashback(query: string): boolean {
  return /\b(cashback|cash back|cash-back|shop with sera|cashback stores?|which (websites?|stores?|merchants?).{0,40}cashback|cashback.{0,40}(stores?|websites?|merchants?|partners?))\b/i.test(
    query,
  );
}

export async function fetchCashbackMerchants(): Promise<CashbackMerchant[]> {
  const res = await fetch(CASHBACK_MERCHANTS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`cashback merchants ${res.status}`);
  }
  const json = (await res.json()) as { merchants?: CashbackMerchant[] };
  return Array.isArray(json.merchants) ? json.merchants : [];
}

export function formatCashbackMerchantsMarkdown(merchants: CashbackMerchant[]): string {
  const lines = [
    "### Live cashback merchants (app.sera.cx)",
    "",
    `App UI: ${CASHBACK_APP_URL}`,
    "Rewards paid in **MYRT** after the store confirms the order. Rates are “up to” and can vary by category/region.",
    `Store count in this snapshot: **${merchants.length}**.`,
    "",
    "| Store | Category | Up to | Payout | Available |",
    "|---|---|---:|---:|---|",
  ];

  for (const m of merchants) {
    const rate = m.headline_rate ?? m.best_rate ?? "—";
    const payout = m.payout_days != null ? `${m.payout_days}d` : "—";
    const avail = m.available === false ? "no" : "yes";
    lines.push(
      `| ${m.name} | ${m.category ?? "—"} | ${rate}% | ${payout} | ${avail} |`,
    );
  }

  if (merchants.length === 0) {
    lines.push("| — | — | — | — | — |");
    lines.push("");
    lines.push("(Live merchant list empty.)");
  }

  return lines.join("\n");
}

export async function prefetchCashbackContext(query: string): Promise<{
  used: boolean;
  label: string;
  markdown: string;
  url: string;
} | null> {
  if (!wantsCashback(query)) return null;

  try {
    const merchants = await fetchCashbackMerchants();
    return {
      used: true,
      label: "live:cashback",
      url: CASHBACK_APP_URL,
      markdown: formatCashbackMerchantsMarkdown(merchants),
    };
  } catch (err) {
    console.warn(
      "[ask-sera/cashback]",
      err instanceof Error ? err.message : err,
    );
    return {
      used: true,
      label: "live:cashback:error",
      url: CASHBACK_APP_URL,
      markdown: [
        "### Live cashback merchants fetch failed",
        "",
        `Tried: ${CASHBACK_MERCHANTS_URL}`,
        `App UI: ${CASHBACK_APP_URL}`,
        "Cashback is a live in-app product; merchant rows unavailable in this snapshot.",
      ].join("\n"),
    };
  }
}
