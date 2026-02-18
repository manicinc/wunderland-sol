/**
 * PublishDashboardModal Component
 * @module components/publish/PublishDashboardModal
 *
 * Main dashboard modal for the batch publishing system.
 * Provides tabs for Queue, Batches, History, and Export.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { X, Upload, Copy, Download, Clock, CheckCircle, AlertCircle, Loader2, GitPullRequest, FileText, History, Settings } from 'lucide-react'
import { usePublisher, usePublishHistory, usePendingCounts } from '@/lib/publish/hooks/usePublisher'
import { SyncStatusBadge, SyncStatusDot } from './SyncStatusBadge'
import type { PublishBatch, PublishableContentType, BatchStrategy, SyncStatus } from '@/lib/publish/types'
import { BATCH_STRATEGY_LABELS, SYNC_STATUS_LABELS } from '@/lib/publish/constants'
import { copyToClipboard, downloadAsFile, downloadAsZip, previewExport } from '@/lib/publish/exporter'

// ============================================================================
// TYPES
// ============================================================================

export interface PublishDashboardModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'queue' | 'batches' | 'history' | 'export'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PublishDashboardModal({
  isOpen,
  onClose,
}: PublishDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('queue')

  // Hooks
  const {
    settings,
    pendingCount,
    isPublishing,
    currentBatch,
    conflicts,
    error,
    publishNow,
    cancelPublish,
  } = usePublisher()

  const { counts, total, refresh: refreshCounts } = usePendingCounts()
  const { batches, loading: historyLoading, refresh: refreshHistory } = usePublishHistory()

  // Handle publish
  const handlePublish = useCallback(async () => {
    await publishNow()
    refreshCounts()
    refreshHistory()
  }, [publishNow, refreshCounts, refreshHistory])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <GitPullRequest className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Publishing</h2>
            {total > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                {total} pending
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{counts.reflection} reflections</span>
            <span>{counts.strand} strands</span>
          </div>

          <div className="flex items-center gap-2">
            <QuickExportButtons />

            <button
              onClick={handlePublish}
              disabled={isPublishing || total === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                isPublishing || total === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publish Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
          <TabButton
            active={activeTab === 'queue'}
            onClick={() => setActiveTab('queue')}
            icon={<FileText className="w-4 h-4" />}
            label="Queue"
            badge={total > 0 ? total : undefined}
          />
          <TabButton
            active={activeTab === 'batches'}
            onClick={() => setActiveTab('batches')}
            icon={<GitPullRequest className="w-4 h-4" />}
            label="Batches"
          />
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<History className="w-4 h-4" />}
            label="History"
          />
          <TabButton
            active={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            icon={<Download className="w-4 h-4" />}
            label="Export"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'queue' && <QueuePanel counts={counts} />}
          {activeTab === 'batches' && <BatchesPanel batches={batches} loading={historyLoading} />}
          {activeTab === 'history' && <HistoryPanel />}
          {activeTab === 'export' && <ExportPanel />}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message}</span>
            </div>
          </div>
        )}

        {/* Current Batch Progress */}
        {isPublishing && currentBatch && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  Publishing {currentBatch.itemCount} items...
                </span>
              </div>
              <button
                onClick={cancelPublish}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TAB BUTTON
// ============================================================================

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// QUICK EXPORT BUTTONS
// ============================================================================

function QuickExportButtons() {
  const [copying, setCopying] = useState(false)

  const handleCopyAll = useCallback(async () => {
    setCopying(true)
    try {
      // TODO: Get actual pending items
      // await copyToClipboard(items)
      console.log('Copy all clicked')
    } finally {
      setCopying(false)
    }
  }, [])

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopyAll}
        disabled={copying}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Copy all to clipboard"
      >
        <Copy className="w-4 h-4" />
        Copy
      </button>
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Download as file"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    </div>
  )
}

// ============================================================================
// QUEUE PANEL
// ============================================================================

