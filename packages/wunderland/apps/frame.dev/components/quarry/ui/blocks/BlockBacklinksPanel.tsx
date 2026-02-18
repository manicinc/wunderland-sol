/**
 * Block Backlinks Panel
 * @module codex/ui/BlockBacklinksPanel
 *
 * @description
 * Sidebar panel showing all backlinks to a strand or specific block.
 * Groups backlinks by source strand with expandable context.
 *
 * @features
 * - Grouped by source strand
 * - Expandable context snippets
 * - Reference type badges
 * - Click to navigate
 * - Search/filter backlinks
 * - Stats overview
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  FileText,
  Quote,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Clock,
  Hash,
  ArrowUpRight,
  Filter,
  X,
  Link,
  Layers,
} from 'lucide-react'
import {
  getBacklinksForStrand,
  getBacklinkStats,
  type BacklinkWithContext,
  type BacklinkStats,
  type ReferenceType,
} from '@/lib/transclusion'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface BlockBacklinksPanelProps {
  /** Strand path to show backlinks for */
  strandPath: string
  /** Optional specific block ID */
  blockId?: string
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when clicking to navigate */
  onNavigate?: (strandPath: string, blockId?: string) => void
  /** Whether panel is collapsed */
  collapsed?: boolean
  /** Callback to toggle collapse */
  onToggleCollapse?: () => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

const referenceTypeConfig: Record<ReferenceType, {
  icon: typeof Link2
  label: string
  color: string
}> = {
  link: { icon: Link2, label: 'Link', color: 'text-blue-400 bg-blue-500/20' },
  embed: { icon: FileText, label: 'Embed', color: 'text-violet-400 bg-violet-500/20' },
  citation: { icon: Quote, label: 'Citation', color: 'text-amber-400 bg-amber-500/20' },
  mirror: { icon: RefreshCw, label: 'Mirror', color: 'text-emerald-400 bg-emerald-500/20' },
}

interface BacklinkGroupProps {
  strandPath: string
  strandTitle: string
  weave?: string
  backlinks: BacklinkWithContext[]
  theme: 'light' | 'dark'
  onNavigate?: (strandPath: string, blockId?: string) => void
}

