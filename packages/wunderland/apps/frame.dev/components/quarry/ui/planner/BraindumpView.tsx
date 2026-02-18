'use client'

/**
 * Braindump View
 *
 * Quick capture inbox for tasks without scheduling.
 * Inspired by Ellie's Braindump feature - a place to dump
 * all your tasks before organizing them.
 *
 * @module components/quarry/ui/planner/BraindumpView
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus,
  Inbox,
  Calendar,
  Clock,
  GripVertical,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Circle,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, CreateTaskInput } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { useProjects } from '@/lib/planner/hooks/useProjects'
import { getProjectColor, getProjectColorWithOpacity, PROJECT_ICONS } from '@/lib/planner/projects'

// ============================================================================
// TYPES
// ============================================================================

export interface BraindumpViewProps {
  /** Tasks to display */
  tasks: Task[]
  /** Called when a task is created */
  onCreateTask: (input: CreateTaskInput) => Promise<Task | null>
  /** Called when a task is updated */
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  /** Called when a task is deleted */
  onDeleteTask: (id: string) => Promise<boolean>
  /** Called when task completion is toggled */
  onToggleComplete: (id: string) => Promise<Task | null>
  /** Called when a task is scheduled (moved to a specific day) */
  onScheduleTask?: (taskId: string, date: Date) => void
  /** Called when reorder happens */
  onReorderTasks?: (taskIds: string[]) => void
  /** Show completed tasks section */
  showCompleted?: boolean
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

interface TaskItemProps {
  task: Task
  isDark: boolean
  onToggle: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<Task>) => void
  onSchedule?: (date: Date) => void
}

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

function TaskItem({ task, isDark, onToggle, onDelete, onUpdate, onSchedule }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const [showMenu, setShowMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { projects } = useProjects()

  const projectColor = getProjectColor(task.project)
  const projectBgColor = getProjectColorWithOpacity(task.project, 0.15)
  const project = projects.find((p) => p.id === task.project)
  const ProjectIcon = project ? PROJECT_ICONS[project.icon] : null

  const isCompleted = task.status === 'completed'

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(() => {
    if (editValue.trim() && editValue !== task.title) {
      onUpdate({ title: editValue.trim() })
    }
    setIsEditing(false)
  }, [editValue, task.title, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave()
      } else if (e.key === 'Escape') {
        setEditValue(task.title)
        setIsEditing(false)
      }
    },
    [handleSave, task.title]
  )

  return (
    <Reorder.Item
      value={task}
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-xl',
        'transition-all duration-200',
        isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50',
        isCompleted && 'opacity-60'
      )}
      style={{
        borderLeft: `3px solid ${projectColor}`,
        backgroundColor: isDark ? 'transparent' : projectBgColor,
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Drag handle */}
      <div
        className={cn(
          'mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity',
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        )}
      >
        <GripVertical size={14} />
      </div>

      {/* Checkbox */}
      <button
        className={cn(
          'mt-0.5 shrink-0 transition-colors',
          isCompleted
            ? 'text-emerald-500'
            : isDark
              ? 'text-zinc-600 hover:text-zinc-400'
              : 'text-zinc-400 hover:text-zinc-600'
        )}
        onClick={onToggle}
      >
        {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full bg-transparent border-none outline-none',
              'text-sm font-medium',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}
          />
        ) : (
          <button
            className={cn(
              'text-left text-sm font-medium w-full',
              isCompleted && 'line-through',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </button>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Project badge */}
          {project && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                'text-[10px] font-medium'
              )}
              style={{
                backgroundColor: projectBgColor,
                color: projectColor,
              }}
            >
              {ProjectIcon && <ProjectIcon size={10} />}
              {project.name}
            </span>
          )}

          {/* Duration */}
          {task.duration && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}
            >
              <Clock size={10} />
              {formatDuration(task.duration)}
            </span>
          )}

          {/* Subtasks indicator (if we add subtasks later) */}
          {task.tags && task.tags.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}
            >
              <Tag size={10} />
              {task.tags.length}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onSchedule && (
          <button
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
                : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
            )}
            onClick={() => onSchedule(new Date())}
            title="Schedule for today"
          >
            <Calendar size={14} />
          </button>
        )}
        <button
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isDark
              ? 'hover:bg-red-900/50 text-zinc-500 hover:text-red-400'
              : 'hover:bg-red-100 text-zinc-400 hover:text-red-500'
          )}
          onClick={onDelete}
          title="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Reorder.Item>
  )
}

// ============================================================================
// QUICK ADD COMPONENT
// ============================================================================

interface QuickAddProps {
  onAdd: (title: string, projectId?: string) => void
  isDark: boolean
  placeholder?: string
}

