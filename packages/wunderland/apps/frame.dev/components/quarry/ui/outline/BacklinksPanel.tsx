/**
 * Backlinks Panel Component
 * @module codex/ui/outline/BacklinksPanel
 *
 * Shows documents linking to the current strand with:
 * - Context preview around the link
 * - Grouped by source document
 * - Click to navigate to source
 * - Link type indicators (reference, mention, related)
 */

'use client'

import React, { useMemo, useState } from 'react'
import {
  Link2,
  ChevronRight,
  ChevronDown,
  FileText,
  Hash,
  ArrowUpRight,
  MessageSquare,
  Bookmark,
  Search,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type BacklinkType = 'reference' | 'mention' | 'related' | 'embed'

export interface Backlink {
  /** Unique ID for the backlink */
  id: string
  /** Source document path */
  sourcePath: string
  /** Source document title */
  sourceTitle: string
  /** Type of link */
  type: BacklinkType
  /** Context snippet around the link */
  context: string
  /** Line number in source document */
  lineNumber?: number
  /** Block ID in source document */
  blockId?: string
  /** Date the link was created/detected */
  createdAt?: string
}

export interface BacklinkGroup {
  sourcePath: string
  sourceTitle: string
  backlinks: Backlink[]
}

export interface BacklinksPanelProps {
  /** Current document path */
  currentPath: string
  /** List of backlinks to this document */
  backlinks: Backlink[]
  /** Callback when clicking a backlink to navigate */
  onNavigate: (path: string, blockId?: string) => void
  /** Theme */
  theme?: string
  /** Maximum context length to display */
  maxContextLength?: number
  /** Whether backlinks are loading */
  loading?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const LINK_TYPE_CONFIG: Record<BacklinkType, { icon: React.ElementType; color: string; label: string }> = {
  reference: { icon: Link2, color: 'text-blue-500', label: 'Reference' },
  mention: { icon: MessageSquare, color: 'text-amber-500', label: 'Mention' },
  related: { icon: Bookmark, color: 'text-violet-500', label: 'Related' },
  embed: { icon: Hash, color: 'text-emerald-500', label: 'Embed' },
}

/**
 * Group backlinks by source document
 */
function groupBacklinks(backlinks: Backlink[]): BacklinkGroup[] {
  const groups = new Map<string, BacklinkGroup>()
  
  for (const backlink of backlinks) {
    const existing = groups.get(backlink.sourcePath)
    if (existing) {
      existing.backlinks.push(backlink)
    } else {
      groups.set(backlink.sourcePath, {
        sourcePath: backlink.sourcePath,
        sourceTitle: backlink.sourceTitle,
        backlinks: [backlink],
      })
    }
  }
  
  // Sort by number of backlinks (most first)
  return Array.from(groups.values()).sort((a, b) => b.backlinks.length - a.backlinks.length)
}

/**
 * Truncate and highlight context
 */
function formatContext(context: string, maxLength: number): string {
  if (context.length <= maxLength) return context
  return context.slice(0, maxLength - 3) + '...'
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface BacklinkItemProps {
  backlink: Backlink
  isDark: boolean
  maxContextLength: number
  onNavigate: (path: string, blockId?: string) => void
}

function BacklinkItem({ backlink, isDark, maxContextLength, onNavigate }: BacklinkItemProps) {
  const config = LINK_TYPE_CONFIG[backlink.type]
  const Icon = config.icon
  
  return (
    <button
      onClick={() => onNavigate(backlink.sourcePath, backlink.blockId)}
      className={`
        w-full text-left p-2 rounded-lg transition-all group
        ${isDark
          ? 'hover:bg-zinc-800/70 active:bg-zinc-700/70'
          : 'hover:bg-zinc-100 active:bg-zinc-200'
        }
      `}
    >
      {/* Link type indicator */}
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className={`text-[10px] font-medium ${config.color}`}>
          {config.label}
        </span>
        {backlink.lineNumber && (
          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            L{backlink.lineNumber}
          </span>
        )}
        <ArrowUpRight className={`
          w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity
          ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
        `} />
      </div>
      
      {/* Context preview */}
      <p className={`
        text-[11px] leading-relaxed line-clamp-2
        ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
      `}>
        {formatContext(backlink.context, maxContextLength)}
      </p>
    </button>
  )
}

interface BacklinkGroupItemProps {
  group: BacklinkGroup
  isDark: boolean
  maxContextLength: number
  onNavigate: (path: string, blockId?: string) => void
  defaultExpanded?: boolean
}

function BacklinkGroupItem({
  group,
  isDark,
  maxContextLength,
  onNavigate,
  defaultExpanded = true,
}: BacklinkGroupItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  return (
    <div className={`
      rounded-lg border overflow-hidden
      ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}
    `}>
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
          ${isDark
            ? 'hover:bg-zinc-800/50'
            : 'hover:bg-zinc-50'
          }
        `}
      >
        {expanded ? (
          <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        )}
        <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <span className={`
          flex-1 text-xs font-medium truncate
          ${isDark ? 'text-zinc-200' : 'text-zinc-700'}
        `}>
          {group.sourceTitle}
        </span>
        <span className={`
          text-[10px] px-1.5 py-0.5 rounded-full
          ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
        `}>
          {group.backlinks.length}
        </span>
      </button>
      
      {/* Backlink items */}
      {expanded && (
        <div className={`
          px-2 pb-2 space-y-1 border-t
          ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}
        `}>
          {group.backlinks.map((backlink) => (
            <BacklinkItem
              key={backlink.id}
              backlink={backlink}
              isDark={isDark}
              maxContextLength={maxContextLength}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BacklinksPanel({
  currentPath: _currentPath,
  backlinks,
  onNavigate,
  theme = 'light',
  maxContextLength = 100,
  loading = false,
}: BacklinksPanelProps) {
  const isDark = theme?.includes('dark')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Group backlinks by source document
  const groupedBacklinks = useMemo(() => groupBacklinks(backlinks), [backlinks])
  
  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedBacklinks
    
    const query = searchQuery.toLowerCase()
    return groupedBacklinks.filter(group =>
      group.sourceTitle.toLowerCase().includes(query) ||
      group.backlinks.some(bl => bl.context.toLowerCase().includes(query))
    )
  }, [groupedBacklinks, searchQuery])
  
  // Calculate stats
  const stats = useMemo(() => ({
    total: backlinks.length,
    documents: groupedBacklinks.length,
    references: backlinks.filter(bl => bl.type === 'reference').length,
    mentions: backlinks.filter(bl => bl.type === 'mention').length,
  }), [backlinks, groupedBacklinks])
  
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className={`h-4 w-24 rounded animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-16 rounded-lg animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
        ))}
      </div>
    )
  }
  
  if (backlinks.length === 0) {
    return (
      <div className={`
        flex flex-col items-center justify-center p-6 text-center
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <div className={`
          p-3 rounded-xl mb-4
          ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'}
        `}>
          <Link2 className="w-8 h-8 opacity-50" />
        </div>
        <p className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          No backlinks yet
        </p>
        <p className="text-xs opacity-70 mb-3 max-w-[200px]">
          Other documents that link to this strand will appear here
        </p>
        <p className={`text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
          💡 Tip: Use [[wikilinks]] to connect strands
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-3">
      {/* Header with stats */}
      <div className="flex items-center gap-2 px-2">
        <Link2 className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          Backlinks
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <span className={`
            text-[10px] px-1.5 py-0.5 rounded
            ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}
          `}>
            {stats.total} links
          </span>
          <span className={`
            text-[10px] px-1.5 py-0.5 rounded
            ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
          `}>
            {stats.documents} docs
          </span>
        </div>
      </div>
      
      {/* Search (show if more than 5 backlinks) */}
      {backlinks.length > 5 && (
        <div className="px-2">
          <div className={`
            flex items-center gap-2 px-2 py-1.5 rounded-lg border
            ${isDark
              ? 'border-zinc-700 bg-zinc-800/50'
              : 'border-zinc-200 bg-zinc-50'
            }
          `}>
            <Search className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter backlinks..."
              className={`
                flex-1 bg-transparent text-xs outline-none
                ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-700 placeholder:text-zinc-400'}
              `}
            />
          </div>
        </div>
      )}
      
      {/* Grouped backlinks */}
      <div className="px-2 space-y-2">
        {filteredGroups.length === 0 ? (
          <p className={`text-xs text-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            No matches found
          </p>
        ) : (
          filteredGroups.map((group) => (
            <BacklinkGroupItem
              key={group.sourcePath}
              group={group}
              isDark={isDark}
              maxContextLength={maxContextLength}
              onNavigate={onNavigate}
              defaultExpanded={filteredGroups.length <= 3}
            />
          ))
        )}
      </div>
    </div>
  )
}

