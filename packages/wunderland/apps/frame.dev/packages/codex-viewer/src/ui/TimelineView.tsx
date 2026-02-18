/**
 * Timeline view for reading history and recent activity
 * @module codex/ui/TimelineView
 * 
 * @remarks
 * - Chronological display of reading history
 * - Grouped by date (Today, Yesterday, This Week, etc.)
 * - Shows view count and last viewed time
 * - Click to navigate to file
 * - Visual timeline with connection lines
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, Eye, FileText, Calendar } from 'lucide-react'
import type { HistoryEntry } from '../lib/localStorage'

interface TimelineViewProps {
  /** Reading history entries */
  history: HistoryEntry[]
  /** Navigate to a file */
  onNavigate: (path: string) => void
  /** Close timeline view */
  onClose: () => void
}

interface GroupedHistory {
  label: string
  entries: HistoryEntry[]
  color: string
}

/**
 * Timeline visualization of reading history
 * 
 * @example
 * ```tsx
 * <TimelineView
 *   history={readingHistory}
 *   onNavigate={(path) => openFile(path)}
 *   onClose={() => setTimelineOpen(false)}
 * />
 * ```
 */
export default function TimelineView({
  history,
  onNavigate,
  onClose,
}: TimelineViewProps) {
  /**
   * Group history by time periods
   */
  const groupedHistory = useMemo((): GroupedHistory[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)
    const thisMonth = new Date(today)
    thisMonth.setMonth(thisMonth.getMonth() - 1)

    const groups: GroupedHistory[] = [
      { label: 'Today', entries: [], color: 'text-cyan-600 dark:text-cyan-400' },
      { label: 'Yesterday', entries: [], color: 'text-blue-600 dark:text-blue-400' },
      { label: 'This Week', entries: [], color: 'text-violet-600 dark:text-violet-400' },
      { label: 'This Month', entries: [], color: 'text-green-600 dark:text-green-400' },
      { label: 'Older', entries: [], color: 'text-gray-600 dark:text-gray-400' },
    ]

    history.forEach((entry) => {
      const viewedDate = new Date(entry.viewedAt)

      if (viewedDate >= today) {
        groups[0].entries.push(entry)
      } else if (viewedDate >= yesterday) {
        groups[1].entries.push(entry)
      } else if (viewedDate >= thisWeek) {
        groups[2].entries.push(entry)
      } else if (viewedDate >= thisMonth) {
        groups[3].entries.push(entry)
      } else {
        groups[4].entries.push(entry)
      }
    })

    return groups.filter((group) => group.entries.length > 0)
  }, [history])

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Clock className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
              Reading Timeline
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Your reading history • {history.length} {history.length === 1 ? 'file' : 'files'} viewed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close timeline"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          {groupedHistory.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-lg text-gray-500">No reading history yet</p>
              <p className="text-sm text-gray-400 mt-2">Start exploring the Codex to build your timeline</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-0 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-violet-500 to-gray-400" />

              {/* Timeline groups */}
              <div className="space-y-12">
                {groupedHistory.map((group, groupIndex) => (
                  <motion.div
                    key={group.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    className="relative pl-8 md:pl-24"
                  >
                    {/* Period label */}
                    <div className={`absolute left-0 md:left-0 -translate-y-2 text-sm font-bold uppercase tracking-wider ${group.color}`}>
                      {group.label}
                    </div>

                    {/* Entries */}
                    <div className="space-y-4 mt-6">
                      {group.entries.map((entry, index) => (
                        <motion.button
                          key={entry.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                          onClick={() => {
                            onNavigate(entry.path)
                            onClose()
                          }}
                          className="relative w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 transition-all group"
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-[34px] md:-left-[66px] top-6 w-3 h-3 rounded-full bg-white dark:bg-gray-950 border-4 border-cyan-500" />

                          {/* Content */}
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {entry.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                                {entry.path}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(entry.viewedAt).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {entry.viewCount} {entry.viewCount === 1 ? 'view' : 'views'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

