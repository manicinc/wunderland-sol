'use client'

/**
 * CrosslinkExplorer - Rich backlink exploration panel
 * @module codex/ui/CrosslinkExplorer
 *
 * @description
 * Displays backlinks with context snippets, reference type indicators,
 * and optional mini graph visualization.
 *
 * Features:
 * - Context snippets showing where references occur
 * - Reference type badges (Link, Embed, Citation, Mirror)
 * - Click to navigate to referencing strand
 * - Stats summary by reference type
 * - Mini graph visualization
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Link2,
  FileText,
  Quote,
  Copy,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  Network,
  ArrowLeft,
  BookOpen,
  Hash,
  Code,
  Search,
  X,
  SortAsc,
  SortDesc,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getBacklinksForStrand,
} from '@/lib/transclusion/transclusionManager'
import type {
  BacklinkWithContext,
  BacklinkStats,
  ReferenceType,
} from '@/lib/transclusion/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface CrosslinkExplorerProps {
  /** Current strand path to show backlinks for */
  strandPath: string
  /** Callback when clicking a backlink to navigate */
  onNavigate?: (path: string, blockId?: string) => void
  /** Theme */
  theme?: string
  /** Whether to show the mini graph */
  showGraph?: boolean
  /** Unlinked mentions (potential links) */
  unlinkedMentions?: UnlinkedMention[]
  /** Called when user accepts an unlinked mention */
  onAcceptUnlinkedMention?: (mention: UnlinkedMention) => void
  /** Called when user dismisses an unlinked mention */
  onDismissUnlinkedMention?: (mention: UnlinkedMention) => void
}

/** Sorting options for backlinks */
type SortOption = 'count' | 'date' | 'name'

interface UnlinkedMention {
  /** The matched text in the content */
  matchedText: string
  /** The strand that could be linked */
  targetStrand: { path: string; title: string }
  /** Position in content where match starts */
  startIndex: number
  /** Confidence score (0-1) */
  confidence: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

const REFERENCE_TYPE_CONFIG: Record<ReferenceType, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  description: string
}> = {
  link: {
    label: 'Link',
    icon: Link2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Direct link to this content',
  },
  embed: {
    label: 'Embed',
    icon: Layers,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    description: 'Embedded inline in another document',
  },
  citation: {
    label: 'Citation',
    icon: Quote,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Cited as reference',
  },
  mirror: {
    label: 'Mirror',
    icon: Copy,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Live mirror (synced)',
  },
}

