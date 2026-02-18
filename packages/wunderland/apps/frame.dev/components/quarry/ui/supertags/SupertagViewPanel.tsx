/**
 * Supertag View Panel
 * @module codex/ui/SupertagViewPanel
 *
 * @description
 * Panel that displays all items with a specific supertag in table/kanban views.
 * Integrated with ViewContainer for switching between view modes.
 */

'use client'

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Table,
  Kanban,
  Filter,
  MoreVertical,
  Download,
  Plus,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupertagItems } from '@/lib/supertags/useSupertagItems'
import { setFieldValue } from '@/lib/supertags/supertagManager'
import { ViewContainer, type ViewItem } from '../views/ViewContainer'
import type { SupertagSchema } from '@/lib/supertags'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagViewPanelProps {
  /** Tag name to display (without #) */
  tagName: string
  /** Theme */
  theme?: 'light' | 'dark'
  /** Called when user wants to go back */
  onBack?: () => void
  /** Called when clicking an item */
  onItemClick?: (item: ViewItem) => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagViewPanel({
  tagName,
  theme = 'dark',
  onBack,
  onItemClick,
  className,
}: SupertagViewPanelProps) {
  const isDark = theme === 'dark'

  // Fetch items with this supertag
  const { items, schema, isLoading, error, refresh, totalCount } = useSupertagItems(tagName)

  // Menu state
  const [showMenu, setShowMenu] = useState(false)

  // Get the current group-by field from view config
  const [currentGroupByField, setCurrentGroupByField] = useState<string | undefined>()

  // Handle item move (for kanban)
  const handleItemMove = useCallback(async (
    itemId: string,
    fromValue: string,
    toValue: string
  ) => {
    if (!schema || !currentGroupByField) {
      console.warn('[SupertagViewPanel] Cannot move item: no schema or groupByField')
      return
    }

    console.log('[SupertagViewPanel] Move item:', itemId, 'from', fromValue, 'to', toValue, 'field:', currentGroupByField)

    try {
      // Update the field value in the database
      await setFieldValue(itemId, schema.id, currentGroupByField, toValue)

      // Refresh to show updated data
      await refresh()
    } catch (error) {
      console.error('[SupertagViewPanel] Failed to update field value:', error)
    }
  }, [schema, currentGroupByField, refresh])

  // Handle view config change to track current groupByField
  const handleConfigChange = useCallback((config: { groupByField?: string }) => {
    if (config.groupByField) {
      setCurrentGroupByField(config.groupByField)
    }
  }, [])

  // Get schema icon
  const SchemaIcon = schema?.icon
    ? (Icons[schema.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) || Icons.Hash
    : Icons.Hash

  if (!schema && !isLoading) {
    return (
      <div className={cn(
        'flex flex-col h-full',
        className
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          {onBack && (
            <button
              onClick={onBack}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className={cn(
            'font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            #{tagName}
          </span>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className={cn(
            'text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <p>No schema found for #{tagName}</p>
            <p className="text-sm mt-1">This tag has no supertag definition.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md"
              style={{ backgroundColor: schema?.color ? `${schema.color}20` : undefined }}
            >
              <SchemaIcon
                className="w-4 h-4"
                style={{ color: schema?.color }}
              />
            </div>
            <div>
              <h2 className={cn(
                'font-semibold text-sm',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}>
                {schema?.displayName || tagName}
              </h2>
              {schema?.description && (
                <p className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {schema.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Item count */}
          <span className={cn(
            'px-2 py-0.5 rounded text-xs',
            isDark
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-zinc-100 text-zinc-600'
          )}>
            {totalCount} item{totalCount !== 1 ? 's' : ''}
          </span>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className={cn(
                    'absolute right-0 top-full mt-1 z-50',
                    'w-48 rounded-lg shadow-xl border p-1',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-zinc-200'
                  )}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                      'transition-colors text-left',
                      isDark
                        ? 'hover:bg-zinc-800 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-600'
                    )}
                    onClick={() => {
                      // TODO: Export to CSV
                      setShowMenu(false)
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Export to CSV
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className={cn(
          'mx-4 mt-4 px-4 py-3 rounded-lg text-sm',
          isDark
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-red-50 text-red-600 border border-red-200'
        )}>
          {error.message}
        </div>
      )}

      {/* View container */}
      {schema && (
        <ViewContainer
          schema={schema}
          items={items}
          theme={theme}
          onItemClick={onItemClick}
          onItemMove={handleItemMove}
          onConfigChange={handleConfigChange}
          onRefresh={refresh}
          loading={isLoading}
          className="flex-1"
        />
      )}

      {/* Loading state */}
      {isLoading && items.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className={cn(
            'text-sm',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Loading items...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && schema && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <SchemaIcon
              className={cn(
                'w-12 h-12 mx-auto mb-4 opacity-20',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            />
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              No items with #{tagName} yet
            </p>
            <p className={cn(
              'text-sm mt-1',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}>
              Apply this tag to strands or blocks to see them here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupertagViewPanel
