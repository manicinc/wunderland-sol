/**
 * Editor Markdown Preview - Isolated markdown rendering for StrandEditor
 * @module codex/ui/EditorMarkdownPreview
 *
 * @remarks
 * This component isolates markdown rendering to prevent TDZ errors in production builds.
 * Uses custom code handling with defensive guards instead of rehype-highlight
 * to prevent "Cannot read properties of undefined (reading 'length')" errors.
 * Supports Mermaid diagrams with interactive rendering.
 */

'use client'

import React, { type ComponentPropsWithoutRef, memo, useState, useEffect, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import dynamic from 'next/dynamic'
import { remarkStripControlFlags } from '@/lib/remark/remarkStripControlFlags'
import { remarkAssetGallery } from '@/lib/remark/remarkAssetGallery'
import { stripFrontmatter } from '../../utils'

// Import highlight.js theme for dark mode
import 'highlight.js/styles/github-dark.css'

// Lazy-loaded lowlight instance (initialized on first use)
let lowlightInstance: any = null
let lowlightPromise: Promise<any> | null = null

/**
 * Initialize lowlight lazily with comprehensive error handling
 */
async function getLowlight() {
  if (lowlightInstance) return lowlightInstance

  if (!lowlightPromise) {
    lowlightPromise = (async () => {
      try {
        const [{ createLowlight, common }, { toHtml }] = await Promise.all([
          import('lowlight'),
          import('hast-util-to-html')
        ])
        lowlightInstance = { lowlight: createLowlight(common), toHtml }
        return lowlightInstance
      } catch (err) {
        console.warn('[EditorMarkdownPreview] Failed to load lowlight:', err)
        return null
      }
    })()
  }

  return lowlightPromise
}

/**
 * Escape HTML entities for plain text fallback
 */
function escapeHtml(text: string | null | undefined): string {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Dynamic import for InlineMermaid to avoid SSR issues
const InlineMermaid = dynamic(
  () => import('../diagrams/MermaidDiagram').then(mod => ({ default: mod.InlineMermaid })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse my-4">
        <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded mb-2" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-600 rounded" />
      </div>
    )
  }
)

interface EditorMarkdownPreviewProps {
  content: string
  className?: string
}

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean
  node?: unknown
}

/**
 * Safe highlight function with comprehensive error handling
 * Avoids useMemo to prevent React dependency comparison crashes
 */
function safeHighlight(code: string, language: string, highlighter: any): string {
  if (!code) return ''
  
  // Validate highlighter structure before use
  if (!highlighter?.lowlight?.highlight || !highlighter?.lowlight?.highlightAuto || !highlighter?.toHtml) {
    return escapeHtml(code)
  }
  
  try {
    let result
    if (language && language !== 'plaintext' && language !== 'mermaid') {
      try {
        result = highlighter.lowlight.highlight(language, code)
      } catch {
        // Language not registered, fall back to auto
        result = highlighter.lowlight.highlightAuto(code)
      }
    } else if (language !== 'mermaid') {
      result = highlighter.lowlight.highlightAuto(code)
    }

    // Guard against malformed result - check children is valid array
    if (!result || !result.children || !Array.isArray(result.children)) {
      return escapeHtml(code)
    }

    // Wrap toHtml in separate try-catch
    try {
      return highlighter.toHtml(result)
    } catch (toHtmlErr) {
      console.warn('[EditorMarkdownPreview] toHtml error:', toHtmlErr)
      return escapeHtml(code)
    }
  } catch (err) {
    console.warn('[EditorMarkdownPreview] Highlight error:', err)
    return escapeHtml(code)
  }
}

// Code block component - handles Mermaid diagrams and syntax highlighting with defensive guards
// Uses useState + useEffect instead of useMemo to avoid React dependency comparison crashes
const CodeBlock = memo(function CodeBlock({ node: _node, inline, className, children, style: _style, ...props }: MarkdownCodeProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeString = String(children ?? '').replace(/\n$/, '')

  // State for lazy-loaded highlighter
  const [highlighter, setHighlighter] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  
  // State for highlighted HTML - using state instead of useMemo to avoid dependency comparison crashes
  const [highlightedHtml, setHighlightedHtml] = useState(() => escapeHtml(codeString))

  // Load highlighter on mount
  useEffect(() => {
    let mounted = true
    getLowlight().then((hl) => {
      if (mounted && hl) {
        setHighlighter(hl)
        setIsReady(true)
      }
    })
    return () => { mounted = false }
  }, [])

  // Update highlighted HTML when dependencies change
  // Using useEffect instead of useMemo to avoid React's internal dependency array comparison
  // which can crash with "Cannot read properties of undefined (reading 'length')"
  useEffect(() => {
    if (!codeString) {
      setHighlightedHtml('')
      return
    }
    
    if (!isReady || !highlighter) {
      setHighlightedHtml(escapeHtml(codeString))
      return
    }
    
    setHighlightedHtml(safeHighlight(codeString, language, highlighter))
  }, [codeString, language, isReady, highlighter])

  // Render Mermaid diagrams with InlineMermaid component
  if (!inline && language === 'mermaid') {
    return <InlineMermaid code={codeString} />
  }

  // For inline code
  if (inline) {
    return (
      <code className={`${className || ''} px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sm`} {...props}>
        {children}
      </code>
    )
  }

  // For code blocks - use our safe highlighting
  return (
    <pre className="!bg-zinc-900 !p-4 !rounded-lg !overflow-x-auto !my-4">
      <code 
        className={`${className || ''} hljs`}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </pre>
  )
})

const MARKDOWN_COMPONENTS: Components = {
  code: CodeBlock as Components['code'],
}

export default function EditorMarkdownPreview({ content, className = '' }: EditorMarkdownPreviewProps) {
  // Strip YAML frontmatter from preview - it will be edited separately
  const contentWithoutFrontmatter = stripFrontmatter(content)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkStripControlFlags, remarkAssetGallery]}
      rehypePlugins={[rehypeRaw]}
      components={MARKDOWN_COMPONENTS}
      className={className}
    >
      {contentWithoutFrontmatter}
    </ReactMarkdown>
  )
}
