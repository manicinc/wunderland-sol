/**
 * Activity Log Viewer Component
 * Displays audit logs, undo history, and session statistics
 *
 * @module codex/activity/ActivityLogViewer
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Activity,
  Clock,
  FileText,
  Edit3,
  Eye,
  Trash2,
  Move,
  BookOpen,
  Search,
  Settings,
  Undo2,
  Redo2,
  RefreshCw,
  Filter,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react'
import { useAuditLog, useUndoRedo } from '@/components/quarry'
import type {
  AuditLogEntry,
  AuditActionType,
  AuditStats
} from '@/lib/audit'

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_TYPE_LABELS: Record<AuditActionType, { label: string; icon: React.ReactNode; color: string }> = {
  file: { label: 'File', icon: <FileText className="w-4 h-4" />, color: 'text-blue-500' },
  content: { label: 'Content', icon: <Edit3 className="w-4 h-4" />, color: 'text-emerald-500' },
  metadata: { label: 'Metadata', icon: <Settings className="w-4 h-4" />, color: 'text-violet-500' },
  tree: { label: 'Tree', icon: <Move className="w-4 h-4" />, color: 'text-amber-500' },
  learning: { label: 'Learning', icon: <BookOpen className="w-4 h-4" />, color: 'text-pink-500' },
  navigation: { label: 'Navigation', icon: <Eye className="w-4 h-4" />, color: 'text-cyan-500' },
  settings: { label: 'Settings', icon: <Settings className="w-4 h-4" />, color: 'text-zinc-500' },
  bookmark: { label: 'Bookmark', icon: <BookOpen className="w-4 h-4" />, color: 'text-yellow-500' },
  api: { label: 'API', icon: <Settings className="w-4 h-4" />, color: 'text-indigo-500' },
}

const ACTION_NAME_LABELS: Record<string, string> = {
  create: 'Created',
  delete: 'Deleted',
  rename: 'Renamed',
  move: 'Moved',
  duplicate: 'Duplicated',
  update: 'Updated',
  publish: 'Published',
  revert: 'Reverted',
  restore_draft: 'Restored draft',
  update_title: 'Updated title',
  update_tags: 'Updated tags',
  update_frontmatter: 'Updated frontmatter',
  view: 'Viewed',
  search: 'Searched',
  jump_to_heading: 'Jumped to heading',
  jump_to_source: 'Jumped to source',
  flashcard_create: 'Created flashcard',
  flashcard_update: 'Updated flashcard',
  flashcard_delete: 'Deleted flashcard',
  flashcard_review: 'Reviewed flashcard',
  quiz_attempt: 'Attempted quiz',
  quiz_complete: 'Completed quiz',
  bookmark_add: 'Added bookmark',
  bookmark_remove: 'Removed bookmark',
  setting_update: 'Updated setting',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now'
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins}m ago`
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }

  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatPath(path: string | undefined): string {
  if (!path) return ''
  // Extract filename from path
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

interface LogEntryProps {
  entry: AuditLogEntry
  isExpanded: boolean
  onToggle: () => void
}

function LogEntry({ entry, isExpanded, onToggle }: LogEntryProps) {
  const actionInfo = ACTION_TYPE_LABELS[entry.actionType]
  const actionLabel = ACTION_NAME_LABELS[entry.actionName] || entry.actionName

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
      >
        {/* Action type icon */}
        <div className={`flex-shrink-0 ${actionInfo.color}`}>
          {actionInfo.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-white">
              {actionLabel}
            </span>
            {entry.isUndoable && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400">
                Undoable
              </span>
            )}
            {entry.source !== 'user' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                {entry.source}
              </span>
            )}
          </div>
          {entry.targetPath && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {entry.targetPath}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <span className="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-zinc-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-zinc-50 dark:bg-zinc-800/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 mb-1">Action Type</p>
              <p className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                <span className={actionInfo.color}>{actionInfo.icon}</span>
                {actionInfo.label}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 mb-1">Target Type</p>
              <p className="font-medium text-zinc-900 dark:text-white">{entry.targetType}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 mb-1">Session ID</p>
              <p className="font-mono text-xs text-zinc-900 dark:text-white">{entry.sessionId.slice(0, 20)}...</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 mb-1">Full Timestamp</p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
            {entry.durationMs && (
              <div>
                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Duration</p>
                <p className="font-medium text-zinc-900 dark:text-white">{entry.durationMs}ms</p>
              </div>
            )}
            {entry.undoGroupId && (
              <div>
                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Undo Group</p>
                <p className="font-mono text-xs text-zinc-900 dark:text-white">{entry.undoGroupId}</p>
              </div>
            )}
          </div>

          {/* Old/New values */}
          {(entry.oldValue || entry.newValue) && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-zinc-500 dark:text-zinc-400 mb-2 text-sm">State Changes</p>
              <div className="grid grid-cols-2 gap-4">
                {entry.oldValue && (
                  <div>
                    <p className="text-xs text-red-500 mb-1 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Before
                    </p>
                    <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300">
                      {JSON.stringify(entry.oldValue, null, 2).slice(0, 200)}
                      {JSON.stringify(entry.oldValue).length > 200 && '...'}
                    </pre>
                  </div>
                )}
                {entry.newValue && (
                  <div>
                    <p className="text-xs text-emerald-500 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> After
                    </p>
                    <pre className="text-xs bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded overflow-x-auto text-emerald-700 dark:text-emerald-300">
                      {JSON.stringify(entry.newValue, null, 2).slice(0, 200)}
                      {JSON.stringify(entry.newValue).length > 200 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ActivityLogViewer() {
  const { sessionId, isReady, getRecentActions, getStats } = useAuditLog()
  const { canUndo, canRedo, undoCount, redoCount, undo, redo } = useUndoRedo()

  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<AuditActionType | 'all'>('all')
  const [showUndoable, setShowUndoable] = useState(false)

  // Load data
  const loadData = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    try {
      const [recentActions, auditStats] = await Promise.all([
        getRecentActions(100),
        getStats()
      ])
      setEntries(recentActions)
      setStats(auditStats)
    } catch (error) {
      console.error('Failed to load activity data:', error)
    } finally {
      setLoading(false)
    }
  }, [isReady, getRecentActions, getStats])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (filter !== 'all' && entry.actionType !== filter) return false
    if (showUndoable && !entry.isUndoable) return false
    return true
  })

  // Handle undo/redo
  const handleUndo = async () => {
    await undo()
    await loadData()
  }

  const handleRedo = async () => {
    await redo()
    await loadData()
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/quarry"
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  Activity Log
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Session: {sessionId?.slice(0, 16)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Undo/Redo buttons */}
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${canUndo
                    ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }
                `}
              >
                <Undo2 className="w-4 h-4" />
                Undo ({undoCount})
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${canRedo
                    ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }
                `}
              >
                <Redo2 className="w-4 h-4" />
                Redo ({redoCount})
              </button>

              {/* Refresh button */}
              <button
                onClick={loadData}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Actions"
              value={stats.totalActions}
              icon={<Activity className="w-5 h-5" />}
              color="text-cyan-500"
            />
            <StatCard
              label="Sessions"
              value={stats.sessionCount}
              icon={<Clock className="w-5 h-5" />}
              color="text-violet-500"
            />
            <StatCard
              label="Edits"
              value={stats.actionsByType.content + stats.actionsByType.file}
              icon={<Edit3 className="w-5 h-5" />}
              color="text-emerald-500"
            />
            <StatCard
              label="Avg/Session"
              value={stats.averageActionsPerSession}
              icon={<BarChart3 className="w-5 h-5" />}
              color="text-amber-500"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Filter className="w-4 h-4" />
            Filter:
          </div>

          {/* Action type filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AuditActionType | 'all')}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white"
          >
            <option value="all">All Types</option>
            {Object.entries(ACTION_TYPE_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Undoable filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUndoable}
              onChange={(e) => setShowUndoable(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Undoable only</span>
          </label>

          <div className="flex-1" />

          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredEntries.length} entries
          </span>
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
              <Info className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No activity yet</p>
              <p className="text-sm">Your actions will appear here as you use Codex</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {filteredEntries.map((entry) => (
                <LogEntry
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Most edited files */}
        {stats && stats.mostEditedFiles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Most Edited Files
            </h2>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              {stats.mostEditedFiles.map((file, index) => (
                <div
                  key={file.path}
                  className="flex items-center gap-4 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm text-zinc-900 dark:text-white truncate">
                    {file.path}
                  </span>
                  <span className="flex-shrink-0 px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                    {file.count} edits
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity by day chart placeholder */}
        {stats && stats.actionsByDay.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" />
              Activity Over Time
            </h2>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-end gap-1 h-32">
                {stats.actionsByDay.slice(-14).map((day) => {
                  const maxCount = Math.max(...stats.actionsByDay.map(d => d.count))
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                    >
                      <div
                        className="w-full bg-cyan-500 dark:bg-cyan-400 rounded-t transition-all hover:bg-cyan-600 dark:hover:bg-cyan-300"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {day.date}: {day.count} actions
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{stats.actionsByDay[stats.actionsByDay.length - 14]?.date || ''}</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
