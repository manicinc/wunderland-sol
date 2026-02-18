/**
 * Strand Component - Knowledge card for infinite canvas
 * @module codex/ui/canvas/shapes/StrandShape/StrandComponent
 *
 * Features:
 * - Thumbnail image display
 * - Title with truncation
 * - Summary preview (expandable)
 * - Tag pills with color coding
 * - Difficulty badge
 * - Weave color accent
 * - Compact/expanded states
 * - Click to navigate to strand
 */

'use client'

import React, { useCallback, memo, useMemo } from 'react'
import { HTMLContainer, track, useEditor } from '@tldraw/tldraw'
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  BookOpen,
  Zap,
  Star,
} from 'lucide-react'
import type { StrandShape, StrandDifficulty } from '../types'
import { getShapeColors, getWeaveColor, WEAVE_COLOR_PALETTE } from '../types'
import type { StrandShapeUtil } from './StrandShapeUtil'

interface StrandComponentProps {
  shape: StrandShape
  util: StrandShapeUtil
}

/** Difficulty badge colors */
const DIFFICULTY_COLORS: Record<StrandDifficulty, { bg: string; text: string; icon: typeof Zap }> = {
  beginner: { bg: '#d1fae5', text: '#065f46', icon: BookOpen },
  intermediate: { bg: '#fef3c7', text: '#92400e', icon: Zap },
  advanced: { bg: '#fee2e2', text: '#991b1b', icon: Star },
  expert: { bg: '#ede9fe', text: '#5b21b6', icon: Star },
}

/**
 * Interactive strand card component for StrandShape
 */
export const StrandComponent = track(function StrandComponent({
  shape,
  util,
}: StrandComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('strand', isDark)

  const {
    w,
    h,
    title,
    summary,
    thumbnailPath,
    tags,
    difficulty,
    weaveSlug,
    collapsed,
    highlighted,
    colorOverride,
    strandPath,
  } = shape.props

  // Get weave accent color
  const weaveColor = useMemo(() => {
    if (colorOverride) return { bg: colorOverride, text: '#ffffff' }
    if (weaveSlug) {
      // Hash the weave slug to get a consistent color
      const hash = weaveSlug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return getWeaveColor(hash)
    }
    return { bg: colors.accent, text: '#ffffff' }
  }, [colorOverride, weaveSlug, colors.accent])

  // Toggle collapsed state
  const toggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      editor.updateShapes([
        {
          id: shape.id,
          type: 'strand',
          props: { collapsed: !collapsed },
        },
      ])
    },
    [editor, shape.id, collapsed]
  )

  // Navigate to strand
  const handleNavigate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (strandPath) {
        // Dispatch custom event for navigation
        window.dispatchEvent(
          new CustomEvent('canvas-strand-navigate', {
            detail: { path: strandPath },
          })
        )
      }
    },
    [strandPath]
  )

  // Display tags (max 5)
  const displayTags = useMemo(() => tags.slice(0, 5), [tags])

  // Difficulty info
  const difficultyInfo = difficulty ? DIFFICULTY_COLORS[difficulty] : null
  const DifficultyIcon = difficultyInfo?.icon || BookOpen

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
      }}
    >
      <div
        className="relative w-full h-full overflow-hidden rounded-xl transition-all duration-200"
        style={{
          backgroundColor: isDark ? colors.bg : colors.bg,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: highlighted ? weaveColor.bg : colors.border,
          boxShadow: highlighted
            ? `0 0 0 3px ${weaveColor.bg}40, 0 4px 12px rgba(0,0,0,0.15)`
            : '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Weave color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: weaveColor.bg }}
        />

        {/* Thumbnail */}
        {thumbnailPath && !collapsed && (
          <div
            className="w-full h-16 bg-cover bg-center"
            style={{
              backgroundImage: `url(${thumbnailPath})`,
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
            }}
          />
        )}

        {/* Content */}
        <div className="p-3 pt-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            {/* Title */}
            <h3
              className="font-semibold text-sm leading-tight flex-1 line-clamp-2"
              style={{ color: colors.text }}
              title={title}
            >
              {title}
            </h3>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Difficulty badge */}
              {difficultyInfo && (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: difficultyInfo.bg,
                    color: difficultyInfo.text,
                  }}
                  title={`Difficulty: ${difficulty}`}
                >
                  <DifficultyIcon className="w-3 h-3" />
                </span>
              )}

              {/* Expand/collapse */}
              <button
                onClick={toggleCollapsed}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.text }} />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" style={{ color: colors.text }} />
                )}
              </button>

              {/* Navigate */}
              <button
                onClick={handleNavigate}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Open strand"
              >
                <ExternalLink className="w-3.5 h-3.5" style={{ color: colors.accent }} />
              </button>
            </div>
          </div>

          {/* Summary - only when expanded */}
          {!collapsed && summary && (
            <p
              className="text-xs mt-2 line-clamp-3 leading-relaxed"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {summary}
            </p>
          )}

          {/* Tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {displayTags.map((tag, index) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#d1d5db' : '#4b5563',
                  }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
              {tags.length > 5 && (
                <span
                  className="text-xs px-1"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  +{tags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Weave/Loom path indicator */}
          {(weaveSlug || shape.props.loomSlug) && collapsed && (
            <div
              className="flex items-center gap-1 mt-2 text-xs"
              style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
            >
              <FileText className="w-3 h-3" />
              <span className="truncate">
                {weaveSlug}
                {shape.props.loomSlug && `/${shape.props.loomSlug}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </HTMLContainer>
  )
})

export default memo(StrandComponent)
