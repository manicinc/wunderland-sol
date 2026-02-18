'use client'

/**
 * StrandTasksPanel Component
 *
 * Displays tasks associated with a Strand document.
 * Shows embedded tasks (from markdown checkboxes), linked tasks,
 * and allows creating new tasks linked to the strand.
 * Tasks are persisted to the database via useStrandTasks hook.
 *
 * @module components/quarry/ui/StrandTasksPanel
 */

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  AlertCircle,
  CalendarDays,
  ListTodo,
  ChevronRight,
  Sparkles,
  Link2,
  FileText,
  Loader2,
} from 'lucide-react'
import { isToday, isPast, parseISO } from 'date-fns'
import { useStrandTasks } from '@/lib/planner/hooks/useTasks'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import type { Task } from '@/lib/planner/types'

interface StrandTasksPanelProps {
  strandPath: string
  content?: string
  theme?: string
}

// Simplified task type for display (embedded tasks from markdown)
interface DisplayTask {
  id: string
  title: string
  taskType: 'embedded' | 'linked' | 'standalone'
  status: 'pending' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  lineNumber?: number
}

// Priority color mappings
const PRIORITY_COLORS = {
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
}

// Simple checkbox extraction from markdown
function extractCheckboxes(content: string): DisplayTask[] {
  if (!content) return []

  const lines = content.split('\n')
  const tasks: DisplayTask[] = []
  const checkboxRegex = /^(\s*)-\s+\[([ xX])\]\s+(.+)$/

  lines.forEach((line, index) => {
    const match = line.match(checkboxRegex)
    if (match) {
      const [, , status, text] = match
      const isCompleted = status.toLowerCase() === 'x'

      // Detect priority from text
      let priority: DisplayTask['priority'] = 'medium'
      const lowerText = text.toLowerCase()
      if (lowerText.includes('urgent') || lowerText.includes('asap') || text.includes('🔴')) {
        priority = 'urgent'
      } else if (lowerText.includes('important') || text.includes('🟠')) {
        priority = 'high'
      } else if (text.includes('🟢')) {
        priority = 'low'
      }

      // Extract due date from @due(date) pattern
      let dueDate: string | undefined
      const dueMatch = text.match(/@due[:\(]([^)\s]+)\)?/i)
      if (dueMatch) {
        dueDate = dueMatch[1]
      }

      // Clean task title
      const cleanTitle = text
        .replace(/@due[:\(][^)\s]+\)?/gi, '')
        .replace(/[🔴🟠🟡🟢]/g, '')
        .trim()

      tasks.push({
        id: `embedded-${index + 1}`,
        title: cleanTitle,
        taskType: 'embedded',
        status: isCompleted ? 'completed' : 'pending',
        priority,
        dueDate,
        lineNumber: index + 1,
      })
    }
  })

  return tasks
}