const BLOCK_TYPE_ICONS: Record<string, React.ElementType> = {
  paragraph: FileText,
  heading: Hash,
  code: Code,
  list: Layers,
  blockquote: Quote,
  table: FileText,
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Reference type badge component
 */
function ReferenceTypeBadge({
  type,
  isDark,
  showLabel = true,
}: {
  type: ReferenceType
  isDark: boolean
  showLabel?: boolean
}) {
  const config = REFERENCE_TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors',
        config.bgColor,
        config.color
      )}
      title={config.description}
      role="status"
      aria-label={`${config.label}: ${config.description}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

/**
 * Stats summary showing reference counts by type
 */
function StatsSummary({
  stats,
  isDark,
}: {
  stats: BacklinkStats
  isDark: boolean
}) {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-2 p-2 rounded-lg mb-3',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <div className="flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5 text-cyan-500" />
        <span className={cn(
          'text-sm font-semibold',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          {stats.total}
        </span>
        <span className="text-xs text-zinc-500">
          backlink{stats.total !== 1 ? 's' : ''}
        </span>
        <span className="text-zinc-400 mx-1">•</span>
        <span className="text-xs text-zinc-500">
          {stats.uniqueStrands} strand{stats.uniqueStrands !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1" />

      {/* Type breakdown */}
      <div className="flex items-center gap-1.5">
        {(Object.entries(stats.byType) as [ReferenceType, number][])
          .filter(([, count]) => count > 0)
          .map(([type, count]) => (
            <div key={type} className="flex items-center gap-0.5">
              <ReferenceTypeBadge type={type} isDark={isDark} showLabel={false} />
              <span className="text-[10px] text-zinc-500">{count}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/**
 * Simple backlinks graph visualization
 * Shows the current strand as a central node with incoming links
 */
function BacklinksGraph({
  strandPath,
  backlinks,
  isDark,
  onNodeClick,
}: {
  strandPath: string
  backlinks: BacklinkWithContext[]
  isDark: boolean
  onNodeClick?: (path: string) => void
}) {
  // Get unique source strands
  const uniqueSources = useMemo(() => {
    const map = new Map<string, { path: string; title: string; count: number }>()
    for (const bl of backlinks) {
      const existing = map.get(bl.sourceStrand.path)
      if (existing) {
        existing.count++
      } else {
        map.set(bl.sourceStrand.path, {
          path: bl.sourceStrand.path,
          title: bl.sourceStrand.title || bl.sourceStrand.path.split('/').pop() || 'Untitled',
          count: 1,
        })
      }
    }
    return Array.from(map.values()).slice(0, 8) // Max 8 nodes for clarity
  }, [backlinks])

  const currentTitle = strandPath.split('/').pop()?.replace('.md', '') || 'Current'

  // Calculate node positions in a radial layout
  const nodePositions = useMemo(() => {
    const center = { x: 50, y: 50 }
    const radius = 35
    const positions: Array<{ x: number; y: number; source: typeof uniqueSources[0] }> = []

    uniqueSources.forEach((source, idx) => {
      const angle = (idx / uniqueSources.length) * 2 * Math.PI - Math.PI / 2
      positions.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
        source,
      })
    })

    return positions
  }, [uniqueSources])

  if (uniqueSources.length === 0) return null

  return (
    <div className={cn(
      'relative h-40 rounded-lg border mb-3 overflow-hidden',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
    )}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ minHeight: '140px' }}
      >
        {/* Edges - lines from source nodes to center */}
        {nodePositions.map((pos, idx) => (
          <g key={`edge-${idx}`}>
            <line
              x1={pos.x}
              y1={pos.y}
              x2={50}
              y2={50}
              stroke={isDark ? '#3b82f6' : '#60a5fa'}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.6}
            />
            {/* Arrow marker pointing to center */}
            <polygon
              points={`${50 + (pos.x - 50) * 0.3 - 1},${50 + (pos.y - 50) * 0.3 - 1} ${50 + (pos.x - 50) * 0.3 + 1},${50 + (pos.y - 50) * 0.3} ${50 + (pos.x - 50) * 0.3 - 1},${50 + (pos.y - 50) * 0.3 + 1}`}
              fill={isDark ? '#3b82f6' : '#60a5fa'}
              opacity={0.8}
            />
          </g>
        ))}

        {/* Center node (current strand) */}
        <g>
          <circle
            cx={50}
            cy={50}
            r={8}
            fill={isDark ? '#22d3ee' : '#06b6d4'}
            stroke={isDark ? '#67e8f9' : '#22d3ee'}
            strokeWidth={1}
          />
          <text
            x={50}
            y={65}
            textAnchor="middle"
            fontSize={4}
            fill={isDark ? '#a1a1aa' : '#71717a'}
            fontWeight={600}
          >
            {currentTitle.substring(0, 12)}{currentTitle.length > 12 ? '…' : ''}
          </text>
        </g>

        {/* Source nodes */}
        {nodePositions.map((pos, idx) => (
          <g
            key={`node-${idx}`}
            className="cursor-pointer"
            onClick={() => onNodeClick?.(pos.source.path)}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={5 + Math.min(pos.source.count, 3)}
              fill={isDark ? '#3b82f6' : '#60a5fa'}
              stroke={isDark ? '#60a5fa' : '#93c5fd'}
              strokeWidth={0.5}
              className="transition-all hover:opacity-80"
            />
            {/* Count badge for multiple references */}
            {pos.source.count > 1 && (
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                fontSize={4}
                fill="white"
                fontWeight={600}
              >
                {pos.source.count}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className={cn(
        'absolute bottom-1 left-1 flex items-center gap-2 px-1.5 py-0.5 rounded text-[8px]',
        isDark ? 'bg-zinc-900/80 text-zinc-400' : 'bg-white/80 text-zinc-500'
      )}>
        <div className="flex items-center gap-0.5">
          <div className={cn('w-2 h-2 rounded-full', isDark ? 'bg-cyan-500' : 'bg-cyan-500')} />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className={cn('w-2 h-2 rounded-full', isDark ? 'bg-blue-500' : 'bg-blue-400')} />
          <span>Source ({uniqueSources.length})</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Single backlink item with context snippet
 */
function BacklinkItem({
  backlink,
  isDark,
  onClick,
}: {
  backlink: BacklinkWithContext
  isDark: boolean
  onClick?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const BlockIcon = BLOCK_TYPE_ICONS[backlink.sourceBlock?.blockType || 'paragraph'] || FileText

  // Highlight the reference within context snippet
  const highlightedContext = useMemo(() => {
    const snippet = backlink.backlink.contextSnippet || ''
    if (!snippet) return null

    // Look for the reference pattern and highlight it
    // This is a simplified version - actual highlighting would need the exact match position
    return snippet
  }, [backlink.backlink.contextSnippet])

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-200 overflow-hidden group',
        isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-cyan-600/50'
          : 'bg-white border-zinc-200 hover:border-cyan-400'
      )}
    >
      {/* Header - always visible */}
      <div
        className={cn(
          'flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-2 cursor-pointer touch-manipulation',
          isDark ? 'hover:bg-zinc-700/50 active:bg-zinc-700' : 'hover:bg-zinc-50 active:bg-zinc-100'
        )}
        onClick={onClick}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className={cn(
            'p-1 sm:p-0.5 rounded-md sm:rounded transition-colors touch-manipulation flex-shrink-0',
            isDark ? 'hover:bg-zinc-600 active:bg-zinc-500' : 'hover:bg-zinc-200 active:bg-zinc-300'
          )}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse context snippet' : 'Expand context snippet'}
          title={expanded ? 'Hide context' : 'Show context snippet'}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" aria-hidden="true" />
          )}
        </button>

        {/* Block type icon */}
        <BlockIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />

        {/* Source strand info */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-sm font-medium truncate block',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            {backlink.sourceStrand.title || backlink.sourceStrand.path}
          </span>
          {backlink.sourceStrand.weave && (
            <span className="text-[10px] text-zinc-500">
              {backlink.sourceStrand.weave}
              {backlink.sourceStrand.loom && ` / ${backlink.sourceStrand.loom}`}
            </span>
          )}
        </div>

        {/* Reference type badge - hidden on mobile, shown on hover on desktop */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          <ReferenceTypeBadge type="link" isDark={isDark} />
        </div>

        {/* Navigate icon */}
        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Context snippet - shown when expanded */}
      {expanded && highlightedContext && (
        <div className={cn(
          'px-3 pb-3 pt-1 border-t',
          isDark ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-100 bg-zinc-50'
        )}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Context</span>
          </div>
          <p className={cn(
            'text-xs leading-relaxed',
            isDark ? 'text-zinc-300' : 'text-zinc-600'
          )}>
            {highlightedContext}
          </p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function CrosslinkExplorer({
  strandPath,
  onNavigate,
  theme = 'light',
  showGraph = true,
  unlinkedMentions = [],
  onAcceptUnlinkedMention,
  onDismissUnlinkedMention,
}: CrosslinkExplorerProps) {
  const isDark = DARK_THEMES.includes(theme)

  // State
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([])
  const [stats, setStats] = useState<BacklinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMiniGraph, setShowMiniGraph] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('count')
  const [sortAsc, setSortAsc] = useState(false)
  const [showUnlinkedMentions, setShowUnlinkedMentions] = useState(true)

  // Filter backlinks by search query
  const filteredBacklinks = useMemo(() => {
    if (!searchQuery.trim()) return backlinks
    const query = searchQuery.toLowerCase()
    return backlinks.filter(bl => 
      bl.sourceStrand.path.toLowerCase().includes(query) ||
      bl.sourceStrand.title?.toLowerCase().includes(query) ||
      bl.backlink.contextSnippet?.toLowerCase().includes(query)
    )
  }, [backlinks, searchQuery])

  // Load backlinks
  useEffect(() => {
    if (!strandPath) {
      setBacklinks([])
      setStats(null)
      setLoading(false)
      return
    }

    loadBacklinks()
  }, [strandPath])

  const loadBacklinks = useCallback(async () => {
    if (!strandPath) return

    setLoading(true)
    setError(null)

    try {
      const linksData = await getBacklinksForStrand(strandPath)
      setBacklinks(linksData)

      // Compute stats from backlinks
      const uniqueStrands = new Set(linksData.map(bl => bl.sourceStrand.path)).size
      const byType: Record<ReferenceType, number> = { link: 0, embed: 0, citation: 0, mirror: 0 }
      // Default to 'link' type since we don't have reference type in BacklinkWithContext
      byType.link = linksData.length

      setStats({
        total: linksData.length,
        uniqueStrands,
        byType,
      })
    } catch (err) {
      console.error('[CrosslinkExplorer] Failed to load backlinks:', err)
      setError('Failed to load backlinks')
    } finally {
      setLoading(false)
    }
  }, [strandPath])

  // Group backlinks by source strand (uses filtered backlinks for search)
  const groupedBacklinks = useMemo(() => {
    const groups = new Map<string, BacklinkWithContext[]>()

    for (const bl of filteredBacklinks) {
      const key = bl.sourceStrand.path
      const existing = groups.get(key) || []
      existing.push(bl)
      groups.set(key, existing)
    }

    // Sort groups based on selected option
    const entries = Array.from(groups.entries())
    
    entries.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'count':
          comparison = b[1].length - a[1].length
          break
        case 'name':
          const titleA = a[1][0]?.sourceStrand.title || a[0]
          const titleB = b[1][0]?.sourceStrand.title || b[0]
          comparison = titleA.localeCompare(titleB)
          break
        case 'date':
          // Sort by most recent (if we have dates)
          comparison = b[1].length - a[1].length // Fallback to count
          break
      }
      return sortAsc ? -comparison : comparison
    })
    
    return entries
  }, [filteredBacklinks, sortBy, sortAsc])

  // Handle navigation
  const handleNavigate = useCallback((path: string, blockId?: string) => {
    onNavigate?.(path, blockId)
  }, [onNavigate])

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <RefreshCw className="w-5 h-5 animate-spin mb-2" />
        <span className="text-xs">Loading backlinks...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        <p className="text-sm mb-2">{error}</p>
        <button
          onClick={loadBacklinks}
          className="text-xs text-cyan-500 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }

  // Empty state
  if (backlinks.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <Link2 className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No backlinks yet</p>
        <p className="text-xs mt-1 max-w-[200px]">
          Other strands that reference this content will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <ArrowLeft className="w-4 h-4 text-cyan-500 flex-shrink-0" />
          <span className={cn(
            'text-sm font-semibold truncate',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            Backlinks
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0" role="toolbar" aria-label="Backlink view controls">
          {/* Toggle mini graph - hidden on very small screens */}
          {showGraph && (
            <button
              onClick={() => setShowMiniGraph(!showMiniGraph)}
              className={cn(
                'p-2 sm:p-1.5 rounded-lg sm:rounded transition-colors touch-manipulation',
                showMiniGraph
                  ? 'bg-cyan-500/20 text-cyan-500'
                  : isDark
                    ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400'
                    : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'
              )}
              title={showMiniGraph ? 'Hide backlink graph visualization' : 'Show backlink graph visualization'}
              aria-pressed={showMiniGraph}
              aria-label="Toggle graph view"
            >
              <Network className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Sort options */}
          <div className="flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={cn(
                'text-[10px] px-1.5 py-1 rounded border transition-colors cursor-pointer',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  : 'bg-white border-zinc-200 text-zinc-700'
              )}
              aria-label="Sort backlinks by"
            >
              <option value="count">By count</option>
              <option value="name">By name</option>
              <option value="date">By date</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className={cn(
                'p-1.5 rounded transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
              title={sortAsc ? 'Sort descending' : 'Sort ascending'}
              aria-label={sortAsc ? 'Sort descending' : 'Sort ascending'}
            >
              {sortAsc ? (
                <SortAsc className="w-3 h-3" aria-hidden="true" />
              ) : (
                <SortDesc className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={loadBacklinks}
            className={cn(
              'p-2 sm:p-1.5 rounded-lg sm:rounded transition-colors touch-manipulation',
              isDark
                ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400'
                : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'
            )}
            title="Refresh backlinks list"
            aria-label="Refresh backlinks"
          >
            <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Unlinked Mentions Section */}
      {unlinkedMentions.length > 0 && (
        <div className={cn(
          'mb-3 p-2 rounded-lg border',
          isDark
            ? 'bg-amber-900/10 border-amber-700/30'
            : 'bg-amber-50 border-amber-200'
        )}>
          <button
            onClick={() => setShowUnlinkedMentions(!showUnlinkedMentions)}
            className="w-full flex items-center gap-2 text-left"
            aria-expanded={showUnlinkedMentions}
          >
            <Sparkles className={cn('w-3.5 h-3.5', isDark ? 'text-amber-400' : 'text-amber-600')} />
            <span className={cn(
              'text-xs font-medium flex-1',
              isDark ? 'text-amber-300' : 'text-amber-700'
            )}>
              {unlinkedMentions.length} potential link{unlinkedMentions.length !== 1 ? 's' : ''} detected
            </span>
            {showUnlinkedMentions ? (
              <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>
          
          {showUnlinkedMentions && (
            <div className="mt-2 space-y-1">
              {unlinkedMentions.slice(0, 5).map((mention, i) => (
                <div
                  key={`${mention.startIndex}-${i}`}
                  className={cn(
                    'flex items-center gap-2 p-1.5 rounded text-xs',
                    isDark ? 'bg-zinc-800/50' : 'bg-white'
                  )}
                >
                  <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span className={cn(
                    'flex-1 truncate',
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  )}>
                    &quot;{mention.matchedText}&quot; → {mention.targetStrand.title}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {Math.round(mention.confidence * 100)}%
                  </span>
                  {onAcceptUnlinkedMention && (
                    <button
                      onClick={() => onAcceptUnlinkedMention(mention)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        isDark
                          ? 'hover:bg-emerald-900/30 text-emerald-400'
                          : 'hover:bg-emerald-100 text-emerald-600'
                      )}
                      title="Accept suggestion"
                      aria-label={`Link ${mention.matchedText} to ${mention.targetStrand.title}`}
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                  )}
                  {onDismissUnlinkedMention && (
                    <button
                      onClick={() => onDismissUnlinkedMention(mention)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        isDark
                          ? 'hover:bg-zinc-700 text-zinc-500'
                          : 'hover:bg-zinc-200 text-zinc-400'
                      )}
                      title="Dismiss suggestion"
                      aria-label={`Dismiss suggestion for ${mention.matchedText}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {unlinkedMentions.length > 5 && (
                <p className="text-[10px] text-zinc-500 text-center pt-1">
                  +{unlinkedMentions.length - 5} more suggestions
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search input */}
      {backlinks.length > 3 && (
        <div className={cn(
          'relative mb-2',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter backlinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border transition-colors',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-cyan-500'
                : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-400',
              'focus:outline-none focus:ring-1 focus:ring-cyan-500/20'
            )}
            aria-label="Filter backlinks by strand name or context"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors',
                isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
              )}
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Stats summary */}
      {stats && <StatsSummary stats={stats} isDark={isDark} />}

      {/* Mini backlinks graph */}
      {showMiniGraph && backlinks.length > 0 && (
        <BacklinksGraph
          strandPath={strandPath}
          backlinks={backlinks}
          isDark={isDark}
          onNodeClick={handleNavigate}
        />
      )}

      {/* Backlinks list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {groupedBacklinks.map(([strandPath, links]) => (
          <div key={strandPath}>
            {links.map((bl, idx) => (
              <BacklinkItem
                key={bl.backlink.id || idx}
                backlink={bl}
                isDark={isDark}
                onClick={() => handleNavigate(bl.sourceStrand.path, bl.backlink.referencingBlockId)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export type { CrosslinkExplorerProps }

