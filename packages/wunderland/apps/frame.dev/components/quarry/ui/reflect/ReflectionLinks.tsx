/**
 * ReflectionLinks - Display links and backlinks for reflections
 * @module components/quarry/ui/ReflectionLinks
 *
 * Shows:
 * - Outgoing links: What this reflection links to
 * - Backlinks: What links to this reflection
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import {
  getLinksFromSource,
  getBacklinks,
  type ReflectionLink,
  type Backlink,
} from '@/lib/reflect/reflectionLinks'
import { parseDateKey, formatDateDisplay } from '@/lib/reflect/reflectionStore'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionLinksProps {
  /** The reflection date key */
  dateKey: string
  /** Called when a link is clicked */
  onNavigate?: (type: 'reflection' | 'strand', id: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Whether to show as collapsed by default */
  defaultCollapsed?: boolean
  /** Class name */
  className?: string
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/** Single link item */
function LinkItem({
  type,
  targetId,
  linkText,
  context,
  direction,
  onNavigate,
  isDark,
}: {
  type: 'reflection' | 'strand'
  targetId: string
  linkText?: string
  context?: string
  direction: 'outgoing' | 'incoming'
  onNavigate?: (type: 'reflection' | 'strand', id: string) => void
  isDark?: boolean
}) {
  const isReflection = type === 'reflection'

  // Format display text
  let displayText = linkText || targetId
  if (isReflection) {
    try {
      const date = parseDateKey(targetId)
      displayText = formatDateDisplay(date)
    } catch {
      displayText = targetId
    }
  }

  return (
    <button
      onClick={() => onNavigate?.(type, targetId)}
      className={cn(
        'w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors group',
        isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'mt-0.5 p-1 rounded',
        isReflection
          ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
          : isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
      )}>
        {isReflection ? (
          <Calendar className="w-3 h-3" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {direction === 'incoming' && (
            <ArrowLeft className={cn('w-3 h-3', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          )}
          <span className={cn(
            'text-xs font-medium truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            {displayText}
          </span>
          {direction === 'outgoing' && (
            <ArrowRight className={cn('w-3 h-3', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          )}
        </div>

        {context && (
          <p className={cn(
            'text-[10px] mt-0.5 line-clamp-2',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {context}
          </p>
        )}
      </div>

      {/* External link indicator */}
      <ExternalLink className={cn(
        'w-3 h-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )} />
    </button>
  )
}

/** Section header */
function SectionHeader({
  title,
  icon: Icon,
  count,
  isOpen,
  onToggle,
  isDark,
}: {
  title: string
  icon: React.ElementType
  count: number
  isOpen: boolean
  onToggle: () => void
  isDark?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
        isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', isDark ? 'text-purple-400' : 'text-purple-600')} />
        <span className={cn('text-xs font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {title}
        </span>
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
        )}>
          {count}
        </span>
      </div>
      {isOpen ? (
        <ChevronUp className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      ) : (
        <ChevronDown className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      )}
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReflectionLinks({
  dateKey,
  onNavigate,
  isDark,
  defaultCollapsed = true,
  className,
}: ReflectionLinksProps) {
  const [outgoingLinks, setOutgoingLinks] = useState<ReflectionLink[]>([])
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showOutgoing, setShowOutgoing] = useState(!defaultCollapsed)
  const [showBacklinks, setShowBacklinks] = useState(!defaultCollapsed)

  // Load links when dateKey changes
  useEffect(() => {
    async function loadLinks() {
      setIsLoading(true)
      try {
        const [outgoing, incoming] = await Promise.all([
          getLinksFromSource('reflection', dateKey),
          getBacklinks('reflection', dateKey),
        ])
        setOutgoingLinks(outgoing)
        setBacklinks(incoming)
      } catch (error) {
        console.error('[ReflectionLinks] Failed to load links:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLinks()
  }, [dateKey])

  const totalLinks = outgoingLinks.length + backlinks.length

  if (isLoading) {
    return (
      <div className={cn('p-3', className)}>
        <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Loading links...
        </div>
      </div>
    )
  }

  if (totalLinks === 0) {
    return null // Don't show if no links
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white', className)}>
      {/* Header */}
      <div className={cn(
        'px-3 py-2 border-b flex items-center gap-2',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Link2 className={cn('w-4 h-4', isDark ? 'text-purple-400' : 'text-purple-600')} />
        <span className={cn('text-xs font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          Linked Items
        </span>
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
        )}>
          {totalLinks}
        </span>
      </div>

      {/* Content */}
      <div className="p-2 space-y-1">
        {/* Outgoing Links */}
        {outgoingLinks.length > 0 && (
          <div>
            <SectionHeader
              title="Links to"
              icon={ArrowRight}
              count={outgoingLinks.length}
              isOpen={showOutgoing}
              onToggle={() => setShowOutgoing(!showOutgoing)}
              isDark={isDark}
            />
            <AnimatePresence>
              {showOutgoing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="ml-2 mt-1 space-y-0.5">
                    {outgoingLinks.map((link) => (
                      <LinkItem
                        key={link.id}
                        type={link.targetType}
                        targetId={link.targetId}
                        linkText={link.linkText}
                        context={link.context}
                        direction="outgoing"
                        onNavigate={onNavigate}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div>
            <SectionHeader
              title="Linked from"
              icon={ArrowLeft}
              count={backlinks.length}
              isOpen={showBacklinks}
              onToggle={() => setShowBacklinks(!showBacklinks)}
              isDark={isDark}
            />
            <AnimatePresence>
              {showBacklinks && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="ml-2 mt-1 space-y-0.5">
                    {backlinks.map((link, idx) => (
                      <LinkItem
                        key={`${link.sourceType}-${link.sourceId}-${idx}`}
                        type={link.sourceType}
                        targetId={link.sourceId}
                        linkText={link.linkText}
                        context={link.context}
                        direction="incoming"
                        onNavigate={onNavigate}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

/**
 * Compact variant for sidebar use
 */
export function ReflectionLinksCompact({
  dateKey,
  onNavigate,
  isDark,
}: {
  dateKey: string
  onNavigate?: (type: 'reflection' | 'strand', id: string) => void
  isDark?: boolean
}) {
  const [outgoingLinks, setOutgoingLinks] = useState<ReflectionLink[]>([])
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLinks() {
      setIsLoading(true)
      try {
        const [outgoing, incoming] = await Promise.all([
          getLinksFromSource('reflection', dateKey),
          getBacklinks('reflection', dateKey),
        ])
        setOutgoingLinks(outgoing)
        setBacklinks(incoming)
      } catch (error) {
        console.error('[ReflectionLinks] Failed to load links:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLinks()
  }, [dateKey])

  const totalLinks = outgoingLinks.length + backlinks.length

  if (isLoading || totalLinks === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Link2 className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
        {totalLinks} link{totalLinks !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
