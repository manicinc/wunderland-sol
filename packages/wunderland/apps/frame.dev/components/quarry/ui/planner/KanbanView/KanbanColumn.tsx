/**
 * KanbanColumn
 *
 * Individual status column in the Kanban board
 * Features gradient header, task count, and drop zone
 *
 * @module components/quarry/ui/planner/KanbanView/KanbanColumn
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Circle, PlayCircle, CheckCircle2, XCircle, Plus, Clock, Inbox, Sparkles } from 'lucide-react'
import type { Task, TaskStatus } from '@/lib/planner/types'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/planner/types'
import { KanbanTaskCard } from './KanbanTaskCard'

// ============================================================================
// TYPES
// ============================================================================

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: Task) => void
  onToggleComplete: (taskId: string) => void
  onCreateTask?: () => void
  isDragOver?: boolean
  theme?: 'light' | 'dark'
}

// ============================================================================
// STYLES
// ============================================================================

const STATUS_STYLES: Record<TaskStatus, {
  gradient: string
  accent: string
  glow: string
  Icon: typeof Circle
}> = {
  pending: {
    gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
    accent: 'bg-amber-500',
    glow: 'shadow-amber-500/10',
    Icon: Circle,
  },
  in_progress: {
    gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
    accent: 'bg-blue-500',
    glow: 'shadow-blue-500/10',
    Icon: PlayCircle,
  },
  completed: {
    gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    accent: 'bg-emerald-500',
    glow: 'shadow-emerald-500/10',
    Icon: CheckCircle2,
  },
  cancelled: {
    gradient: 'from-stone-500/20 via-stone-500/10 to-transparent',
    accent: 'bg-stone-500',
    glow: 'shadow-stone-500/10',
    Icon: XCircle,
  },
}

// ============================================================================
// ANIMATIONS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const columnVariants = {
  idle: {
    borderColor: 'transparent',
  },
  dragOver: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    transition: { duration: 0.15 },
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanColumn({
  status,
  label,
  tasks,
  onTaskMove,
  onTaskClick,
  onToggleComplete,
  onCreateTask,
  isDragOver = false,
  theme = 'dark',
}: KanbanColumnProps) {
  const isDark = theme === 'dark'
  const style = STATUS_STYLES[status]
  const Icon = style.Icon

  // Calculate total duration
  const totalDuration = tasks.reduce((sum, task) => sum + (task.duration ?? 0), 0)

  // Handle drag over state
  const [localDragOver, setLocalDragOver] = useState(false)
  const showDropIndicator = isDragOver || localDragOver

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setLocalDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setLocalDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setLocalDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      onTaskMove(taskId, status)
    }
  }, [status, onTaskMove])

  return (
    <motion.div
      className={cn(
        'flex flex-col w-80 min-w-[320px] rounded-xl border',
        'transition-all duration-200',
        isDark
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-gray-50 border-gray-200',
        showDropIndicator && 'ring-2 ring-emerald-500/30 border-emerald-500/50'
      )}
      variants={columnVariants}
      animate={showDropIndicator ? 'dragOver' : 'idle'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with gradient */}
      <div
        className={cn(
          'px-4 py-3 rounded-t-xl bg-gradient-to-br',
          style.gradient
        )}
      >
        <div className="flex items-center justify-between">
          {/* Status indicator + label */}
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', style.accent)} />
            <h3 className={cn(
              'font-semibold text-sm',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              {label}
            </h3>
            {/* Count badge */}
            <CountBadge count={tasks.length} isDark={isDark} />
          </div>

          {/* Total duration badge */}
          {totalDuration > 0 && (
            <span className={cn(
              'flex items-center gap-1 text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            )}>
              <Clock size={12} />
              {formatDuration(totalDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Quick add for pending column */}
      {status === 'pending' && onCreateTask && (
        <button
          onClick={onCreateTask}
          className={cn(
            'mx-3 mt-2 px-3 py-2 rounded-lg border border-dashed',
            'flex items-center justify-center gap-2',
            'text-sm transition-colors',
            isDark
              ? 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
          )}
        >
          <Plus size={14} />
          Add task
        </button>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {tasks.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {tasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={() => onToggleComplete(task.id)}
                  onStatusChange={(newStatus) => onTaskMove(task.id, newStatus)}
                  theme={theme}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyColumn status={status} onAddTask={onCreateTask} isDark={isDark} />
          )}
        </AnimatePresence>
      </div>

      {/* Drop zone indicator */}
      <AnimatePresence>
        {showDropIndicator && (
          <motion.div
            className="mx-3 mb-3 h-12 rounded-lg border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 flex items-center justify-center"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 48 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-xs text-emerald-500">Drop here</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CountBadge({ count, isDark }: { count: number; isDark: boolean }) {
  return (
    <motion.span
      key={count}
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums',
        isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-white/60 text-zinc-700'
      )}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {count}
    </motion.span>
  )
}

function EmptyColumn({
  status,
  onAddTask,
  isDark,
}: {
  status: TaskStatus
  onAddTask?: () => void
  isDark: boolean
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
          isDark ? 'bg-zinc-800/50' : 'bg-gray-100'
        )}
      >
        {status === 'completed' ? (
          <Sparkles className="w-6 h-6 text-emerald-500" />
        ) : (
          <Inbox className={cn('w-6 h-6', isDark ? 'text-zinc-600' : 'text-gray-400')} />
        )}
      </div>
      <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-gray-500')}>
        {status === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
      </p>
      {status === 'pending' && onAddTask && (
        <button
          onClick={onAddTask}
          className="mt-3 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          + Add a task
        </button>
      )}
    </motion.div>
  )
}