interface QueuePanelProps {
  counts: Record<PublishableContentType, number>
}

function QueuePanel({ counts }: QueuePanelProps) {
  const total = counts.reflection + counts.strand + counts.project

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <CheckCircle className="w-12 h-12 mb-4 text-emerald-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm">No items pending for publishing</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reflections */}
      {counts.reflection > 0 && (
        <QueueSection
          title="Reflections"
          count={counts.reflection}
          type="reflection"
        />
      )}

      {/* Strands */}
      {counts.strand > 0 && (
        <QueueSection
          title="Strands"
          count={counts.strand}
          type="strand"
        />
      )}

      {/* Projects */}
      {counts.project > 0 && (
        <QueueSection
          title="Projects"
          count={counts.project}
          type="project"
        />
      )}
    </div>
  )
}

interface QueueSectionProps {
  title: string
  count: number
  type: PublishableContentType
}

function QueueSection({ title, count, type }: QueueSectionProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
            {count}
          </span>
        </div>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            expanded ? 'rotate-180' : ''
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Placeholder items - would be populated with actual data */}
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <QueueItem key={i} type={type} index={i} />
          ))}
          {count > 5 && (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">
              + {count - 5} more items
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface QueueItemProps {
  type: PublishableContentType
  index: number
}

function QueueItem({ type, index }: QueueItemProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <div className="flex items-center gap-3">
        <SyncStatusDot status="pending" />
        <div>
          <p className="text-sm font-medium">
            {type === 'reflection' ? `Reflection ${index + 1}` : `Item ${index + 1}`}
          </p>
          <p className="text-xs text-gray-500">Modified today</p>
        </div>
      </div>
      <button className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        Remove
      </button>
    </div>
  )
}

// ============================================================================
// BATCHES PANEL
// ============================================================================

interface BatchesPanelProps {
  batches: PublishBatch[]
  loading: boolean
}

function BatchesPanel({ batches, loading }: BatchesPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <GitPullRequest className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No batches yet</p>
        <p className="text-sm">Published batches will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {batches.map(batch => (
        <BatchCard key={batch.id} batch={batch} />
      ))}
    </div>
  )
}

interface BatchCardProps {
  batch: PublishBatch
}

function BatchCard({ batch }: BatchCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    conflict: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              statusColors[batch.status] || statusColors.pending
            )}>
              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500">
              {BATCH_STRATEGY_LABELS[batch.strategy]}
            </span>
          </div>
          <p className="text-sm font-medium mt-1">
            {batch.itemCount} items ({batch.itemsSynced} synced, {batch.itemsFailed} failed)
          </p>
        </div>

        {batch.prUrl && (
          <a
            href={batch.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <GitPullRequest className="w-4 h-4" />
            PR #{batch.prNumber}
          </a>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Created: {new Date(batch.createdAt).toLocaleString()}</span>
        {batch.completedAt && (
          <span>Completed: {new Date(batch.completedAt).toLocaleString()}</span>
        )}
      </div>

      {batch.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
          {batch.error}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HISTORY PANEL
// ============================================================================

function HistoryPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <History className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">Publish History</p>
      <p className="text-sm">Individual item publish history will appear here</p>
    </div>
  )
}

// ============================================================================
// EXPORT PANEL
// ============================================================================

function ExportPanel() {
  const [format, setFormat] = useState<'markdown' | 'json' | 'zip'>('markdown')
  const [preview, setPreview] = useState<string>('')

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Export Format</label>
        <div className="flex gap-2">
          {(['markdown', 'json', 'zip'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'px-4 py-2 text-sm rounded-lg border transition-colors',
                format === f
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm">Include frontmatter</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm">Include metadata</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          <Copy className="w-4 h-4" />
          Copy to Clipboard
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Download {format.toUpperCase()}
        </button>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium mb-2">Preview</label>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-xs overflow-auto max-h-64">
          <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
            {preview || '(Select items to preview export)'}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PublishDashboardModal
