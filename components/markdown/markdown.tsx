"use client";

import React from "react";
import remarkGfm from "remark-gfm";
import { twMerge } from "tailwind-merge";

import { LazyCodeBlock } from "@/components/markdown/lazy-code-block";
import { MemoizedReactMarkdown } from "@/components/markdown/memoized-react-markdownn";

type Props = { text: string; className?: string };

export default function Markdown({ text, className = "" }: Props) {
  return (
    <MemoizedReactMarkdown
      className={twMerge(
        "prose text-black dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words",
        className
      )}
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        a({ node, href, children, ...props }) {
          const childrenArray = React.Children.toArray(children);
          const childrenText = childrenArray
            .map((child) => child?.toString() ?? "")
            .join("");

          const cleanedText = childrenText.replace(/\[|\]/g, "");
          const isNumber = /^\d+$/.test(cleanedText);

          return isNumber ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              {...props}
              className="bg-mountain-meadow-100 hover:bg-mountain-meadow-100/80 dark:bg-colour-primary-800 dark:hover:bg-colour-primary-800/80 relative bottom-[6px] mx-0.5 rounded px-[5px] py-[2px] text-[8px] font-bold no-underline"
            >
              {children}
            </a>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              {...props}
              className="hover:underline"
            >
              {children}
            </a>
          );
        },

        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <LazyCodeBlock
              key={crypto.randomUUID()}
              language={(match && match[1]) || ""}
              value={String(children).replace(/\n$/, "")}
            />
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </MemoizedReactMarkdown>
  );
}
