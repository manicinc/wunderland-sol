/**
 * Job Status Panel Component
 * @module quarry/ui/learning/JobStatusPanel
 *
 * Displays a panel showing all Learning Studio background jobs.
 * Shows pending jobs with progress bars, completed jobs with "View Results",
 * and provides cancel/clear functionality.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  XCircle,
  Eye,
  Layers,
  BookOpen,
  HelpCircle,
} from 'lucide-react'
import type { Job, JobType, JobStatus } from '@/lib/jobs'
import { JOB_TYPE_LABELS, isJobTerminal } from '@/lib/jobs'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface JobStatusPanelProps {
  /** All jobs to display */
  jobs: Job[]
  /** Currently running job */
  runningJob: Job | null
  /** Whether panel is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Cancel job handler */
  onCancelJob: (jobId: string) => Promise<void>
  /** Delete job handler */
  onDeleteJob: (jobId: string) => Promise<void>
  /** Clear all completed jobs */
  onClearCompleted: () => Promise<void>
  /** View results handler */
  onViewResults: (job: Job) => void
  /** Theme */
  isDark: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEARNING JOB TYPES
═══════════════════════════════════════════════════════════════════════════ */

const LEARNING_JOB_TYPES: JobType[] = [
  'flashcard_generation',
  'glossary_generation',
  'quiz_generation',
]

function isLearningJob(type: JobType): boolean {
  return LEARNING_JOB_TYPES.includes(type)
}

function getJobIcon(type: JobType) {
  switch (type) {
    case 'flashcard_generation':
      return Layers
    case 'glossary_generation':
      return BookOpen
    case 'quiz_generation':
      return HelpCircle
    default:
      return Clock
  }
}

function getStatusColor(status: JobStatus, isDark: boolean): string {
  switch (status) {
    case 'pending':
      return isDark ? 'text-amber-400' : 'text-amber-600'
    case 'running':
      return isDark ? 'text-blue-400' : 'text-blue-600'
    case 'completed':
      return isDark ? 'text-emerald-400' : 'text-emerald-600'
    case 'failed':
      return isDark ? 'text-red-400' : 'text-red-600'
    case 'cancelled':
      return isDark ? 'text-zinc-400' : 'text-zinc-500'
    default:
      return isDark ? 'text-zinc-400' : 'text-zinc-500'
  }
}

