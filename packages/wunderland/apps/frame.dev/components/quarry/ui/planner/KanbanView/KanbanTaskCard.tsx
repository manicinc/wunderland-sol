/**
 * KanbanTaskCard
 *
 * Task card optimized for Kanban board display
 * Features drag handle, priority indicator, and quick actions
 *
 * @module components/quarry/ui/planner/KanbanView/KanbanTaskCard
 */

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  GripVertical,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import type { Task, TaskStatus, TaskPriority } from '@/lib/planner/types'
import { cn } from '@/lib/utils'
import { formatDuration, isTaskOverdue, isTaskDueToday, PRIORITY_COLORS } from '@/lib/planner/types'
import { getProjectColor, getProjectIcon } from '@/lib/planner/projects'

// ============================================================================
// TYPES
// ============================================================================

interface KanbanTaskCardProps {
  task: Task
  onClick: () => void
  onToggleComplete: () => void
  onStatusChange: (status: TaskStatus) => void
  theme?: 'light' | 'dark'
}

// ============================================================================
// STYLES
// ============================================================================

const PRIORITY_BORDER_COLORS: Record<TaskPriority, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
}

const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

// ============================================================================
// ANIMATIONS
// ============================================================================

const cardVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  hover: {
    scale: 1.02,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  dragging: {
    scale: 1.05,
    rotate: 3,
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanTaskCard({
  task,
  onClick,
  onToggleComplete,
  onStatusChange,
  theme = 'dark',
}: KanbanTaskCardProps) {
  const isDark = theme === 'dark'
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const isOverdue = isTaskOverdue(task)
  const isDueToday = isTaskDueToday(task)
  const projectColor = task.project ? getProjectColor(task.project) : null
  const ProjectIcon = task.project ? getProjectIcon(task.project) : null

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [task.id])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Quick status change
  const canMoveLeft = task.status !== 'pending'
  const canMoveRight = task.status !== 'completed' && task.status !== 'cancelled'

  const handleMoveLeft = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'completed']
    const currentIndex = statusOrder.indexOf(task.status)
    if (currentIndex > 0) {
      onStatusChange(statusOrder[currentIndex - 1])
    }
  }, [task.status, onStatusChange])

  const handleMoveRight = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'completed']
    const currentIndex = statusOrder.indexOf(task.status)
    if (currentIndex < statusOrder.length - 1) {
      onStatusChange(statusOrder[currentIndex + 1])
    }
  }, [task.status, onStatusChange])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className={cn(
          'group relative rounded-lg border cursor-pointer select-none',
          'transition-colors duration-150',
          'border-l-[3px]',
          PRIORITY_BORDER_COLORS[task.priority],
          isDark
            ? 'bg-zinc-800/80 border-zinc-700/50 hover:bg-zinc-800'
            : 'bg-white border-gray-200 hover:bg-gray-50',
          isDragging && 'opacity-50'
        )}
        style={{
          borderLeftColor: projectColor ?? undefined,
        }}
        variants={cardVariants}
        initial="hidden"
        animate={isDragging ? 'dragging' : 'visible'}
        whileHover="hover"
        onClick={onClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
      {/* Urgent priority corner triangle */}
      {task.priority === 'urgent' && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-red-500 border-r-transparent rounded-tr-lg" />
      )}

      {/* Overdue indicator */}
      {isOverdue && (
        <motion.div
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-red-500 rounded-full"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Drag handle */}
      <div
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'cursor-grab active:cursor-grabbing',
          isDark ? 'hover:bg-zinc-700' : 'hover:bg-gray-200'
        )}
      >
        <GripVertical size={12} className={isDark ? 'text-zinc-500' : 'text-gray-400'} />
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 pl-6">
        {/* Title row */}
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete()
            }}
            className={cn(
              'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5',
              'transition-all duration-150',
              task.status === 'completed'
                ? 'bg-emerald-500 border-emerald-500'
                : cn('border-current', PRIORITY_DOT_COLORS[task.priority].replace('bg-', 'border-'))
            )}
          >
            {task.status === 'completed' && (
              <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Title */}
          <h4
            className={cn(
              'text-sm font-medium line-clamp-2',
              task.status === 'completed' && 'line-through opacity-60',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}
          >
            {task.title}
          </h4>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Project badge */}
          {task.project && ProjectIcon && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                isDark ? 'bg-zinc-700/50' : 'bg-gray-100'
              )}
              style={{ color: projectColor ?? undefined }}
            >
              <ProjectIcon size={10} />
              {task.project}
            </span>
          )}

          {/* Duration */}
          {task.duration && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                isDark ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              <Clock size={10} />
              {formatDuration(task.duration)}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                isOverdue && 'text-red-500',
                isDueToday && !isOverdue && 'text-amber-500',
                !isOverdue && !isDueToday && (isDark ? 'text-zinc-500' : 'text-gray-500')
              )}
            >
              {isOverdue && <AlertTriangle size={10} />}
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                isDark ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              <Tag size={10} />
              {task.tags.length}
            </span>
          )}
        </div>
      </div>

      {/* Quick action buttons (on hover) */}
      <motion.div
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        initial={false}
        animate={{ opacity: showActions ? 1 : 0 }}
      >
        {canMoveLeft && (
          <button
            onClick={handleMoveLeft}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            )}
            title="Move left"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        {canMoveRight && (
          <button
            onClick={handleMoveRight}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            )}
            title="Move right"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </motion.div>
    </motion.div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago`
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
