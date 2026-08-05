"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Sources.module.css";
import { sanitizeAnswer } from "@/lib/sanitize-answer";

export type SourceLink = { label: string; href: string };

type Props = {
  content: string;
  sources?: SourceLink[];
};

function stripSourceArtifacts(content: string): string {
  let out = content;
  out = out.replace(/@@sources@@[\s\S]*?@@\/sources@@/gi, "");
  out = out.replace(/@@sources@@[\s\S]*$/i, "");
  out = out.replace(/@@\/sources@@/gi, "");
  out = out.replace(
    /\n(?:#{1,3}\s*)?\*{0,2}Sources?\*{0,2}\s*:?\s*\n(?:\s*[-*]\s*\[[^\]]+\]\([^)]+\)\s*\n?)+\s*$/i,
    "",
  );
  out = out.replace(/\n(?:#{1,3}\s*)?\*{0,2}Sources?\*{0,2}\s*:?\s*$/i, "");
  out = out.replace(
    /\n\*{0,2}Sources?\*{0,2}\s*:?\s*(?:\[[^\]]+\]\([^)]+\)(?:\s*[·|,]\s*)?)+\s*$/i,
    "",
  );
  return out.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href, "https://sera.cx");
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return href;
  } catch {
    return undefined;
  }
}

function hostname(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function SourceChips({ sources }: { sources: SourceLink[] }) {
  if (sources.length === 0) return null;
  return (
    <div className={styles.wrap} aria-label="Sources">
      <span className={styles.label}>Sources</span>
      <ul className={styles.list}>
        {sources.map((s) => (
          <li key={s.href}>
            <a
              className={styles.chip}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              title={s.href}
            >
              <span className={styles.dot} aria-hidden />
              <span className={styles.chipLabel}>{s.label}</span>
              <span className={styles.host}>{hostname(s.href)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Markdown({ content, sources = [] }: Props) {
  const body = sanitizeAnswer(stripSourceArtifacts(content));

  return (
    <div className="md">
      {body.trim() ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              const safe = safeHref(href);
              if (!safe) return <span>{children}</span>;
              return (
                <a href={safe} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
            p: ({ children }) => <p className="md-p">{children}</p>,
            table: ({ children }) => (
              <div className="md-table-wrap">
                <table>{children}</table>
              </div>
            ),
          }}
        >
          {body}
        </ReactMarkdown>
      ) : null}
      <SourceChips sources={sources} />
    </div>
  );
}
