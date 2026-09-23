"use client"

import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy, Terminal, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormattedMessageProps {
  content: string
  className?: string
  isUser?: boolean
}

export function FormattedMessage({ content, className, isUser }: FormattedMessageProps) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeId(id)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  if (isUser) {
    return (
      <div className={cn("whitespace-pre-wrap break-words leading-relaxed text-sm font-normal", className)}>
        {content}
      </div>
    )
  }

  return (
    <div className={cn("ai-markdown-content text-sm leading-relaxed text-foreground/95 space-y-2.5", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/40 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold tracking-tight text-foreground mt-3.5 mb-1.5 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-3 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2.5 last:mb-0 text-foreground/90 font-normal">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground tracking-tight">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1.5 pl-5 list-disc marker:text-violet-500/80 dark:marker:text-violet-400/80 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 space-y-2 pl-5 list-decimal marker:font-semibold marker:text-violet-600 dark:marker:text-violet-400 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-xl border-l-3 border-violet-500 bg-violet-500/5 dark:bg-violet-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-foreground/90 shadow-2xs">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <div className="flex-1 not-italic font-normal">{children}</div>
              </div>
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-border/60 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/80 text-foreground font-semibold border-b border-border/60">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/40 bg-card/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-xs font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs text-foreground/90">
              {children}
            </td>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n")
            const codeString = String(children).replace(/\n$/, "")
            const codeId = `code_${Math.abs(codeString.slice(0, 30).split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`

            if (isInline) {
              return (
                <code
                  className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-foreground border border-border/40"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            const match = /language-(\w+)/.exec(codeClassName || "")
            const lang = match ? match[1] : ""

            return (
              <div className="my-3 rounded-xl overflow-hidden border border-border/70 bg-zinc-950 dark:bg-zinc-900 text-zinc-100 shadow-sm">
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 dark:bg-zinc-800/80 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-zinc-400" />
                    {lang || "code"}
                  </span>
                  <button
                    onClick={() => copyCode(codeString, codeId)}
                    className="flex items-center gap-1 hover:text-white transition-colors py-0.5 px-1.5 rounded bg-zinc-800/60 hover:bg-zinc-800"
                    title="Copy code"
                  >
                    {copiedCodeId === codeId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-200">
                  <code>{children}</code>
                </pre>
              </div>
            )
          },
          hr: () => <hr className="my-4 border-border/60" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
