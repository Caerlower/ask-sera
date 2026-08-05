/**
 * Firecrawl scrape client — allowlisted official Sera pages only.
 * Uses Next.js data cache so scrapes survive across serverless invocations.
 */

import "server-only";

import { unstable_cache } from "next/cache";

/** Chat path keeps pages short to limit prompt size. */
const MAX_MARKDOWN_CHARS = 6_000;

export function hasFirecrawlCredentials(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

function revalidateSeconds(): number {
  const hours = Number(process.env.FIRECRAWL_CACHE_TTL_HOURS);
  const h = Number.isFinite(hours) && hours > 0 ? hours : 6;
  return Math.round(h * 3600);
}

export type FirecrawlPage = {
  url: string;
  title?: string;
  markdown: string;
};

async function scrapeMarkdownUncached(url: string): Promise<FirecrawlPage | null> {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 20_000,
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[ask-sera/firecrawl] ${res.status} ${url}: ${text.slice(0, 200)}`);
    return null;
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string; metadata?: { title?: string } };
  };

  const markdown = (json.data?.markdown ?? "").trim();
  if (!markdown) return null;

  const clipped =
    markdown.length > MAX_MARKDOWN_CHARS
      ? `${markdown.slice(0, MAX_MARKDOWN_CHARS)}\n\n…(truncated)`
      : markdown;

  return { url, title: json.data?.metadata?.title, markdown: clipped };
}

async function scrapeMarkdown(url: string): Promise<FirecrawlPage | null> {
  if (!hasFirecrawlCredentials()) return null;

  // Only cache successful scrapes — throwing on miss prevents Next from
  // caching null for the full TTL after a transient Firecrawl/X failure.
  const cachedFn = unstable_cache(
    async () => {
      const page = await scrapeMarkdownUncached(url);
      if (!page) throw new Error("FIRECRAWL_MISS");
      return page;
    },
    ["firecrawl-scrape-v3", url],
    { revalidate: revalidateSeconds() },
  );

  try {
    return await cachedFn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg !== "FIRECRAWL_MISS") {
      console.warn(`[ask-sera/firecrawl] failed ${url}:`, msg);
    }
    return null;
  }
}

export async function scrapeMany(urls: string[], limit = 2): Promise<FirecrawlPage[]> {
  const unique = [...new Set(urls)].slice(0, limit);
  const results = await Promise.all(unique.map((u) => scrapeMarkdown(u)));
  return results.filter((r): r is FirecrawlPage => r != null);
}

/** Warm the cache for a URL list (used by cron). */
export async function warmFirecrawlUrls(urls: string[]): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const url of urls) {
    const page = await scrapeMarkdown(url);
    if (page) ok += 1;
    else fail += 1;
  }
  return { ok, fail };
}
