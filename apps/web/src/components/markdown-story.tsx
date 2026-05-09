"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/// Renders campaign story / update markdown. react-markdown sanitizes by
/// default (no raw HTML passes through). GFM adds tables, strikethrough,
/// task-lists, autolinks.
export function MarkdownStory({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-none text-[15px] leading-relaxed text-foreground/90",
        // typography
        "[&>h1]:mb-4 [&>h1]:mt-6 [&>h1]:font-mono [&>h1]:text-xl [&>h1]:font-semibold [&>h1]:tracking-tight [&>h1]:text-foreground",
        "[&>h2]:mb-3 [&>h2]:mt-6 [&>h2]:font-mono [&>h2]:text-base [&>h2]:font-semibold [&>h2]:uppercase [&>h2]:tracking-tight [&>h2]:text-foreground",
        "[&>h3]:mb-2 [&>h3]:mt-5 [&>h3]:font-mono [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:uppercase [&>h3]:tracking-tight [&>h3]:text-muted-foreground",
        "[&>p]:my-3",
        "[&>ul]:my-3 [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul]:pl-5",
        "[&>ol]:my-3 [&>ol]:list-decimal [&>ol]:space-y-1.5 [&>ol]:pl-5",
        "[&_li]:marker:text-primary/60",
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
        "[&_code]:rounded-none [&_code]:border [&_code]:border-border [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]",
        "[&>blockquote]:my-4 [&>blockquote]:border-l-2 [&>blockquote]:border-primary/40 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground",
        "[&>hr]:my-6 [&>hr]:border-border",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
