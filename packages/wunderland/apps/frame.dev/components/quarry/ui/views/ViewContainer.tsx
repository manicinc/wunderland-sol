/**
 * View Container Component
 * @module codex/ui/views/ViewContainer
 *
 * @description
 * Container that manages switching between different view types
 * (Table, Kanban, Calendar, Gallery) for supertag collections.
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  Kanban,
  Calendar,
  LayoutGrid,
  ChevronDown,
  Settings2,
  RefreshCw,
} from 'lucide-react'
import type { SupertagSchema } from '@/lib/supertags'
import { TableView, type TableRow } from './TableView'
import { KanbanView, type KanbanCard } from './KanbanView'
import SelectionToolbar from '@/components/quarry/ui/transform/SelectionToolbar'
import TransformModal from '@/components/quarry/ui/transform/TransformModal'
import { useSelectedStrandsSafe } from '@/components/quarry/contexts/SelectedStrandsContext'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type ViewType = 'table' | 'kanban' | 'calendar' | 'gallery'

export interface ViewItem {
  /** Unique item ID */
  id: string
  /** Item path */
  path: string
  /** Display title */
  title: string
  /** Field values */
  values: Record<string, unknown>
  /** Created timestamp */
  createdAt?: string
  /** Updated timestamp */
  updatedAt?: string
}

export interface ViewConfig {
  /** Current view type */
  viewType: ViewType
  /** Field to group by (for kanban) */
  groupByField?: string
  /** Sort field */
  sortField?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Fields to show on cards */
  cardFields?: string[]
}

