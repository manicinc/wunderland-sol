/**
 * Supertag Badge Component
 * @module codex/ui/SupertagBadge
 *
 * @description
 * Displays a supertag as a colored badge with optional fields preview.
 * Supports multiple display modes: full, compact, and icon-only.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  getSchemaByTagName,
  getFieldValues,
  type SupertagSchema,
  type SupertagBadgeMode,
} from '@/lib/supertags'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagBadgeProps {
  /** Tag name (without # prefix) */
  tagName: string
  /** Block ID to show values for (optional) */
  blockId?: string
  /** Display mode */
  mode?: SupertagBadgeMode
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Click handler */
  onClick?: () => void
  /** Show hover preview */
  showPreview?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Icons.Tag
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = IconsRecord[iconName]
  return Icon || Icons.Tag
}

function formatFieldValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '-'

  switch (type) {
    case 'checkbox':
      return value ? 'Yes' : 'No'
    case 'date':
    case 'datetime':
      try {
        return new Date(value as string).toLocaleDateString()
      } catch {
        return String(value)
      }
    case 'rating':
      return '★'.repeat(value as number) + '☆'.repeat(5 - (value as number))
    case 'progress':
      return `${value}%`
    case 'tags':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    case 'select':
      if (typeof value === 'object' && value !== null && 'label' in value) {
        return (value as { label: string }).label
      }
      return String(value)
    default:
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagBadge({
  tagName,
  blockId,
  mode = 'compact',
  theme = 'dark',
  onClick,
  showPreview = true,
  className,
}: SupertagBadgeProps) {
  const [schema, setSchema] = useState<SupertagSchema | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [showHover, setShowHover] = useState(false)
  const [loading, setLoading] = useState(true)

  const isDark = theme === 'dark'

  // Load schema and values
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const schemaData = await getSchemaByTagName(tagName)
        if (cancelled) return

        setSchema(schemaData)

        if (blockId && schemaData) {
          const valuesData = await getFieldValues(blockId, schemaData.id)
          if (!cancelled) setValues(valuesData)
        }
      } catch (error) {
        console.error('Failed to load supertag:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [tagName, blockId])

  if (loading) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs animate-pulse',
        isDark ? 'bg-zinc-800' : 'bg-zinc-200',
        className
      )}>
        <span className="w-3 h-3 rounded-full bg-zinc-500" />
        <span className="w-12 h-3 rounded bg-zinc-500" />
      </span>
    )
  }

  const Icon = getIconComponent(schema?.icon)
  const color = schema?.color || '#71717a'

  // Icon-only mode
  if (mode === 'icon') {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full',
          'transition-transform hover:scale-110',
          onClick && 'cursor-pointer',
          className
        )}
        style={{ backgroundColor: color + '30', color }}
        onClick={onClick}
        title={schema?.displayName || tagName}
      >
        <Icon className="w-3 h-3" />
      </button>
    )
  }

  // Compact mode
  if (mode === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
          'transition-all',
          onClick && 'cursor-pointer hover:ring-1 hover:ring-white/20',
          className
        )}
        style={{ backgroundColor: color + '20', color }}
        onClick={onClick}
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
      >
        <Icon className="w-3 h-3" />
        <span className="font-medium">#{schema?.displayName || tagName}</span>

        {/* Hover preview */}
        <AnimatePresence>
          {showPreview && showHover && Object.keys(values).length > 0 && (
            <motion.div
              className={cn(
                'absolute left-0 top-full mt-1 z-50',
                'w-56 rounded-lg shadow-xl border p-2',
                isDark
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-white border-zinc-200'
              )}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <div className="space-y-1">
                {schema?.fields.slice(0, 4).map(field => {
                  const value = values[field.name]
                  if (value === undefined || value === null) return null
                  return (
                    <div key={field.name} className="flex items-center gap-2 text-xs">
                      <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                        {field.label}:
                      </span>
                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                        {formatFieldValue(value, field.type)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    )
  }

  // Full mode
  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-white/10',
        className
      )}
      style={{ borderColor: color + '50' }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ backgroundColor: color + '15' }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="font-medium text-sm" style={{ color }}>
          #{schema?.displayName || tagName}
        </span>
      </div>

      {/* Fields */}
      {Object.keys(values).length > 0 && (
        <div className={cn(
          'p-3 space-y-2',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
        )}>
          {schema?.fields.map(field => {
            const value = values[field.name]
            if (value === undefined || value === null) return null

            return (
              <div key={field.name} className="text-sm">
                <div className={cn(
                  'text-xs mb-0.5',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {field.label}
                </div>
                <div className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                  {field.type === 'progress' ? (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex-1 h-2 rounded-full overflow-hidden',
                        isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                      )}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Number(value)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="text-xs">{String(value)}%</span>
                    </div>
                  ) : field.type === 'rating' ? (
                    <span className="text-amber-400">
                      {formatFieldValue(value, field.type)}
                    </span>
                  ) : field.type === 'checkbox' ? (
                    <span>
                      {value ? (
                        <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Icons.Circle className="w-4 h-4 text-zinc-500" />
                      )}
                    </span>
                  ) : (
                    formatFieldValue(value, field.type)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SupertagBadge
