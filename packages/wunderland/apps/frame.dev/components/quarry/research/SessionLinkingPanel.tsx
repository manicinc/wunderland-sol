/**
 * Session Linking Panel
 * @module components/quarry/research/SessionLinkingPanel
 *
 * Panel for viewing, creating, and managing links between research sessions.
 * Shows related session suggestions and allows manual linking.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Unlink,
  GitBranch,
  GitMerge,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import {
  linkSessions,
  unlinkSessions,
  getLinkedSessionsWithDetails,
  suggestRelatedSessions,
  branchSession,
  mergeSessions,
  getChildSessions,
  getSessionLineage,
} from '@/lib/research/sessionLinking'
import { getAllSessions, getSession } from '@/lib/research/sessions'
import type { ResearchSession, SessionLink, SessionLinkType } from '@/lib/research/types'

// ============================================================================
// TYPES
// ============================================================================

interface SessionLinkingPanelProps {
  /** The current session */
  session: ResearchSession
  /** Callback when session changes */
  onSessionChange?: (session: ResearchSession) => void
  /** Callback to navigate to a session */
  onNavigateToSession?: (sessionId: string) => void
}

interface LinkedSessionItem {
  session: ResearchSession
  link: SessionLink
}

interface SuggestionItem {
  session: ResearchSession
  score: number
  reasons: string[]
}

// ============================================================================
// LINK TYPE BADGE
// ============================================================================

