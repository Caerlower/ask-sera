import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { formatDataStreamPart, streamText, type CoreMessage } from "ai";
import {
  errorText,
  isFailoverError,
  isRateLimitError,
  publicErrorMessage,
} from "@/lib/errors";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/** Per-key cooldown after rate limit (ms since epoch). Process-local. */
const keyCooldownUntil = new Map<number, number>();

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

function parseRetryAfterMs(message: string): number {
  const m = message.match(
    /try again in\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+(?:\.\d+)?)\s*s)?/i,
  );
  if (m) {
    const h = Number(m[1] ?? 0);
    const min = Number(m[2] ?? 0);
    const sec = Number(m[3] ?? 0);
    const ms = ((h * 60 + min) * 60 + sec) * 1000;
    if (ms > 0) return Math.min(ms + 5_000, 24 * 60 * 60_000);
  }
  if (/tokens per day|tpd/i.test(message)) return 60 * 60_000;
  return 60_000;
}

function markCooldown(index: number, error: unknown) {
  keyCooldownUntil.set(index, Date.now() + parseRetryAfterMs(errorText(error)));
}

function orderedKeys(keys: string[]): { key: string; index: number }[] {
  const now = Date.now();
  const available = keys
    .map((key, index) => ({ key, index }))
    .filter(({ index }) => (keyCooldownUntil.get(index) ?? 0) <= now);
  return available.length > 0 ? available : keys.map((key, index) => ({ key, index }));
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
    const { key, index } = candidates[attempt]!;
    const groq = createGroq({ apiKey: key });
    const label = `#${index + 1}/${total}`;

    try {
      const result = streamText({
        model: groq(modelId),
        system: args.system,
        messages: args.messages,
        temperature: 0.2,
        maxTokens: 3200,
        maxRetries: 0,
      });

      const response = result.toDataStreamResponse({
        getErrorMessage: (error) => {
          if (isFailoverError(error)) {
            console.warn("[ask-sera/chat] upstream rate-limited or busy");
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
          markCooldown(index, streamErr);
          lastError = streamErr;
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          if (attempt < candidates.length - 1) {
            console.warn(
              `[ask-sera] Groq key ${label} rate-limited/unavailable — trying next key`,
            );
            continue;
          }
          // Last key also failed — do NOT stream a half-broken 200 to the UI (it hangs).
          console.error(
            `[ask-sera/chat] all ${total} Groq keys exhausted (last tried ${label})`,
            streamErr,
          );
          return Response.json({ error: publicErrorMessage(streamErr) }, { status: 429 });
        }
      }

      // Healthy stream. Write first chunk, then sources annotation BEFORE finish
      // events — useChat drops annotations that arrive after e:/d: finish.
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
          `[ask-sera] Groq key ${label} failed (${isRateLimitError(error) ? "rate limit" : "upstream"}) — trying next key`,
        );
        continue;
      }
      if (isFailoverError(error)) {
        console.error(
          `[ask-sera/chat] all ${total} Groq keys exhausted (last tried ${label})`,
          error,
        );
        return Response.json({ error: publicErrorMessage(error) }, { status: 429 });
      }
      console.error("[ask-sera/chat] upstream error", error);
      return Response.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
  }

  console.error(`[ask-sera/chat] all ${total} Groq keys exhausted`, lastError);
  const status = isFailoverError(lastError) ? 429 : 500;
  return Response.json({ error: publicErrorMessage(lastError) }, { status });
}