function QuickAdd({ onAdd, isDark, placeholder = 'Add a task...' }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | undefined>()
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { projects } = useProjects()

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onAdd(value.trim(), selectedProject)
      setValue('')
      setSelectedProject(undefined)
    }
  }, [value, selectedProject, onAdd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const selectedProjectData = selectedProject ? projects.find((p) => p.id === selectedProject) : null
  const ProjectIcon = selectedProjectData ? PROJECT_ICONS[selectedProjectData.icon] : null

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-xl border',
        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
      )}
    >
      <Plus
        size={18}
        className={cn(isDark ? 'text-zinc-600' : 'text-zinc-400')}
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent border-none outline-none text-sm',
          isDark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'
        )}
      />

      {/* Project selector */}
      <div className="relative">
        <button
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors',
            selectedProject
              ? ''
              : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
          )}
          style={
            selectedProject
              ? {
                  backgroundColor: getProjectColorWithOpacity(selectedProject, 0.2),
                  color: getProjectColor(selectedProject),
                }
              : undefined
          }
          onClick={() => setShowProjectPicker(!showProjectPicker)}
        >
          {selectedProjectData && ProjectIcon ? (
            <>
              <ProjectIcon size={12} />
              {selectedProjectData.name}
            </>
          ) : (
            <>
              <Tag size={12} />
              Project
            </>
          )}
          <ChevronDown size={12} />
        </button>

        <AnimatePresence>
          {showProjectPicker && (
            <motion.div
              className={cn(
                'absolute right-0 top-full mt-1 z-50 min-w-[160px]',
                'rounded-lg border shadow-lg py-1',
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              )}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <button
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs text-left',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
                onClick={() => {
                  setSelectedProject(undefined)
                  setShowProjectPicker(false)
                }}
              >
                No project
              </button>
              {projects.map((p) => {
                const Icon = PROJECT_ICONS[p.icon]
                return (
                  <button
                    key={p.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs text-left',
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                    )}
                    style={{ color: p.color }}
                    onClick={() => {
                      setSelectedProject(p.id)
                      setShowProjectPicker(false)
                    }}
                  >
                    {Icon && <Icon size={14} />}
                    {p.name}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit button */}
      {value.trim() && (
        <motion.button
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium',
            'bg-emerald-600 text-white hover:bg-emerald-500'
          )}
          onClick={handleSubmit}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
        >
          Add
        </motion.button>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BraindumpView({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onScheduleTask,
  onReorderTasks,
  showCompleted = false,
  theme = 'dark',
  className,
}: BraindumpViewProps) {
  const isDark = theme === 'dark'
  const [expandCompleted, setExpandCompleted] = useState(false)

  // Separate pending and completed tasks
  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== 'completed')
    const completed = tasks.filter((t) => t.status === 'completed')
    return { pendingTasks: pending, completedTasks: completed }
  }, [tasks])

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return pendingTasks.reduce((sum, t) => sum + (t.duration || 0), 0)
  }, [pendingTasks])

  // Handle quick add
  const handleQuickAdd = useCallback(
    async (title: string, projectId?: string) => {
      await onCreateTask({
        title,
        project: projectId,
        taskType: 'standalone',
      })
    },
    [onCreateTask]
  )

  // Handle reorder
  const handleReorder = useCallback(
    (reorderedTasks: Task[]) => {
      onReorderTasks?.(reorderedTasks.map((t) => t.id))
    },
    [onReorderTasks]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <header
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b shrink-0',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2">
          <Inbox size={20} className={cn(isDark ? 'text-amber-500' : 'text-amber-600')} />
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Braindump
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
            {pendingTasks.length} tasks
            {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
          </div>
        </div>
      </header>

      {/* Quick Add */}
      <div className={cn('px-4 py-3 border-b shrink-0', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <QuickAdd onAdd={handleQuickAdd} isDark={isDark} />
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {pendingTasks.length === 0 ? (
          <motion.div
            className={cn(
              'flex flex-col items-center justify-center py-12 text-center',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Your brain is clear!</p>
            <p className="text-xs opacity-75">Add tasks above to capture your thoughts</p>
          </motion.div>
        ) : (
          <Reorder.Group
            axis="y"
            values={pendingTasks}
            onReorder={handleReorder}
            className="space-y-2"
          >
            <AnimatePresence mode="popLayout">
              {pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isDark={isDark}
                  onToggle={() => onToggleComplete(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                  onUpdate={(updates) => onUpdateTask(task.id, updates)}
                  onSchedule={onScheduleTask ? (date) => onScheduleTask(task.id, date) : undefined}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}

        {/* Completed Section */}
        {showCompleted && completedTasks.length > 0 && (
          <div className={cn('mt-6 pt-4 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
            <button
              className={cn(
                'flex items-center gap-2 w-full text-left py-2 text-sm font-medium',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}
              onClick={() => setExpandCompleted(!expandCompleted)}
            >
              {expandCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Completed ({completedTasks.length})
            </button>

            <AnimatePresence>
              {expandCompleted && (
                <motion.div
                  className="space-y-2 mt-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isDark={isDark}
                      onToggle={() => onToggleComplete(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                      onUpdate={(updates) => onUpdateTask(task.id, updates)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default BraindumpView
