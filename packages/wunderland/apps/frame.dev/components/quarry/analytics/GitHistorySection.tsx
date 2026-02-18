/**
 * Git History Section Component
 * @module components/quarry/analytics/GitHistorySection
 *
 * Displays git commit analytics including timeline, contributors, and recent commits.
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  GitBranch,
  GitCommit as GitCommitIcon,
  User,
  Plus,
  Minus,
  FileText,
  Loader2,
  Clock,
} from 'lucide-react'
import { getGitCommitMetrics } from '@/lib/analytics/gitAnalyticsService'
import type { TimeRange, GitCommitMetrics } from '@/lib/analytics/types'
import { AreaChart } from './charts/AreaChart'
import { BarChart } from './charts/BarChart'

// ============================================================================
// TYPES
// ============================================================================

interface GitHistorySectionProps {
  isDark: boolean
  timeRange: TimeRange
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GitHistorySection({ isDark, timeRange }: GitHistorySectionProps) {
  const [data, setData] = useState<GitCommitMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const metrics = await getGitCommitMetrics(timeRange)
        setData(metrics)
      } catch (error) {
        console.error('[GitHistory] Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  if (!data || data.totalCommits === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GitBranch className={`w-10 h-10 mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          No commit history available yet.
          <br />
          Commit changes to strands to see activity here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Commits"
          value={data.totalCommits}
          icon={<GitCommitIcon className="w-4 h-4" />}
          isDark={isDark}
        />
        <StatCard
          label="This Period"
          value={data.commitsThisPeriod}
          icon={<Clock className="w-4 h-4" />}
          isDark={isDark}
        />
        <StatCard
          label="Lines Added"
          value={`+${data.totalAdditions}`}
          icon={<Plus className="w-4 h-4" />}
          color="emerald"
          isDark={isDark}
        />
        <StatCard
          label="Lines Removed"
          value={`-${data.totalDeletions}`}
          icon={<Minus className="w-4 h-4" />}
          color="red"
          isDark={isDark}
        />
      </div>

      {/* Commits Over Time Chart */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Commit Activity
        </h3>
        <AreaChart
          data={data.commitsOverTime}
          showCumulative
          colorScheme="secondary"
          isDark={isDark}
          height={250}
        />
      </div>

      {/* Contributors and Strands */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <User className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Contributors
            </h3>
          </div>
          {data.topContributors.length > 0 ? (
            <BarChart
              data={data.topContributors.map((c) => ({ label: c.author, value: c.count }))}
              horizontal
              colorScheme="secondary"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No contributor data" isDark={isDark} />
          )}
        </div>

        {/* By Strand */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Most Changed Files
            </h3>
          </div>
          {data.byStrand.length > 0 ? (
            <div className="space-y-2">
              {data.byStrand.slice(0, 8).map((s) => (
                <div key={s.path} className="flex items-center justify-between">
                  <span
                    className={`text-sm truncate max-w-[200px] ${
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                    title={s.path}
                  >
                    {s.path.split('/').pop()}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {s.commits} commits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No file change data" isDark={isDark} />
          )}
        </div>
      </div>

      {/* Recent Commits */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Recent Commits
        </h3>
        {data.recentCommits.length > 0 ? (
          <div className="space-y-3">
            {data.recentCommits.slice(0, 10).map((commit) => (
              <CommitRow key={commit.sha} commit={commit} isDark={isDark} />
            ))}
          </div>
        ) : (
          <EmptyState message="No recent commits" isDark={isDark} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'default' | 'emerald' | 'red'
  isDark: boolean
}

function StatCard({ label, value, icon, color = 'default', isDark }: StatCardProps) {
  const colorClasses = {
    default: isDark ? 'text-zinc-400' : 'text-zinc-500',
    emerald: isDark ? 'text-emerald-400' : 'text-emerald-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
  }

  return (
    <div
      className={`
        rounded-xl border p-4
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{value}</p>
    </div>
  )
}

interface CommitRowProps {
  commit: {
    sha: string
    message: string
    authorName: string
    committedAt: string
    additions?: number
    deletions?: number
  }
  isDark: boolean
}

function CommitRow({ commit, isDark }: CommitRowProps) {
  const date = new Date(commit.committedAt)
  const timeAgo = getTimeAgo(date)

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg transition-colors
        ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}
      `}
    >
      <div className={`p-2 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
        <GitCommitIcon className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {commit.message}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {commit.authorName}
          </span>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {timeAgo}
          </span>
          {(commit.additions || commit.deletions) && (
            <span className="text-xs">
              <span className="text-emerald-500">+{commit.additions || 0}</span>
              {' / '}
              <span className="text-red-500">-{commit.deletions || 0}</span>
            </span>
          )}
        </div>
      </div>
      <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {commit.sha.slice(0, 7)}
      </span>
    </div>
  )
}

function EmptyState({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>
    </div>
  )
}

// ============================================================================
// UTILITIES
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default GitHistorySection
