import "server-only";

import { hasFirecrawlCredentials, scrapeMany, type FirecrawlPage } from "@/lib/firecrawl";

type LiveWebPrefetch = {
  used: boolean;
  label: string;
  markdown: string;
  urls: string[];
};

const ALLOWLISTED_SOURCES: { match: RegExp; urls: string[]; label: string }[] = [
  {
    label: "social",
    match: /\b(tweet|tweets|twitter|x\.com|on x|socials?|@seraprotocol)\b/i,
    urls: ["https://x.com/seraprotocol"],
  },
  {
    label: "community",
    match:
      /\b(token ?2049|community|evangelist|sponsor|sponsorship|gsera|xp\b|badge|referral|telegram|ambassador)\b/i,
    urls: ["https://community.sera.cx/"],
  },
  {
    label: "team",
    match:
      /\b(team|founder|founders|ceo|who (built|founded|started|runs|created)|about (the )?compan|douglas)\b/i,
    urls: ["https://www.sera.cx/team", "https://sera.cx/"],
  },
  {
    label: "cashback",
    match: /\b(cashback|cash back|cash-back|shop with sera)\b/i,
    urls: ["https://app.sera.cx/en/cashback"],
  },
  {
    label: "earn",
    match: /\b(earn|liquidity provider|\blp\b|virtual liquidity|apy|yield)\b/i,
    urls: ["https://sera.cx/earn", "https://docs.sera.cx/protocol/earn/"],
  },
  {
    label: "on-par",
    match: /\b(on[- ]?par|same[- ]?peg|1:1)\b/i,
    urls: ["https://sera.cx/on-par"],
  },
  {
    label: "pay",
    match: /\b(pay|serapay|merchant|checkout|qr)\b/i,
    urls: ["https://docs.sera.cx/", "https://sera.cx/"],
  },
  {
    label: "agents",
    match: /\b(mcp|sera-mcp|sera-agent|agents?\.sera)\b/i,
    urls: ["https://agents.sera.cx/"],
  },
  {
    label: "docs-api",
    match: /\b(api|rest|docs|signing|eip-?712|route_params|swap\/quote|fx\/rate)\b/i,
    urls: ["https://docs.testnet.sera.cx/", "https://docs.sera.cx/"],
  },
  {
    label: "products",
    match:
      /\b(what products|which products|sera products|product (map|list|suite)|features? (of|on) sera)\b/i,
    urls: ["https://docs.sera.cx/", "https://docs.sera.cx/protocol/earn/", "https://app.sera.cx/en/cashback"],
  },
  {
    label: "overview",
    match: /\b(what is sera|sera protocol|overview|explain sera|tell me about sera|who (is|are) (the )?founder)\b/i,
    urls: ["https://docs.sera.cx/", "https://www.sera.cx/team", "https://sera.cx/"],
  },
];

export function allAllowlistedUrls(): string[] {
  return [...new Set(ALLOWLISTED_SOURCES.flatMap((s) => s.urls))];
}

/** Reuse allowlist matchers for citation follow-ups from conversation history. */
export function forceUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  for (const src of ALLOWLISTED_SOURCES) {
    if (src.match.test(text)) {
      for (const u of src.urls) {
        if (!urls.includes(u)) urls.push(u);
      }
    }
  }
  return urls.slice(0, 3);
}

function pickUrls(query: string): { urls: string[]; labels: string[] } {
  const urls: string[] = [];
  const labels: string[] = [];
  for (const src of ALLOWLISTED_SOURCES) {
    if (src.match.test(query)) {
      labels.push(src.label);
      for (const u of src.urls) {
        if (!urls.includes(u)) urls.push(u);
      }
    }
  }
  if (urls.length === 0 && /\bsera\b/i.test(query) && query.split(/\s+/).length <= 12) {
    urls.push("https://sera.cx/");
    labels.push("overview");
  }
  return { urls: urls.slice(0, 4), labels };
}

function formatPages(pages: FirecrawlPage[]): string {
  return pages
    .map((p, i) => {
      const title = p.title ? ` — ${p.title}` : "";
      return [`### Official page ${i + 1}: ${p.url}${title}`, "", p.markdown].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function prefetchLiveWeb(
  query: string,
  opts: { forceUrls?: string[] } = {},
): Promise<LiveWebPrefetch | null> {
  if (!hasFirecrawlCredentials()) return null;

  const picked = pickUrls(query);
  const urls = [...new Set([...(opts.forceUrls ?? []), ...picked.urls])].slice(0, 4);
  const labels = picked.labels.length ? picked.labels : opts.forceUrls?.length ? ["forced"] : [];
  if (urls.length === 0) return null;

  const pages = await scrapeMany(urls, 4);
  if (pages.length === 0) {
    return {
      used: true,
      label: "live-web:error",
      urls,
      markdown: [
        "### Live docs/product scrape failed",
        "",
        `Tried: ${urls.join(", ")}`,
        "Official page text unavailable in this snapshot.",
      ].join("\n"),
    };
  }

  return {
    used: true,
    label: `live-web:${labels.join("+") || "pages"}`,
    urls: pages.map((p) => p.url),
    markdown: [
      "### Official pages",
      "",
      formatPages(pages),
    ].join("\n"),
  };
}
