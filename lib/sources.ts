/**
 * Server-owned citation list for subtle UI chips (never printed by the model).
 */

export type SourceLine = {
  label: string;
  url?: string;
};

type UiSource = {
  label: string;
  url: string;
};

const KNOWLEDGE_URLS: Record<string, string[]> = {
  "overview.md": ["https://www.sera.cx/team", "https://sera.cx/"],
  "products.md": [
    "https://docs.sera.cx/",
    "https://app.sera.cx/en/cashback",
    "https://sera.cx/",
  ],
  "community.md": ["https://community.sera.cx/"],
  "api.md": ["https://docs.testnet.sera.cx/", "https://docs.sera.cx/"],
  "liquidity.md": ["https://docs.testnet.sera.cx/", "https://docs.sera.cx/"],
  "agents.md": ["https://agents.sera.cx/"],
  "contracts.md": [
    "https://api.sera.cx/api/v1/config",
    "https://docs.testnet.sera.cx/",
    "https://github.com/sera-cx/orderbook-contract-v2",
  ],
  "assistant-policy.md": [],
};

export function knowledgeSourceLines(chunkSources: string[]): SourceLine[] {
  const out: SourceLine[] = [];
  const seen = new Set<string>();
  for (const file of chunkSources) {
    for (const url of KNOWLEDGE_URLS[file] ?? []) {
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ label: shortLabelFromUrl(url), url });
    }
  }
  return out;
}

export function toUiSources(lines: SourceLine[]): UiSource[] {
  const seen = new Set<string>();
  const out: UiSource[] = [];
  for (const l of lines) {
    if (!l.url || seen.has(l.url)) continue;
    seen.add(l.url);
    out.push({
      label: labelFor(l.label, l.url),
      url: l.url,
    });
  }
  return out.slice(0, 6);
}

function labelFor(label: string, url: string): string {
  if (/x\.com|twitter\.com/i.test(url)) return "X";
  if (/^Official page$/i.test(label)) return shortLabelFromUrl(url);
  if (/^Live API$/i.test(label)) return "Live API";
  if (/^News$/i.test(label)) return "News";
  return label || shortLabelFromUrl(url);
}

function shortLabelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    if (path.includes("/team")) return "Team";
    if (host.startsWith("community.")) return "Community";
    if (host.startsWith("docs.")) return "Docs";
    if (host.startsWith("agents.")) return "Agents";
    if (host.startsWith("app.")) return path.includes("cashback") ? "Cashback" : "App";
    if (host === "x.com" || host === "twitter.com") return "X";
    if (host.startsWith("api.")) return "API";
    if (path.includes("/earn")) return "Earn";
    if (path.includes("/cashback")) return "Cashback";
    if (path && path !== "/") {
      const last = path.split("/").filter(Boolean).pop();
      if (last) return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (host === "sera.cx") return "Sera";
    return host;
  } catch {
    return "Source";
  }
}

/** One-line note for the model — UI attaches chips separately. */
export function formatSourcesNote(): string {
  return "Citation chips are attached by the UI. Omit any Sources section or @@sources@@ markers from the answer body.";
}

export function wantsCitationFollowUp(query: string): boolean {
  return /\b(source|sources|where (did|do) you (get|find|read|learn)|cite|citation|according to|based on what|what (page|site|url)|link (please|to that))\b/i.test(
    query,
  );
}
