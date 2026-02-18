/**
 * Canvas Strand Preview Panel - Slide-out panel for viewing strand content
 * @module codex/ui/CanvasStrandPreviewPanel
 *
 * Right-side slide-out panel for viewing strand content when clicking
 * on strand cards in the canvas view. Similar to VS Code's side panel.
 *
 * Features:
 * - Animated slide-in from right (300ms, ease-out)
 * - Resizable width (drag handle on left edge)
 * - Full markdown rendering with QuarryContent
 * - Header with strand title, weave/loom badges
 * - Quick actions: Edit, Open in new tab, Add to collection
 * - Keyboard: Escape to close, arrow keys for next/prev strand
 * - Canvas stays visible and interactive behind panel
 */

'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ExternalLink,
  Edit3,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Tag,
  Clock,
  Hash,
  GripVertical,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { StrandMetadata } from '../../types'
import { parseTags as parseTagsUtil } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandData {
  path: string
  title: string
  content?: string
  metadata?: Partial<StrandMetadata>
  weaveSlug?: string
  loomSlug?: string
}

export interface CanvasStrandPreviewPanelProps {
  /** Strand path to display (null to close) */
  strandPath: string | null
  /** Whether the panel is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Navigate to strand in full view */
  onNavigate?: (path: string) => void
  /** Edit strand callback */
  onEdit?: (path: string) => void
  /** Add to collection callback */
  onAddToCollection?: (path: string) => void
  /** Navigate to next/previous strand */
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  /** Whether there are prev/next strands */
  hasPrev?: boolean
  hasNext?: boolean
  /** Strand data (fetched externally) */
  strandData?: StrandData | null
  /** Loading state */
  isLoading?: boolean
  /** Initial panel width */
  initialWidth?: number
  /** Min/max width constraints */
  minWidth?: number
  maxWidth?: number
  /** Theme */
  isDark?: boolean
}

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
 * Estimate reading time
 */
