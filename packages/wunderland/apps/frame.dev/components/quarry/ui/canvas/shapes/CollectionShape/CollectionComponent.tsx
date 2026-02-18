/**
 * Collection Component - Visual container for strand groups
 * @module codex/ui/canvas/shapes/CollectionShape/CollectionComponent
 *
 * Features:
 * - Colored header with icon and title
 * - Strand count badge
 * - Cross-weave/loom indicators
 * - Expandable grid of strand mini-cards
 * - Smart collection indicator
 * - Click to open collection panel
 */

'use client'

import React, { useCallback, memo, useMemo } from 'react'
import { HTMLContainer, track, useEditor } from '@tldraw/tldraw'
import {
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  GitBranch,
  Layers,
} from 'lucide-react'
import type { CollectionShape } from '../types'
import { getShapeColors } from '../types'
import type { CollectionShapeUtil } from './CollectionShapeUtil'
import { CollectionHeader } from './CollectionHeader'
import { CollectionGrid } from './CollectionGrid'

interface CollectionComponentProps {
  shape: CollectionShape
  util: CollectionShapeUtil
}

/**
 * Interactive collection card component for CollectionShape
 */
export const CollectionComponent = track(function CollectionComponent({
  shape,
  util,
}: CollectionComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('collection', isDark)

  const {
    w,
    h,
    collectionId,
    title,
    description,
    strandCount,
    color,
    icon,
    expanded,
    highlighted,
    viewMode,
    strands,
    crossWeave,
    crossLoom,
    isSmart,
  } = shape.props

  // Toggle expanded state
  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      editor.updateShapes([
        {
          id: shape.id,
          type: 'collection',
          props: { expanded: !expanded },
        },
      ])
    },
    [editor, shape.id, expanded]
  )

  // Navigate to collection
  const handleNavigate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Dispatch custom event for navigation
      window.dispatchEvent(
        new CustomEvent('canvas-collection-navigate', {
          detail: { collectionId },
        })
      )
    },
    [collectionId]
  )

  // Handle strand click for preview panel
  const handleStrandClick = useCallback(
    (strandPath: string) => {
      window.dispatchEvent(
        new CustomEvent('canvas-strand-preview', {
          detail: { path: strandPath },
        })
      )
    },
    []
  )

  // Calculate if we have room to show strands
  const hasRoom = useMemo(() => h > 120, [h])

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
        className="relative w-full h-full overflow-hidden rounded-2xl transition-all duration-200 flex flex-col"
        style={{
          backgroundColor: isDark ? colors.bg : colors.bg,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: highlighted ? color : colors.border,
          boxShadow: highlighted
            ? `0 0 0 3px ${color}40, 0 8px 24px rgba(0,0,0,0.2)`
            : '0 4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <CollectionHeader
          title={title}
          strandCount={strandCount}
          color={color}
          icon={icon}
          isSmart={isSmart}
          crossWeave={crossWeave}
          crossLoom={crossLoom}
          expanded={expanded}
          onToggle={toggleExpanded}
          onNavigate={handleNavigate}
          isDark={isDark}
        />

        {/* Content area */}
        <div className="flex-1 overflow-hidden p-3">
          {/* Description */}
          {description && !expanded && (
            <p
              className="text-xs line-clamp-2 mb-2"
              style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}
            >
              {description}
            </p>
          )}

          {/* Strand grid - when expanded */}
          {expanded && hasRoom && strands.length > 0 && (
            <CollectionGrid
              strands={strands}
              viewMode={viewMode}
              onStrandClick={handleStrandClick}
              isDark={isDark}
              maxHeight={h - 80}
            />
          )}

          {/* Empty state */}
          {expanded && strands.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-4">
              <FolderOpen
                className="w-8 h-8 mb-2"
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
              />
              <p
                className="text-xs"
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
              >
                No strands yet
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: isDark ? '#4b5563' : '#d1d5db' }}
              >
                Drag strands here to add
              </p>
            </div>
          )}

          {/* Compact preview - when collapsed */}
          {!expanded && strands.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {strands.slice(0, 4).map((strand) => (
                <div
                  key={strand.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs truncate max-w-[100px]"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#d1d5db' : '#4b5563',
                  }}
                  title={strand.title}
                >
                  {strand.thumbnail ? (
                    <img
                      src={strand.thumbnail}
                      alt=""
                      className="w-4 h-4 rounded object-cover"
                    />
                  ) : null}
                  <span className="truncate">{strand.title}</span>
                </div>
              ))}
              {strands.length > 4 && (
                <div
                  className="px-2 py-1 rounded-md text-xs"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#9ca3af' : '#6b7280',
                  }}
                >
                  +{strands.length - 4} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cross-weave/loom indicators */}
        {(crossWeave || crossLoom) && (
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            {crossWeave && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: isDark ? '#1e3a5f' : '#dbeafe',
                  color: isDark ? '#93c5fd' : '#1d4ed8',
                }}
                title="Contains strands from multiple weaves"
              >
                <GitBranch className="w-3 h-3" />
                <span>Cross-weave</span>
              </div>
            )}
            {crossLoom && !crossWeave && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: isDark ? '#422006' : '#fef3c7',
                  color: isDark ? '#fcd34d' : '#92400e',
                }}
                title="Contains strands from multiple looms"
              >
                <Layers className="w-3 h-3" />
                <span>Cross-loom</span>
              </div>
            )}
          </div>
        )}
      </div>
    </HTMLContainer>
  )
})

export default memo(CollectionComponent)
