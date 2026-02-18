/**
 * Supernote Component
 * @module codex/ui/canvas/shapes/SupernoteShape
 *
 * Interactive supernote card component for the infinite canvas.
 * Renders a compact notecard with:
 * - Supertag badge at top
 * - Title and content preview
 * - Inline supertag field values
 * - Paper/notecard visual styling
 * - Parent breadcrumb (if nested)
 */

'use client'

import { HTMLContainer, useEditor } from '@tldraw/tldraw'
import { memo, useCallback, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  StickyNote,
  ChevronRight,
  Heart,
  MessageSquare,
  Users,
  Pencil,
  Hash,
  ExternalLink,
} from 'lucide-react'
import type { SupernoteShape, SupernoteStyleType } from '../types'
import type { SupernoteShapeUtil } from './SupernoteShapeUtil'

interface SupernoteComponentProps {
  shape: SupernoteShape
  util: SupernoteShapeUtil
}

/**
 * Get style-based colors for the supernote
 */
function getStyleColors(style: SupernoteStyleType, supertagColor: string, isDark: boolean) {
  const styles: Record<SupernoteStyleType, { bg: string; border: string; text: string; accent: string }> = {
    paper: {
      bg: isDark ? '#451a03' : '#fffbeb',
      border: isDark ? '#78350f' : '#fde68a',
      text: isDark ? '#fef3c7' : '#78350f',
      accent: supertagColor || '#f59e0b',
    },
    minimal: {
      bg: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#f3f4f6' : '#1f2937',
      accent: supertagColor || '#6b7280',
    },
    colored: {
      bg: `${supertagColor}15`,
      border: supertagColor,
      text: isDark ? '#f3f4f6' : '#1f2937',
      accent: supertagColor,
    },
    glass: {
      bg: isDark ? 'rgba(31,41,55,0.8)' : 'rgba(255,255,255,0.8)',
      border: isDark ? 'rgba(75,85,99,0.5)' : 'rgba(0,0,0,0.1)',
      text: isDark ? '#f3f4f6' : '#1f2937',
      accent: supertagColor || '#8b5cf6',
    },
    terminal: {
      bg: isDark ? '#0f172a' : '#1e293b',
      border: isDark ? '#1e293b' : '#334155',
      text: '#22c55e',
      accent: '#22c55e',
    },
  }
  return styles[style] || styles.paper
}

/**
 * Format field value for display
 */
function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'number') return value.toLocaleString()
  if (Array.isArray(value)) return value.slice(0, 3).join(', ')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 30)
  return String(value).slice(0, 50)
}

/**
 * Supernote component for canvas rendering
 */
