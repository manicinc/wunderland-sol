/**
 * Mention Badge Component
 * @module codex/ui/MentionBadge
 *
 * @description
 * Displays @mentions as interactive badges with hover cards.
 * Links to #person supertags when available.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Users, Folder, Tag, AtSign, ExternalLink } from 'lucide-react'
import {
  getMentionsOfEntity,
  type MentionEntityType,
  type Mention,
} from '@/lib/mentions'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface MentionBadgeProps {
  /** Mention text (without @ prefix) */
  mention: string
  /** Entity type override */
  entityType?: MentionEntityType
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click handler */
  onClick?: () => void
  /** Navigate to entity handler */
  onNavigate?: (strandPath: string) => void
  /** Show hover card with mentions */
  showHoverCard?: boolean
  /** Display size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const ENTITY_STYLES: Record<MentionEntityType, {
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  person: {
    icon: User,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  team: {
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
  },
  project: {
    icon: Folder,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  tag: {
    icon: Tag,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
  unknown: {
    icon: AtSign,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/15',
  },
}

function inferEntityType(mention: string): MentionEntityType {
  const text = mention.toLowerCase()

  if (text.includes('team') || text.includes('group')) return 'team'
  if (text.includes('project') || text.startsWith('prj-')) return 'project'
  if (['important', 'urgent', 'todo', 'followup'].includes(text)) return 'tag'

  return 'person'
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function MentionBadge({
  mention,
  entityType,
  theme = 'dark',
  onClick,
  onNavigate,
  showHoverCard = true,
  size = 'md',
  className,
}: MentionBadgeProps) {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isDark = theme === 'dark'
  const type = entityType || inferEntityType(mention)
  const style = ENTITY_STYLES[type]
  const Icon = style.icon

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

  // Load mentions on hover
  useEffect(() => {
    if (hovered && showHoverCard && mentions.length === 0) {
      setLoading(true)
      getMentionsOfEntity(mention)
        .then(setMentions)
        .finally(() => setLoading(false))
    }
  }, [hovered, showHoverCard, mention, mentions.length])

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium cursor-pointer relative',
        'transition-all ring-1 ring-inset',
        sizeClasses[size],
        style.bgColor,
        style.color,
        isDark ? 'ring-white/10' : 'ring-black/10',
        'hover:ring-2',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon className={iconSizes[size]} />
      <span>@{mention}</span>

      {/* Hover card */}
      <AnimatePresence>
        {hovered && showHoverCard && (
          <motion.div
            className={cn(
              'absolute left-0 top-full mt-1 z-50',
              'w-64 rounded-lg shadow-xl border p-3',
              isDark
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-zinc-200'
            )}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                style.bgColor
              )}>
                <Icon className={cn('w-4 h-4', style.color)} />
              </div>
              <div>
                <div className={cn(
                  'font-semibold text-sm',
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                )}>
                  @{mention}
                </div>
                <div className={cn(
                  'text-[10px] capitalize',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {type}
                </div>
              </div>
            </div>

            {/* Mentions list */}
            {loading ? (
              <div className={cn(
                'text-xs py-2 text-center',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                Loading mentions...
              </div>
            ) : mentions.length > 0 ? (
              <div className="space-y-1.5">
                <div className={cn(
                  'text-[10px] uppercase tracking-wide font-medium',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )}>
                  Mentioned in {mentions.length} place{mentions.length !== 1 ? 's' : ''}
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {mentions.slice(0, 5).map((m) => (
                    <button
                      key={m.id}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-md text-xs',
                        'transition-colors',
                        isDark
                          ? 'hover:bg-zinc-800 text-zinc-400'
                          : 'hover:bg-zinc-100 text-zinc-600'
                      )}
                      onClick={() => onNavigate?.(m.sourceStrandPath)}
                    >
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {m.sourceStrandPath.split('/').pop()}
                        </span>
                      </div>
                      {m.contextSnippet && (
                        <div className={cn(
                          'text-[10px] truncate mt-0.5',
                          isDark ? 'text-zinc-600' : 'text-zinc-400'
                        )}>
                          {m.contextSnippet}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {mentions.length > 5 && (
                  <div className={cn(
                    'text-[10px] text-center pt-1',
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  )}>
                    +{mentions.length - 5} more
                  </div>
                )}
              </div>
            ) : (
              <div className={cn(
                'text-xs py-2 text-center',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                No other mentions found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

export default MentionBadge
