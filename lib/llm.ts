import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { formatDataStreamPart, streamText, type CoreMessage } from "ai";
import {
  errorText,
  isFailoverError,
  isRateLimitError,
  publicErrorMessage,
} from "@/lib/errors";

const DEFAULT_MODEL = "openai/gpt-oss-120b";

/** Per-key cooldown after rate limit (ms since epoch). Process-local. */
const keyCooldownUntil = new Map<number, number>();

/** Rotate which key we try first so multi-turn chats don't always burn #1. */
let roundRobinOffset = 0;

function getGroqApiKeys(): string[] {
  const fromList = (process.env.GROQ_API_KEYS ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const numbered: string[] = [];
  // GROQ_API_KEY and GROQ_API_KEY_1 are both accepted as the primary key.
  const primary =
    process.env.GROQ_API_KEY?.trim() || process.env.GROQ_API_KEY_1?.trim();
  if (primary) numbered.push(primary);
  for (let i = 2; i <= 20; i++) {
    const v = process.env[`GROQ_API_KEY_${i}`]?.trim();
    if (v) numbered.push(v);
  }

  const unique = [...new Set([...fromList, ...numbered])];
  const rawCount = fromList.length + numbered.length;
  if (rawCount > unique.length) {
    console.warn(
      `[ask-sera] Groq keys: ${unique.length} unique of ${rawCount} configured (duplicates ignored)`,
    );
  }
  return unique;
}

export function hasLlmCredentials(): boolean {
  return getGroqApiKeys().length > 0;
}

function classifyLimit(message: string): "tpd" | "tpm" | "rpm" | "unknown" {
  const lower = message.toLowerCase();
  if (/tokens per day|\btpd\b/.test(lower)) return "tpd";
  if (/tokens per minute|\btpm\b/.test(lower)) return "tpm";
  if (/requests per minute|\brpm\b/.test(lower)) return "rpm";
  return "unknown";
}

/**
 * Cooldown length from a raw provider error.
 * Important: stream path may only see our sanitized client copy — keep those short
 * so a follow-up turn can still reach a healthy key.
 */
function parseRetryAfterMs(message: string): number {
  const m = message.match(
    /try again in\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+(?:\.\d+)?)\s*s)?/i,
  );
  if (m) {
    const h = Number(m[1] ?? 0);
    const min = Number(m[2] ?? 0);
    const sec = Number(m[3] ?? 0);
    const ms = ((h * 60 + min) * 60 + sec) * 1000;
    if (ms > 0) return Math.min(ms + 2_000, 24 * 60 * 60_000);
  }

  const kind = classifyLimit(message);
  if (kind === "tpd") return 15 * 60_000; // retry sooner; daily reset is org-side anyway
  if (kind === "tpm" || kind === "rpm") return 8_000;

  // Sanitized UI copy / unknown — short cooldown so multi-turn can recover
  if (/getting a lot of questions right now/i.test(message)) return 5_000;
  return 10_000;
}

function markCooldown(index: number, error: unknown) {
  const raw = errorText(error);
  const ms = parseRetryAfterMs(raw);
  keyCooldownUntil.set(index, Date.now() + ms);
  const kind = classifyLimit(raw);
  console.warn(
    `[ask-sera] Groq key #${index + 1} cooldown ${Math.round(ms / 1000)}s (${kind})`,
  );
}

function clearCooldown(index: number) {
  keyCooldownUntil.delete(index);
}

/**
 * Prefer keys not on cooldown, but ALWAYS keep cooled keys as a fallback.
 * Previously we only tried "available" keys and could report "all 9 exhausted"
 * after trying 2–3 — skipping a healthy org key still on a stale cooldown.
 */
function orderedKeys(keys: string[]): { key: string; index: number; cooling: boolean }[] {
  const now = Date.now();
  const n = keys.length;
  if (n === 0) return [];

  const start = roundRobinOffset % n;
  roundRobinOffset = (roundRobinOffset + 1) % Math.max(n, 1);

  const rotated = keys.map((key, i) => {
    const index = (start + i) % n;
    return {
      key: keys[index]!,
      index,
      cooling: (keyCooldownUntil.get(index) ?? 0) > now,
    };
  });

  return [...rotated.filter((k) => !k.cooling), ...rotated.filter((k) => k.cooling)];
}

function isDataStreamErrorChunk(chunk: string): string | null {
  const line = chunk.split("\n").find((l) => l.startsWith("3:"));
  if (!line) return null;
  try {
    const payload = JSON.parse(line.slice(2)) as unknown;
    return typeof payload === "string" ? payload : errorText(payload);
  } catch {
    return line.slice(2);
  }
}

