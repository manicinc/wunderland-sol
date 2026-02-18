/**
 * Writing Stats Modal Component
 * @module codex/ui/WritingStatsModal
 *
 * Detailed statistics modal for writing sessions.
 * Shows daily, weekly, and per-strand statistics.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Timer,
  Calendar,
  TrendingUp,
  FileText,
  Clock,
  BarChart3,
  Trash2,
} from 'lucide-react'
import {
  getWritingTimerStore,
  type DailyWritingSummary,
  type StrandWritingStats,
} from '@/lib/tracking/writingTimerStore'
import { formatDuration } from '@/lib/tracking/writingTimer'
import { cn } from '@/lib/utils'

export interface WritingStatsModalProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Current strand ID (for focused view) */
  strandId?: string
  /** Close handler */
  onClose: () => void
}

export function WritingStatsModal({
  theme = 'dark',
  strandId,
  onClose,
}: WritingStatsModalProps) {
  const [dailySummaries, setDailySummaries] = useState<DailyWritingSummary[]>([])
  const [strandStats, setStrandStats] = useState<StrandWritingStats | null>(null)
  const [todayTotal, setTodayTotal] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const isDark = theme.includes('dark')

  useEffect(() => {
    async function loadStats() {
      try {
        const store = await getWritingTimerStore()
        const summaries = await store.getDailySummaries(7)
        const today = await store.getTodayTotal()
        const week = await store.getWeekTotal()

        setDailySummaries(summaries)
        setTodayTotal(today)
        setWeekTotal(week)

        if (strandId) {
          const stats = await store.getStrandStats(strandId)
          setStrandStats(stats)
        }
      } catch (e) {
        console.error('[WritingStatsModal] Failed to load stats:', e)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [strandId])

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all writing time data?')) return

    try {
      const store = await getWritingTimerStore()
      await store.clearAll()
      setDailySummaries([])
      setTodayTotal(0)
      setWeekTotal(0)
      setStrandStats(null)
    } catch (e) {
      console.error('[WritingStatsModal] Failed to clear data:', e)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Calculate max value for chart scaling
  const maxDailySeconds = Math.max(...dailySummaries.map((s) => s.totalActiveSeconds), 1)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            'w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={cn(
              'px-6 py-4 border-b flex items-center justify-between',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h2
                className={cn(
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900'
                )}
              >
                Writing Statistics
              </h2>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <motion.div
                  className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    icon={<Clock className="w-5 h-5 text-green-500" />}
                    label="Today"
                    value={formatDuration(todayTotal)}
                    isDark={isDark}
                  />
                  <StatCard
                    icon={<Calendar className="w-5 h-5 text-blue-500" />}
                    label="This Week"
                    value={formatDuration(weekTotal)}
                    isDark={isDark}
                  />
                </div>

                {/* Strand Stats (if available) */}
                {strandStats && (
                  <div
                    className={cn(
                      'p-4 rounded-xl border',
                      isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        )}
                      >
                        This Page
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div
                          className={cn(
                            'text-lg font-semibold',
                            isDark ? 'text-white' : 'text-zinc-900'
                          )}
                        >
                          {formatDuration(strandStats.totalActiveSeconds)}
                        </div>
                        <div
                          className={cn(
                            'text-xs',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}
                        >
                          Total time
                        </div>
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-lg font-semibold',
                            isDark ? 'text-white' : 'text-zinc-900'
                          )}
                        >
                          {strandStats.totalSessions}
                        </div>
                        <div
                          className={cn(
                            'text-xs',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}
                        >
                          Sessions
                        </div>
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-lg font-semibold',
                            isDark ? 'text-white' : 'text-zinc-900'
                          )}
                        >
                          {formatDuration(strandStats.averageSessionLength)}
                        </div>
                        <div
                          className={cn(
                            'text-xs',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}
                        >
                          Avg session
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly Chart */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}
                    >
                      7-Day Activity
                    </span>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() - (6 - i))
                      const dateStr = date.toISOString().split('T')[0]
                      const summary = dailySummaries.find((s) => s.date === dateStr)
                      const height =
                        summary && maxDailySeconds > 0
                          ? (summary.totalActiveSeconds / maxDailySeconds) * 100
                          : 5

                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <motion.div
                            className={cn(
                              'w-full rounded-t transition-all',
                              summary && summary.totalActiveSeconds > 0
                                ? 'bg-gradient-to-t from-blue-500/50 to-blue-400/30'
                                : isDark
                                  ? 'bg-zinc-800'
                                  : 'bg-zinc-200'
                            )}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            title={
                              summary
                                ? `${formatDuration(summary.totalActiveSeconds)}`
                                : 'No activity'
                            }
                          />
                          <span
                            className={cn(
                              'text-[10px]',
                              isDark ? 'text-zinc-500' : 'text-zinc-400'
                            )}
                          >
                            {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Daily Breakdown */}
                {dailySummaries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-cyan-500" />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        )}
                      >
                        Daily Breakdown
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dailySummaries.slice(0, 5).map((summary) => {
                        const date = new Date(summary.date)
                        const isToday =
                          summary.date === new Date().toISOString().split('T')[0]

                        return (
                          <div
                            key={summary.date}
                            className={cn(
                              'flex items-center justify-between p-2 rounded-lg',
                              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                            )}
                          >
                            <span
                              className={cn(
                                'text-sm',
                                isDark ? 'text-zinc-300' : 'text-zinc-700'
                              )}
                            >
                              {isToday
                                ? 'Today'
                                : date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                            </span>
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  isDark ? 'text-white' : 'text-zinc-900'
                                )}
                              >
                                {formatDuration(summary.totalActiveSeconds)}
                              </span>
                              <span
                                className={cn(
                                  'text-xs',
                                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                                )}
                              >
                                {summary.totalSessions} sessions
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Clear Data */}
                <div className={cn('pt-4 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
                  <button
                    onClick={handleClearAll}
                    className={cn(
                      'flex items-center gap-2 text-sm transition-colors',
                      isDark
                        ? 'text-zinc-500 hover:text-red-400'
                        : 'text-zinc-400 hover:text-red-600'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear all data
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatCard({
  icon,
  label,
  value,
  isDark,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isDark: boolean
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border',
        isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div
        className={cn(
          'text-2xl font-bold',
          isDark ? 'text-white' : 'text-zinc-900'
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          'text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}
      >
        {label}
      </div>
    </div>
  )
}

export default WritingStatsModal
