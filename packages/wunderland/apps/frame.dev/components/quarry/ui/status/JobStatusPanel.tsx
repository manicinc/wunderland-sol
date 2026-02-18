'use client'

/**
 * Job Status Panel
 * @module codex/ui/JobStatusPanel
 * 
 * Floating panel showing background job progress and status.
 * Collapsible to a small badge when minimized.
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers,
  BookOpen,
  HelpCircle,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Minimize2,
  Maximize2,
  Upload,
  Download,
  FolderOpen,
  Cloud,
  FileText,
  Tag,
  Github,
  GitBranch,
  Send,
  Link,
} from 'lucide-react'
import {
  useJobQueue,
  type Job,
  type JobType,
  type JobStatus,
  JOB_TYPE_LABELS,
  isJobTerminal,
} from '../../hooks/useJobQueue'
import { Z_INDEX } from '../../constants'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface JobStatusPanelProps {
  /** Theme name */
  theme?: string
  /** Callback when user clicks to view job results */
  onViewResults?: (job: Job) => void
  /** Position */
  position?: 'bottom-right' | 'bottom-left'
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════════════════ */

const JOB_TYPE_ICON: Record<JobType, typeof Layers> = {
  flashcard_generation: Layers,
  glossary_generation: BookOpen,
  quiz_generation: HelpCircle,
  rating_generation: Star,
  categorization: Tag,
  'reclassify-taxonomy': GitBranch,
  'block-tagging': Tag,
  'bulk-block-tagging': Tag,
  'reindex-strand': RefreshCw,
  'reindex-blocks': RefreshCw,
  'refresh-backlinks': Link,
  'publish-strand': Send,
  'publish-project': BookOpen,
  'import-obsidian': FolderOpen,
  'import-notion': FolderOpen,
  'import-google-docs': Cloud,
  'import-markdown': FileText,
  'import-json': Upload,
  'import-github': Github,
  'import-evernote': FolderOpen,
  'export-pdf': Download,
  'export-docx': Download,
  'export-markdown': Download,
  'export-json': Download,
}

