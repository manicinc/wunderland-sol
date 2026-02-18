'use client'

/**
 * PlannerFullView - Comprehensive Calendar/Planner with Multiple Views
 * @module codex/ui/PlannerFullView
 *
 * @description
 * Orchestrates Day, Week, Month, and Agenda views with:
 * - ViewSwitcher for toggling views
 * - DragDropProvider for event manipulation
 * - Google Calendar sync status
 * - Inline task editor
 *
 * Note: Task sidebar moved to PlannerRightSidebar (QuarryPageLayout right panel).
 */

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Home,
  Settings,
  Download,
  FileText,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react'
import Link from 'next/link'

// Hooks
import { useTasks } from '@/lib/planner/hooks/useTasks'
import type { Task, CreateTaskInput, UpdateTaskInput, PlannerView, CalendarEvent } from '@/lib/planner/types'
import { useResponsive, useOrientation } from '@/components/quarry/hooks/useMediaQuery'

// View Components
import { ViewSwitcher, ViewSwitcherCompact } from './ViewSwitcher'
import DayView from './DayView'
import WeekView from './WeekView'
import MonthView from './MonthView'
import AgendaView from './AgendaView'
import { KanbanBoard } from './KanbanView'
import { DragDropProvider } from './DragDropProvider'
import InlineTaskEditor from './InlineTaskEditor'
import { useStrandTags } from '@/lib/planner/useStrandTags'
import { useToast } from '../common/Toast'
import { HabitDashboard } from '../habits/HabitDashboard'
import { TimelineSpine } from './TimelineSpine'
import { taskToTimelineItem } from '@/lib/planner/timelineUtils'
import type { TimelineItem } from '@/lib/planner/timelineUtils'


// Download helper
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface PlannerFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

// Dark themes
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']
const TASK_OPTIONS = { includeCompleted: true } as const

