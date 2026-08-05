import { warmFirecrawlUrls } from "@/lib/firecrawl";
import { allAllowlistedUrls } from "@/lib/live-web";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Layer 2 warm — re-scrape allowlisted official pages.
 * Requires CRON_SECRET whenever Firecrawl is configured (Vercel sends Bearer).
 */
export async function GET(req: Request) {
  if (!process.env.FIRECRAWL_API_KEY?.trim()) {
    return Response.json(
      { ok: false, error: "FIRECRAWL_API_KEY not configured" },
      { status: 503 },
    );
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is required when FIRECRAWL_API_KEY is set" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urls = allAllowlistedUrls();
  const result = await warmFirecrawlUrls(urls);

  return Response.json({
    ok: true,
    warmed: result.ok,
    failed: result.fail,
    urls,
    at: new Date().toISOString(),
  });
}