function LinkTypeBadge({ type }: { type: SessionLinkType }) {
  const config = {
    related: { label: 'Related', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    continuation: { label: 'Continuation', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    subtopic: { label: 'Subtopic', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
    merged: { label: 'Merged', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  }

  const { label, color } = config[type]

  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${color}`}>
      {label}
    </span>
  )
}

// ============================================================================
// SESSION CARD
// ============================================================================

function SessionCard({
  session,
  linkType,
  onUnlink,
  onNavigate,
  showUnlink = true,
}: {
  session: ResearchSession
  linkType?: SessionLinkType
  onUnlink?: () => void
  onNavigate?: () => void
  showUnlink?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {session.topic}
          </h4>
          {linkType && <LinkTypeBadge type={linkType} />}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {session.savedResults.length} results · {new Date(session.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
            title="Open session"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        {showUnlink && onUnlink && (
          <button
            onClick={onUnlink}
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Unlink session"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUGGESTION CARD
// ============================================================================

function SuggestionCard({
  suggestion,
  onLink,
  linking,
}: {
  suggestion: SuggestionItem
  onLink: (type: SessionLinkType) => void
  linking: boolean
}) {
  const [showTypes, setShowTypes] = useState(false)

  return (
    <div className="p-3 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/10 rounded-lg border border-violet-200 dark:border-violet-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {suggestion.session.topic}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-violet-600 dark:text-violet-400">
              {Math.round(suggestion.score * 100)}% match
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-500 truncate">
              {suggestion.reasons[0]}
            </span>
          </div>
        </div>

        {!showTypes ? (
          <button
            onClick={() => setShowTypes(true)}
            disabled={linking}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded transition-colors"
          >
            {linking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Link2 className="w-3 h-3" />
                Link
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            {(['related', 'continuation', 'subtopic'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onLink(type)}
                disabled={linking}
                className="px-2 py-1 text-[10px] font-medium text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded capitalize transition-colors"
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setShowTypes(false)}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SessionLinkingPanel({
  session,
  onSessionChange,
  onNavigateToSession,
}: SessionLinkingPanelProps) {
  const [linkedSessions, setLinkedSessions] = useState<LinkedSessionItem[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [childSessions, setChildSessions] = useState<ResearchSession[]>([])
  const [lineage, setLineage] = useState<ResearchSession[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ResearchSession[]>([])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [linked, suggested, children, sessionLineage] = await Promise.all([
        getLinkedSessionsWithDetails(session.id),
        suggestRelatedSessions(session.id),
        getChildSessions(session.id),
        getSessionLineage(session.id),
      ])

      setLinkedSessions(linked)
      setSuggestions(suggested)
      setChildSessions(children)
      setLineage(sessionLineage.slice(0, -1)) // Exclude current session
    } catch (error) {
      console.error('[SessionLinkingPanel] Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [session.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Search for sessions to link
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const search = async () => {
      const all = await getAllSessions()
      const linkedIds = new Set(linkedSessions.map((l) => l.session.id))
      const results = all
        .filter(
          (s) =>
            s.id !== session.id &&
            !linkedIds.has(s.id) &&
            (s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.queries.some((q) => q.toLowerCase().includes(searchQuery.toLowerCase())))
        )
        .slice(0, 5)
      setSearchResults(results)
    }

    search()
  }, [searchQuery, session.id, linkedSessions])

  const handleLink = async (targetId: string, type: SessionLinkType) => {
    setLinking(true)
    try {
      await linkSessions(session.id, targetId, type)
      const updatedSession = await getSession(session.id)
      if (updatedSession) {
        onSessionChange?.(updatedSession)
      }
      await loadData()
      setShowSearch(false)
      setSearchQuery('')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (targetId: string) => {
    try {
      await unlinkSessions(session.id, targetId)
      const updatedSession = await getSession(session.id)
      if (updatedSession) {
        onSessionChange?.(updatedSession)
      }
      await loadData()
    } catch (error) {
      console.error('[SessionLinkingPanel] Failed to unlink:', error)
    }
  }

  const handleBranch = async () => {
    const topic = prompt('Enter topic for the new branch session:')
    if (!topic) return

    try {
      const newSession = await branchSession(session.id, topic, { copyTags: true })
      onNavigateToSession?.(newSession.id)
    } catch (error) {
      console.error('[SessionLinkingPanel] Failed to branch:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Session Links
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBranch}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Branch
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Link
          </button>
        </div>
      </div>

      {/* Session Lineage */}
      {lineage.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Parent Sessions
          </h4>
          <div className="flex items-center gap-1 flex-wrap">
            {lineage.map((parent, i) => (
              <React.Fragment key={parent.id}>
                <button
                  onClick={() => onNavigateToSession?.(parent.id)}
                  className="text-xs text-violet-600 hover:underline truncate max-w-[150px]"
                >
                  {parent.topic}
                </button>
                {i < lineage.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                )}
              </React.Fragment>
            ))}
            <ChevronRight className="w-3 h-3 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[150px]">
              {session.topic}
            </span>
          </div>
        </div>
      )}

      {/* Search for sessions */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions to link..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                autoFocus
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-900 dark:text-white truncate">
                        {result.topic}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {result.savedResults.length} results
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['related', 'subtopic'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => handleLink(result.id, type)}
                          disabled={linking}
                          className="px-2 py-1 text-[10px] font-medium text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded capitalize"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Linked Sessions */}
      {linkedSessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Linked Sessions ({linkedSessions.length})
          </h4>
          <div className="space-y-2">
            {linkedSessions.map(({ session: linked, link }) => (
              <SessionCard
                key={linked.id}
                session={linked}
                linkType={link.linkType}
                onUnlink={() => handleUnlink(linked.id)}
                onNavigate={() => onNavigateToSession?.(linked.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Child Sessions (Branches) */}
      {childSessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            Branches ({childSessions.length})
          </h4>
          <div className="space-y-2">
            {childSessions.map((child) => (
              <SessionCard
                key={child.id}
                session={child}
                onNavigate={() => onNavigateToSession?.(child.id)}
                showUnlink={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Suggested Links
            </h4>
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <SuggestionCard
                key={suggestion.session.id}
                suggestion={suggestion}
                onLink={(type) => handleLink(suggestion.session.id, type)}
                linking={linking}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {linkedSessions.length === 0 && suggestions.length === 0 && childSessions.length === 0 && (
        <div className="text-center py-6">
          <Link2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No linked sessions yet.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Link related research sessions to build connections.
          </p>
        </div>
      )}
    </div>
  )
}

export default SessionLinkingPanel