export default function PlannerFullView({ theme = 'light', onOpenPreferences, onNavigateToStrand }: PlannerFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)

  // Responsive hooks for mobile optimization
  const { isMobile, isSmallScreen } = useResponsive()
  const { isPortrait } = useOrientation()

  const isMobilePortrait = isMobile && isPortrait

  // View state - default to day view on mobile, week on desktop
  const [view, setView] = useState<PlannerView>(() => isMobile ? 'day' : 'week')
  const [currentDate, setCurrentDate] = useState(() => new Date())

  // Inline task editor state (no modal)
  const [showInlineEditor, setShowInlineEditor] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [inlineEditorTime, setInlineEditorTime] = useState('')

  // UI state
  const [dbError, setDbError] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Hooks
  const {
    tasks: rawTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
  } = useTasks(TASK_OPTIONS)

  // Ensure tasks is always an array (defensive coding for edge cases)
  const tasks = Array.isArray(rawTasks) ? rawTasks : []

  // Toast for user feedback
  const toast = useToast()

  // Tags from strands for autocomplete
  const { tags: rawAvailableTags } = useStrandTags()
  // Ensure availableTags is always an array (defensive coding)
  const availableTags = Array.isArray(rawAvailableTags) ? rawAvailableTags : []

  // Calendar events (empty for now, will be populated by Google Calendar sync)
  const [events] = useState<CalendarEvent[]>([])

  // Check for database errors
  useEffect(() => {
    if (error) {
      console.error('[Planner] Error:', error)
      if (error.message?.includes('object store') || error.message?.includes('IndexedDB')) {
        setDbError('Database schema needs to be updated. This can happen after an app update.')
      } else {
        setDbError(error.message)
      }
    }
  }, [error])

  // Date navigation
  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  // View change with smart date adjustment
  const handleViewChange = useCallback((newView: PlannerView) => {
    setView(newView)
  }, [])

  // Navigate to day view when clicking on a day header in week/month view
  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date)
    setView('day')
  }, [])

  // Slot click - create event/task at specific time (inline editor)
  const handleSlotClick = useCallback((date: Date, hour: number, minute: number) => {
    setCurrentDate(date)
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    setInlineEditorTime(timeStr)
    setEditingTask(null)
    setShowInlineEditor(true)
  }, [])

  // Open inline editor to add new task
  const handleOpenAddTask = useCallback(() => {
    setEditingTask(null)
    setInlineEditorTime('')
    setShowInlineEditor(true)
  }, [])

  // Open inline editor to edit existing task, or navigate to strand if linked
  const handleEditTask = useCallback((task: Task) => {
    console.log('[Planner] Task clicked:', task.title, 'strandPath:', task.strandPath, 'taskType:', task.taskType, 'onNavigateToStrand:', !!onNavigateToStrand)

    // If task is linked to a strand, navigate to it
    if (task.strandPath && onNavigateToStrand) {
      console.log('[Planner] Navigating to strand:', task.strandPath)
      toast.info(`Opening strand: ${task.strandPath.split('/').pop()}`)
      onNavigateToStrand(task.strandPath)
      return
    }

    // Standalone task - show info toast if user might expect navigation
    if (task.taskType === 'standalone') {
      console.log('[Planner] Standalone task - no strand linked')
    }

    // Open the editor
    console.log('[Planner] Opening editor for task:', task.title)
    setEditingTask(task)
    setInlineEditorTime(task.dueTime || '')
    setShowInlineEditor(true)
  }, [onNavigateToStrand, toast])

  // Save from inline editor
  const handleInlineSave = useCallback(async (input: CreateTaskInput | UpdateTaskInput) => {
    if (editingTask) {
      // Update existing task
      await updateTask(editingTask.id, input as UpdateTaskInput)
    } else {
      // Create new task - ensure title is present
      if (!input.title) {
        console.warn('Task title is required for creation')
        return
      }
      await createTask({
        ...(input as CreateTaskInput),
        dueDate: input.dueDate || format(currentDate, 'yyyy-MM-dd'),
        taskType: 'standalone',
      })
    }
    setShowInlineEditor(false)
    setEditingTask(null)
  }, [editingTask, currentDate, createTask, updateTask])

  // Cancel inline editor
  const handleInlineCancel = useCallback(() => {
    setShowInlineEditor(false)
    setEditingTask(null)
  }, [])

  // Delete task from inline editor
  const handleInlineDelete = useCallback(async (taskId: string) => {
    await deleteTask(taskId)
    setShowInlineEditor(false)
    setEditingTask(null)
  }, [deleteTask])

  // Task toggle
  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    await toggleComplete(taskId)
  }, [toggleComplete])

  // Export functions
  const handleExport = useCallback((exportFormat: 'ics' | 'markdown' | 'csv' | 'text') => {
    const today = format(currentDate, 'yyyy-MM-dd')
    const relevantTasks = tasks.filter(t => t.dueDate === today || !t.dueDate)

    if (exportFormat === 'ics') {
      const icsEvents = relevantTasks.map(task => {
        const date = task.dueDate?.replace(/-/g, '') || format(new Date(), 'yyyyMMdd')
        return [
          'BEGIN:VEVENT',
          `DTSTART;VALUE=DATE:${date}`,
          `DTEND;VALUE=DATE:${date}`,
          `SUMMARY:${task.title}`,
          `DESCRIPTION:${task.description || ''}`,
          `STATUS:${task.status === 'completed' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
          `UID:${task.id}@quarry.planner`,
          'END:VEVENT',
        ].join('\r\n')
      })

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Quarry//Planner//EN',
        'CALSCALE:GREGORIAN',
        ...icsEvents,
        'END:VCALENDAR',
      ].join('\r\n')

      downloadFile(ics, 'agenda.ics', 'text/calendar')
    } else if (exportFormat === 'markdown') {
      let md = `# Agenda: ${format(currentDate, 'MMMM d, yyyy')}\n\n`
      for (const task of relevantTasks) {
        const checkbox = task.status === 'completed' ? '[x]' : '[ ]'
        md += `- ${checkbox} ${task.title}\n`
        if (task.description) md += `  > ${task.description}\n`
      }
      downloadFile(md, 'agenda.md', 'text/markdown')
    } else if (exportFormat === 'csv') {
      const headers = ['Date', 'Title', 'Priority', 'Status', 'Description']
      const rows = relevantTasks.map(task => [
        task.dueDate || '',
        `"${task.title.replace(/"/g, '""')}"`,
        task.priority,
        task.status,
        `"${(task.description || '').replace(/"/g, '""')}"`,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      downloadFile(csv, 'agenda.csv', 'text/csv')
    } else {
      let text = `AGENDA - ${format(currentDate, 'MMMM d, yyyy')}\n${'='.repeat(40)}\n\n`
      for (const task of relevantTasks) {
        const status = task.status === 'completed' ? '✓' : '○'
        text += `${status} ${task.title} [${task.priority}]\n`
        if (task.description) text += `   ${task.description}\n`
      }
      downloadFile(text, 'agenda.txt', 'text/plain')
    }
    setShowExportMenu(false)
  }, [currentDate, tasks])

  // Clear database for error recovery
  const handleClearDatabase = useCallback(async () => {
    if (!confirm('This will clear your planner data and reinitialize. Continue?')) return

    setIsClearing(true)
    try {
      const databases = await indexedDB.databases()
      for (const db of databases) {
        if (db.name && db.name.includes('codex')) {
          indexedDB.deleteDatabase(db.name)
        }
      }
      window.location.reload()
    } catch (err) {
      console.error('[Planner] Failed to clear database:', err)
      setIsClearing(false)
    }
  }, [])

  // Error state
  if (dbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`max-w-md w-full p-6 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Database Error
            </h2>
          </div>
          <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{dbError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
            >
              {isClearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear & Reinit
            </button>
          </div>
          <Link
            href="/quarry"
            className={`mt-4 flex items-center justify-center gap-2 text-sm ${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600'}`}
          >
            <Home className="w-4 h-4" />
            Return to Codex
          </Link>
        </div>
      </div>
    )
  }

  return (
    <DragDropProvider>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - responsive with wrapping on small screens */}
        <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 border-b flex-shrink-0 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          {/* View Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <ViewSwitcher
              view={view}
              onViewChange={handleViewChange}
              className="hidden lg:flex"
            />
            <ViewSwitcherCompact
              view={view}
              onViewChange={handleViewChange}
              className="lg:hidden"
            />
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Export dropdown - hidden on small screens */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                  }`}>
                    {[
                      { format: 'ics' as const, label: 'Calendar (.ics)', icon: Calendar, color: 'text-blue-500' },
                      { format: 'markdown' as const, label: 'Markdown (.md)', icon: FileText, color: 'text-purple-500' },
                      { format: 'csv' as const, label: 'Spreadsheet (.csv)', icon: FileSpreadsheet, color: 'text-green-500' },
                      { format: 'text' as const, label: 'Plain Text (.txt)', icon: FileText, color: 'text-zinc-500' },
                    ].map(({ format, label, icon: Icon, color }) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                          isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${color}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Add Task - compact on smaller screens */}
            <button
              onClick={handleOpenAddTask}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              title="Add Task"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Add Task</span>
            </button>

            {/* Settings button - hidden on mobile */}
            <button
              onClick={onOpenPreferences}
              className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Calendar view */}
          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-stone-50'}`}>
            {view === 'day' && (
              <DayView
                date={currentDate}
                events={events}
                tasks={tasks}
                onDateChange={handleDateChange}
                onSlotClick={handleSlotClick}
                onEventClick={() => {}}
                onTaskClick={handleEditTask}
                onTaskToggle={handleTaskToggle}
              />
            )}

            {view === 'week' && (
              <WeekView
                date={currentDate}
                events={events}
                tasks={tasks}
                onDateChange={handleDateChange}
                onDayClick={handleDayClick}
                onSlotClick={handleSlotClick}
                onEventClick={() => {}}
                onTaskClick={handleEditTask}
                onTaskToggle={handleTaskToggle}
              />
            )}

            {view === 'month' && (
              <MonthView
                date={currentDate}
                events={events}
                tasks={tasks}
                onDateChange={handleDateChange}
                onDayClick={() => {}}
                onDayDoubleClick={handleDayClick}
                onEventClick={() => {}}
                onTaskClick={handleEditTask}
              />
            )}

            {view === 'agenda' && (
              <AgendaView
                date={currentDate}
                events={events}
                tasks={tasks}
                onDateChange={handleDateChange}
                onEventClick={() => {}}
                onTaskClick={handleEditTask}
                onTaskToggle={handleTaskToggle}
                onExport={handleExport}
                theme={isDark ? 'dark' : 'light'}
              />
            )}

            {view === 'kanban' && (
              <KanbanBoard
                tasks={tasks}
                onUpdateTask={updateTask}
                onCreateTask={createTask}
                onTaskClick={handleEditTask}
                onTaskToggle={(taskId) => handleTaskToggle(taskId, false)}
                theme={isDark ? 'dark' : 'light'}
              />
            )}

            {view === 'habits' && (
              <div className={`flex-1 overflow-y-auto p-4 ${isDark ? 'bg-zinc-950' : 'bg-stone-50'}`}>
                <HabitDashboard />
              </div>
            )}

            {view === 'timeline' && (
              <div className={`flex-1 overflow-y-auto p-4 ${isDark ? 'bg-zinc-950' : 'bg-stone-50'}`}>
                <div className="max-w-4xl mx-auto px-8 py-12">
                  <TimelineSpine
                    items={tasks
                      .filter(t => t.dueDate === format(currentDate, 'yyyy-MM-dd'))
                      .map(taskToTimelineItem)
                      .filter((item): item is TimelineItem => item !== null)
                    }
                    theme={isDark ? 'dark' : 'light'}
                    onItemClick={(item) => {
                      const task = tasks.find(t => t.id === item.id)
                      if (task) handleEditTask(task)
                    }}
                    onItemToggle={(itemId, completed) => handleTaskToggle(itemId, completed)}
                    onSlotClick={(time) => handleSlotClick(currentDate, time.getHours(), time.getMinutes())}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Inline Task Editor (replaces modal) - mobile optimized */}
        {showInlineEditor && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={handleInlineCancel} />
            <div className={`fixed z-50 ${
              isMobile
                ? 'inset-x-2 top-4 bottom-4 flex items-start justify-center overflow-y-auto'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg'
            } ${isDark ? 'shadow-2xl shadow-black/50' : 'shadow-2xl shadow-zinc-400/30'}`}>
              <div className={isMobile ? 'w-full max-w-lg' : ''}>
                <InlineTaskEditor
                  task={editingTask || undefined}
                  initialDate={currentDate}
                  initialTime={inlineEditorTime}
                  availableTags={availableTags}
                  onSave={handleInlineSave}
                  onCancel={handleInlineCancel}
                  onDelete={editingTask ? () => handleInlineDelete(editingTask.id) : undefined}
                  onNavigateToStrand={onNavigateToStrand}
                  theme={theme}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </DragDropProvider>
  )
}
