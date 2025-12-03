"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Компонент для рендеринга markdown с красивым форматированием
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3 leading-relaxed last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-3 space-y-2 ml-6" style={{ listStyleType: "disc", listStylePosition: "outside" }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-3 space-y-2 ml-6" style={{ listStyleType: "decimal", listStylePosition: "outside" }} {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-1" style={{ display: "list-item", wordWrap: "break-word", whiteSpace: "normal" }} {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
            ) : (
              <code className="block bg-muted p-3 rounded text-sm font-mono overflow-x-auto mb-3" {...props} />
            ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-3 text-muted-foreground" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-border" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary underline hover:text-primary/80" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

