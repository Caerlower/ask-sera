"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

export function Markdown({ content }: Props) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Avoid nested <p> issues inside list items looking broken
          p: ({ children }) => <p className="md-p">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