const STATUS_ICON: Record<JobStatus, typeof Clock> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertCircle,
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function JobStatusPanel({
  theme = 'dark',
  onViewResults,
  position = 'bottom-right',
}: JobStatusPanelProps) {
  const isDark = theme.includes('dark')
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const {
    jobs,
    runningJob,
    pendingCount,
    cancelJob,
    deleteJob,
    clearTerminalJobs,
  } = useJobQueue()
  
  // Only show panel if there are jobs
  const hasJobs = jobs.length > 0
  const activeCount = pendingCount + (runningJob ? 1 : 0)
  
  // Sort jobs: running first, then pending, then by creation date
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      // Running first
      if (a.status === 'running' && b.status !== 'running') return -1
      if (b.status === 'running' && a.status !== 'running') return 1
      // Then pending
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (b.status === 'pending' && a.status !== 'pending') return 1
      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [jobs])
  
  if (!hasJobs) return null
  
  const positionClasses = position === 'bottom-right' 
    ? 'right-4 bottom-4' 
    : 'left-4 bottom-4'
  
  // Minimized badge view
  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={() => setIsMinimized(false)}
        className={`
          fixed ${positionClasses} p-3 rounded-full shadow-lg
          ${isDark 
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' 
            : 'bg-white hover:bg-zinc-50 text-zinc-800'}
          transition-colors cursor-pointer
        `}
        style={{ zIndex: Z_INDEX.TOAST }}
      >
        <div className="relative">
          {runningJob ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : (
            <Layers className="w-5 h-5" />
          )}
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
      </motion.button>
    )
  }
  
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className={`
        fixed ${positionClasses} w-80 rounded-xl shadow-2xl overflow-hidden
        ${isDark 
          ? 'bg-zinc-900 border border-zinc-800' 
          : 'bg-white border border-zinc-200'}
      `}
      style={{ zIndex: Z_INDEX.TOAST }}
    >
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between px-3 py-2 cursor-pointer
          ${isDark 
            ? 'bg-zinc-800/50 hover:bg-zinc-800' 
            : 'bg-zinc-50 hover:bg-zinc-100'}
          transition-colors
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {runningJob ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <Layers className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          )}
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Background Jobs
          </span>
          {activeCount > 0 && (
            <span className={`
              px-1.5 py-0.5 text-xs rounded-full
              ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}
            `}>
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(true)
            }}
            className={`
              p-1 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
            `}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          {isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          ) : (
            <ChevronUp className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          )}
        </div>
      </div>
      
      {/* Jobs List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {sortedJobs.map((job) => (
                <JobItem
                  key={job.id}
                  job={job}
                  isDark={isDark}
                  onCancel={() => cancelJob(job.id)}
                  onDelete={() => deleteJob(job.id)}
                  onView={onViewResults ? () => onViewResults(job) : undefined}
                />
              ))}
            </div>
            
            {/* Footer */}
            {jobs.some(j => isJobTerminal(j.status)) && (
              <div 
                className={`
                  px-3 py-2 border-t flex justify-end
                  ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
                `}
              >
                <button
                  onClick={() => clearTerminalJobs()}
                  className={`
                    text-xs px-2 py-1 rounded transition-colors
                    ${isDark 
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}
                  `}
                >
                  Clear completed
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   JOB ITEM
═══════════════════════════════════════════════════════════════════════════ */

function JobItem({
  job,
  isDark,
  onCancel,
  onDelete,
  onView,
}: {
  job: Job
  isDark: boolean
  onCancel: () => void
  onDelete: () => void
  onView?: () => void
}) {
  const TypeIcon = JOB_TYPE_ICON[job.type]
  const StatusIcon = STATUS_ICON[job.status]
  
  const statusColors: Record<JobStatus, string> = {
    pending: isDark ? 'text-zinc-400' : 'text-zinc-500',
    running: 'text-blue-500',
    completed: 'text-emerald-500',
    failed: 'text-red-500',
    cancelled: 'text-amber-500',
  }
  
  return (
    <div 
      className={`
        px-3 py-2.5 border-b last:border-b-0
        ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
      `}
    >
      {/* Job Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TypeIcon className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {JOB_TYPE_LABELS[job.type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon 
            className={`w-3.5 h-3.5 ${statusColors[job.status]} ${
              job.status === 'running' ? 'animate-spin' : ''
            }`} 
          />
        </div>
      </div>
      
      {/* Progress Bar (for running jobs) */}
      {job.status === 'running' && (
        <div className={`h-1.5 rounded-full overflow-hidden mb-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-blue-500 rounded-full"
          />
        </div>
      )}
      
      {/* Message */}
      <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {job.message}
      </p>
      
      {/* Error */}
      {job.error && (
        <p className="text-xs text-red-400 mt-1 truncate">
          {job.error}
        </p>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        {(job.status === 'pending' || job.status === 'running') && (
          <button
            onClick={onCancel}
            className={`
              text-xs px-2 py-0.5 rounded transition-colors
              ${isDark 
                ? 'text-red-400 hover:bg-red-500/20' 
                : 'text-red-500 hover:bg-red-50'}
            `}
          >
            Cancel
          </button>
        )}
        {job.status === 'completed' && onView && (
          <button
            onClick={onView}
            className={`
              text-xs px-2 py-0.5 rounded transition-colors
              ${isDark 
                ? 'text-blue-400 hover:bg-blue-500/20' 
                : 'text-blue-500 hover:bg-blue-50'}
            `}
          >
            View Results
          </button>
        )}
        {isJobTerminal(job.status) && (
          <button
            onClick={onDelete}
            className={`
              text-xs px-2 py-0.5 rounded transition-colors
              ${isDark 
                ? 'text-zinc-500 hover:bg-zinc-800' 
                : 'text-zinc-400 hover:bg-zinc-100'}
            `}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default JobStatusPanel









