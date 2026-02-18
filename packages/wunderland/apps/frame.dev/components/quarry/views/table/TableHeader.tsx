/**
 * Table Header Component
 *
 * Sortable column headers for strand table view.
 * @module components/quarry/views/table/TableHeader
 */

'use client'

import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, GripVertical } from 'lucide-react'
import type { TableColumn, SortDirection } from '../types'

interface TableHeaderProps {
  /** Column definitions */
  columns: TableColumn[]
  /** Visible column IDs */
  visibleColumns: string[]
  /** Current sort column */
  sortBy: string
  /** Sort direction */
  sortDirection: SortDirection
  /** Sort change handler */
  onSort: (columnId: string) => void
  /** Current theme */
  theme?: string
  /** Show checkbox column */
  showCheckbox?: boolean
  /** Select all handler */
  onSelectAll?: () => void
  /** All selected state */
  allSelected?: boolean
  /** Some selected state */
  someSelected?: boolean
}

export function TableHeader({
  columns,
  visibleColumns,
  sortBy,
  sortDirection,
  onSort,
  theme = 'light',
  showCheckbox = false,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}: TableHeaderProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  const visibleColumnDefs = columns.filter((col) => visibleColumns.includes(col.id))

  const headerClasses = `
    sticky top-0 z-10
    ${isDark ? 'bg-zinc-900/95' : 'bg-white/95'}
    backdrop-blur-sm border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  const cellClasses = (col: TableColumn) => `
    px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider
    ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
    ${isTerminal ? 'font-mono text-green-500/70' : ''}
    ${col.sortable ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none' : ''}
    transition-colors
  `

  const getSortIcon = (columnId: string) => {
    if (sortBy !== columnId) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    )
  }

  return (
    <thead className={headerClasses}>
      <tr>
        {showCheckbox && (
          <th className="w-10 px-3 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected
              }}
              onChange={onSelectAll}
              className={`
                w-4 h-4 rounded
                ${isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-300'}
                focus:ring-2 focus:ring-rose-500/50
              `}
            />
          </th>
        )}
        {visibleColumnDefs.map((col) => (
          <th
            key={col.id}
            className={cellClasses(col)}
            style={{
              width: col.width,
              minWidth: col.minWidth,
            }}
            onClick={() => col.sortable && onSort(col.id)}
          >
            <div className="flex items-center gap-1.5">
              <span>{col.label}</span>
              {col.sortable && getSortIcon(col.id)}
            </div>
          </th>
        ))}
        {/* Actions column */}
        <th className="w-20 px-3 py-2">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  )
}

export default TableHeader
