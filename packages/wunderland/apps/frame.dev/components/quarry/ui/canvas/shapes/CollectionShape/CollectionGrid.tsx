/**
 * Collection Grid - Strand cards grid for expanded collection view
 * @module codex/ui/canvas/shapes/CollectionShape/CollectionGrid
 */

'use client'

import React, { memo, useCallback } from 'react'
import { FileText, Image } from 'lucide-react'
import type { CollectionShapeViewMode } from '../types'

interface StrandPreview {
  id: string
  title: string
  thumbnail?: string
  path: string
}

interface CollectionGridProps {
  strands: StrandPreview[]
  viewMode: CollectionShapeViewMode
  onStrandClick: (path: string) => void
  isDark: boolean
  maxHeight: number
}

/**
 * Grid of strand mini-cards for expanded collection view
 */
export const CollectionGrid = memo(function CollectionGrid({
  strands,
  viewMode,
  onStrandClick,
  isDark,
  maxHeight,
}: CollectionGridProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation()
      onStrandClick(path)
    },
    [onStrandClick]
  )

  // Grid columns based on view mode
  const gridCols = viewMode === 'compact' ? 'grid-cols-3' : 'grid-cols-2'
  const cardSize = viewMode === 'compact' ? 'h-12' : 'h-20'

  return (
    <div
      className={`grid ${gridCols} gap-2 overflow-y-auto pr-1`}
      style={{ maxHeight }}
    >
      {strands.map((strand) => (
        <button
          key={strand.id}
          onClick={(e) => handleClick(e, strand.path)}
          className={`${cardSize} p-2 rounded-lg transition-all hover:scale-[1.02] text-left overflow-hidden flex flex-col`}
          style={{
            backgroundColor: isDark ? '#374151' : '#f3f4f6',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: isDark ? '#4b5563' : '#e5e7eb',
          }}
          title={strand.title}
        >
          {/* Thumbnail or icon */}
          {viewMode !== 'compact' && (
            <div className="flex-shrink-0 mb-1">
              {strand.thumbnail ? (
                <img
                  src={strand.thumbnail}
                  alt=""
                  className="w-full h-8 rounded object-cover"
                />
              ) : (
                <div
                  className="w-full h-8 rounded flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
                  }}
                >
                  <FileText
                    className="w-4 h-4"
                    style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <span
            className={`text-xs font-medium truncate ${
              viewMode === 'compact' ? 'flex items-center gap-1' : 'line-clamp-2'
            }`}
            style={{ color: isDark ? '#e5e7eb' : '#374151' }}
          >
            {viewMode === 'compact' && (
              <FileText
                className="w-3 h-3 flex-shrink-0"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              />
            )}
            {strand.title}
          </span>
        </button>
      ))}
    </div>
  )
})

export default CollectionGrid