function estimateReadingTime(content?: string): number {
  if (!content) return 0
  const words = content.split(/\s+/).filter((w) => w.length > 0).length
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Format path as breadcrumb
 */
function formatBreadcrumb(path: string): string {
  return path
    .replace(/^weaves\//, '')
    .replace(/\.md$/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => p.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .join(' / ')
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function CanvasStrandPreviewPanel({
  strandPath,
  isOpen,
  onClose,
  onNavigate,
  onEdit,
  onAddToCollection,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  strandData,
  isLoading = false,
  initialWidth = 480,
  minWidth = 320,
  maxWidth = 800,
  isDark = false,
}: CanvasStrandPreviewPanelProps) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrev && onNavigatePrev) {
            e.preventDefault()
            onNavigatePrev()
          }
          break
        case 'ArrowRight':
          if (hasNext && onNavigateNext) {
            e.preventDefault()
            onNavigateNext()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasPrev, hasNext, onClose, onNavigatePrev, onNavigateNext])

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  // Computed values
  const title = strandData?.title || strandPath?.split('/').pop()?.replace('.md', '') || 'Loading...'
  const tags = parseTags(strandData?.metadata?.tags)
  const readingTime = useMemo(
    () => estimateReadingTime(strandData?.content),
    [strandData?.content]
  )
  const breadcrumb = strandPath ? formatBreadcrumb(strandPath) : ''

  // Strip frontmatter from content
  const content = useMemo(() => {
    if (!strandData?.content) return ''
    return strandData.content.replace(/^---[\s\S]*?---\s*/, '')
  }, [strandData?.content])

  const panelWidth = isMaximized ? '100%' : `${width}px`

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - semi-transparent to keep canvas visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
            style={{
              width: panelWidth,
              backgroundColor: isDark ? '#18181b' : '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Resize handle */}
            {!isMaximized && (
              <div
                ref={resizeRef}
                onMouseDown={handleMouseDown}
                className={`
                  absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize
                  flex items-center justify-center
                  hover:bg-emerald-500/20 transition-colors
                  ${isResizing ? 'bg-emerald-500/30' : ''}
                `}
              >
                <GripVertical
                  className="w-3 h-3"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                />
              </div>
            )}

            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{
                borderColor: isDark ? '#27272a' : '#e5e7eb',
                backgroundColor: isDark ? '#1f1f23' : '#f9fafb',
              }}
            >
              {/* Left: Navigation arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  className={`
                    p-1.5 rounded-md transition-colors
                    ${hasPrev
                      ? isDark
                        ? 'hover:bg-zinc-700 text-zinc-300'
                        : 'hover:bg-zinc-200 text-zinc-600'
                      : 'opacity-30 cursor-not-allowed'
                    }
                  `}
                  title="Previous strand (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className={`
                    p-1.5 rounded-md transition-colors
                    ${hasNext
                      ? isDark
                        ? 'hover:bg-zinc-700 text-zinc-300'
                        : 'hover:bg-zinc-200 text-zinc-600'
                      : 'opacity-30 cursor-not-allowed'
                    }
                  `}
                  title="Next strand (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1">
                {/* Add to collection */}
                {onAddToCollection && strandPath && (
                  <button
                    onClick={() => onAddToCollection(strandPath)}
                    className={`
                      p-1.5 rounded-md transition-colors
                      ${isDark
                        ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                        : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                      }
                    `}
                    title="Add to collection"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                )}

                {/* Edit */}
                {onEdit && strandPath && (
                  <button
                    onClick={() => onEdit(strandPath)}
                    className={`
                      p-1.5 rounded-md transition-colors
                      ${isDark
                        ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                        : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                      }
                    `}
                    title="Edit strand"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {/* Open in new tab */}
                {onNavigate && strandPath && (
                  <button
                    onClick={() => onNavigate(strandPath)}
                    className={`
                      p-1.5 rounded-md transition-colors
                      ${isDark
                        ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                        : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                      }
                    `}
                    title="Open in full view"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}

                {/* Maximize/minimize */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className={`
                    p-1.5 rounded-md transition-colors
                    ${isDark
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                    }
                  `}
                  title={isMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isMaximized ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className={`
                    p-1.5 rounded-md transition-colors
                    ${isDark
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                    }
                  `}
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <div className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              ) : (
                <div className="p-6">
                  {/* Breadcrumb */}
                  {breadcrumb && (
                    <div
                      className="flex items-center gap-1 text-xs mb-3"
                      style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                    >
                      <Layers className="w-3 h-3" />
                      {breadcrumb}
                    </div>
                  )}

                  {/* Title */}
                  <h1
                    className="text-2xl font-bold mb-3"
                    style={{ color: isDark ? '#f4f4f5' : '#18181b' }}
                  >
                    {title}
                  </h1>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                    {/* Weave/Loom badges */}
                    {strandData?.weaveSlug && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: isDark ? '#065f46' : '#d1fae5',
                          color: isDark ? '#a7f3d0' : '#065f46',
                        }}
                      >
                        {strandData.weaveSlug}
                      </span>
                    )}
                    {strandData?.loomSlug && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: isDark ? '#422006' : '#fef3c7',
                          color: isDark ? '#fcd34d' : '#92400e',
                        }}
                      >
                        {strandData.loomSlug}
                      </span>
                    )}

                    {/* Reading time */}
                    {readingTime > 0 && (
                      <span
                        className="flex items-center gap-1"
                        style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                      >
                        <Clock className="w-3 h-3" />
                        {readingTime} min read
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-6">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: isDark ? '#164e63' : '#cffafe',
                            color: isDark ? '#67e8f9' : '#0e7490',
                          }}
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {strandData?.metadata?.summary && (
                    <p
                      className="text-sm italic mb-6 pl-3 border-l-2"
                      style={{
                        color: isDark ? '#a1a1aa' : '#71717a',
                        borderColor: isDark ? '#3f3f46' : '#d4d4d8',
                      }}
                    >
                      {strandData.metadata.summary}
                    </p>
                  )}

                  {/* Markdown content */}
                  {content && (
                    <div
                      className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}
                      style={{
                        '--tw-prose-body': isDark ? '#d4d4d8' : '#3f3f46',
                        '--tw-prose-headings': isDark ? '#f4f4f5' : '#18181b',
                        '--tw-prose-links': isDark ? '#34d399' : '#059669',
                        '--tw-prose-code': isDark ? '#fbbf24' : '#d97706',
                      } as React.CSSProperties}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 border-t text-xs flex items-center justify-between"
              style={{
                borderColor: isDark ? '#27272a' : '#e5e7eb',
                backgroundColor: isDark ? '#1f1f23' : '#f9fafb',
                color: isDark ? '#71717a' : '#a1a1aa',
              }}
            >
              <span>Press Esc to close • ← → to navigate</span>
              {strandPath && (
                <span className="truncate max-w-[200px]" title={strandPath}>
                  {strandPath.split('/').pop()}
                </span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CanvasStrandPreviewPanel
