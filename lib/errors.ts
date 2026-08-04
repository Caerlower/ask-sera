/**
 * Map provider/API errors to short user-facing copy.
 * Never forward raw vendor messages (org ids, quotas, billing URLs, keys).
 */

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isRateLimitError(error: unknown): boolean {
  const lower = errorText(error).toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("tokens per day") ||
    lower.includes("tokens per minute") ||
    lower.includes("tpd") ||
    lower.includes("tpm") ||
    lower.includes("too many requests") ||
    lower.includes("quota") ||
    /\b429\b/.test(lower)
  );
}

/** Fail over to the next key for these (before any tokens were sent). */
export function isFailoverError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;
  const lower = errorText(error).toLowerCase();
  // Also match our own sanitized client copy (stream may already be scrubbed)
  if (lower.includes("getting a lot of questions right now")) return true;
  if (lower.includes("the model is busy")) return true;
  return (
    lower.includes("overloaded") ||
    lower.includes("capacity") ||
    lower.includes("service unavailable") ||
    lower.includes("bad gateway") ||
    /\b503\b/.test(lower) ||
    /\b502\b/.test(lower)
  );
}

export function publicErrorMessage(error: unknown): string {
  const lower = errorText(error).toLowerCase();

  if (isRateLimitError(error)) {
    return "We're getting a lot of questions right now. Please try again in a bit.";
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline")) {
    return "That took too long. Please try again.";
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication") ||
    /\b401\b/.test(lower) ||
    /\b403\b/.test(lower)
  ) {
    return "Chat is temporarily unavailable. Please try again later.";
  }

  if (lower.includes("overloaded") || lower.includes("capacity") || /\b503\b/.test(lower)) {
    return "The model is busy. Please try again shortly.";
  }

  return "Something went wrong. Please try again.";
}
