/**
 * Layer 3 — recent announcements via Exa (official Sera domains).
 *
 * Note: Exa deprecated category:"tweet" and no longer returns x.com posts
 * reliably. @seraprotocol tweets are scraped via Firecrawl (live-web).
 */

import "server-only";

type LiveNewsPrefetch = {
  used: boolean;
  label: string;
  markdown: string;
  urls: string[];
};

function hasExaCredentials(): boolean {
  return Boolean(process.env.EXA_API_KEY?.trim());
}

export function wantsLiveNews(query: string): boolean {
  return /\b(announce|announced|announcements?|news|update|updates|today|this (morning|week|month)|latest|recent|just (drop|ship|launch)|partnership|partnered|alpha|breaking|on (x|twitter)|tweet|tweets|posted|posting|telegram (post|update)|what did (the )?team|socials?|twitter|x\.com)\b/i.test(
    query,
  );
}

export function isSocialQuery(query: string): boolean {
  return /\b(tweet|tweets|twitter|x\.com|on x|socials?|@seraprotocol)\b/i.test(query);
}

type ExaResult = {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
};

function filterResults(results: ExaResult[]): ExaResult[] {
  return results.filter((r) => {
    const u = (r.url ?? "").toLowerCase();
    if (!u) return false;
    // Drop X URLs here — social is Firecrawl's job; Exa rarely has them now.
    if (u.includes("x.com/") || u.includes("twitter.com/")) {
      return false;
    }
    return true;
  });
}

function formatResults(results: ExaResult[]): LiveNewsPrefetch {
  const formatted = results
    .map((r, i) => {
      const bits = [
        `### Result ${i + 1}: ${r.title ?? "(untitled)"}`,
        r.url ? `URL: ${r.url}` : null,
        r.publishedDate ? `Published: ${r.publishedDate}` : null,
        r.highlights?.length ? `Highlights: ${r.highlights.join(" … ")}` : null,
        r.text ? r.text.slice(0, 1000) : null,
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n\n---\n\n");

  return {
    used: true,
    label: "live-news:exa",
    urls: results.map((r) => r.url).filter((u): u is string => Boolean(u)),
    markdown: ["### Recent official results (Exa)", "", formatted].join("\n"),
  };
}

function emptyNews(recencyDays: number): LiveNewsPrefetch {
  return {
    used: true,
    label: "live-news:empty",
    urls: [],
    markdown: `**No recent official announcements found in Exa (last ~${recencyDays} days).**`,
  };
}

/**
 * Search recent official Sera-related sources.
 * Social/X queries return null — use Firecrawl on https://x.com/seraprotocol.
 */
export async function prefetchLiveNews(query: string): Promise<LiveNewsPrefetch | null> {
  if (!hasExaCredentials() || !wantsLiveNews(query)) return null;

  // Tweets / X: Exa's tweet category is deprecated; domain search returns 0.
  // Firecrawl scrapes the live profile (see live-web + chat route).
  if (isSocialQuery(query)) return null;

  const key = process.env.EXA_API_KEY!.trim();
  const days = Number(process.env.EXA_RECENCY_DAYS);
  const configured = Number.isFinite(days) && days > 0 ? days : 14;
  const start = new Date(Date.now() - configured * 24 * 60 * 60_000).toISOString();

  try {
    async function runSearch(payload: Record<string, unknown>): Promise<ExaResult[]> {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "x-api-key": key,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(`[ask-sera/exa] ${res.status}: ${text.slice(0, 200)}`);
        return [];
      }
      const json = (await res.json()) as { results?: ExaResult[] };
      return json.results ?? [];
    }

    const results = filterResults(
      await runSearch({
        query: `Sera Protocol ${query}`,
        type: "auto",
        numResults: 8,
        includeDomains: [
          "sera.cx",
          "app.sera.cx",
          "community.sera.cx",
          "docs.sera.cx",
          "docs.testnet.sera.cx",
          "agents.sera.cx",
          "token2049.sera.cx",
        ],
        startPublishedDate: start,
        contents: { text: { maxCharacters: 1200 }, highlights: { maxCharacters: 800 } },
      }),
    );

    console.info(`[ask-sera/exa] mode=domains social=false kept=${results.length}`);

    if (results.length === 0) return emptyNews(configured);
    return formatResults(results);
  } catch (err) {
    console.warn("[ask-sera/exa]", err instanceof Error ? err.message : err);
    return {
      used: true,
      label: "live-news:error",
      urls: [],
      markdown: "**Couldn’t fetch latest announcements right now.**",
    };
  }
}
