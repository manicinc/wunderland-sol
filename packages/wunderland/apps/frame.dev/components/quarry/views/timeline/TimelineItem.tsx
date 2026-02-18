/**
 * Timeline Item Component
 *
 * Single strand item in timeline view.
 * @module components/quarry/views/timeline/TimelineItem
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  ExternalLink,
  Edit3,
  MoreHorizontal,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { StrandWithPath } from '../types'

interface TimelineItemProps {
  /** Strand data */
  strand: StrandWithPath
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Edit handler */
  onEdit?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Animation index */
  index?: number
}

export function TimelineItem({
  strand,
  onNavigate,
  onEdit,
  theme = 'light',
  index = 0,
}: TimelineItemProps) {
  const isDark = theme.includes('dark')

  const tags = Array.isArray(strand.metadata.tags)
    ? strand.metadata.tags
    : strand.metadata.tags
      ? [strand.metadata.tags]
      : []

  const difficulty = typeof strand.metadata.difficulty === 'string'
    ? strand.metadata.difficulty
    : null

  const status = strand.metadata.publishing?.status || 'draft'

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const formattedTime = strand.lastModified
    ? format(parseISO(strand.lastModified), 'h:mm a')
    : null

  const itemClasses = `
    group relative flex gap-4 p-3 rounded-lg cursor-pointer
    ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}
    transition-colors
  `

  return (
    <motion.div
      className={itemClasses}
      onClick={() => onNavigate(strand.path)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`
            w-3 h-3 rounded-full flex-shrink-0
            ${status === 'published'
              ? 'bg-green-500'
              : status === 'draft'
                ? isDark ? 'bg-zinc-600' : 'bg-zinc-300'
                : 'bg-zinc-400'
            }
          `}
        />
        <div
          className={`
            w-0.5 flex-1 mt-2
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Time */}
        {formattedTime && (
          <div className={`flex items-center gap-1 text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Clock className="w-3 h-3" />
            {formattedTime}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-2">
          <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {strand.title || strand.path.split('/').pop()}
            </h4>

            {/* Summary */}
            {strand.summary && (
              <p className={`text-xs line-clamp-2 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {strand.summary}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Difficulty */}
              {difficulty && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${difficultyColors[difficulty]}`}>
                  {difficulty}
                </span>
              )}

              {/* Status */}
              {status !== 'published' && (
                <span
                  className={`
                    px-1.5 py-0.5 text-[10px] rounded
                    ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                  `}
                >
                  {status}
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

            {/* Path */}
            <div className={`mt-1 text-[10px] truncate ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {strand.weave}{strand.loom && ` / ${strand.loom}`}
            </div>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div
        className={`
          flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onNavigate(strand.path)}
          className={`
            p-1.5 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
          `}
          title="Open"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(strand)}
            className={`
              p-1.5 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
            `}
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default TimelineItem
