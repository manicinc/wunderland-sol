/**
 * Kanban View Component
 * @module codex/ui/views/KanbanView
 *
 * @description
 * Kanban board view for supertag collections.
 * Groups items by a select field (e.g., status) into columns.
 * Supports drag-and-drop between columns.
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  GripVertical,
  ExternalLink,
  User,
  Calendar,
  Tag,
  StickyNote,
} from 'lucide-react'
import type { SupertagSchema, SupertagFieldDefinition } from '@/lib/supertags'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface KanbanCard {
  /** Unique card ID */
  id: string
  /** Block/strand path */
  path: string
  /** Display title */
  title: string
  /** Column value (e.g., status) */
  columnValue: string
  /** Field values keyed by field name */
  values: Record<string, unknown>
  /** Priority for ordering */
  priority?: number
  /** Created timestamp */
  createdAt?: string
  /** Is this a supernote */
  isSupernote?: boolean
  /** Primary supertag for supernotes */
  primarySupertag?: string
}

export interface KanbanColumn {
  /** Column ID (option value) */
  id: string
  /** Column label */
  label: string
  /** Column color */
  color?: string
  /** Cards in this column */
  cards: KanbanCard[]
  /** WIP limit (optional) */
  wipLimit?: number
}

export interface KanbanViewProps {
  /** Supertag schema */
  schema: SupertagSchema
  /** Field to group by (must be a select field) */
  groupByField: string
  /** Cards data */
  cards: KanbanCard[]
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click card to navigate */
  onCardClick?: (card: KanbanCard) => void
  /** Move card to different column */
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void
  /** Fields to show on cards */
  cardFields?: string[]
  /** Loading state */
  loading?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getFieldOptions(schema: SupertagSchema, fieldName: string): Array<{ value: string; label: string; color?: string }> {
  const field = schema.fields.find((f) => f.name === fieldName)
  if (!field || !field.options) return []
  return field.options
}

function formatCardFieldValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) return null

  switch (type) {
    case 'date':
    case 'datetime':
      try {
        const date = new Date(value as string)
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Calendar className="w-2.5 h-2.5" />
            {date.toLocaleDateString()}
          </span>
        )
      } catch {
        return null
      }

    case 'tags':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-0.5">
            {(value as string[]).slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="px-1 py-0.5 rounded bg-zinc-700 text-zinc-400 text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )
      }
      return null

    case 'rating':
      const rating = Number(value) || 0
      return (
        <span className="text-amber-400 text-[10px]">
          {'★'.repeat(rating)}
        </span>
      )

    case 'progress':
      const progress = Number(value) || 0
      return (
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500">{progress}%</span>
        </div>
      )

    default:
      if (typeof value === 'string' && value.length > 0) {
        return (
          <span className="text-[10px] text-zinc-500 truncate">
            {value.length > 30 ? value.substring(0, 30) + '...' : value}
          </span>
        )
      }
      return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface KanbanCardItemProps {
  card: KanbanCard
  schema: SupertagSchema
  cardFields?: string[]
  theme: 'light' | 'dark'
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

function KanbanCardItem({
  card,
  schema,
  cardFields = [],
  theme,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanCardItemProps) {
  const isDark = theme === 'dark'
  const isSupernote = card.isSupernote

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="cursor-grab active:cursor-grabbing"
    >
      <motion.div
        className={cn(
          'p-3 rounded-lg border relative',
          'transition-all',
          isSupernote
            ? isDark
              ? 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-stone-600/50 hover:border-stone-500'
              : 'bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200 hover:border-amber-300 hover:shadow-sm'
            : isDark
              ? 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800'
              : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm',
          isDragging && 'opacity-50 ring-2 ring-cyan-500'
        )}
        onClick={onClick}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
      {/* Corner fold for supernotes */}
      {isSupernote && (
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderLeft: '12px solid transparent',
            borderTop: isDark ? '12px solid #57534e' : '12px solid #fcd34d',
          }}
        />
      )}

      {/* Supernote badge */}
      {isSupernote && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
            isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-200 text-amber-800'
          )}>
            <StickyNote className="w-2.5 h-2.5" />
            supernote
          </span>
          {card.primarySupertag && (
            <span className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded',
              isDark ? 'bg-stone-700 text-stone-300' : 'bg-amber-100/70 text-amber-700'
            )}>
              <Tag className="w-2.5 h-2.5" />
              {card.primarySupertag}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <div className={cn(
        'font-medium text-sm mb-2',
        isSupernote
          ? isDark ? 'text-amber-100' : 'text-stone-800'
          : isDark ? 'text-zinc-200' : 'text-zinc-800'
      )}>
        {card.title}
      </div>

      {/* Card fields */}
      {cardFields.length > 0 && (
        <div className="space-y-1.5">
          {cardFields.map((fieldName) => {
            const field = schema.fields.find((f) => f.name === fieldName)
            if (!field) return null
            const value = card.values[fieldName]
            const rendered = formatCardFieldValue(value, field.type)
            if (!rendered) return null

            return (
              <div key={fieldName}>
                {rendered}
              </div>
            )
          })}
        </div>
      )}
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLUMN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface KanbanColumnProps {
  column: KanbanColumn
  schema: SupertagSchema
  cardFields?: string[]
  theme: 'light' | 'dark'
  onCardClick?: (card: KanbanCard) => void
  isDragOver?: boolean
  onDragStart?: (card: KanbanCard, e: React.DragEvent) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
}

