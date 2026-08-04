"use client";

import { useChat } from "ai/react";
import { FormEvent, useEffect, useRef } from "react";
import { Markdown } from "@/components/Markdown";
import styles from "./Chat.module.css";

const SUGGESTIONS = [
  "List all supported currencies",
  "What is gSera?",
  "How does Earn work for LPs?",
  "Who founded Sera?",
];

export function Chat() {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat",
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const sendSuggestion = (text: string) => {
    void append({ role: "user", content: text });
  };

  const onSubmit = (e: FormEvent) => {
    handleSubmit(e);
  };

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className={styles.app}>
      <div className={styles.glow} aria-hidden />

      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button type="button" className={styles.brand} onClick={newChat} aria-label="New chat">
            <span className={styles.logoMark}>S</span>
            <span className={styles.brandText}>Ask Sera</span>
          </button>
          <div className={styles.navRight}>
            {hasMessages && (
              <button type="button" className={styles.linkBtn} onClick={newChat}>
                New
              </button>
            )}
            <a
              className={`${styles.linkBtn} ${styles.hideSm}`}
              href="https://agents.sera.cx"
              target="_blank"
              rel="noopener noreferrer"
            >
              Agents
            </a>
            <a className={styles.cta} href="https://docs.sera.cx" target="_blank" rel="noopener noreferrer">
              Docs
            </a>
          </div>
        </div>
      </header>

      <main className={styles.main} ref={scrollRef}>
        <div className={styles.mainInner}>
          {!hasMessages ? (
            <section className={styles.hero}>
              <h1 className={styles.heroTitle}>
                Ask anything about <span className={styles.accent}>Sera</span>
              </h1>
              <p className={styles.heroSub}>
                Protocol, products, API, and live markets — clear answers, no fluff.
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((q, i) => (
                  <button
                    key={q}
                    type="button"
                    className={styles.chip}
                    style={{ animationDelay: `${40 + i * 35}ms` }}
                    onClick={() => sendSuggestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className={styles.thread} aria-live="polite">
              {messages.map((m) =>
                m.role === "user" ? (
                  <article key={m.id} className={`${styles.row} ${styles.rowUser}`}>
                    <div className={styles.userBubble}>
                      <p>{m.content}</p>
                    </div>
                  </article>
                ) : (
                  <article key={m.id} className={`${styles.row} ${styles.rowAssistant}`}>
                    <div className={styles.assistant}>
                      <Markdown content={m.content} />
                    </div>
                  </article>
                ),
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <article className={`${styles.row} ${styles.rowAssistant}`}>
                  <div className={styles.assistant}>
                    <div className={styles.typing} aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>

      <footer className={styles.dock}>
        <div className={styles.dockInner}>
          {error && (
            <div className={styles.error} role="alert">
              <span>{error.message || "Something went wrong."}</span>
              <button type="button" onClick={() => reload()}>
                Retry
              </button>
            </div>
          )}
          <form className={styles.composer} onSubmit={onSubmit}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Ask Sera…"
              rows={1}
              enterKeyHint="send"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && input.trim()) {
                    handleSubmit(e as unknown as FormEvent);
                  }
                }
              }}
              disabled={isLoading}
            />
            {isLoading ? (
              <button type="button" className={styles.send} onClick={() => stop()} aria-label="Stop">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" />
                </svg>
              </button>
            ) : (
              <button type="submit" className={styles.send} disabled={!input.trim()} aria-label="Send">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </form>
        </div>
      </footer>
    </div>
  );
}
