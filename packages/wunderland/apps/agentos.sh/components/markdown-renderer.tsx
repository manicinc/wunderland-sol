'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={copyCode}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDark ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers={children.split('\n').length > 5}
        lineNumberStyle={{
          minWidth: '2.5rem',
          paddingRight: '1rem',
          color: '#6b7280',
          userSelect: 'none',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none
      prose-headings:text-[var(--color-text-primary)] prose-headings:font-bold
      prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8
      prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--color-border-subtle)]
      prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6
      prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
      prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed
      prose-a:text-[var(--color-accent-primary)] prose-a:no-underline hover:prose-a:underline
      prose-strong:text-[var(--color-text-primary)]
      prose-code:text-[var(--color-accent-primary)] prose-code:bg-[var(--color-background-tertiary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-0
      prose-ul:text-[var(--color-text-secondary)] prose-ul:list-disc prose-ul:pl-6
      prose-ol:text-[var(--color-text-secondary)] prose-ol:list-decimal prose-ol:pl-6
      prose-li:text-[var(--color-text-secondary)] prose-li:my-1
      prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-accent-primary)] prose-blockquote:bg-[var(--color-background-secondary)] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-[var(--color-text-secondary)]
      prose-table:border-collapse
      prose-th:bg-[var(--color-background-secondary)] prose-th:text-[var(--color-text-primary)] prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-[var(--color-border-subtle)]
      prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-[var(--color-border-subtle)] prose-td:text-[var(--color-text-secondary)]
      prose-hr:border-[var(--color-border-subtle)]
      prose-img:rounded-xl prose-img:shadow-lg
    ">
      <ReactMarkdown
        components={{
          code({ node: _node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match?.[1] || 'text'}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },
          a({ node: _node, href, children, ...props }) {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ node: _node, children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2({ node: _node, children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3({ node: _node, children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            return <h3 id={id} {...props}>{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
