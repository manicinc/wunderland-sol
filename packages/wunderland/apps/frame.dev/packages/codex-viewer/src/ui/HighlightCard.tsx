/**
 * Highlight card component for displaying individual highlights
 * @module codex/ui/HighlightCard
 *
 * @remarks
 * - Shows highlighted text with color indicator
 * - Displays metadata (file path, category, notes)
 * - Actions: edit, delete, view connections, navigate
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Trash2, Edit, Link2, MapPin, Tag, StickyNote } from 'lucide-react'
import type { Highlight, HighlightConnection } from '../lib/highlightTypes'

interface HighlightCardProps {
  /** The highlight to display */
  highlight: Highlight
  /** Connections to other highlights */
  connections?: HighlightConnection[]
  /** Navigate to the source file */
  onNavigate: (path: string) => void
  /** Edit the highlight */
  onEdit: (highlight: Highlight) => void
  /** Delete the highlight */
  onDelete: (id: string) => void
  /** View connections */
  onViewConnections?: (highlight: Highlight) => void
}

const colorClasses = {
  yellow: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  green: 'border-green-400 bg-green-50 dark:bg-green-900/20',
  blue: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
  pink: 'border-pink-400 bg-pink-50 dark:bg-pink-900/20',
  purple: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20',
  orange: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
}

const colorBadgeClasses = {
  yellow: 'bg-yellow-500 text-yellow-900',
  green: 'bg-green-500 text-green-900',
  blue: 'bg-blue-500 text-blue-900',
  pink: 'bg-pink-500 text-pink-900',
  purple: 'bg-purple-500 text-purple-900',
  orange: 'bg-orange-500 text-orange-900',
}

/**
 * Card component for displaying a highlight with actions
 *
 * @example
 * ```tsx
 * <HighlightCard
 *   highlight={highlight}
 *   connections={connections}
 *   onNavigate={(path) => navigate(path)}
 *   onEdit={(h) => setEditingHighlight(h)}
 *   onDelete={(id) => deleteHighlight(id)}
 *   onViewConnections={(h) => showConnectionsModal(h)}
 * />
 * ```
 */
export default function HighlightCard({
  highlight,
  connections = [],
  onNavigate,
  onEdit,
  onDelete,
  onViewConnections,
}: HighlightCardProps) {
  const handleNavigate = () => {
    onNavigate(highlight.filePath)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(highlight)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(highlight.id)
  }

  const handleViewConnections = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onViewConnections) {
      onViewConnections(highlight)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`group relative p-4 rounded-lg border-l-4 ${colorClasses[highlight.color]} border transition-all hover:shadow-md cursor-pointer`}
      onClick={handleNavigate}
    >
      {/* Color Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorBadgeClasses[highlight.color]}`}
        >
          {highlight.color}
        </span>
      </div>

      {/* Highlighted Content */}
      <div className="mb-3 pr-20">
        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
          {highlight.content}
        </p>
      </div>

      {/* Category Tag */}
      {highlight.categoryTag && (
        <div className="mb-2 flex items-center gap-2">
          <Tag className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {highlight.categoryTag}
          </span>
        </div>
      )}

      {/* User Notes */}
      {highlight.userNotes && (
        <div className="mb-3 flex items-start gap-2 p-2 bg-gray-100 dark:bg-gray-800/50 rounded">
          <StickyNote className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-700 dark:text-gray-300 italic">
            {highlight.userNotes}
          </p>
        </div>
      )}

      {/* File Path */}
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {highlight.filePath}
        </span>
      </div>

      {/* Metadata Row */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {/* Selection Type */}
          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
            {highlight.selectionType === 'text' ? 'Text' : 'Block'}
          </span>

          {/* Created Date */}
          <span>{new Date(highlight.createdAt).toLocaleDateString()}</span>

          {/* Connections Badge */}
          {connections.length > 0 && (
            <button
              onClick={handleViewConnections}
              className="flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
              title="View connections"
            >
              <Link2 className="w-3 h-3" />
              <span>{connections.length}</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit highlight"
            aria-label="Edit highlight"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
            title="Delete highlight"
            aria-label="Delete highlight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
