/**
 * Strip model-echoed system/knowledge instructions and meta waffle
 * from user-facing answers. Prefer broad patterns over one-off phrases.
 */

/** Lines that sound like prompt/knowledge instructions, not user answers. */
function isInstructionLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;

  // Explicit markers we inject into live blocks
  if (/^(ANSWER SHAPE|STATUS:|INTERNAL|OUTPUT ONLY|Hard stop|Banned:|Shape:|Instructions for your reply)\b/i.test(t)) {
    return true;
  }

  // Imperatives aimed at the model. Use (?!\w) not \b — \b fails after markdown **.
  if (
    /^(?:[-*•]\s*)?(?:never|do not|don't|must not|hard stop|stop after|stop immediately|prefer |banned:|compound with|match this|unless they asked|blank lines|paraphrase|do \*\*not\*\*|do not print|never print|never echo|never invent|never paste|user invent|omit it|list \*\*only\*\*|copy (?:these|closely|exactly)|user-facing answer|lead with the bold|fall back to curated)(?!\w)/i.test(
      t,
    )
  ) {
    return true;
  }

  // Meta process talk
  if (
    /^(?:please note|also,? note|note that|note:|for the most (?:up-to-date|accurate)|i recommend checking|to get the (?:latest|most)|you can (?:also )?check|you can query|exa is a live|these instructions|prefer stated facts)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  if (/get \/config endpoint provides/i.test(t)) return true;
  if (/subject to change/i.test(t) && /verif/i.test(t)) return true;
  if (/live data source/i.test(t) && /exa|firecrawl|api/i.test(t)) return true;
  if (/based on available data/i.test(t)) return true;
  if (/may not reflect real-time/i.test(t)) return true;
  if (/check the official (?:sera|website|site|channels)/i.test(t)) return true;
  if (/hope (?:that|this) helps/i.test(t)) return true;
  if (/let me know if (?:you|there)/i.test(t)) return true;

  return false;
}

/** Drop trailing instruction / meta paragraphs after a clean founder answer. */
function trimAfterFounderBullets(content: string): string {
  const marker = /Angels\/advisors are listed separately[^\n]*/i;
  const m = content.match(marker);
  if (!m || m.index == null) return content;
  const end = m.index + m[0].length;
  const rest = content.slice(end);
  if (/^\s*\n\s*#{1,3}\s+/m.test(rest) || /^\s*\n\s*\*\*[^*]+\*\*/m.test(rest)) {
    return (
      content.slice(0, end) +
      "\n" +
      rest
        .split("\n")
        .filter((l) => !isInstructionLine(l))
        .join("\n")
        .trimEnd()
    );
  }
  return content.slice(0, end).trimEnd();
}

function trimEmptySocialWaffle(content: string): string {
  const m = content.match(
    /\*\*No recent @seraprotocol posts[^*]*\*\*\.?|\*\*No recent official (?:tweets|announcements)[^*]*\*\*\.?|\*\*Couldn['’]t fetch @seraprotocol posts[^*]*\*\*\.?|No recent tweets from @seraprotocol[^\n]*|Exa (?:no longer indexes|isn['’]t indexing)[^\n]*/i,
  );
  if (!m || m.index == null) return content;
  // If real tweet/status URLs already appear earlier, drop the empty-Exa trailer only.
  const before = content.slice(0, m.index);
  if (/x\.com\/seraprotocol\/status\//i.test(before)) {
    return before.trimEnd();
  }
  return content.slice(0, m.index + m[0].length).trimEnd();
}

function trimConfigTrailer(content: string): string {
  if (!/0x[a-fA-F0-9]{40}/.test(content)) return content;
  if (!/\b(SeraSOR|Vault|contract addresses)\b/i.test(content)) return content;
  return content
    .replace(/\n+(?:Please note|Also,? note|Note:)[\s\S]*$/i, "")
    .replace(/\n+These addresses (?:might be|are) subject to change[\s\S]*$/i, "")
    .replace(/\n+Raw JSON[\s\S]*$/i, "")
    .replace(/\n*```json[\s\S]*?```/gi, "")
    .trimEnd();
}

function trimFluffCloser(content: string): string {
  return content
    .replace(
      /\n+(?:Note:|Please note:)?\s*This response is based on available data[\s\S]*$/i,
      "",
    )
    .replace(/\n+For the most (?:up-to-date|accurate)[\s\S]*$/i, "")
    .replace(/\n+(?:I recommend|Please) (?:checking|check|verify|visit)[\s\S]*$/i, "")
    .replace(/\n+Hope (?:that|this) helps[!?.\s]*$/i, "")
    .replace(/\n+Let me know if[^\n]*$/i, "")
    .trimEnd();
}

/** Remove paragraphs that are pure meta / process talk. */
function dropMetaParagraphs(content: string): string {
  return content
    .split(/\n{2,}/)
    .filter((para) => {
      const t = para.trim();
      if (!t) return false;
      if (isInstructionLine(t)) return false;
      if (
        /^(?:please note|also,? note that|note:|for the most|i recommend|to get the latest|this response is based|hope (?:that|this) helps)/i.test(
          t,
        )
      ) {
        return false;
      }
      // Whole para is a laundry list of “check official channels”
      if (
        /official (?:website|documentation|twitter|channels|sera)/i.test(t) &&
        /(?:check|visit|refer|recommend|up-to-date|real-time)/i.test(t) &&
        t.length < 400 &&
        !/0x[a-fA-F0-9]{40}/.test(t) &&
        !/^\*\*/.test(t)
      ) {
        return false;
      }
      return true;
    })
    .join("\n\n");
}

export function sanitizeAnswer(content: string): string {
  let out = content;

  out = out
    .split("\n")
    .filter((line) => !isInstructionLine(line))
    .join("\n");

  out = dropMetaParagraphs(out);
  out = trimFluffCloser(out);

  if (/no single founder is named/i.test(out)) {
    out = trimAfterFounderBullets(out);
  }
  if (
    /no recent @seraprotocol posts|no recent official (tweets|announcements)|couldn['’]t fetch @seraprotocol|no recent tweets from @seraprotocol/i.test(
      out,
    )
  ) {
    out = trimEmptySocialWaffle(out);
  }
  out = trimConfigTrailer(out);

  return out.replace(/\n{3,}/g, "\n\n").trim();
}