function BacklinkGroup({
  strandPath,
  strandTitle,
  weave,
  backlinks,
  theme,
  onNavigate,
}: BacklinkGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const isDark = theme === 'dark'

  return (
    <div className={cn(
      'rounded-lg overflow-hidden',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
    )}>
      {/* Group header */}
      <button
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'hover:bg-white/5 transition-colors'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
        <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-sm font-medium truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            {strandTitle}
          </div>
          {weave && (
            <div className="text-xs text-zinc-500 truncate">
              {weave}
            </div>
          )}
        </div>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
        )}>
          {backlinks.length}
        </span>
      </button>

      {/* Expanded backlinks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'border-t px-3 py-2 space-y-2',
              isDark ? 'border-zinc-700/50' : 'border-zinc-200'
            )}>
              {backlinks.map(bl => (
                <BacklinkItem
                  key={bl.backlink.id}
                  backlink={bl}
                  theme={theme}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface BacklinkItemProps {
  backlink: BacklinkWithContext
  theme: 'light' | 'dark'
  onNavigate?: (strandPath: string, blockId?: string) => void
}

function BacklinkItem({ backlink, theme, onNavigate }: BacklinkItemProps) {
  const isDark = theme === 'dark'

  return (
    <button
      className={cn(
        'w-full text-left p-2 rounded-lg',
        'hover:bg-white/5 transition-colors',
        'group'
      )}
      onClick={() => onNavigate?.(
        backlink.backlink.referencingStrandPath,
        backlink.backlink.referencingBlockId
      )}
    >
      {/* Context snippet */}
      {backlink.backlink.contextSnippet && (
        <div className={cn(
          'text-xs leading-relaxed mb-1',
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        )}>
          "{backlink.backlink.contextSnippet.slice(0, 100)}
          {backlink.backlink.contextSnippet.length > 100 && '...'}"
        </div>
      )}

      {/* Block info */}
      {backlink.sourceBlock && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Hash className="w-3 h-3" />
          <span className="truncate">{backlink.sourceBlock.blockType}</span>
        </div>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
        <Clock className="w-3 h-3" />
        <span>
          {formatDistanceToNow(new Date(backlink.referencedAt), { addSuffix: true })}
        </span>
        <ArrowUpRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function BlockBacklinksPanel({
  strandPath,
  blockId,
  theme = 'dark',
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  className,
}: BlockBacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([])
  const [stats, setStats] = useState<BacklinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ReferenceType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const isDark = theme === 'dark'

  // Load backlinks
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const [backlinkData, statsData] = await Promise.all([
          getBacklinksForStrand(strandPath),
          blockId ? getBacklinkStats(blockId) : null,
        ])

        if (cancelled) return

        setBacklinks(backlinkData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load backlinks:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [strandPath, blockId])

  // Group backlinks by source strand
  const groupedBacklinks = useMemo(() => {
    // Filter by search query
    let filtered = backlinks
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = backlinks.filter(bl =>
        bl.sourceStrand.title.toLowerCase().includes(query) ||
        bl.backlink.contextSnippet?.toLowerCase().includes(query)
      )
    }

    // Group by source strand
    const groups = new Map<string, {
      strandPath: string
      strandTitle: string
      weave?: string
      backlinks: BacklinkWithContext[]
    }>()

    for (const bl of filtered) {
      const key = bl.sourceStrand.path
      if (!groups.has(key)) {
        groups.set(key, {
          strandPath: bl.sourceStrand.path,
          strandTitle: bl.sourceStrand.title,
          weave: bl.sourceStrand.weave,
          backlinks: [],
        })
      }
      groups.get(key)!.backlinks.push(bl)
    }

    // Sort by backlink count
    return Array.from(groups.values()).sort((a, b) =>
      b.backlinks.length - a.backlinks.length
    )
  }, [backlinks, searchQuery])

  // Collapsed state
  if (collapsed) {
    return (
      <button
        className={cn(
          'flex items-center justify-center p-2 rounded-lg',
          isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200',
          className
        )}
        onClick={onToggleCollapse}
        title={`${backlinks.length} backlinks`}
      >
        <Link2 className="w-4 h-4" />
        {backlinks.length > 0 && (
          <span className="ml-1 text-xs font-medium">{backlinks.length}</span>
        )}
      </button>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Link2 className="w-5 h-5 text-zinc-500" />
        <h2 className={cn(
          'text-sm font-semibold flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          Backlinks
        </h2>
        {stats && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
          )}>
            {stats.total} total
          </span>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'p-1 rounded hover:bg-white/10',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-2 border-b',
          isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
        )}>
          <div className="flex items-center gap-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              {stats.uniqueStrands} strands
            </span>
          </div>
          {Object.entries(stats.byType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => {
              const config = referenceTypeConfig[type as ReferenceType]
              const Icon = config.icon
              return (
                <div key={type} className="flex items-center gap-1 text-xs">
                  <Icon className={cn('w-3.5 h-3.5', config.color.split(' ')[0])} />
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    {count}
                  </span>
                </div>
              )
            })}
        </div>
      )}

      {/* Search bar */}
      <div className={cn(
        'px-4 py-2 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}>
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search backlinks..."
            className={cn(
              'flex-1 bg-transparent text-sm outline-none',
              isDark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0.5 rounded hover:bg-white/10"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : groupedBacklinks.length === 0 ? (
          <div className="text-center py-8">
            <Link className={cn(
              'w-8 h-8 mx-auto mb-2',
              isDark ? 'text-zinc-700' : 'text-zinc-300'
            )} />
            <p className={cn(
              'text-sm',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {searchQuery ? 'No matching backlinks' : 'No backlinks yet'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Reference this strand from other documents to see backlinks
            </p>
          </div>
        ) : (
          groupedBacklinks.map(group => (
            <BacklinkGroup
              key={group.strandPath}
              {...group}
              theme={theme}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default BlockBacklinksPanel
