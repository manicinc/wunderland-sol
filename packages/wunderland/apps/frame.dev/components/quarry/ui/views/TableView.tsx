/**
 * Table View Component
 * @module codex/ui/views/TableView
 *
 * @description
 * Spreadsheet-like view for supertag collections.
 * Displays blocks with a specific supertag as rows with field columns.
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff,
  GripVertical,
  Square,
  CheckSquare,
  MinusSquare,
} from 'lucide-react'
import type { SupertagSchema, SupertagFieldDefinition } from '@/lib/supertags'
import { cn } from '@/lib/utils'
import { useSelectedStrandsSafe, type SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TableRow {
  /** Unique row ID */
  id: string
  /** Block/strand path */
  path: string
  /** Display title */
  title: string
  /** Field values keyed by field name */
  values: Record<string, unknown>
  /** Metadata */
  createdAt?: string
  updatedAt?: string
}

export interface TableColumn {
  /** Field name */
  name: string
  /** Display label */
  label: string
  /** Field type */
  type: string
  /** Column width */
  width?: number
  /** Is column visible */
  visible: boolean
  /** Sort direction */
  sortDirection?: 'asc' | 'desc' | null
}

export interface TableViewProps {
  /** Supertag schema for column definitions */
  schema: SupertagSchema
  /** Rows of data */
  rows: TableRow[]
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click row to navigate */
  onRowClick?: (row: TableRow) => void
  /** Edit cell value */
  onCellEdit?: (rowId: string, fieldName: string, value: unknown) => void
  /** Loading state */
  loading?: boolean
  /** Enable row selection with checkboxes */
  selectable?: boolean
  /** Additional class names */
  className?: string
}

export type SortDirection = 'asc' | 'desc' | null

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function formatCellValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-zinc-500 italic">—</span>
  }

  switch (type) {
    case 'checkbox':
      return value ? (
        <span className="text-emerald-400">✓</span>
      ) : (
        <span className="text-zinc-500">✗</span>
      )

    case 'rating':
      const rating = Number(value) || 0
      return (
        <span className="text-amber-400">
          {'★'.repeat(rating)}
          <span className="text-zinc-600">{'★'.repeat(5 - rating)}</span>
        </span>
      )

    case 'progress':
      const progress = Number(value) || 0
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{progress}%</span>
        </div>
      )

    case 'date':
    case 'datetime':
      try {
        const date = new Date(value as string)
        return date.toLocaleDateString()
      } catch {
        return String(value)
      }

    case 'select':
      if (typeof value === 'object' && value !== null && 'label' in value) {
        const option = value as { label: string; color?: string }
        return (
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              backgroundColor: option.color ? `${option.color}20` : undefined,
              color: option.color,
            }}
          >
            {option.label}
          </span>
        )
      }
      return String(value)

    case 'tags':
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {(value as string[]).slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs"
              >
                #{tag}
              </span>
            ))}
            {value.length > 3 && (
              <span className="text-xs text-zinc-500">+{value.length - 3}</span>
            )}
          </div>
        )
      }
      return String(value)

    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate max-w-[150px]">{String(value)}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-cyan-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      )

    default:
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return str.length > 50 ? str.substring(0, 50) + '...' : str
  }
}