export default function StrandTasksPanel({
  strandPath,
  content = '',
  theme = 'light',
}: StrandTasksPanelProps) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')

  const resolvePath = useQuarryPath()
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')
  const isOceanic = theme.includes('oceanic')

  // Use persisted tasks from database
  const {
    tasks: persistedTasks,
    isLoading,
    createTask,
    toggleComplete,
    refresh,
  } = useStrandTasks(strandPath)

  // Convert persisted tasks to display format
  const linkedTasks: DisplayTask[] = useMemo(() => {
    return persistedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      taskType: task.taskType as DisplayTask['taskType'],
      status: task.status === 'completed' ? 'completed' : 'pending',
      priority: task.priority,
      dueDate: task.dueDate,
    }))
  }, [persistedTasks])

  // Extract embedded tasks from content
  const embeddedTasks = useMemo(() => {
    return extractCheckboxes(content)
  }, [content])

  // Combine and categorize tasks
  const { incompleteTasks, completedTasks, overdueTasks, todayTasks } = useMemo(() => {
    const allTasks = [...embeddedTasks, ...linkedTasks]
    const today = new Date()

    const overdue: DisplayTask[] = []
    const todaysDue: DisplayTask[] = []
    const incomplete: DisplayTask[] = []
    const completed: DisplayTask[] = []

    allTasks.forEach((task) => {
      if (task.status === 'completed') {
        completed.push(task)
      } else if (task.dueDate) {
        try {
          const dueDate = parseISO(task.dueDate)
          if (isPast(dueDate) && !isToday(dueDate)) {
            overdue.push(task)
          } else if (isToday(dueDate)) {
            todaysDue.push(task)
          } else {
            incomplete.push(task)
          }
        } catch {
          incomplete.push(task)
        }
      } else {
        incomplete.push(task)
      }
    })

    return {
      incompleteTasks: incomplete,
      completedTasks: completed,
      overdueTasks: overdue,
      todayTasks: todaysDue,
    }
  }, [embeddedTasks, linkedTasks])

  const totalPending = incompleteTasks.length + overdueTasks.length + todayTasks.length

  // Handle adding new linked task (persisted to database)
  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return

    await createTask({
      title: newTaskTitle.trim(),
      taskType: 'linked',
      strandPath,
      priority: newTaskPriority,
    })

    setNewTaskTitle('')
    setNewTaskPriority('medium')
    setShowAddTask(false)
  }, [newTaskTitle, newTaskPriority, strandPath, createTask])

  // Handle task toggle (for linked tasks only - embedded require content update)
  const handleToggle = useCallback(async (taskId: string) => {
    if (taskId.startsWith('embedded-')) {
      // For embedded tasks, show a hint
      console.log('[StrandTasksPanel] Edit the markdown to toggle embedded tasks')
      return
    }

    await toggleComplete(taskId)
  }, [toggleComplete])

  // Theme-aware section header
  const sectionHeaderClasses = `
    flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2
    ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
    ${isTerminal ? 'text-green-500/70 font-mono' : ''}
    ${isSepia ? 'font-serif' : ''}
  `

  // Accent colors based on theme
  const accentColor = isOceanic
    ? 'text-cyan-500'
    : isTerminal
      ? 'text-green-500'
      : 'text-rose-500'

  const accentBg = isOceanic
    ? 'bg-cyan-500'
    : isTerminal
      ? 'bg-green-500'
      : 'bg-rose-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className={`w-4 h-4 ${accentColor}`} />
          <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'} ${isSepia ? 'font-serif' : ''}`}>
            Strand Tasks
          </span>
          {totalPending > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
              {totalPending}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${accentColor}`}
          title="Add linked task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Strand info */}
      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <FileText className="w-3 h-3" />
        <span className="truncate font-mono">{strandPath.split('/').pop()}</span>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </div>
      )}

      {/* Quick Add Form */}
      {showAddTask && (
        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask()
              if (e.key === 'Escape') setShowAddTask(false)
            }}
            placeholder="Add a task linked to this strand..."
            autoFocus
            className={`w-full px-2 py-1.5 text-sm rounded border ${
              isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400'
            } focus:outline-none focus:ring-2 focus:ring-rose-500/50`}
          />
          {/* Priority selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Priority:</span>
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setNewTaskPriority(p)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  newTaskPriority === p
                    ? `${PRIORITY_COLORS[p].bg} ${PRIORITY_COLORS[p].text} font-medium`
                    : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => setShowAddTask(false)}
              className={`px-2 py-1 text-xs rounded ${isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className={`px-2 py-1 text-xs rounded ${accentBg} text-white hover:opacity-90 disabled:opacity-50`}
            >
              Add Task
            </button>
          </div>
        </div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <TaskSection
          title="Overdue"
          icon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          tasks={overdueTasks}
          onToggle={handleToggle}
          isDark={isDark}
          isSepia={isSepia}
          titleColor="text-red-500"
        />
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <TaskSection
          title="Due Today"
          icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          tasks={todayTasks}
          onToggle={handleToggle}
          isDark={isDark}
          isSepia={isSepia}
          titleColor="text-amber-500"
        />
      )}

      {/* Active Tasks */}
      {incompleteTasks.length > 0 && (
        <TaskSection
          title="Active"
          icon={<Clock className="w-3.5 h-3.5" />}
          tasks={incompleteTasks}
          onToggle={handleToggle}
          isDark={isDark}
          isSepia={isSepia}
        />
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <TaskSection
          title="Completed"
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          tasks={completedTasks.slice(0, 5)}
          onToggle={handleToggle}
          isDark={isDark}
          isSepia={isSepia}
          titleColor="text-emerald-500"
          collapsed={completedTasks.length > 5}
          extraCount={completedTasks.length - 5}
        />
      )}

      {/* Empty State */}
      {embeddedTasks.length === 0 && linkedTasks.length === 0 && (
        <div className={`text-center py-6 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No tasks found</p>
          <p className="text-xs mt-1">
            Add checkboxes in your markdown or create linked tasks
          </p>
          <div className={`mt-3 p-2 rounded-lg text-xs ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
            <code className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              - [ ] Task description
            </code>
          </div>
        </div>
      )}

      {/* Link to Planner */}
      <a
        href={resolvePath('/quarry/plan')}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
          isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Open Full Planner
        <ChevronRight className="w-3 h-3" />
      </a>
    </div>
  )
}

