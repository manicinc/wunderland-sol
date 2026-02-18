/**
 * Job Status Badge Component
 * @module quarry/ui/learning/JobStatusBadge
 *
 * Displays a badge indicator for Learning Studio background jobs.
 * Shows spinning indicator when jobs are running, badge count for pending,
 * and green dot for recently completed jobs.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { Job, JobStatus } from '@/lib/jobs'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface JobStatusBadgeProps {
  /** Running job (if any) */
  runningJob: Job | null
  /** Number of pending jobs */
  pendingCount: number
  /** Number of recently completed jobs (in last 5 mins) */
  completedCount: number
  /** Whether there are any failed jobs */
  hasFailedJobs?: boolean
  /** Click handler to open job panel */
  onClick: () => void
  /** Theme */
  isDark: boolean
  /** Custom className */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function JobStatusBadge({
  runningJob,
  pendingCount,
  completedCount,
  hasFailedJobs = false,
  onClick,
  isDark,
  className = '',
}: JobStatusBadgeProps) {
  // Don't render if nothing to show
  const hasActivity = runningJob || pendingCount > 0 || completedCount > 0 || hasFailedJobs
  if (!hasActivity) return null

  const isRunning = !!runningJob
  const totalPending = pendingCount + (isRunning ? 1 : 0)

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
        transition-colors duration-200
        ${isDark
          ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50'
          : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-200'
        }
        ${className}
      `}
      title={getTooltip(runningJob, pendingCount, completedCount, hasFailedJobs)}
    >
      {/* Status Icon */}
      <AnimatePresence mode="wait">
        {isRunning ? (
          <motion.div
            key="running"
            initial={{ opacity: 0, rotate: -180 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 180 }}
          >
            <Loader2
              className={`w-3.5 h-3.5 animate-spin ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}
            />
          </motion.div>
        ) : hasFailedJobs ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}
            />
          </motion.div>
        ) : completedCount > 0 ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
          </motion.div>
        ) : (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label */}
      <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
        {getLabel(runningJob, pendingCount, completedCount, hasFailedJobs)}
      </span>

      {/* Count Badge */}
      {totalPending > 0 && (
        <span
          className={`
            flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
            ${isDark
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-blue-100 text-blue-700'
            }
          `}
        >
          {totalPending}
        </span>
      )}

      {/* Completed dot indicator */}
      {completedCount > 0 && !isRunning && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full
            ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}
          `}
        />
      )}

      {/* Progress bar (when running) */}
      {isRunning && runningJob && (
        <motion.div
          className={`
            absolute bottom-0 left-0 h-0.5 rounded-b-lg
            ${isDark ? 'bg-blue-500' : 'bg-blue-600'}
          `}
          initial={{ width: '0%' }}
          animate={{ width: `${runningJob.progress}%` }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getLabel(
  runningJob: Job | null,
  pendingCount: number,
  completedCount: number,
  hasFailedJobs: boolean
): string {
  if (runningJob) {
    return `${runningJob.progress}%`
  }
  if (hasFailedJobs) {
    return 'Failed'
  }
  if (completedCount > 0) {
    return 'Done'
  }
  if (pendingCount > 0) {
    return 'Queued'
  }
  return ''
}

function getTooltip(
  runningJob: Job | null,
  pendingCount: number,
  completedCount: number,
  hasFailedJobs: boolean
): string {
  const parts: string[] = []

  if (runningJob) {
    parts.push(`Running: ${runningJob.message || 'Processing...'}`)
  }
  if (pendingCount > 0) {
    parts.push(`${pendingCount} job${pendingCount > 1 ? 's' : ''} queued`)
  }
  if (completedCount > 0) {
    parts.push(`${completedCount} completed`)
  }
  if (hasFailedJobs) {
    parts.push('Some jobs failed')
  }

  return parts.join(' | ') || 'Job status'
}

export default JobStatusBadge
