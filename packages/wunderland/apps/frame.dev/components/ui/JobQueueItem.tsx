'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  BookOpen,
  HelpCircle,
  Star,
  FolderTree,
  GitBranch,
  Tags,
  RefreshCw,
  Send,
  Upload,
  Download,
  Github,
  X,
  Check,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react'
import {
  type Job,
  type JobType,
  type JobStatus,
  isJobCancellable,
  JOB_TYPE_LABELS,
  JOB_TYPE_ICONS,
  getJobStatusColor,
  getJobStatusBgColor,
} from '@/lib/jobs/types'
import { formatJobDuration, getJobRelativeTime } from '@/lib/hooks/useJobQueue'

/* ═══════════════════════════════════════════════════════════════════════════
   ICON MAP
═══════════════════════════════════════════════════════════════════════════ */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  BookOpen,
  HelpCircle,
  Star,
  FolderTree,
  GitBranch,
  Tags,
  RefreshCw,
  Send,
  Upload,
  Download,
  Github,
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface JobQueueItemProps {
  /** The job to display */
  job: Job
  /** Callback to cancel the job */
  onCancel?: (jobId: string) => void
  /** Whether to show in compact mode */
  compact?: boolean
  /** Whether the item is expanded (for details) */
  expanded?: boolean
  /** Callback when clicked */
  onClick?: (job: Job) => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * A single job queue item showing status, progress, and controls
 */
export const JobQueueItem = memo(function JobQueueItem({
  job,
  onCancel,
  compact = false,
  expanded = false,
  onClick,
}: JobQueueItemProps) {
  // Get the icon component
  const iconName = JOB_TYPE_ICONS[job.type]
  const IconComponent = ICON_MAP[iconName] || Layers

  // Status-specific icon
  const StatusIcon = useMemo(() => {
    switch (job.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <Check className="h-4 w-4 text-emerald-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <X className="h-4 w-4 text-amber-500" />
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />
    }
  }, [job.status])

  const canCancel = isJobCancellable(job.status)
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(job.status)

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCancel && canCancel) {
      onCancel(job.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative rounded-lg border transition-all duration-200
        ${isTerminal
          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
        }
        ${onClick ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600' : ''}
        ${compact ? 'p-2' : 'p-3'}
      `}
      onClick={() => onClick?.(job)}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3">
        {/* Job Type Icon */}
        <div
          className={`
            flex-shrink-0 p-1.5 rounded-md
            ${getJobStatusBgColor(job.status)}
          `}
        >
          <IconComponent className={`h-4 w-4 ${getJobStatusColor(job.status)}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {JOB_TYPE_LABELS[job.type]}
            </span>
            {StatusIcon}
          </div>

          {/* Message / Progress */}
          {!compact && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {job.message}
            </p>
          )}

          {/* Progress Bar */}
          {job.status === 'running' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span>{job.progress}%</span>
                <span>{formatJobDuration(job)}</span>
              </div>
              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Completed info */}
          {isTerminal && !compact && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {getJobRelativeTime(job)}
              {job.status === 'failed' && job.error && (
                <span className="text-red-500 ml-2">• {job.error}</span>
              )}
            </p>
          )}
        </div>

        {/* Cancel Button */}
        {canCancel && onCancel && (
          <button
            onClick={handleCancel}
            className={`
              flex-shrink-0 p-1 rounded-md transition-colors
              text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
              hover:bg-zinc-100 dark:hover:bg-zinc-700
              ${compact ? 'opacity-0 group-hover:opacity-100' : ''}
            `}
            title="Cancel job"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && !compact && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700"
        >
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {new Date(job.createdAt).toLocaleTimeString()}
              </dd>
            </div>
            {job.startedAt && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Started</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(job.startedAt).toLocaleTimeString()}
                </dd>
              </div>
            )}
            {job.completedAt && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Completed</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(job.completedAt).toLocaleTimeString()}
                </dd>
              </div>
            )}
            {job.completedAt && job.startedAt && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Duration</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {formatJobDuration(job)}
                </dd>
              </div>
            )}
          </dl>
        </motion.div>
      )}
    </motion.div>
  )
})

export default JobQueueItem