function compareValues(a: unknown, b: unknown, type: string): number {
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1

  switch (type) {
    case 'number':
    case 'rating':
    case 'progress':
      return Number(a) - Number(b)

    case 'date':
    case 'datetime':
      return new Date(a as string).getTime() - new Date(b as string).getTime()

    case 'checkbox':
      return (a ? 1 : 0) - (b ? 1 : 0)

    default:
      return String(a).localeCompare(String(b))
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function TableView({
  schema,
  rows,
  theme = 'dark',
  onRowClick,
  onCellEdit,
  loading = false,
  selectable = false,
  className,
}: TableViewProps) {
  const isDark = theme === 'dark'

  // Selection context (optional - safe version returns null if not in provider)
  const selectionContext = useSelectedStrandsSafe()

  // Column state
  const [columns, setColumns] = useState<TableColumn[]>(() => [
    { name: '_title', label: 'Title', type: 'text', visible: true, width: 200 },
    ...schema.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      visible: !field.hidden,
      width: field.type === 'textarea' ? 250 : 150,
    })),
  ])

  // Convert rows to SelectedStrand format for selection context
  const rowsAsStrands = useMemo<SelectedStrand[]>(() => {
    return rows.map((row) => ({
      id: row.id,
      path: row.path,
      title: row.title,
      tags: row.values.tags as string[] | undefined,
    }))
  }, [rows])

  // Selection helpers
  const isRowSelected = useCallback(
    (rowId: string) => selectionContext?.selectedIds.has(rowId) ?? false,
    [selectionContext?.selectedIds]
  )

  const selectedCount = selectionContext?.strands.length ?? 0
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const someSelected = selectedCount > 0 && selectedCount < rows.length

  // Handle row selection click
  const handleRowSelectionClick = useCallback(
    (row: TableRow, event: React.MouseEvent) => {
      if (!selectionContext) return

      const strand: SelectedStrand = {
        id: row.id,
        path: row.path,
        title: row.title,
        tags: row.values.tags as string[] | undefined,
      }

      selectionContext.handleStrandClick(
        strand,
        { shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey },
        rowsAsStrands
      )
    },
    [selectionContext, rowsAsStrands]
  )

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selectionContext) return

    if (allSelected) {
      selectionContext.clearAll()
    } else {
      selectionContext.selectAll(rowsAsStrands)
    }
  }, [selectionContext, allSelected, rowsAsStrands])

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Column visibility menu
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  // Handle column sort
  const handleSort = useCallback((columnName: string) => {
    if (sortColumn === columnName) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnName)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection])

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnName: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.name === columnName ? { ...col, visible: !col.visible } : col
      )
    )
  }, [])

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return rows

    const column = columns.find((c) => c.name === sortColumn)
    if (!column) return rows

    return [...rows].sort((a, b) => {
      const aValue = sortColumn === '_title' ? a.title : a.values[sortColumn]
      const bValue = sortColumn === '_title' ? b.title : b.values[sortColumn]
      const cmp = compareValues(aValue, bValue, column.type)
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [rows, sortColumn, sortDirection, columns])

  // Visible columns
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  )

  if (loading) {
    return (
      <div className={cn(
        'flex items-center justify-center h-48',
        className
      )}>
        <div className="text-zinc-500">Loading...</div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-48 text-center',
        className
      )}>
        <div className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
          No items found
        </div>
        <div className={cn(
          'text-sm mt-1',
          isDark ? 'text-zinc-600' : 'text-zinc-500'
        )}>
          Add items with #{schema.tagName} to see them here
        </div>
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      {/* Column visibility menu */}
      <div className="flex justify-end mb-2">
        <div className="relative">
          <button
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
              'transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-600'
            )}
            onClick={() => setShowColumnMenu(!showColumnMenu)}
          >
            <Eye className="w-3.5 h-3.5" />
            Columns
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showColumnMenu && (
              <motion.div
                className={cn(
                  'absolute right-0 top-full mt-1 z-50',
                  'w-48 rounded-lg shadow-xl border p-2',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700'
                    : 'bg-white border-zinc-200'
                )}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                {columns.map((col) => (
                  <button
                    key={col.name}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                      'transition-colors text-left',
                      isDark
                        ? 'hover:bg-zinc-800'
                        : 'hover:bg-zinc-100',
                      col.visible
                        ? isDark ? 'text-zinc-200' : 'text-zinc-800'
                        : isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                    onClick={() => toggleColumnVisibility(col.name)}
                  >
                    {col.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {col.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className={cn(
            'border-b',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}>
            {/* Selection checkbox header */}
            {selectable && selectionContext && (
              <th className="w-10 px-2 py-2">
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                  )}
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary-400" />
                  ) : someSelected ? (
                    <MinusSquare className="w-4 h-4 text-primary-400" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column.name}
                className={cn(
                  'text-left px-3 py-2 text-xs font-medium',
                  'cursor-pointer select-none transition-colors',
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column.name)}
              >
                <div className="flex items-center gap-1.5">
                  <span>{column.label}</span>
                  {sortColumn === column.name ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </div>
              </th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {sortedRows.map((row, idx) => {
            const rowSelected = isRowSelected(row.id)
            return (
            <motion.tr
              key={row.id}
              className={cn(
                'border-b transition-colors cursor-pointer',
                isDark
                  ? 'border-zinc-800/50 hover:bg-zinc-800/30'
                  : 'border-zinc-100 hover:bg-zinc-50',
                // Selection highlight
                rowSelected && (isDark ? 'bg-primary-900/20' : 'bg-primary-50')
              )}
              onClick={() => onRowClick?.(row)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              {/* Selection checkbox cell */}
              {selectable && selectionContext && (
                <td className="w-10 px-2 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRowSelectionClick(row, e)
                    }}
                    className={cn(
                      'p-1 rounded transition-colors',
                      isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                    )}
                  >
                    {rowSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-400" />
                    )}
                  </button>
                </td>
              )}
              {visibleColumns.map((column) => (
                <td
                  key={column.name}
                  className={cn(
                    'px-3 py-2 text-sm',
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  )}
                >
                  {column.name === '_title' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{row.title}</span>
                    </div>
                  ) : (
                    formatCellValue(row.values[column.name], column.type)
                  )}
                </td>
              ))}
              <td className="px-2 py-2">
                <button
                  className={cn(
                    'p-1 rounded opacity-50 hover:opacity-100 transition-opacity',
                    isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRowClick?.(row)
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </td>
            </motion.tr>
          )})}
        </tbody>
      </table>

      {/* Footer */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <span>
          {selectable && selectedCount > 0 ? (
            <span className="text-primary-400">
              {selectedCount} selected of {rows.length} item{rows.length !== 1 ? 's' : ''}
            </span>
          ) : (
            `${rows.length} item${rows.length !== 1 ? 's' : ''}`
          )}
        </span>
        <span>{visibleColumns.length} of {columns.length} columns</span>
      </div>
    </div>
  )
}

export default TableView
