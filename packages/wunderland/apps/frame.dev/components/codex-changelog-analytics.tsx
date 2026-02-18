'use client'

import { useState, useEffect } from 'react'
import { Calendar, GitCommit, GitPullRequest, GitMerge, TrendingUp, Activity } from 'lucide-react'

interface CommitEntry {
  date: string
  totalCommits: number
  byType: Record<string, any[]>
  commits: Array<{
    sha: string
    author: string
    type: string
    scope: string | null
    description: string
    url: string
  }>
}

interface ActivityEntry {
  type: 'github_activity'
  date: string
  summary: {
    issuesCreated: number
    issuesClosed: number
    prsMerged: number
    total: number
  }
  created: any[]
  closed: any[]
  merged: any[]
}

type ChangelogEntry = CommitEntry | ActivityEntry

export default function CodexChangelogAnalytics() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    // Default to current month
    const now = new Date()
    const month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
    setSelectedMonth(month)
  }, [])

  useEffect(() => {
    if (!selectedMonth) return

    const fetchChangelog = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/framersai/quarry/master/codex-history/${selectedMonth}.jsonl`
        )

        if (!response.ok) {
          throw new Error(`Month ${selectedMonth} not found`)
        }

        const text = await response.text()
        const lines = text.trim().split('\n').filter(Boolean)
        const parsed = lines.map(line => JSON.parse(line))

        setEntries(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load changelog')
      } finally {
        setLoading(false)
      }
    }

    fetchChangelog()
  }, [selectedMonth])

  // Calculate statistics
  const stats = entries.reduce(
    (acc, entry) => {
      if ('commits' in entry) {
        acc.totalCommits += entry.totalCommits
        Object.entries(entry.byType).forEach(([type, commits]) => {
          acc.commitsByType[type] = (acc.commitsByType[type] || 0) + commits.length
        })
      } else if (entry.type === 'github_activity') {
        acc.issuesCreated += entry.summary.issuesCreated
        acc.issuesClosed += entry.summary.issuesClosed
        acc.prsMerged += entry.summary.prsMerged
      }
      return acc
    },
    {
      totalCommits: 0,
      commitsByType: {} as Record<string, number>,
      issuesCreated: 0,
      issuesClosed: 0,
      prsMerged: 0,
    }
  )

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <p className="text-sm text-gray-500 mt-2">Try selecting a different month</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="month-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Month:
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="paper-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <GitCommit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Commits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCommits}</p>
            </div>
          </div>
        </div>

        <div className="paper-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <GitMerge className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">PRs Merged</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.prsMerged}</p>
            </div>
          </div>
        </div>

        <div className="paper-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Issues Created</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issuesCreated}</p>
            </div>
          </div>
        </div>

        <div className="paper-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Issues Closed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issuesClosed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commits by Type */}
      <div className="paper-card p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Commits by Type</h3>
        <div className="space-y-3">
          {Object.entries(stats.commitsByType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const percentage = (count / stats.totalCommits) * 100
              const colors: Record<string, string> = {
                feat: 'bg-green-500',
                fix: 'bg-red-500',
                docs: 'bg-blue-500',
                chore: 'bg-gray-500',
                refactor: 'bg-purple-500',
                test: 'bg-yellow-500',
                ci: 'bg-orange-500',
                other: 'bg-gray-400',
              }
              const color = colors[type] || 'bg-gray-400'

              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="paper-card p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Activity Timeline</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {entries
            .slice()
            .reverse()
            .map((entry, index) => {
              if ('commits' in entry) {
                return (
                  <div key={`commit-${index}`} className="flex gap-4 border-l-2 border-purple-300 dark:border-purple-700 pl-4">
                    <div className="flex-shrink-0">
                      <Calendar className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.date}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.totalCommits} commit{entry.totalCommits !== 1 ? 's' : ''}
                      </p>
                      <div className="mt-2 space-y-1">
                        {entry.commits.slice(0, 3).map((commit) => (
                          <a
                            key={commit.sha}
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            <span className="font-mono">{commit.sha}</span> {commit.type}
                            {commit.scope && `(${commit.scope})`}: {commit.description}
                          </a>
                        ))}
                        {entry.commits.length > 3 && (
                          <p className="text-xs text-gray-500">+{entry.commits.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              } else {
                return (
                  <div key={`activity-${index}`} className="flex gap-4 border-l-2 border-green-300 dark:border-green-700 pl-4">
                    <div className="flex-shrink-0">
                      <GitPullRequest className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.date}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.summary.total} issue/PR activity
                      </p>
                      <div className="mt-1 flex gap-4 text-xs text-gray-500">
                        {entry.summary.issuesCreated > 0 && <span>+{entry.summary.issuesCreated} created</span>}
                        {entry.summary.issuesClosed > 0 && <span>✓{entry.summary.issuesClosed} closed</span>}
                        {entry.summary.prsMerged > 0 && <span>⚡{entry.summary.prsMerged} merged</span>}
                      </div>
                    </div>
                  </div>
                )
              }
            })}
        </div>
      </div>
    </div>
  )
}

