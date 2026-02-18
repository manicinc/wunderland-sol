/**
 * DayColumn Component
 *
 * A single day column for the MultiDayView (Calendar Kanban).
 * Supports drag-drop, quick add, and shows estimated time totals.
 *
 * @module components/quarry/ui/planner/DayColumn
 */

'use client'

import { useState, useCallback, memo } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Plus, Clock, CalendarDays, Sunrise, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, CreateTaskInput } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { TaskCard } from './TaskCard'

export interface DayColumnProps {
  date: Date
  tasks: Task[]
  isToday?: boolean
  isPast?: boolean
  onTaskClick?: (task: Task) => void
  onToggleComplete?: (taskId: string) => void
  onCreateTask?: (input: CreateTaskInput) => Promise<Task | null>
  onMoveTask?: (taskId: string, newDate: string) => void
  onReorderTasks?: (date: string, taskIds: string[]) => void
  onTaskContextMenu?: (task: Task, e: React.MouseEvent) => void
  showCompleted?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

function DayColumnComponent({
  date,
  tasks,
  isToday = false,
  isPast = false,
  onTaskClick,
  onToggleComplete,
  onCreateTask,
  onMoveTask,
  onReorderTasks,
  onTaskContextMenu,
  showCompleted = false,
  theme = 'dark',
  className,
}: DayColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showCompletedSection, setShowCompletedSection] = useState(false)
  const dragControls = useDragControls()

  const dateStr = date.toISOString().split('T')[0]
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = date.getDate()
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })

  // Filter tasks (with null safety)
  const safeTasks = tasks && Array.isArray(tasks) ? tasks : []
  const incompleteTasks = safeTasks.filter((t) => t.status !== 'completed')
  const completedTasks = safeTasks.filter((t) => t.status === 'completed')

  // Calculate total estimated time
  const totalMinutes = incompleteTasks.reduce((sum, t) => sum + (t.duration || 0), 0)

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !onCreateTask) return

    await onCreateTask({
      title: newTaskTitle.trim(),
      dueDate: dateStr,
    })

    setNewTaskTitle('')
    setIsAddingTask(false)
  }, [newTaskTitle, dateStr, onCreateTask])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddTask()
    } else if (e.key === 'Escape') {
      setNewTaskTitle('')
      setIsAddingTask(false)
    }
  }

  const handleReorder = useCallback(
    (newOrder: Task[]) => {
      onReorderTasks?.(dateStr, newOrder.map((t) => t.id))
    },
    [dateStr, onReorderTasks]
  )

  // Handle drop from another column
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const taskId = e.dataTransfer.getData('taskId')
      if (taskId) {
        onMoveTask?.(taskId, dateStr)
      }
    },
    [dateStr, onMoveTask]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl border',
        theme === 'dark'
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-gray-50 border-gray-200',
        isToday && theme === 'dark' && 'ring-2 ring-blue-500/30 border-blue-500/50',
        isToday && theme === 'light' && 'ring-2 ring-blue-400/30 border-blue-400/50',
        isPast && 'opacity-75',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Day number circle */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg',
              isToday
                ? 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'bg-gray-200 text-gray-900'
            )}
          >
            {dayNum}
          </div>
          <div>
            <p
              className={cn(
                'text-sm font-medium',
                isToday
                  ? 'text-blue-400'
                  : theme === 'dark'
                    ? 'text-zinc-100'
                    : 'text-gray-900'
              )}
            >
              {isToday ? 'Today' : dayName}
            </p>
            <p
              className={cn(
                'text-xs',
                theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {monthName} {dayNum}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          {totalMinutes > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'bg-gray-200 text-gray-700'
              )}
            >
              <Clock className="w-3 h-3" />
              {formatDuration(totalMinutes)}
            </span>
          )}
          <span
            className={cn(
              'text-xs',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
            )}
          >
            {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Quick add button / input */}
      <div className={cn('px-3 py-2 border-b', theme === 'dark' ? 'border-zinc-800/50' : 'border-gray-100')}>
        {isAddingTask ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTaskTitle.trim()) {
                  setIsAddingTask(false)
                }
              }}
              placeholder="Task title..."
              autoFocus
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2',
                theme === 'dark'
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-blue-500/50'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-400/50'
              )}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  newTaskTitle.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                )}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setNewTaskTitle('')
                  setIsAddingTask(false)
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingTask(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              theme === 'dark'
                ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            <Plus className="w-4 h-4" />
            Add a task
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[200px] max-h-[500px]">
        {incompleteTasks.length === 0 ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-8 text-center',
              theme === 'dark' ? 'text-zinc-600' : 'text-gray-400'
            )}
          >
            {isToday ? (
              <>
                <Sunrise className="w-8 h-8 mb-2" />
                <p className="text-sm">No tasks for today</p>
                <p className="text-xs mt-1">Enjoy the free time!</p>
              </>
            ) : (
              <>
                <CalendarDays className="w-8 h-8 mb-2" />
                <p className="text-sm">No tasks scheduled</p>
              </>
            )}
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={incompleteTasks}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {incompleteTasks.map((task) => (
              <Reorder.Item
                key={task.id}
                value={task}
                dragListener={true}
                dragControls={dragControls}
                className="cursor-grab active:cursor-grabbing"
                onDragStart={(e: PointerEvent) => {
                  const event = e as unknown as DragEvent
                  if (event.dataTransfer) {
                    event.dataTransfer.setData('taskId', task.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }
                }}
              >
                <TaskCard
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onClick={onTaskClick}
                  onContextMenu={onTaskContextMenu}
                  theme={theme}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Completed section */}
      {completedTasks.length > 0 && (
        <div
          className={cn(
            'border-t',
            theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
          )}
        >
          <button
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2 text-xs transition-colors',
              theme === 'dark'
                ? 'text-zinc-500 hover:bg-zinc-800/50'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              {completedTasks.length} completed
            </span>
            {showCompletedSection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCompletedSection && (
            <div className="px-3 pb-3 space-y-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onClick={onTaskClick}
                  compact
                  theme={theme}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const DayColumn = memo(DayColumnComponent)
export default DayColumn
