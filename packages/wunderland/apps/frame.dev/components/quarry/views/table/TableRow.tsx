/**
 * Table Row Component
 *
 * Single row in strand table view with hover actions.
 * @module components/quarry/views/table/TableRow
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Star,
  StarOff,
  FileText,
} from 'lucide-react'
import type { StrandWithPath, TableColumn } from '../types'

interface TableRowProps {
  /** Strand data */
  strand: StrandWithPath
  /** Column definitions */
  columns: TableColumn[]
  /** Visible column IDs */
  visibleColumns: string[]
  /** Row index */
  index: number
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Edit handler */
  onEdit?: (strand: StrandWithPath) => void
  /** Delete handler */
  onDelete?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Is selected */
  isSelected?: boolean
  /** Selection change handler */
  onSelect?: (selected: boolean) => void
  /** Show checkbox */
  showCheckbox?: boolean
}

/**
 * Get cell value for a column
 */
function getCellValue(strand: StrandWithPath, col: TableColumn): React.ReactNode {
  const { field } = col

  switch (field) {
    case 'title':
      return strand.title || strand.path.split('/').pop()
    case 'path':
      return strand.path
    case 'weave':
      return strand.weave || '-'
    case 'loom':
      return strand.loom || '-'
    case 'lastModified':
      if (!strand.lastModified) return '-'
      try {
        const date = new Date(strand.lastModified)
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        })
      } catch {
        return '-'
      }
    case 'difficulty':
      const diff = strand.metadata.difficulty
      if (typeof diff === 'string') {
        const colors: Record<string, string> = {
          beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        }
        return (
          <span className={`px-2 py-0.5 text-xs rounded-full ${colors[diff] || ''}`}>
            {diff}
          </span>
        )
      }
      return '-'
    case 'publishing':
      const status = strand.metadata.publishing?.status || 'draft'
      const statusColors: Record<string, string> = {
        draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
        published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        archived: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-500',
      }
      return (
        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[status] || ''}`}>
          {status}
        </span>
      )
    case 'tags':
      const tags = Array.isArray(strand.metadata.tags)
        ? strand.metadata.tags
        : strand.metadata.tags
          ? [strand.metadata.tags]
          : []
      if (tags.length === 0) return '-'
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-zinc-400">+{tags.length - 3}</span>
          )}
        </div>
      )
    default:
      // Try custom render
      if (col.render) {
        return col.render(strand)
      }
      // Try to get from metadata
      const value = strand.metadata[field as keyof typeof strand.metadata]
      if (Array.isArray(value)) return value.join(', ')
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value || '-')
  }
}

export function TableRow({
  strand,
  columns,
  visibleColumns,
  index,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: TableRowProps) {
  const [showActions, setShowActions] = useState(false)
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  const visibleColumnDefs = columns.filter((col) => visibleColumns.includes(col.id))

  const rowClasses = `
    group cursor-pointer transition-colors
    ${isSelected
      ? isDark
        ? 'bg-rose-500/10'
        : 'bg-rose-50'
      : isDark
        ? 'hover:bg-zinc-800/50'
        : 'hover:bg-zinc-50'
    }
    ${index % 2 === 0 ? '' : isDark ? 'bg-zinc-900/30' : 'bg-zinc-50/50'}
    border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
  `

  const cellClasses = `
    px-3 py-2.5 text-sm
    ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
    ${isTerminal ? 'font-mono' : ''}
  `

  return (
    <motion.tr
      className={rowClasses}
      onClick={() => onNavigate(strand.path)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
    >
      {showCheckbox && (
        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className={`
              w-4 h-4 rounded
              ${isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-300'}
              focus:ring-2 focus:ring-rose-500/50
            `}
          />
        </td>
      )}
      {visibleColumnDefs.map((col) => (
        <td
          key={col.id}
          className={cellClasses}
          style={{ width: col.width, minWidth: col.minWidth }}
        >
          {col.id === 'title' ? (
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <span className="font-medium truncate">{getCellValue(strand, col)}</span>
            </div>
          ) : (
            getCellValue(strand, col)
          )}
        </td>
      ))}
      {/* Actions column */}
      <td className="w-20 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div
          className={`
            flex items-center gap-1 transition-opacity
            ${showActions ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <button
            onClick={() => onNavigate(strand.path)}
            className={`
              p-1.5 rounded-md transition-colors
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
                p-1.5 rounded-md transition-colors
                ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
              `}
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(strand)}
              className={`
                p-1.5 rounded-md transition-colors
                ${isDark ? 'hover:bg-red-900/30 text-zinc-400 hover:text-red-400' : 'hover:bg-red-50 text-zinc-500 hover:text-red-600'}
              `}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

export default TableRow
