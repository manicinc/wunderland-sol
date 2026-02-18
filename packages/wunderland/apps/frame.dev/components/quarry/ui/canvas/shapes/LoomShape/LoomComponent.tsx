/**
 * Loom Component - Topic container for infinite canvas
 * @module codex/ui/canvas/shapes/LoomShape/LoomComponent
 *
 * Features:
 * - Container header with title and icon
 * - Strand count badge
 * - Expand/collapse toggle
 * - Dashed border indicating container nature
 * - Drop zone indicator for drag-and-drop
 */

'use client'

import React, { useCallback, useMemo } from 'react'
import { HTMLContainer, track, useEditor } from '@tldraw/tldraw'
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MoreHorizontal,
} from 'lucide-react'
import type { LoomShape } from '../types'
import { getShapeColors, getWeaveColor } from '../types'
import type { LoomShapeUtil } from './LoomShapeUtil'

interface LoomComponentProps {
  shape: LoomShape
  util: LoomShapeUtil
}

/**
 * Interactive container component for LoomShape
 */
export const LoomComponent = track(function LoomComponent({
  shape,
  util,
}: LoomComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('loom', isDark)

  const {
    w,
    h,
    title,
    description,
    strandCount,
    weaveSlug,
    style,
    expanded,
    childStrandIds,
    backgroundColor,
  } = shape.props

  // Get weave accent color
  const weaveColor = useMemo(() => {
    if (backgroundColor) return { bg: backgroundColor, text: '#ffffff' }
    if (weaveSlug) {
      const hash = weaveSlug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return getWeaveColor(hash)
    }
    return { bg: colors.accent, text: '#ffffff' }
  }, [backgroundColor, weaveSlug, colors.accent])

  // Toggle expanded state
  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      editor.updateShapes([
        {
          id: shape.id,
          type: 'loom',
          props: { expanded: !expanded },
        },
      ])
    },
    [editor, shape.id, expanded]
  )

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
        className="relative w-full h-full rounded-2xl transition-all duration-200"
        style={{
          backgroundColor: isDark
            ? `${weaveColor.bg}15`
            : `${weaveColor.bg}20`,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: weaveColor.bg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-t-2xl"
          style={{
            backgroundColor: isDark
              ? `${weaveColor.bg}30`
              : `${weaveColor.bg}40`,
          }}
        >
          {/* Expand/collapse button */}
          <button
            onClick={toggleExpanded}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" style={{ color: weaveColor.bg }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: weaveColor.bg }} />
            )}
          </button>

          {/* Icon */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: weaveColor.bg }}
          >
            {style?.emoji ? (
              <span className="text-lg">{style.emoji}</span>
            ) : expanded ? (
              <FolderOpen className="w-5 h-5 text-white" />
            ) : (
              <Folder className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold truncate"
              style={{ color: isDark ? '#f3f4f6' : '#1f2937' }}
            >
              {title}
            </h3>
            {description && expanded && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Strand count badge */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: weaveColor.bg,
              color: '#ffffff',
            }}
          >
            <FileText className="w-3 h-3" />
            <span>{strandCount}</span>
          </div>

          {/* More actions */}
          <button
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal
              className="w-4 h-4"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            />
          </button>
        </div>

        {/* Content area - shows when expanded */}
        {expanded && (
          <div className="p-4">
            {childStrandIds.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed"
                style={{
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                }}
              >
                <FileText
                  className="w-8 h-8 mb-2"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                />
                <p
                  className="text-sm"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  Drop strands here
                </p>
              </div>
            ) : (
              <div
                className="text-sm"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {childStrandIds.length} strand{childStrandIds.length !== 1 ? 's' : ''} in this loom
              </div>
            )}
          </div>
        )}

        {/* Weave indicator */}
        {weaveSlug && (
          <div
            className="absolute bottom-2 left-4 flex items-center gap-1 text-xs"
            style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
          >
            <Folder className="w-3 h-3" />
            <span>{weaveSlug}</span>
          </div>
        )}
      </div>
    </HTMLContainer>
  )
})
