/**
 * Board Card Component
 *
 * Draggable card in board/kanban view.
 * @module components/quarry/views/board/BoardCard
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  GripVertical,
  MoreHorizontal,
  ExternalLink,
  Edit3,
  Trash2,
  StickyNote,
  Tag,
  FolderPlus,
} from 'lucide-react'
import type { StrandWithPath } from '../types'
import { AddToCollectionModal } from '@/components/quarry/ui/collections'

interface BoardCardProps {
  /** Strand data */
  strand: StrandWithPath
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Edit handler */
  onEdit?: (strand: StrandWithPath) => void
  /** Delete handler */
  onDelete?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Is being dragged */
  isDragging?: boolean
  /** Drag handle props */
  dragHandleProps?: Record<string, unknown>
}

export function BoardCard({
  strand,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  isDragging = false,
  dragHandleProps,
}: BoardCardProps) {
  const [showAddToCollection, setShowAddToCollection] = useState(false)
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Check if this is a supernote
  const isSupernote = strand.metadata.strandType === 'supernote'
  const primarySupertag = strand.metadata.supernote?.primarySupertag

  const tags = Array.isArray(strand.metadata.tags)
    ? strand.metadata.tags
    : strand.metadata.tags
      ? [strand.metadata.tags]
      : []

  const difficulty = typeof strand.metadata.difficulty === 'string'
    ? strand.metadata.difficulty
    : null

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  // Supernote-specific styling - paper texture feel with corner fold
  const supernoteStyles = isSupernote
    ? {
        background: isDark
          ? 'linear-gradient(135deg, #44403c 0%, #292524 100%)'
          : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
        borderColor: isDark ? '#78716c' : '#fde047',
      }
    : {}

  const cardClasses = `
    group relative p-3 rounded-lg cursor-pointer transition-all
    ${isSupernote
      ? isDark
        ? 'bg-gradient-to-br from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700'
        : 'bg-gradient-to-br from-yellow-50 to-amber-100 hover:from-yellow-100 hover:to-amber-200'
      : isDark
        ? 'bg-zinc-800 hover:bg-zinc-750'
        : 'bg-white hover:bg-zinc-50'
    }
    ${isDragging ? 'shadow-lg ring-2 ring-rose-500/50 opacity-90' : 'shadow-sm'}
    border ${isSupernote
      ? isDark ? 'border-stone-600' : 'border-amber-300'
      : isDark ? 'border-zinc-700' : 'border-zinc-200'
    }
  `

  return (
    <motion.div
      className={cardClasses}
      onClick={() => onNavigate(strand.path)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className={`
          absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100
          cursor-grab active:cursor-grabbing transition-opacity
          ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>

      {/* Corner fold effect for supernotes */}
      {isSupernote && (
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderLeft: '16px solid transparent',
            borderTop: isDark ? '16px solid #57534e' : '16px solid #fcd34d',
          }}
        />
      )}

      {/* Content */}
      <div className="pl-4">
        {/* Supernote badge with supertag */}
        {isSupernote && primarySupertag && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className={`
              inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full
              ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-200 text-amber-800'}
            `}>
              <StickyNote className="w-2.5 h-2.5" />
              supernote
            </span>
            <span className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded
              ${isDark ? 'bg-stone-700 text-stone-300' : 'bg-amber-100 text-amber-700'}
            `}>
              <Tag className="w-2.5 h-2.5" />
              {primarySupertag}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="flex items-start gap-2">
          {isSupernote ? (
            <StickyNote className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
          ) : (
            <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          )}
          <h4 className={`text-sm font-medium line-clamp-2 ${
            isSupernote
              ? isDark ? 'text-amber-100' : 'text-stone-800'
              : isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}>
            {strand.title || strand.path.split('/').pop()}
          </h4>
        </div>

        {/* Summary */}
        {strand.summary && (
          <p className={`mt-1.5 text-xs line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {strand.summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Difficulty badge */}
          {difficulty && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${difficultyColors[difficulty] || ''}`}>
              {difficulty}
            </span>
          )}

          {/* Tags */}
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 text-[10px] rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              +{tags.length - 2}
            </span>
          )}
        </div>

        {/* Path hint */}
        {strand.loom && (
          <div className={`mt-2 text-[10px] truncate ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {strand.weave}/{strand.loom}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div
        className={`
          absolute right-2 top-2 flex items-center gap-1
          opacity-0 group-hover:opacity-100 transition-opacity
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onNavigate(strand.path)}
          className={`
            p-1 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
          `}
          title="Open"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowAddToCollection(true)}
          className={`
            p-1 rounded transition-colors
            ${isDark ? 'hover:bg-violet-900/50 text-violet-400' : 'hover:bg-violet-100 text-violet-600'}
          `}
          title="Add to collection"
        >
          <FolderPlus className="w-3 h-3" />
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(strand)}
            className={`
              p-1 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
            `}
            title="Edit"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        strandPaths={strand.path}
        strandTitle={strand.title}
        isDark={isDark}
      />
    </motion.div>
  )
}

export default BoardCard
