/**
 * Strand Preview Panel - Live Visual Preview for Strand Creation
 * @module codex/ui/StrandPreviewPanel
 * 
 * @description
 * Real-time visual preview component that shows how a strand will appear
 * when rendered. Used in the contribute modal and strand editor.
 * 
 * @features
 * - Live markdown rendering with syntax highlighting
 * - Metadata display (title, tags, difficulty, etc.)
 * - Image preview (if any)
 * - Reading time estimate
 * - Relationship links visualization
 * - Table of contents preview
 * - Mobile/desktop view toggle
 * - Print preview mode
 * 
 * @example
 * ```tsx
 * <StrandPreviewPanel
 *   content={markdownContent}
 *   metadata={{
 *     title: 'My Strand',
 *     tags: ['react', 'typescript'],
 *     difficulty: 'intermediate',
 *   }}
 *   currentPath="weaves/frame/looms/react/my-strand.md"
 * />
 * ```
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {
  Eye,
  Smartphone,
  Monitor,
  Printer,
  Clock,
  Tag,
  Layers,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Hash,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import type { StrandMetadata } from '../../types'
import { analyzeReadingLevel, extractKeywords, classifyContentType } from '@/lib/nlp'
import { parseTags as parseTagsUtil } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandPreviewPanelProps {
  /** Markdown content to preview */
  content: string
  /** Strand metadata */
  metadata: Partial<StrandMetadata>
  /** Current file path */
  currentPath?: string
  /** Theme */
  theme?: string
  /** Whether to show in compact mode */
  compact?: boolean
}

type ViewMode = 'desktop' | 'mobile' | 'print'

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse tags from various formats (uses centralized utility with min length filter)
 */
function parseTags(tags: unknown): string[] {
  return parseTagsUtil(tags, { lowercase: false })
}

/**
 * Get difficulty color
 */
function getDifficultyColor(difficulty: string | undefined): string {
  if (!difficulty) return '#6B7280'
  const lower = difficulty.toLowerCase()
  if (lower.includes('beginner')) return '#10B981'
  if (lower.includes('intermediate')) return '#F59E0B'
  if (lower.includes('advanced')) return '#EF4444'
  if (lower.includes('expert')) return '#8B5CF6'
  return '#6B7280'
}

/**
 * Format file path as location string
 */
function formatLocation(path: string): string {
  if (!path) return ''
  return path
    .replace(/^weaves\//, '')
    .replace(/\.md$/, '')
    .split('/')
    .filter(Boolean)
    .map(p => p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .join(' › ')
}

/**
 * Extract headings for table of contents
 */
function extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
  if (!content) return []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: Array<{ level: number; text: string; id: string }> = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    headings.push({ level, text, id })
  }
  
  return headings
}

/**
 * Estimate word count and reading time
 */
function estimateReadingTime(content: string): { words: number; minutes: number } {
  if (!content) return { words: 0, minutes: 0 }
  const strippedContent = content
    .replace(/^---[\s\S]*?---\s*/, '') // Remove frontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text
  
  const words = strippedContent.split(/\s+/).filter(w => w.length > 0).length
  const minutes = Math.ceil(words / 200) // Average reading speed
  
  return { words, minutes }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Metadata header in preview
 */
function PreviewHeader({
  metadata,
  currentPath,
  readingTime,
  contentType,
}: {
  metadata: Partial<StrandMetadata>
  currentPath?: string
  readingTime: { words: number; minutes: number }
  contentType: { type: string; confidence: number }
}) {
  const title = metadata.title || currentPath?.split('/').pop()?.replace('.md', '') || 'Untitled'
  const tags = parseTags(metadata.tags)
  const difficulty = typeof metadata.difficulty === 'string'
    ? metadata.difficulty
    : (metadata.difficulty as { overall?: string })?.overall || ''
  const location = currentPath ? formatLocation(currentPath) : ''
  
  return (
    <div className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
      {/* Location breadcrumb */}
      {location && (
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          <Layers className="w-3 h-3" />
          {location}
        </div>
      )}
      
      {/* Title */}
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h1>
      
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {/* Difficulty */}
        {difficulty && (
          <span
            className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: getDifficultyColor(difficulty) }}
          >
            {difficulty}
          </span>
        )}
        
        {/* Content type */}
        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs text-zinc-600 dark:text-zinc-400 capitalize">
          {contentType.type}
        </span>
        
        {/* Reading time */}
        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3 h-3" />
          {readingTime.minutes} min read
          <span className="text-zinc-400 dark:text-zinc-500">({readingTime.words} words)</span>
        </span>
      </div>
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs rounded"
            >
              <Hash className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Summary */}
      {metadata.summary && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 italic border-l-2 border-zinc-300 dark:border-zinc-600 pl-3">
          {metadata.summary}
        </p>
      )}
    </div>
  )
}

/**
 * Table of contents preview
 */