function KanbanColumnComponent({
  column,
  schema,
  cardFields,
  theme,
  onCardClick,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnProps) {
  const isDark = theme === 'dark'
  const isOverWipLimit = column.wipLimit && column.cards.length > column.wipLimit

  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 flex flex-col rounded-lg transition-colors',
        isDark ? 'bg-zinc-900/50' : 'bg-zinc-50',
        isDragOver && (isDark ? 'bg-cyan-900/30 ring-2 ring-cyan-500/50' : 'bg-cyan-50 ring-2 ring-cyan-400/50')
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <span className={cn(
            'font-medium text-sm',
            isDark ? 'text-zinc-200' : 'text-zinc-700'
          )}>
            {column.label}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs',
            isOverWipLimit
              ? 'bg-red-500/20 text-red-400'
              : isDark
                ? 'bg-zinc-800 text-zinc-400'
                : 'bg-zinc-200 text-zinc-500'
          )}>
            {column.cards.length}
            {column.wipLimit && ` / ${column.wipLimit}`}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        <AnimatePresence mode="popLayout">
          {column.cards.map((card) => (
            <KanbanCardItem
              key={card.id}
              card={card}
              schema={schema}
              cardFields={cardFields}
              theme={theme}
              onClick={() => onCardClick?.(card)}
              onDragStart={(e) => onDragStart?.(card, e)}
              onDragEnd={onDragEnd}
              isDragging={false}
            />
          ))}
        </AnimatePresence>

        {column.cards.length === 0 && (
          <div className={cn(
            'text-center py-8 text-xs',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            {isDragOver ? 'Drop here' : 'No items'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function KanbanView({
  schema,
  groupByField,
  cards,
  theme = 'dark',
  onCardClick,
  onCardMove,
  cardFields = [],
  loading = false,
  className,
}: KanbanViewProps) {
  const isDark = theme === 'dark'

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Handle drag start
  const handleDragStart = useCallback((card: KanbanCard, e: React.DragEvent) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card.id)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedCard(null)
    setDragOverColumn(null)
  }, [])

  // Handle drag over column
  const handleDragOver = useCallback((columnId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }, [dragOverColumn])

  // Handle drag leave column
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  // Handle drop on column
  const handleDrop = useCallback((toColumnId: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedCard || draggedCard.columnValue === toColumnId) {
      setDraggedCard(null)
      return
    }

    // Call the move handler
    onCardMove?.(draggedCard.id, draggedCard.columnValue, toColumnId)
    setDraggedCard(null)
  }, [draggedCard, onCardMove])

  // Build columns from field options
  const columns = useMemo<KanbanColumn[]>(() => {
    const options = getFieldOptions(schema, groupByField)

    // Add an "uncategorized" column for items without a value
    const allColumns: KanbanColumn[] = options.map((opt) => ({
      id: opt.value,
      label: opt.label,
      color: opt.color,
      cards: cards.filter((card) => card.columnValue === opt.value),
    }))

    // Add uncategorized column if there are cards without a column value
    const uncategorized = cards.filter(
      (card) => !card.columnValue || !options.some((o) => o.value === card.columnValue)
    )
    if (uncategorized.length > 0) {
      allColumns.push({
        id: '_uncategorized',
        label: 'Uncategorized',
        cards: uncategorized,
      })
    }

    return allColumns
  }, [schema, groupByField, cards])

  // Default card fields if not specified
  const displayFields = useMemo(() => {
    if (cardFields.length > 0) return cardFields

    // Auto-select some useful fields
    const useful = schema.fields
      .filter((f) => f.name !== groupByField && !f.hidden)
      .filter((f) => ['date', 'tags', 'rating', 'progress', 'text'].includes(f.type))
      .slice(0, 2)
      .map((f) => f.name)

    return useful
  }, [cardFields, schema.fields, groupByField])

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

  if (cards.length === 0) {
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
      <div className="flex gap-3 pb-4 min-w-max">
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            schema={schema}
            cardFields={displayFields}
            theme={theme}
            onCardClick={onCardClick}
            isDragOver={dragOverColumn === column.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(column.id, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(column.id, e)}
          />
        ))}
      </div>

      {/* Footer stats */}
      <div className={cn(
        'flex items-center gap-4 px-2 py-2 text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <span>{cards.length} total item{cards.length !== 1 ? 's' : ''}</span>
        <span>{columns.length} column{columns.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

export default KanbanView