export interface ViewContainerProps {
  /** Supertag schema */
  schema: SupertagSchema
  /** Items to display */
  items: ViewItem[]
  /** Theme */
  theme?: 'light' | 'dark'
  /** Initial view configuration */
  initialConfig?: Partial<ViewConfig>
  /** Click item handler */
  onItemClick?: (item: ViewItem) => void
  /** Move item handler (for kanban) */
  onItemMove?: (itemId: string, fromValue: string, toValue: string) => void
  /** Config changed handler */
  onConfigChange?: (config: ViewConfig) => void
  /** Refresh data handler */
  onRefresh?: () => void
  /** Loading state */
  loading?: boolean
  /** Enable multi-select with checkboxes and toolbar */
  selectable?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const VIEW_OPTIONS: Array<{
  type: ViewType
  label: string
  icon: React.ElementType
}> = [
  { type: 'table', label: 'Table', icon: Table },
  { type: 'kanban', label: 'Kanban', icon: Kanban },
  { type: 'calendar', label: 'Calendar', icon: Calendar },
  { type: 'gallery', label: 'Gallery', icon: LayoutGrid },
]

function findDefaultGroupByField(schema: SupertagSchema): string | undefined {
  // Look for a select field that looks like a status
  const statusField = schema.fields.find(
    (f) => f.type === 'select' && (f.name === 'status' || f.name.includes('status'))
  )
  if (statusField) return statusField.name

  // Fallback to first select field
  const firstSelect = schema.fields.find((f) => f.type === 'select')
  return firstSelect?.name
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function ViewContainer({
  schema,
  items,
  theme = 'dark',
  initialConfig,
  onItemClick,
  onItemMove,
  onConfigChange,
  onRefresh,
  loading = false,
  selectable = false,
  className,
}: ViewContainerProps) {
  const isDark = theme === 'dark'

  // Selection context
  const selectionContext = useSelectedStrandsSafe()
  const hasSelection = selectionContext && selectionContext.strands.length > 0

  // Transform modal state
  const [showTransformModal, setShowTransformModal] = useState(false)

  // View configuration state
  const [config, setConfig] = useState<ViewConfig>(() => ({
    viewType: initialConfig?.viewType || 'table',
    groupByField: initialConfig?.groupByField || findDefaultGroupByField(schema),
    sortField: initialConfig?.sortField,
    sortDirection: initialConfig?.sortDirection,
    cardFields: initialConfig?.cardFields,
  }))

  // View selector dropdown
  const [showViewSelector, setShowViewSelector] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Update config and notify
  const updateConfig = useCallback((updates: Partial<ViewConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates }
      onConfigChange?.(next)
      return next
    })
  }, [onConfigChange])

  // Convert items to table rows
  const tableRows = useMemo<TableRow[]>(() => {
    return items.map((item) => ({
      id: item.id,
      path: item.path,
      title: item.title,
      values: item.values,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
  }, [items])

  // Convert items to kanban cards
  const kanbanCards = useMemo<KanbanCard[]>(() => {
    if (!config.groupByField) return []

    return items.map((item) => {
      const columnValue = item.values[config.groupByField!]
      return {
        id: item.id,
        path: item.path,
        title: item.title,
        columnValue: typeof columnValue === 'object' && columnValue && 'value' in columnValue
          ? (columnValue as { value: string }).value
          : String(columnValue || ''),
        values: item.values,
        createdAt: item.createdAt,
      }
    })
  }, [items, config.groupByField])

  // Available group by fields (select type only)
  const groupByOptions = useMemo(() => {
    return schema.fields.filter((f) => f.type === 'select')
  }, [schema.fields])

  // Current view info
  const currentView = VIEW_OPTIONS.find((v) => v.type === config.viewType) || VIEW_OPTIONS[0]
  const CurrentViewIcon = currentView.icon

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {/* Left: View selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                'transition-colors',
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              )}
              onClick={() => setShowViewSelector(!showViewSelector)}
            >
              <CurrentViewIcon className="w-4 h-4" />
              <span>{currentView.label}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            <AnimatePresence>
              {showViewSelector && (
                <motion.div
                  className={cn(
                    'absolute left-0 top-full mt-1 z-50',
                    'w-40 rounded-lg shadow-xl border p-1',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-zinc-200'
                  )}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isActive = config.viewType === option.type
                    const isDisabled = option.type === 'calendar' || option.type === 'gallery'

                    return (
                      <button
                        key={option.type}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                          'transition-colors text-left',
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed'
                            : isActive
                              ? isDark
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-cyan-50 text-cyan-600'
                              : isDark
                                ? 'hover:bg-zinc-800 text-zinc-300'
                                : 'hover:bg-zinc-100 text-zinc-600'
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            updateConfig({ viewType: option.type })
                            setShowViewSelector(false)
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                        {isDisabled && (
                          <span className="text-xs opacity-50 ml-auto">Soon</span>
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Kanban: Group by selector */}
          {config.viewType === 'kanban' && groupByOptions.length > 0 && (
            <select
              value={config.groupByField || ''}
              onChange={(e) => updateConfig({ groupByField: e.target.value })}
              className={cn(
                'px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700'
              )}
            >
              {groupByOptions.map((field) => (
                <option key={field.name} value={field.name}>
                  Group by: {field.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
              onClick={onRefresh}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={config.viewType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {config.viewType === 'table' && (
              <TableView
                schema={schema}
                rows={tableRows}
                theme={theme}
                selectable={selectable}
                onRowClick={(row) => onItemClick?.({
                  id: row.id,
                  path: row.path,
                  title: row.title,
                  values: row.values,
                })}
                loading={loading}
              />
            )}

            {config.viewType === 'kanban' && config.groupByField && (
              <KanbanView
                schema={schema}
                groupByField={config.groupByField}
                cards={kanbanCards}
                theme={theme}
                onCardClick={(card) => onItemClick?.({
                  id: card.id,
                  path: card.path,
                  title: card.title,
                  values: card.values,
                })}
                onCardMove={onItemMove}
                cardFields={config.cardFields}
                loading={loading}
              />
            )}

            {config.viewType === 'calendar' && (
              <div className={cn(
                'flex items-center justify-center h-48',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                Calendar view coming soon
              </div>
            )}

            {config.viewType === 'gallery' && (
              <div className={cn(
                'flex items-center justify-center h-48',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                Gallery view coming soon
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selection Toolbar */}
      {selectable && hasSelection && (
        <SelectionToolbar
          onTransform={() => setShowTransformModal(true)}
          onDelete={() => {
            // TODO: Implement batch delete
            console.log('Delete selected strands')
          }}
        />
      )}

      {/* Transform Modal */}
      {selectable && selectionContext && (
        <TransformModal
          isOpen={showTransformModal}
          onClose={() => setShowTransformModal(false)}
          strands={selectionContext.strands}
          onComplete={(result) => {
            console.log('[ViewContainer] Transform complete:', result)
            setShowTransformModal(false)
            selectionContext.clearAll()
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}

export default ViewContainer
