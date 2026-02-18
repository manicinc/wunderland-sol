/**
 * Unified Tag Badge Component
 * @module codex/ui/TagBadge
 *
 * @description
 * Unified tag display - lightweight tags by default, supertags when schema exists.
 * Tags are opt-in to become supertags. This component only READS schemas,
 * it never auto-creates them. Promotion to supertag is done explicitly via
 * the sidebar's "Convert to Supertag" action.
 *
 * - Lightweight tag: Simple pill with hash icon, muted color
 * - Supertag: Custom icon, custom color, ring indicator, field count tooltip
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import { Tag, Hash, ChevronRight } from 'lucide-react'
import { getSchemaByTagName, type SupertagSchema } from '@/lib/supertags'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TagBadgeProps {
  /** Tag name (with or without # prefix) */
  tag: string
  /** Block ID for supertag field values */
  blockId?: string
  /** Display size */
  size?: 'sm' | 'md' | 'lg'
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click handler */
  onClick?: () => void
  /** Show schema indicator for supertags */
  showSchemaIndicator?: boolean
  /** Allow editing supertag fields */
  editable?: boolean
  /** Callback when supertag fields are edited */
  onEdit?: (schema: SupertagSchema) => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Hash
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = IconsRecord[iconName]
  return Icon || Hash
}

// Color palette for tags without schemas
const TAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#84cc16', // lime
]

function getTagColor(tag: string): string {
  // Generate consistent color from tag name
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function TagBadge({
  tag,
  blockId,
  size = 'md',
  theme = 'dark',
  onClick,
  showSchemaIndicator = true,
  editable = false,
  onEdit,
  className,
}: TagBadgeProps) {
  const [schema, setSchema] = useState<SupertagSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(false)

  const isDark = theme === 'dark'

  // Normalize tag name (remove # if present)
  const tagName = tag.startsWith('#') ? tag.slice(1) : tag
  const displayTag = `#${tagName}`

  // Check if tag has a supertag schema (read-only - no auto-creation)
  // Tags without schemas render as lightweight tags
  useEffect(() => {
    let cancelled = false

    async function checkSchema() {
      try {
        // Only check if schema exists - don't create one
        const schemaData = await getSchemaByTagName(tagName)

        if (!cancelled) {
          // Schema can be null for lightweight tags - that's expected
          setSchema(schemaData)
        }
      } catch (error) {
        // Failed to check schema - show as lightweight tag
        console.warn(`Failed to check schema for tag "${tagName}":`, error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkSchema()
    return () => { cancelled = true }
  }, [tagName])

  // Size classes
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  }

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  }

  // Get display properties
  const hasSchema = schema !== null
  const Icon = hasSchema ? getIconComponent(schema.icon) : Hash
  const color = hasSchema ? (schema.color || '#71717a') : getTagColor(tagName)

  if (loading) {
    return (
      <span className={cn(
        'inline-flex items-center rounded-full animate-pulse',
        sizeClasses[size],
        isDark ? 'bg-zinc-800' : 'bg-zinc-200',
        className
      )}>
        <span className={cn('rounded-full bg-zinc-500', iconSizes[size])} />
        <span className="w-10 h-3 rounded bg-zinc-500" />
      </span>
    )
  }

  return (
    <motion.span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all relative',
        sizeClasses[size],
        onClick && 'cursor-pointer',
        hasSchema && 'ring-1 ring-inset',
        className
      )}
      style={{
        backgroundColor: color + '20',
        color: color,
        ...(hasSchema && { ['--tw-ring-color' as string]: color + '40' }),
      }}
      onClick={() => {
        if (editable && hasSchema && onEdit) {
          onEdit(schema)
        } else if (onClick) {
          onClick()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className={iconSizes[size]} />
      <span>{displayTag}</span>

      {/* Schema indicator - shows this is a supertag with fields */}
      {showSchemaIndicator && hasSchema && (
        <span
          className={cn(
            'rounded-full flex items-center justify-center',
            size === 'sm' ? 'w-3 h-3 ml-0.5' : 'w-4 h-4 ml-1'
          )}
          style={{ backgroundColor: color + '30' }}
          title={`${schema.fields.length} fields`}
        >
          <ChevronRight className={size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
        </span>
      )}

      {/* Hover tooltip for supertags */}
      <AnimatePresence>
        {hovered && hasSchema && (
          <motion.div
            className={cn(
              'absolute left-0 top-full mt-1 z-50 pointer-events-none',
              'w-48 rounded-lg shadow-xl border p-2',
              isDark
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-zinc-200'
            )}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="font-semibold text-xs" style={{ color }}>
                {schema.displayName}
              </span>
            </div>
            {schema.description && (
              <p className={cn(
                'text-[10px] mb-1.5',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}>
                {schema.description}
              </p>
            )}
            <div className={cn(
              'text-[10px]',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}:
              {' '}
              {schema.fields.slice(0, 3).map(f => f.label).join(', ')}
              {schema.fields.length > 3 && '...'}
            </div>
            {editable && (
              <div className={cn(
                'text-[10px] mt-1.5 pt-1.5 border-t',
                isDark ? 'border-zinc-700 text-cyan-400' : 'border-zinc-200 text-cyan-600'
              )}>
                Click to edit fields
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAG LIST COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export interface TagListProps {
  /** Array of tags (with or without # prefix) */
  tags: string[]
  /** Block ID for supertag values */
  blockId?: string
  /** Display size */
  size?: 'sm' | 'md' | 'lg'
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click handler for individual tags */
  onTagClick?: (tag: string) => void
  /** Edit handler for supertags */
  onTagEdit?: (tag: string, schema: SupertagSchema) => void
  /** Max tags to show before "and X more" */
  maxVisible?: number
  /** Additional class names */
  className?: string
}

export function TagList({
  tags,
  blockId,
  size = 'md',
  theme = 'dark',
  onTagClick,
  onTagEdit,
  maxVisible = 10,
  className,
}: TagListProps) {
  const isDark = theme === 'dark'
  const visibleTags = tags.slice(0, maxVisible)
  const hiddenCount = tags.length - maxVisible

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          blockId={blockId}
          size={size}
          theme={theme}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          editable={!!onTagEdit}
          onEdit={onTagEdit ? (schema) => onTagEdit(tag, schema) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full font-medium',
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
        )}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  )
}

export default TagBadge
