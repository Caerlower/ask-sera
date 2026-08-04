import { publicErrorMessage } from "@/lib/errors";
import { formatRetrievedContext, retrieveKnowledge } from "@/lib/knowledge";
import { prefetchLiveContext } from "@/lib/live-context";
import { hasLlmCredentials, streamChatWithFailover } from "@/lib/llm";
import { SYSTEM_PROMPT } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  try {
    const live = await prefetchLiveContext(query);
    const knowledgeLimit = live?.label === "live:/tokens" ? 3 : 8;
    const chunks = retrieveKnowledge(query, knowledgeLimit);
    const context = formatRetrievedContext(chunks);

    const liveBlock = live?.markdown
      ? `\n\n## Live API snapshot\n\n${live.markdown}\n\nWhen a Live API snapshot is present, treat it as ground truth for that question. For full currency lists, output every symbol from the snapshot — never truncate with “and N more”, and never tell the user to call GET /tokens themselves.`
      : "";

    return await streamChatWithFailover({
      system: `${SYSTEM_PROMPT}\n\n## Retrieved knowledge\n\n${context}${liveBlock}`,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
  } catch (error) {
    console.error("[ask-sera/chat]", error);
    return Response.json({ error: publicErrorMessage(error) }, { status: 500 });
  }
}
