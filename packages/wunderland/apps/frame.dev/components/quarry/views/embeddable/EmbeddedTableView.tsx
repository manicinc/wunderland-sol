/**
 * Embedded Table View
 * @module components/quarry/views/embeddable/EmbeddedTableView
 *
 * @description
 * Embark-inspired embedded table view for displaying structured data
 * with computed columns from formulas.
 */

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { EmbeddableViewConfig, ViewData, TableViewSettings } from '@/lib/views'
import type { MentionableEntity } from '@/lib/mentions/types'
import { ArrowUpDown, ArrowUp, ArrowDown, Table } from 'lucide-react'

interface EmbeddedTableViewProps {
  config: EmbeddableViewConfig
  data: ViewData
  editable?: boolean
  onItemClick?: (item: ViewData['items'][0]) => void
  className?: string
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Format cell value for display
 */
function formatCellValue(
  value: unknown,
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean'
): string {
  if (value === null || value === undefined) return '—'

  switch (format) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    case 'currency':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        : String(value)
    case 'percentage':
      return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : String(value)
    case 'date':
      if (value instanceof Date) return value.toLocaleDateString()
      if (typeof value === 'string') {
        const date = new Date(value)
        if (!isNaN(date.getTime())) return date.toLocaleDateString()
      }
      return String(value)
    case 'boolean':
      return value ? '✓' : '✗'
    default:
      if (Array.isArray(value)) return value.join(', ')
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
  }
}

const EmbeddedTableView: React.FC<EmbeddedTableViewProps> = ({
  config,
  data,
  editable = false,
  onItemClick,
  className,
}) => {
  const settings = config.settings as TableViewSettings

  const [sortBy, setSortBy] = useState(settings.sortBy || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(settings.sortDirection || 'asc')

  // Generate columns from data if not specified
  const columns = useMemo(() => {
    if (settings.columns && settings.columns.length > 0) {
      return settings.columns
    }

    // Auto-generate columns from first item
    if (data.items.length === 0) return []

    const firstEntity = data.items[0].entity as MentionableEntity
    const cols = [
      { id: 'label', label: 'Name', field: 'label', sortable: true },
      { id: 'type', label: 'Type', field: 'type', sortable: true },
    ]

    // Add columns from properties
    if ('properties' in firstEntity && firstEntity.properties) {
      const props = firstEntity.properties as Record<string, unknown>
      for (const key of Object.keys(props)) {
        cols.push({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          field: `properties.${key}`,
          sortable: true,
        })
      }
    }

    return cols
  }, [settings.columns, data.items])

  // Sort data
  const sortedItems = useMemo(() => {
    if (!sortBy) return data.items

    return [...data.items].sort((a, b) => {
      const aEntity = a.entity as Record<string, unknown>
      const bEntity = b.entity as Record<string, unknown>

      const aValue = getNestedValue(aEntity, sortBy)
      const bValue = getNestedValue(bEntity, sortBy)

      let comparison = 0
      if (aValue === bValue) comparison = 0
      else if (aValue === null || aValue === undefined) comparison = 1
      else if (bValue === null || bValue === undefined) comparison = -1
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data.items, sortBy, sortDirection])

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(columnId)
      setSortDirection('asc')
    }
  }

  // Empty state - Enhanced
  if (data.items.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full min-h-[200px] p-6',
          'bg-gradient-to-br from-cyan-50 to-slate-50',
          'dark:from-cyan-950/30 dark:to-slate-950/30',
          'border-2 border-dashed border-cyan-200 dark:border-cyan-800 rounded-xl',
          className
        )}
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full" />
          <Table className="relative h-14 w-14 text-cyan-400 dark:text-cyan-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No data to display
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
          This table will show structured data from your document
        </p>
        <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-600 dark:text-gray-300">💡 How to add data:</p>
          <ul className="space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">@</span>
              <span>Use @mentions to reference structured entities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">#</span>
              <span>Apply supertags like <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">#book</code> with properties</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">📊</span>
              <span>Create bullet lists with structured items</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto h-full', className)}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
          <tr>
            {settings.showRowNumbers && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-10">
                #
              </th>
            )}
            {columns.map(column => (
              <th
                key={column.id}
                className={cn(
                  'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  'border-b border-gray-200 dark:border-gray-700',
                  column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                style={{ width: 'width' in column ? column.width : undefined }}
                onClick={() => column.sortable && handleSort(column.field)}
              >
                <div className="flex items-center gap-1">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <span className="text-gray-400">
                      {sortBy === column.field ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {sortedItems.map((item, index) => {
            const entity = item.entity as Record<string, unknown>

            return (
              <tr
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  onItemClick && 'cursor-pointer'
                )}
              >
                {settings.showRowNumbers && (
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {index + 1}
                  </td>
                )}
                {columns.map(column => {
                  const value = getNestedValue(entity, column.field)
                  const displayValue = formatCellValue(value, 'format' in column ? column.format : undefined)

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        'px-3 py-2 text-gray-700 dark:text-gray-300',
                        'align' in column && column.align === 'center' && 'text-center',
                        'align' in column && column.align === 'right' && 'text-right'
                      )}
                    >
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { EmbeddedTableView }
export type { EmbeddedTableViewProps }

