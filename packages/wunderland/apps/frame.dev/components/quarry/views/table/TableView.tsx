/**
 * Table View Component
 *
 * Sortable, filterable table view for strands.
 * @module components/quarry/views/table/TableView
 */

'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Search,
  X,
  ChevronDown,
  Download,
  Filter,
  Loader2,
} from 'lucide-react'
import { TableHeader } from './TableHeader'
import { TableRow } from './TableRow'
import type { TableViewProps, StrandWithPath, TableColumn } from '../types'
import { DEFAULT_TABLE_COLUMNS } from '../types'

interface TableViewExtendedProps extends Omit<TableViewProps, 'columns'> {
  /** Column definitions (optional, uses defaults) */
  columns?: TableColumn[]
  /** Search query */
  searchQuery?: string
  /** Search change handler */
  onSearchChange?: (query: string) => void
  /** Enable selection */
  enableSelection?: boolean
  /** Selected strand paths */
  selectedPaths?: string[]
  /** Selection change handler */
  onSelectionChange?: (paths: string[]) => void
  /** Export handler */
  onExport?: (strands: StrandWithPath[]) => void
}

export default function TableView({
  strands,
  columns = DEFAULT_TABLE_COLUMNS,
  sortBy,
  sortDirection,
  onSort,
  onNavigate,
  onEdit,
  onDelete,
  onColumnVisibilityChange,
  onColumnReorder,
  theme = 'light',
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  enableSelection = false,
  selectedPaths = [],
  onSelectionChange,
  onExport,
}: TableViewExtendedProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  )
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const tableRef = useRef<HTMLDivElement>(null)

  // Filter strands by search
  const filteredStrands = useMemo(() => {
    if (!localSearch.trim()) return strands

    const query = localSearch.toLowerCase()
    return strands.filter((strand) => {
      return (
        strand.title?.toLowerCase().includes(query) ||
        strand.path.toLowerCase().includes(query) ||
        strand.weave?.toLowerCase().includes(query) ||
        strand.loom?.toLowerCase().includes(query) ||
        strand.metadata.tags?.toString().toLowerCase().includes(query)
      )
    })
  }, [strands, localSearch])

  // Selection handlers
  const handleSelect = useCallback(
    (path: string, selected: boolean) => {
      if (!onSelectionChange) return

      if (selected) {
        onSelectionChange([...selectedPaths, path])
      } else {
        onSelectionChange(selectedPaths.filter((p) => p !== path))
      }
    },
    [selectedPaths, onSelectionChange]
  )

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return

    if (selectedPaths.length === filteredStrands.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filteredStrands.map((s) => s.path))
    }
  }, [selectedPaths, filteredStrands, onSelectionChange])

  // Column visibility toggle
  const toggleColumn = useCallback(
    (columnId: string) => {
      const newVisible = visibleColumns.includes(columnId)
        ? visibleColumns.filter((id) => id !== columnId)
        : [...visibleColumns, columnId]
      setVisibleColumns(newVisible)
      onColumnVisibilityChange?.(columnId, !visibleColumns.includes(columnId))
    },
    [visibleColumns, onColumnVisibilityChange]
  )

  const containerClasses = `
    flex flex-col h-full overflow-hidden rounded-lg border
    ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
  `

  const toolbarClasses = `
    flex items-center justify-between gap-3 p-3 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className={toolbarClasses}>
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
          >
            <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              placeholder="Search strands..."
              className={`
                flex-1 bg-transparent text-sm outline-none
                ${isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'}
              `}
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('')
                  onSearchChange?.('')
                }}
                className={`p-0.5 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Count */}
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {filteredStrands.length} {filteredStrands.length === 1 ? 'strand' : 'strands'}
            {selectedPaths.length > 0 && ` (${selectedPaths.length} selected)`}
          </span>

          {/* Export */}
          {onExport && (
            <button
              onClick={() => onExport(selectedPaths.length > 0
                ? filteredStrands.filter(s => selectedPaths.includes(s.path))
                : filteredStrands
              )}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
              `}
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Column picker */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className={`
                p-2 rounded-lg transition-colors
                ${showColumnPicker
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-200 text-zinc-700'
                  : isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                }
              `}
              title="Column settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showColumnPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`
                    absolute right-0 top-full mt-1 z-20
                    min-w-[180px] p-2 rounded-lg shadow-lg border
                    ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
                  `}
                >
                  <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Visible Columns
                  </div>
                  {columns.map((col) => (
                    <label
                      key={col.id}
                      className={`
                        flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                        ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-50'}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        className="w-3.5 h-3.5 rounded"
                      />
                      <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {col.label}
                      </span>
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          </div>
        ) : filteredStrands.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Search className="w-12 h-12 opacity-30" />
            <p className="text-sm">
              {localSearch ? 'No strands match your search' : 'No strands found'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <TableHeader
              columns={columns}
              visibleColumns={visibleColumns}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
              theme={theme}
              showCheckbox={enableSelection}
              onSelectAll={handleSelectAll}
              allSelected={selectedPaths.length === filteredStrands.length && filteredStrands.length > 0}
              someSelected={selectedPaths.length > 0 && selectedPaths.length < filteredStrands.length}
            />
            <tbody>
              {filteredStrands.map((strand, index) => (
                <TableRow
                  key={strand.path}
                  strand={strand}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  index={index}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                  showCheckbox={enableSelection}
                  isSelected={selectedPaths.includes(strand.path)}
                  onSelect={(selected) => handleSelect(strand.path, selected)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