/** Redact secrets from provider error text before logging. */
function safeErrorSnippet(error: unknown): string {
  return errorText(error)
    .replace(/gsk_[A-Za-z0-9]+/g, "gsk_***")
    .replace(/org_[A-Za-z0-9]+/g, "org_***")
    .slice(0, 220);
}

type ChatSource = { label: string; url: string };

type ChatStreamArgs = {
  system: string;
  messages: CoreMessage[];
  sources?: ChatSource[];
};

function sourcesAnnotationChunk(sources: ChatSource[]): Uint8Array {
  const part = formatDataStreamPart("message_annotations", [{ sources }]);
  return new TextEncoder().encode(part);
}

/**
 * Stream a chat completion, failing over across Groq API keys on rate limits
 * before any successful tokens are returned to the client.
 */
export async function streamChatWithFailover(args: ChatStreamArgs): Promise<Response> {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    return Response.json(
      { error: "Chat is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const modelId = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const candidates = orderedKeys(keys);
  const total = keys.length;
  let lastError: unknown;

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const { key, index, cooling } = candidates[attempt]!;
    const groq = createGroq({ apiKey: key });
    const label = `#${index + 1}/${total}${cooling ? " (cooldown-retry)" : ""}`;

    try {
      // Capture the raw provider error for cooldown classification before
      // getErrorMessage sanitizes it into the data-stream `3:` chunk.
      let lastRawError: unknown;

      const result = streamText({
        model: groq(modelId),
        system: args.system,
        messages: args.messages,
        temperature: 0.2,
        maxTokens: 8192,
        maxRetries: 0,
        providerOptions: {
          groq: {
            // gpt-oss is a reasoning model; keep CoT off the user-facing stream.
            reasoningFormat: "hidden",
          },
        },
      });

      const response = result.toDataStreamResponse({
        getErrorMessage: (error) => {
          lastRawError = error;
          if (isFailoverError(error)) {
            console.warn(
              `[ask-sera/chat] upstream fail ${label}: ${safeErrorSnippet(error)}`,
            );
          } else {
            console.error("[ask-sera/chat]", publicErrorMessage(error));
          }
          return publicErrorMessage(error);
        },
      });

      const body = response.body;
      if (!body) {
        lastError = new Error("Empty upstream response");
        continue;
      }

      const reader = body.getReader();
      const { done, value } = await reader.read();

      if (!done && value) {
        const decoded = new TextDecoder().decode(value);
        const streamErr = isDataStreamErrorChunk(decoded);
        if (streamErr && isFailoverError(streamErr)) {
          const cooldownSrc = lastRawError ?? streamErr;
          markCooldown(index, cooldownSrc);
          lastError = cooldownSrc;
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          if (attempt < candidates.length - 1) {
            console.warn(
              `[ask-sera] Groq key ${label} unavailable — trying next key`,
            );
            continue;
          }
          console.error(
            `[ask-sera/chat] all ${total} Groq keys exhausted (last tried ${label})`,
            safeErrorSnippet(cooldownSrc),
          );
          return Response.json({ error: publicErrorMessage(cooldownSrc) }, { status: 429 });
        }
      }

      // Healthy stream — clear this key's cooldown and deliver to the client.
      clearCooldown(index);

      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const sources = args.sources?.filter((s) => s.url) ?? [];
      const annotation =
        sources.length > 0 ? sourcesAnnotationChunk(sources) : null;

      void (async () => {
        try {
          if (!done && value) await writer.write(value);
          if (annotation) await writer.write(annotation);
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            if (next.value) await writer.write(next.value);
          }
          await writer.close();
        } catch (err) {
          try {
            await writer.abort(err);
          } catch {
            /* ignore */
          }
        }
      })();

      return new Response(readable, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      lastError = error;
      if (isFailoverError(error) && attempt < candidates.length - 1) {
        markCooldown(index, error);
        console.warn(
          `[ask-sera] Groq key ${label} failed (${isRateLimitError(error) ? "rate limit" : "upstream"}): ${safeErrorSnippet(error)} — trying next`,
        );
        continue;
      }
      if (isFailoverError(error)) {
        markCooldown(index, error);
        console.error(
          `[ask-sera/chat] all ${total} Groq keys exhausted (last tried ${label})`,
          safeErrorSnippet(error),
        );
        return Response.json({ error: publicErrorMessage(error) }, { status: 429 });
      }
      console.error("[ask-sera/chat] upstream error", safeErrorSnippet(error));
      return Response.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
  }

  console.error(
    `[ask-sera/chat] all ${total} Groq keys exhausted`,
    safeErrorSnippet(lastError),
  );
  const status = isFailoverError(lastError) ? 429 : 500;
  return Response.json({ error: publicErrorMessage(lastError) }, { status });
}