function getStatusBgColor(status: JobStatus, isDark: boolean): string {
  switch (status) {
    case 'pending':
      return isDark ? 'bg-amber-500/10' : 'bg-amber-50'
    case 'running':
      return isDark ? 'bg-blue-500/10' : 'bg-blue-50'
    case 'completed':
      return isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
    case 'failed':
      return isDark ? 'bg-red-500/10' : 'bg-red-50'
    case 'cancelled':
      return isDark ? 'bg-zinc-500/10' : 'bg-zinc-50'
    default:
      return isDark ? 'bg-zinc-800' : 'bg-zinc-100'
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function JobStatusPanel({
  jobs,
  runningJob,
  isOpen,
  onClose,
  onCancelJob,
  onDeleteJob,
  onClearCompleted,
  onViewResults,
  isDark,
}: JobStatusPanelProps) {
  // Filter to only learning jobs
  const learningJobs = jobs.filter(j => isLearningJob(j.type))

  // Separate by status
  const activeJobs = learningJobs.filter(j => j.status === 'running' || j.status === 'pending')
  const completedJobs = learningJobs.filter(j => j.status === 'completed')
  const failedJobs = learningJobs.filter(j => j.status === 'failed' || j.status === 'cancelled')

  const hasCompletedJobs = completedJobs.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
              absolute right-0 top-full mt-2 z-50
              w-80 max-h-[400px] overflow-hidden
              rounded-xl shadow-xl
              ${isDark
                ? 'bg-zinc-900 border border-zinc-700/50'
                : 'bg-white border border-zinc-200'
              }
            `}
          >
            {/* Header */}
            <div
              className={`
                flex items-center justify-between px-4 py-3
                border-b
                ${isDark ? 'border-zinc-700/50' : 'border-zinc-200'}
              `}
            >
              <h3 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Generation Jobs
              </h3>
              <div className="flex items-center gap-2">
                {hasCompletedJobs && (
                  <button
                    onClick={() => onClearCompleted()}
                    className={`
                      text-xs px-2 py-1 rounded-md transition-colors
                      ${isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                      }
                    `}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`
                    p-1 rounded-md transition-colors
                    ${isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[320px]">
              {learningJobs.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No jobs in queue</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {/* Active Jobs */}
                  {activeJobs.map(job => (
                    <JobItem
                      key={job.id}
                      job={job}
                      isDark={isDark}
                      onCancel={() => onCancelJob(job.id)}
                      onDelete={() => onDeleteJob(job.id)}
                      onViewResults={() => onViewResults(job)}
                    />
                  ))}

                  {/* Completed Jobs */}
                  {completedJobs.map(job => (
                    <JobItem
                      key={job.id}
                      job={job}
                      isDark={isDark}
                      onCancel={() => onCancelJob(job.id)}
                      onDelete={() => onDeleteJob(job.id)}
                      onViewResults={() => onViewResults(job)}
                    />
                  ))}

                  {/* Failed Jobs */}
                  {failedJobs.map(job => (
                    <JobItem
                      key={job.id}
                      job={job}
                      isDark={isDark}
                      onCancel={() => onCancelJob(job.id)}
                      onDelete={() => onDeleteJob(job.id)}
                      onViewResults={() => onViewResults(job)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   JOB ITEM COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface JobItemProps {
  job: Job
  isDark: boolean
  onCancel: () => void
  onDelete: () => void
  onViewResults: () => void
}

function JobItem({ job, isDark, onCancel, onDelete, onViewResults }: JobItemProps) {
  const Icon = getJobIcon(job.type)
  const isActive = job.status === 'running' || job.status === 'pending'
  const isComplete = job.status === 'completed'
  const isFailed = job.status === 'failed' || job.status === 'cancelled'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`
        relative p-3 rounded-lg transition-colors
        ${getStatusBgColor(job.status, isDark)}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${getStatusColor(job.status, isDark)}`}>
          {job.status === 'running' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : job.status === 'failed' ? (
            <AlertCircle className="w-4 h-4" />
          ) : job.status === 'cancelled' ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`
                text-sm font-medium truncate
                ${isDark ? 'text-zinc-200' : 'text-zinc-800'}
              `}
            >
              {JOB_TYPE_LABELS[job.type] || job.type}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {isComplete && (
                <button
                  onClick={onViewResults}
                  className={`
                    p-1 rounded-md transition-colors
                    ${isDark
                      ? 'text-emerald-400 hover:bg-emerald-500/20'
                      : 'text-emerald-600 hover:bg-emerald-100'
                    }
                  `}
                  title="View results"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}

              {isActive && (
                <button
                  onClick={onCancel}
                  className={`
                    p-1 rounded-md transition-colors
                    ${isDark
                      ? 'text-amber-400 hover:bg-amber-500/20'
                      : 'text-amber-600 hover:bg-amber-100'
                    }
                  `}
                  title="Cancel job"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {isJobTerminal(job.status) && (
                <button
                  onClick={onDelete}
                  className={`
                    p-1 rounded-md transition-colors
                    ${isDark
                      ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                      : 'text-zinc-400 hover:text-red-600 hover:bg-red-50'
                    }
                  `}
                  title="Remove from list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status message */}
          <p
            className={`
              text-xs truncate mt-0.5
              ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
            `}
          >
            {job.message || getDefaultMessage(job.status)}
          </p>

          {/* Progress bar */}
          {job.status === 'running' && (
            <div className="mt-2">
              <div
                className={`
                  h-1 rounded-full overflow-hidden
                  ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                `}
              >
                <motion.div
                  className={`h-full ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p
                className={`
                  text-[10px] mt-1 text-right
                  ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                `}
              >
                {job.progress}%
              </p>
            </div>
          )}

          {/* Error message */}
          {job.status === 'failed' && job.error && (
            <p
              className={`
                text-xs mt-1 p-2 rounded
                ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}
              `}
            >
              {job.error}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function getDefaultMessage(status: JobStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting in queue...'
    case 'running':
      return 'Processing...'
    case 'completed':
      return 'Completed successfully'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return ''
  }
}

export default JobStatusPanel
