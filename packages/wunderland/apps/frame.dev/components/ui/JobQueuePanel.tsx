'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Trash2,
  ListTodo,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { useJobQueue } from '@/lib/hooks/useJobQueue'
import { JobQueueItem } from './JobQueueItem'
import type { Job } from '@/lib/jobs/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface JobQueuePanelProps {
  /** Position of the panel */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Auto-hide when no active jobs */
  autoHide?: boolean
  /** Maximum number of completed jobs to show */
  maxCompleted?: number
  /** Initial collapsed state */
  defaultCollapsed?: boolean
  /** Whether to show in minimized mode (icon only) */
  defaultMinimized?: boolean
  /** Custom class name */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Floating panel showing active and recent background jobs
 */
export function JobQueuePanel({
  position = 'bottom-right',
  autoHide = false,
  maxCompleted = 5,
  defaultCollapsed = false,
  defaultMinimized = false,
  className = '',
}: JobQueuePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  const {
    jobs,
    runningJobs,
    pendingJobs,
    completedJobs,
    activeCount,
    isProcessing,
    cancelJob,
    clearCompleted,
  } = useJobQueue({
    maxCompleted,
  })

  // Position classes
  const positionClasses = useMemo(() => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
      default:
        return 'bottom-4 right-4'
    }
  }, [position])

  // Handle job cancellation
  const handleCancel = useCallback(
    async (jobId: string) => {
      await cancelJob(jobId)
    },
    [cancelJob]
  )

  // Handle clearing completed jobs
  const handleClearCompleted = useCallback(async () => {
    await clearCompleted()
  }, [clearCompleted])

  // Handle job click (expand/collapse details)
  const handleJobClick = useCallback((job: Job) => {
    setSelectedJob((prev) => (prev === job.id ? null : job.id))
  }, [])

  // Auto-hide logic
  const shouldShow = !autoHide || activeCount > 0 || jobs.length > 0

  if (!shouldShow) {
    return null
  }

  // Minimized mode - just show a badge
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`fixed ${positionClasses} z-50 ${className}`}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className={`
            relative flex items-center justify-center
            w-12 h-12 rounded-full shadow-lg
            bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
            hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors
          `}
          title={`${activeCount} active jobs`}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <ListTodo className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          )}

          {/* Badge */}
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
              {activeCount}
            </span>
          )}
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed ${positionClasses} z-50 ${className}`}
    >
      <div
        className={`
          w-80 max-h-[calc(100vh-8rem)] flex flex-col
          bg-white dark:bg-zinc-900 rounded-xl shadow-xl
          border border-zinc-200 dark:border-zinc-700
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            ) : (
              <ListTodo className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            )}
            <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              Jobs
            </h3>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">
                {activeCount} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Clear Completed */}
            {completedJobs.length > 0 && (
              <button
                onClick={handleClearCompleted}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Clear completed jobs"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-y-auto"
            >
              <div className="p-3 space-y-2">
                {/* Running Jobs */}
                <AnimatePresence mode="popLayout">
                  {runningJobs.map((job) => (
                    <JobQueueItem
                      key={job.id}
                      job={job}
                      onCancel={handleCancel}
                      expanded={selectedJob === job.id}
                      onClick={handleJobClick}
                    />
                  ))}
                </AnimatePresence>

                {/* Pending Jobs */}
                <AnimatePresence mode="popLayout">
                  {pendingJobs.map((job) => (
                    <JobQueueItem
                      key={job.id}
                      job={job}
                      onCancel={handleCancel}
                      expanded={selectedJob === job.id}
                      onClick={handleJobClick}
                    />
                  ))}
                </AnimatePresence>

                {/* Divider if there are both active and completed */}
                {activeCount > 0 && completedJobs.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      Recent
                    </span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                )}

                {/* Completed Jobs */}
                <AnimatePresence mode="popLayout">
                  {completedJobs.map((job) => (
                    <JobQueueItem
                      key={job.id}
                      job={job}
                      compact
                      expanded={selectedJob === job.id}
                      onClick={handleJobClick}
                    />
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {jobs.length === 0 && (
                  <div className="py-8 text-center">
                    <ListTodo className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No active jobs
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Summary */}
        {isCollapsed && jobs.length > 0 && (
          <div className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
            {activeCount > 0
              ? `${activeCount} job${activeCount > 1 ? 's' : ''} in progress`
              : `${jobs.length} completed job${jobs.length > 1 ? 's' : ''}`}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default JobQueuePanel
