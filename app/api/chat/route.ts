import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { formatRetrievedContext, retrieveKnowledge } from "@/lib/knowledge";
import { prefetchLiveContext } from "@/lib/live-context";
import { SYSTEM_PROMPT } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 },
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

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";
  if (typeof query !== "string" || query.trim().length === 0) {
    return Response.json({ error: "Empty user message." }, { status: 400 });
  }
  if (query.length > 8000) {
    return Response.json({ error: "Message too long." }, { status: 413 });
  }

  const live = await prefetchLiveContext(query);
  const knowledgeLimit = live?.label === "live:/tokens" ? 3 : 8;
  const chunks = retrieveKnowledge(query, knowledgeLimit);
  const context = formatRetrievedContext(chunks);
  const sources = [
    ...new Set([
      ...chunks.map((c) => c.source),
      ...(live?.used ? [live.label] : []),
    ]),
  ];

  const liveBlock = live?.markdown
    ? `\n\n## Live API snapshot\n\n${live.markdown}\n\nWhen a Live API snapshot is present, treat it as ground truth for that question. For full currency lists, output every symbol from the snapshot — never truncate with “and N more”, and never tell the user to call GET /tokens themselves.`
    : "";

  const result = streamText({
    model: groq(process.env.GROQ_MODEL ?? DEFAULT_MODEL),
    system: `${SYSTEM_PROMPT}\n\n## Retrieved knowledge\n\n${context}${liveBlock}`,
    messages: messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    temperature: 0.25,
    maxTokens: 3200,
  });

  return result.toDataStreamResponse({
    getErrorMessage(error) {
      if (error instanceof Error && error.message) return error.message;
      return "Something went wrong answering that. Try again in a moment.";
    },
    headers: {
      "x-sera-ask-sources": sources.join(","),
    },
  });
}