export const SupernoteComponent = memo(function SupernoteComponent({
  shape,
  util,
}: SupernoteComponentProps) {
  const editor = useEditor()
  const [isHovered, setIsHovered] = useState(false)

  const {
    w,
    h,
    title,
    contentPreview,
    tags,
    primarySupertag,
    supertagColor,
    supertagIcon,
    fieldValues,
    visibleFields,
    parentSupernote,
    style,
    isExpanded,
    isHighlighted,
    stats,
  } = shape.props

  // Determine if dark mode
  const isDark = editor.user.getIsDarkMode()
  
  // Get colors based on style
  const colors = useMemo(
    () => getStyleColors(style, supertagColor, isDark),
    [style, supertagColor, isDark]
  )

  // Handle card click to navigate to strand
  const handleClick = useCallback(() => {
    // Dispatch custom event to open strand viewer
    if (shape.props.strandPath) {
      window.dispatchEvent(
        new CustomEvent('quarry:open-strand', {
          detail: { path: shape.props.strandPath },
        })
      )
    }
  }, [shape.props.strandPath])

  // Visible field entries to display
  const fieldEntries = useMemo(() => {
    if (!visibleFields || visibleFields.length === 0) return []
    return visibleFields
      .slice(0, isExpanded ? 6 : 3)
      .map((key) => ({
        key,
        value: fieldValues[key],
      }))
      .filter((entry) => entry.value !== undefined)
  }, [visibleFields, fieldValues, isExpanded])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
      }}
    >
      <article
        role="article"
        aria-label={`${primarySupertag} supernote: ${title || 'Untitled'}`}
        tabIndex={0}
        className={cn(
          'relative w-full h-full rounded-lg overflow-hidden',
          'transition-all duration-200 ease-out',
          'cursor-pointer select-none touch-manipulation',
          // Focus styles for keyboard navigation
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
          isHighlighted && 'ring-2 ring-offset-2 ring-amber-400',
          isHovered && 'scale-[1.02]'
        )}
        style={{
          backgroundColor: colors.bg,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: 'solid',
          boxShadow: isHovered
            ? '0 8px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.08)'
            : '0 4px 12px -2px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          backdropFilter: style === 'glass' ? 'blur(8px)' : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {/* Paper corner fold effect */}
        {style === 'paper' && (
          <div
            className="absolute top-0 right-0 w-4 h-4"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${colors.border} 50%)`,
            }}
          />
        )}

        {/* Supernote indicator badge (top-right) */}
        <div
          className="absolute top-2 right-6 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{
            backgroundColor: `${colors.accent}25`,
            color: colors.accent,
          }}
          aria-hidden="true" // Decorative, info is in aria-label of parent
        >
          <StickyNote className="w-3 h-3" aria-hidden="true" />
          <span>Supernote</span>
        </div>

        {/* Parent breadcrumb */}
        {parentSupernote && (
          <nav
            aria-label="Parent supernote"
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-[60%]"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
          >
            <span className="truncate">{parentSupernote.title}</span>
            <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          </nav>
        )}

        {/* Main content area */}
        <div
          className="flex flex-col h-full p-3"
          style={{ paddingTop: parentSupernote ? 28 : 12 }}
        >
          {/* Supertag badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-white self-start mb-2"
            style={{ backgroundColor: colors.accent }}
            role="status"
            aria-label={`Tagged with ${primarySupertag}`}
          >
            {supertagIcon ? (
              <span aria-hidden="true">{supertagIcon}</span>
            ) : (
              <Hash className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{primarySupertag}</span>
          </div>

          {/* Title */}
          <h3
            className="font-semibold text-sm leading-tight mb-1 line-clamp-2"
            style={{ color: colors.text }}
          >
            {title || 'Untitled'}
          </h3>

          {/* Content preview */}
          {contentPreview && (
            <p
              className="text-xs leading-relaxed mb-2 line-clamp-2 opacity-80"
              style={{ color: colors.text }}
            >
              {contentPreview}
            </p>
          )}

          {/* Supertag field values */}
          {fieldEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {fieldEntries.map(({ key, value }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: `${colors.accent}15`,
                    color: colors.text,
                  }}
                >
                  <span className="opacity-60">{key}:</span>
                  <span className="font-medium">{formatFieldValue(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tags row */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${colors.accent}20`,
                    color: colors.accent,
                  }}
                >
                  #{tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 opacity-60"
                  style={{ color: colors.text }}
                >
                  +{tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Bottom stats row */}
          <div className="flex items-center justify-between">
            {/* Stats - screen reader friendly */}
            {stats && (
              <div className="flex items-center gap-2 text-[10px] opacity-60" style={{ color: colors.text }} role="group" aria-label="Engagement stats">
                {stats.likes !== undefined && (
                  <span className="flex items-center gap-0.5" aria-label={`${stats.likes} likes`}>
                    <Heart className="w-3 h-3" aria-hidden="true" />
                    <span aria-hidden="true">{stats.likes}</span>
                  </span>
                )}
                {stats.comments !== undefined && (
                  <span className="flex items-center gap-0.5" aria-label={`${stats.comments} comments`}>
                    <MessageSquare className="w-3 h-3" aria-hidden="true" />
                    <span aria-hidden="true">{stats.comments}</span>
                  </span>
                )}
                {stats.contributors !== undefined && (
                  <span className="flex items-center gap-0.5" aria-label={`${stats.contributors} contributors`}>
                    <Users className="w-3 h-3" aria-hidden="true" />
                    <span aria-hidden="true">{stats.contributors}</span>
                  </span>
                )}
              </div>
            )}

            {/* Actions - accessible with proper labels and touch targets */}
            <div className="flex items-center gap-1" role="group" aria-label="Supernote actions">
              {isHovered && (
                <>
                  <button
                    type="button"
                    aria-label="Edit supernote"
                    className="p-2 -m-0.5 rounded hover:bg-black/10 focus:bg-black/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 sm:p-1 sm:-m-0"
                    style={{ color: colors.accent }}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Trigger inline edit mode
                      editor.updateShape<SupernoteShape>({
                        id: shape.id,
                        type: 'supernote',
                        props: { isEditing: true },
                      })
                    }}
                  >
                    <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Open supernote in viewer"
                    className="p-2 -m-0.5 rounded hover:bg-black/10 focus:bg-black/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 sm:p-1 sm:-m-0"
                    style={{ color: colors.accent }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClick()
                    }}
                  >
                    <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </HTMLContainer>
  )
})

