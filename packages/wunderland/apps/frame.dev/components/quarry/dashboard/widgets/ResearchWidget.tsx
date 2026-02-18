/**
 * Research Widget
 *
 * Quick access to web research from the dashboard.
 * @module components/quarry/dashboard/widgets/ResearchWidget
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Globe,
  ArrowRight,
  Clock,
  FolderOpen,
} from 'lucide-react'
import type { WidgetProps } from '../types'
import { useResearchSessions } from '@/lib/research'

export function ResearchWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [query, setQuery] = useState('')
  const { sessions, loading } = useResearchSessions()

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    // Navigate to research page with query
    const params = new URLSearchParams({ q: query.trim() })
    onNavigate(`/quarry/research?${params.toString()}`)
  }, [query, onNavigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Recent sessions (last 3)
  const recentSessions = sessions.slice(0, 3)

  if (compact) {
    return (
      <button
        onClick={() => onNavigate('/quarry/research')}
        className={`
          w-full flex items-center justify-center gap-2 py-3 rounded-lg
          font-medium transition-all
          ${isDark
            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          }
        `}
      >
        <Globe className="w-5 h-5" />
        Research
      </button>
    )
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Search input */}
      <div className="relative">
        <Search className={`
          absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search the web..."
          className={`
            w-full pl-10 pr-12 py-2.5 rounded-lg outline-none
            text-sm transition-all
            ${isDark
              ? 'bg-zinc-700 text-zinc-100 placeholder-zinc-500 border border-zinc-600 focus:border-cyan-500'
              : 'bg-zinc-50 text-zinc-800 placeholder-zinc-400 border border-zinc-200 focus:border-cyan-500'
            }
          `}
        />
        <motion.button
          onClick={handleSearch}
          disabled={!query.trim()}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            p-1.5 rounded-lg transition-all
            ${query.trim()
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : isDark ? 'bg-zinc-600 text-zinc-500' : 'bg-zinc-200 text-zinc-400'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Recent sessions */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`
                  h-10 rounded-lg animate-pulse
                  ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}
                `}
              />
            ))}
          </div>
        ) : recentSessions.length > 0 ? (
          <div className="space-y-1.5">
            <div className={`
              flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}>
              <Clock className="w-3 h-3" />
              Recent Sessions
            </div>
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onNavigate('/quarry/research')}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                  transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-700/50 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
              >
                <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className="text-sm truncate flex-1">{session.topic}</span>
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {session.queries.length}q
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={`
            flex flex-col items-center justify-center h-full text-center py-4
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <Globe className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No research sessions yet</p>
          </div>
        )}
      </div>

      {/* View all link */}
      <button
        onClick={() => onNavigate('/quarry/research')}
        className={`
          flex items-center justify-center gap-1.5 py-2 rounded-lg
          text-xs font-medium transition-colors
          ${isDark
            ? 'text-cyan-400 hover:bg-cyan-900/30'
            : 'text-cyan-600 hover:bg-cyan-50'
          }
        `}
      >
        <Globe className="w-3.5 h-3.5" />
        Open Research
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

export default ResearchWidget
