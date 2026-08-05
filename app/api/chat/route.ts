import { prefetchCashbackContext, wantsCashback } from "@/lib/cashback";
import { publicErrorMessage } from "@/lib/errors";
import { isSocialQuery, prefetchLiveNews } from "@/lib/exa";
import { formatRetrievedContext, retrieveKnowledge } from "@/lib/knowledge";
import {
  isPureRateQuery,
  prefetchConfigContext,
  prefetchLiveContext,
  wantsConfigQuery,
} from "@/lib/live-context";
import { forceUrlsFromText, prefetchLiveWeb } from "@/lib/live-web";
import { hasLlmCredentials, streamChatWithFailover } from "@/lib/llm";
import { SYSTEM_PROMPT, PRODUCT_ACCURACY_BLOCK, FOUNDER_ACCURACY_BLOCK } from "@/lib/prompt";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  formatSourcesNote,
  knowledgeSourceLines,
  toUiSources,
  wantsCitationFollowUp,
  type SourceLine,
} from "@/lib/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 48_000;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  if (!hasLlmCredentials()) {
    return Response.json(
      { error: "Chat is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const limited = rateLimit({
    key: `chat:${clientKey(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages[] required." }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json({ error: "Too many messages." }, { status: 413 });
  }

  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m.content !== "string") {
      return Response.json({ error: "Invalid message." }, { status: 400 });
    }
    totalChars += m.content.length;
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return Response.json({ error: "Message too long." }, { status: 413 });
    }
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return Response.json({ error: "Conversation too long." }, { status: 413 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";
  if (typeof query !== "string" || query.trim().length === 0) {
    return Response.json({ error: "Empty user message." }, { status: 400 });
  }

  try {
    const pureRateIntent = isPureRateQuery(query);
    const citationQ = wantsCitationFollowUp(query);
    const historyBlob = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => m.content)
      .join("\n");
    const retrievalQuery = citationQ ? `${query}\n${historyBlob}` : query;

    const cashbackIntent = wantsCashback(query);
    const socialIntent = isSocialQuery(query);
    const configIntent = wantsConfigQuery(query);
    const [live, config, cashback, web, news] = await Promise.all([
      prefetchLiveContext(query),
      prefetchConfigContext(query),
      prefetchCashbackContext(query),
      // Social/X always scrapes via Firecrawl (Exa no longer indexes tweets).
      // Skip web only for pure FX turns, or cashback/config without social.
      pureRateIntent && !citationQ
        ? Promise.resolve(null)
        : (cashbackIntent || configIntent) && !socialIntent && !citationQ
          ? Promise.resolve(null)
          : prefetchLiveWeb(retrievalQuery, {
              forceUrls: citationQ
                ? forceUrlsFromText(historyBlob)
                : socialIntent
                  ? ["https://x.com/seraprotocol"]
                  : undefined,
            }),
      // Exa is for official-site announcements; social tweets use Firecrawl above.
      pureRateIntent && !citationQ
        ? Promise.resolve(null)
        : prefetchLiveNews(query),
    ]);

    const isRateLive = live?.label?.startsWith("live:rate:") ?? false;
    const isConfigLive = Boolean(config?.used);
    const knowledgeLimit =
      live?.label === "live:/tokens"
        ? 3
        : pureRateIntent || (isConfigLive && !cashback?.used && !socialIntent && !web?.used)
          ? 2
          : cashback?.used
            ? 3
            : /\b(what is sera|sera protocol|founder|team|overview|tell me about|explain sera)\b/i.test(
                  query,
                )
              ? 8
              : web?.used || news?.used
                ? 5
                : 8;
    const chunks = retrieveKnowledge(retrievalQuery, knowledgeLimit);
    const context = formatRetrievedContext(chunks);

    // Pure rate answers stay chip-light; compound turns still surface other sources.
    const pureRate =
      isRateLive &&
      pureRateIntent &&
      !isConfigLive &&
      !cashback?.url &&
      !news?.used &&
      !socialIntent &&
      (web?.urls?.length ?? 0) === 0;

    const sourceLines: SourceLine[] = [];
    if (!pureRate) {
      // Prioritize live product surfaces before generic docs (chip budget is limited).
      if (cashback?.url) {
        sourceLines.push({ label: "Cashback", url: cashback.url });
      }
      if (socialIntent || (web?.urls ?? []).some((u) => /x\.com|twitter\.com/i.test(u))) {
        sourceLines.push({ label: "X", url: "https://x.com/seraprotocol" });
      }
      if (isConfigLive) {
        sourceLines.push(
          { label: "Live API", url: "https://api.sera.cx/api/v1/config" },
          { label: "Contracts", url: "https://github.com/sera-cx/orderbook-contract-v2" },
        );
      }
      for (const url of news?.urls ?? []) {
        sourceLines.push({ label: "News", url });
      }
      // Empty Exa news: still attribute official site when nothing else is present.
      if (news?.used && (news.urls?.length ?? 0) === 0 && !socialIntent && !cashback?.url) {
        sourceLines.push({ label: "Sera", url: "https://sera.cx/" });
      }
      for (const url of web?.urls ?? []) {
        if (/x\.com|twitter\.com/i.test(url)) continue; // already added X
        sourceLines.push({ label: "Official page", url });
      }
      if (
        !isConfigLive &&
        !cashback?.url &&
        !news?.used &&
        !socialIntent &&
        (web?.urls?.length ?? 0) === 0 &&
        (news?.urls?.length ?? 0) === 0
      ) {
        if (live?.used) {
          sourceLines.push({ label: "Live API", url: "https://api.sera.cx/api/v1" });
        }
        sourceLines.push(
          ...knowledgeSourceLines([...new Set(chunks.map((c) => c.source))]),
        );
      }
    }

    const uiSources = toUiSources(sourceLines);

    const liveBlock = live?.markdown
      ? `\n\n## Live API snapshot\n\n${live.markdown}`
      : "";

    const configBlock = config?.markdown
      ? `\n\n## Live config snapshot\n\n${config.markdown}`
      : "";

    const cashbackBlock = cashback?.markdown
      ? `\n\n## Live cashback snapshot\n\n${cashback.markdown}`
      : "";

    const newsBlock = news?.markdown
      ? `\n\n## Live news snapshot\n\n${news.markdown}`
      : "";

    const webBlock = web?.markdown
      ? socialIntent || (web.urls ?? []).some((u) => /x\.com|twitter\.com/i.test(u))
        ? `\n\n## Live X page\n\n${web.markdown}`
        : `\n\n## Live pages\n\n${web.markdown}`
      : "";

    const citationHint = citationQ
      ? `\n\n## Citation follow-up\nName the official page(s) in one short sentence.`
      : "";

    const groundingNote = `\n\n## Grounding for this turn
Live snapshots are ground truth when present. Use only facts from them or curated knowledge. Write the user-facing answer only.`;

    const wantsProductAccuracy =
      /\b(what is sera|sera protocol|overview|explain sera|tell me about sera|product|products|earn|on[- ]?par|gsera|cashback|mcp|agents?)\b/i.test(
        query,
      );
    const wantsFounderAccuracy =
      /\b(founder|founders|ceo|team|who (founded|started|built|runs))\b/i.test(query);

    const accuracyBlock = [
      wantsProductAccuracy ? PRODUCT_ACCURACY_BLOCK : "",
      wantsFounderAccuracy ? FOUNDER_ACCURACY_BLOCK : "",
    ]
      .filter(Boolean)
      .map((b) => `\n\n${b}`)
      .join("");

    return await streamChatWithFailover({
      system: `${SYSTEM_PROMPT}${accuracyBlock}\n\n## Retrieved knowledge\n\n${context}${liveBlock}${configBlock}${cashbackBlock}${webBlock}${newsBlock}${citationHint}${groundingNote}\n\n${formatSourcesNote()}`,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      sources: uiSources,
    });
  } catch (error) {
    console.error("[ask-sera/chat]", error);
    return Response.json({ error: publicErrorMessage(error) }, { status: 500 });
  }
}