function TableOfContents({
  headings,
  expanded,
  onToggle,
}: {
  headings: Array<{ level: number; text: string; id: string }>
  expanded: boolean
  onToggle: () => void
}) {
  if (headings.length === 0) return null
  
  return (
    <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <BookOpen className="w-4 h-4" />
        Table of Contents ({headings.length})
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-1 text-sm">
              {headings.map((h, i) => (
                <li
                  key={i}
                  style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  {h.text}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Relationships preview
 */
function RelationshipsPreview({
  metadata,
}: {
  metadata: Partial<StrandMetadata>
}) {
  const prereqs = metadata.relationships?.prerequisites || []
  const refs = metadata.relationships?.references || []
  
  if (prereqs.length === 0 && refs.length === 0) return null
  
  return (
    <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
      {prereqs.length > 0 && (
        <div className="mb-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            <ArrowLeft className="w-4 h-4 text-rose-500" />
            Prerequisites
          </h4>
          <div className="flex flex-wrap gap-2">
            {prereqs.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-xs rounded"
              >
                <FileText className="w-3 h-3" />
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {refs.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            <ArrowRight className="w-4 h-4 text-emerald-500" />
            See Also
          </h4>
          <div className="flex flex-wrap gap-2">
            {refs.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded"
              >
                <ExternalLink className="w-3 h-3" />
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Validation warnings
 */
function ValidationWarnings({
  content,
  metadata,
}: {
  content: string
  metadata: Partial<StrandMetadata>
}) {
  const warnings: Array<{ type: 'error' | 'warning'; message: string }> = []
  
  // Check title
  if (!metadata.title) {
    warnings.push({ type: 'error', message: 'Missing title in frontmatter' })
  }
  
  // Check tags format
  const tags = metadata.tags
  if (tags && typeof tags === 'string' && !tags.startsWith('[')) {
    warnings.push({ 
      type: 'warning', 
      message: 'Tags should be a YAML array [tag1, tag2], not a comma-separated string' 
    })
  }
  
  // Check content length
  const words = content.split(/\s+/).length
  if (words < 50) {
    warnings.push({ type: 'warning', message: 'Content is very short (< 50 words)' })
  }
  
  // Check for headings
  if (words > 200 && !content.match(/^#{1,3}\s+/m)) {
    warnings.push({ type: 'warning', message: 'Consider adding headings to structure longer content' })
  }
  
  if (warnings.length === 0) return null
  
  return (
    <div className="mb-4 space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`
            flex items-start gap-2 p-2 rounded-lg text-sm
            ${w.type === 'error' 
              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' 
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            }
          `}
        >
          {w.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          {w.message}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Strand Preview Panel
 * 
 * Live visual preview for strand creation/editing
 */
export default function StrandPreviewPanel({
  content,
  metadata,
  currentPath,
  theme = 'light',
  compact = false,
}: StrandPreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [showToc, setShowToc] = useState(true)
  
  const isDark = theme.includes('dark')
  
  // Computed values
  const readingTime = useMemo(() => estimateReadingTime(content), [content])
  const headings = useMemo(() => extractHeadings(content), [content])
  const contentType = useMemo(() => {
    const result = classifyContentType(content)
    return { type: result.primary, confidence: result.confidence }
  }, [content])
  
  // Strip frontmatter for rendering
  const strippedContent = useMemo(() => {
    return content.replace(/^---[\s\S]*?---\s*/, '')
  }, [content])
  
  // View mode styles
  const containerClass = {
    desktop: 'w-full',
    mobile: 'max-w-[375px] mx-auto',
    print: 'w-full bg-white text-black',
  }[viewMode]
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!compact && (
        <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</span>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-0.5">
            {[
              { mode: 'desktop' as ViewMode, icon: Monitor, label: 'Desktop' },
              { mode: 'mobile' as ViewMode, icon: Smartphone, label: 'Mobile' },
              { mode: 'print' as ViewMode, icon: Printer, label: 'Print' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  p-1.5 rounded-md transition-colors
                  ${viewMode === mode 
                    ? 'bg-white dark:bg-zinc-600 shadow text-emerald-600 dark:text-emerald-400' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }
                `}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Preview content */}
      <div className={`flex-1 overflow-y-auto ${viewMode === 'print' ? 'bg-white' : ''}`}>
        <div className={`p-6 ${containerClass}`}>
          {/* Validation warnings */}
          <ValidationWarnings content={content} metadata={metadata} />
          
          {/* Header */}
          <PreviewHeader
            metadata={metadata}
            currentPath={currentPath}
            readingTime={readingTime}
            contentType={contentType}
          />
          
          {/* Table of contents */}
          <TableOfContents
            headings={headings}
            expanded={showToc}
            onToggle={() => setShowToc(!showToc)}
          />
          
          {/* Markdown content */}
          <div className={`
            prose prose-zinc dark:prose-invert max-w-none
            ${viewMode === 'mobile' ? 'prose-sm' : ''}
            ${viewMode === 'print' ? 'prose-print' : ''}
          `}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt || ''}
                    className="max-w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                  />
                ),
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{children}</code>
                    </pre>
                  )
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {children}
                    {href?.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 pl-4 py-2 italic">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-zinc-200 dark:border-zinc-700">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    {children}
                  </td>
                ),
              }}
            >
              {strippedContent}
            </ReactMarkdown>
          </div>
          
          {/* Relationships */}
          <RelationshipsPreview metadata={metadata} />
        </div>
      </div>
      
      {/* Footer stats */}
      {!compact && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>{readingTime.words} words</span>
              <span>{headings.length} headings</span>
              <span className="capitalize">{contentType.type} ({Math.round(contentType.confidence * 100)}%)</span>
            </div>
            {metadata.title && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                Ready to publish
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

