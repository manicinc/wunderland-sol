/**
 * TaskCard Component
 *
 * Enhanced task card for kanban/multi-day views with project colors,
 * priority indicators, and drag support.
 *
 * @module components/quarry/ui/planner/TaskCard
 */

'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Clock,
  GripVertical,
  MoreHorizontal,
  Calendar,
  Flag,
  ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { getProjectColor, getProjectColorWithOpacity, getProjectIcon, getProjectName } from '@/lib/planner/projects'

export interface TaskCardProps {
  task: Task
  onToggleComplete?: (taskId: string) => void
  onClick?: (task: Task) => void
  onContextMenu?: (task: Task, e: React.MouseEvent) => void
  isDragging?: boolean
  compact?: boolean
  showProject?: boolean
  showDueDate?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

const PRIORITY_COLORS: Record<TaskPriority, { dot: string; border: string }> = {
  low: { dot: 'bg-green-400', border: 'border-green-400/30' },
  medium: { dot: 'bg-yellow-400', border: 'border-yellow-400/30' },
  high: { dot: 'bg-orange-400', border: 'border-orange-400/30' },
  urgent: { dot: 'bg-red-500', border: 'border-red-500/30' },
}

function TaskCardComponent({
  task,
  onToggleComplete,
  onClick,
  onContextMenu,
  isDragging = false,
  compact = false,
  showProject = true,
  showDueDate = false,
  theme = 'dark',
  className,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isCompleted = task.status === 'completed'
  const projectColor = getProjectColor(task.project)
  const projectBgColor = getProjectColorWithOpacity(task.project, 0.15)
  const ProjectIcon = getProjectIcon(task.project)
  const projectName = getProjectName(task.project)
  const priorityStyles = PRIORITY_COLORS[task.priority]

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleComplete?.(task.id)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(task, e)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? '0 10px 40px rgba(0,0,0,0.3)'
          : isHovered
            ? '0 4px 12px rgba(0,0,0,0.15)'
            : '0 1px 3px rgba(0,0,0,0.1)',
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative rounded-lg border cursor-pointer select-none',
        'transition-colors duration-150',
        theme === 'dark'
          ? 'bg-zinc-800/80 border-zinc-700/50 hover:border-zinc-600'
          : 'bg-white border-gray-200 hover:border-gray-300',
        isCompleted && 'opacity-60',
        isDragging && 'z-50',
        className
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: projectColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(task)}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle */}
      <div
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab',
          theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
        )}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      <div className={cn('p-3', compact ? 'py-2' : 'py-3')}>
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            onClick={handleCheckClick}
            className={cn(
              'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
              'transition-all duration-150 mt-0.5',
              isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : theme === 'dark'
                  ? 'border-zinc-500 hover:border-zinc-400'
                  : 'border-gray-300 hover:border-gray-400'
            )}
          >
            {isCompleted && <Check className="w-3 h-3 text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                isCompleted && 'line-through',
                theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'
              )}
            >
              {task.title}
            </p>

            {/* Meta row */}
            {!compact && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Project badge */}
                {showProject && task.project && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: projectBgColor,
                      color: projectColor,
                    }}
                  >
                    <ProjectIcon className="w-2.5 h-2.5" />
                    {projectName}
                  </span>
                )}

                {/* Duration */}
                {task.duration && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px]',
                      theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
                    )}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {formatDuration(task.duration)}
                  </span>
                )}

                {/* Due date */}
                {showDueDate && task.dueDate && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px]',
                      theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
                    )}
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}

                {/* Priority indicator */}
                {task.priority !== 'medium' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px]',
                      task.priority === 'urgent' ? 'text-red-400' :
                      task.priority === 'high' ? 'text-orange-400' : 'text-green-400'
                    )}
                  >
                    <Flag className="w-2.5 h-2.5" />
                    {task.priority}
                  </span>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px]',
                      theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
                    )}
                  >
                    <ListTodo className="w-2.5 h-2.5" />
                    {task.tags.length}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* More menu */}
          <button
            className={cn(
              'flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
              theme === 'dark'
                ? 'hover:bg-zinc-700 text-zinc-400'
                : 'hover:bg-gray-100 text-gray-500'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onContextMenu?.(task, e)
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Priority stripe */}
      {task.priority === 'urgent' && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-red-500 border-r-transparent rounded-tr-lg" />
      )}
    </motion.div>
  )
}

export const TaskCard = memo(TaskCardComponent)
export default TaskCard