// Task Section Component
interface TaskSectionProps {
  title: string
  icon: React.ReactNode
  tasks: DisplayTask[]
  onToggle: (id: string) => void
  isDark: boolean
  isSepia: boolean
  titleColor?: string
  collapsed?: boolean
  extraCount?: number
}

function TaskSection({
  title,
  icon,
  tasks,
  onToggle,
  isDark,
  isSepia,
  titleColor,
  collapsed,
  extraCount,
}: TaskSectionProps) {
  return (
    <div>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 ${titleColor || (isDark ? 'text-zinc-400' : 'text-zinc-500')}`}>
        {icon}
        <span>{title} ({tasks.length}{extraCount && extraCount > 0 ? `+${extraCount}` : ''})</span>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            isDark={isDark}
            isSepia={isSepia}
          />
        ))}
      </div>
    </div>
  )
}

// Task Item Component
interface TaskItemProps {
  task: DisplayTask
  onToggle: () => void
  isDark: boolean
  isSepia: boolean
}

function TaskItem({ task, onToggle, isDark, isSepia }: TaskItemProps) {
  const isCompleted = task.status === 'completed'
  const isEmbedded = task.taskType === 'embedded'
  const priorityStyles = PRIORITY_COLORS[task.priority]

  return (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-lg transition-colors
        ${isCompleted ? 'opacity-60' : ''}
        ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}
        ${isEmbedded ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={isEmbedded ? undefined : onToggle}
    >
      <button
        className={`mt-0.5 flex-shrink-0 transition-colors ${priorityStyles.text}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        disabled={isEmbedded}
        title={isEmbedded ? 'Edit markdown to toggle' : 'Toggle completion'}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-tight ${
            isCompleted ? 'line-through' : ''
          } ${isDark ? 'text-zinc-200' : 'text-zinc-700'} ${isSepia ? 'font-serif' : ''}`}
        >
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Task Type Badge */}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              task.taskType === 'embedded'
                ? isDark
                  ? 'bg-violet-900/30 text-violet-400'
                  : 'bg-violet-100 text-violet-600'
                : isDark
                  ? 'bg-cyan-900/30 text-cyan-400'
                  : 'bg-cyan-100 text-cyan-600'
            }`}
          >
            {task.taskType === 'embedded' ? (
              <span className="flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" />
                L{task.lineNumber}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Link2 className="w-2.5 h-2.5" />
                linked
              </span>
            )}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {task.dueDate}
            </span>
          )}

          {/* Priority Indicator */}
          {task.priority !== 'medium' && (
            <span className={`text-[10px] ${priorityStyles.text}`}>
              {task.priority === 'urgent' ? '!!' : task.priority === 'high' ? '!' : '○'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
