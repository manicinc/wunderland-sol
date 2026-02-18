/**
 * Planner/Calendar Type Definitions
 *
 * Comprehensive types for the planner app including:
 * - Tasks (standalone, linked, embedded)
 * - Calendar events
 * - Google Calendar sync
 * - Recurrence rules
 *
 * @module lib/planner/types
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type TaskType = 'standalone' | 'linked' | 'embedded'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SyncStatus = 'local' | 'synced' | 'pending_sync' | 'conflict' | 'error'
export type PlannerView = 'day' | 'week' | 'month' | 'agenda' | 'timeline' | 'kanban' | 'habits'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
}

/**
 * Common duration options in minutes (Google Calendar parity)
 */
export const DURATION_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 360, label: '6 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
] as const

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// ============================================================================
// SUBTASK TYPES
// ============================================================================

/**
 * Subtask record - nested checklist items within a task
 */
export interface Subtask {
  id: string
  parentTaskId: string
  title: string
  completed: boolean
  completedAt?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new subtask
 */
export interface CreateSubtaskInput {
  parentTaskId: string
  title: string
  sortOrder?: number
}

/**
 * Input for updating a subtask
 */
export interface UpdateSubtaskInput {
  title?: string
  completed?: boolean
  sortOrder?: number
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Recurrence rule following RFC 5545 RRULE format
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  endDate?: string
  count?: number
  byDay?: number[] // 0-6 for weekly (0 = Sunday)
  byMonthDay?: number[] // 1-31 for monthly
  byMonth?: number[] // 1-12 for yearly
}

/**
 * Task record - supports standalone, linked, and embedded tasks
 */
export interface Task {
  id: string

  // Content
  title: string
  description?: string

  // Type and linking
  taskType: TaskType
  strandPath?: string
  sourceLineNumber?: number
  checkboxText?: string // Original checkbox text for embedded tasks

  // Status
  status: TaskStatus
  priority: TaskPriority

  // Dates & Duration
  dueDate?: string // ISO date (YYYY-MM-DD)
  dueTime?: string // ISO time (HH:mm) - start time
  duration?: number // Estimated duration in minutes (15, 30, 60, 90, 120, etc.)
  actualDuration?: number // Actual time spent in minutes (from timer)
  timerStartedAt?: string // ISO datetime when timer was started
  timerAccumulatedMs?: number // Accumulated time in ms (for pause/resume)
  reminderAt?: string // ISO datetime
  completedAt?: string

  // Recurrence
  recurrenceRule?: RecurrenceRule
  recurrenceEndDate?: string
  parentTaskId?: string // For recurring instances

  // Organization
  tags?: string[]
  project?: string

  // Google Calendar sync
  googleEventId?: string
  googleCalendarId?: string
  syncStatus: SyncStatus
  localVersion: number
  remoteVersion: number
  lastSyncedAt?: string
  etag?: string

  // Soft delete
  isDeleted: boolean
  deletedAt?: string

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  title: string
  description?: string
  taskType?: TaskType
  strandPath?: string
  sourceLineNumber?: number
  checkboxText?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  dueTime?: string
  duration?: number // Duration in minutes
  reminderAt?: string
  recurrenceRule?: RecurrenceRule
  recurrenceEndDate?: string
  tags?: string[]
  project?: string
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  dueTime?: string | null
  duration?: number | null // Estimated duration in minutes
  actualDuration?: number | null // Actual time spent
  timerStartedAt?: string | null // Timer start time
  timerAccumulatedMs?: number | null // Accumulated time
  reminderAt?: string | null
  recurrenceRule?: RecurrenceRule | null
  tags?: string[]
  project?: string | null
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event attendee
 */
export interface EventAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  organizer?: boolean
  self?: boolean
}

/**
 * Calendar event - time-blocked events
 */
export interface CalendarEvent {
  id: string

  // Content
  title: string
  description?: string
  location?: string

  // Timing
  startDatetime: string // ISO datetime
  endDatetime: string // ISO datetime
  allDay: boolean
  timezone: string

  // Recurrence
  recurrenceRule?: RecurrenceRule
  recurrenceEndDate?: string
  parentEventId?: string

  // Attendees
  attendees?: EventAttendee[]

  // Visual
  color?: string

  // Linking
  linkedTaskId?: string
  strandPath?: string

  // Sync metadata
  googleEventId?: string
  googleCalendarId?: string
  syncStatus: SyncStatus
  localVersion: number
  remoteVersion: number
  lastSyncedAt?: string
  etag?: string

  // Soft delete
  isDeleted: boolean
  deletedAt?: string

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a calendar event
 */
export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  startDatetime: string
  endDatetime: string
  allDay?: boolean
  timezone?: string
  recurrenceRule?: RecurrenceRule
  attendees?: EventAttendee[]
  color?: string
  linkedTaskId?: string
  strandPath?: string
}

/**
 * Input for updating a calendar event
 */
export interface UpdateEventInput {
  title?: string
  description?: string
  location?: string
  startDatetime?: string
  endDatetime?: string
  allDay?: boolean
  timezone?: string
  recurrenceRule?: RecurrenceRule | null
  recurrenceEndDate?: string | null
  attendees?: EventAttendee[]
  color?: string | null
  linkedTaskId?: string | null
  strandPath?: string | null
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Sync cursor for resumable sync operations
 */
export interface SyncCursor {
  position: number
  entityType: 'task' | 'event'
  lastProcessedId?: string
}

/**
 * Sync state for Google Calendar
 */
export interface SyncState {
  id: string
  googleSyncToken?: string
  lastFullSyncAt?: string
  lastIncrementalSyncAt?: string
  syncCursor?: SyncCursor
  pendingConflicts: number
  lastConflictAt?: string
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  lastError?: string
  lastErrorAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Change log entry for offline-first sync
 */
export interface ChangeLogEntry {
  id: string
  entityType: 'task' | 'event'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  fieldChanges?: Record<string, { old: unknown; new: unknown }>
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict'
  syncAttempts: number
  lastSyncAttemptAt?: string
  syncError?: string
  sequenceNumber: number
  createdAt: string
}

/**
 * Sync conflict between local and remote versions
 */
export interface SyncConflict {
  id: string
  entityType: 'task' | 'event'
  entityId: string
  localVersion: Task | CalendarEvent
  remoteVersion: GoogleCalendarEvent
  conflictFields: string[]
  resolution?: 'keep_local' | 'keep_remote' | 'merge' | 'pending'
  resolvedAt?: string
}

// ============================================================================
// GOOGLE CALENDAR TYPES
// ============================================================================

/**
 * Encrypted OAuth tokens for Google Calendar
 */
export interface GoogleCalendarTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
  tokenType: string
  userEmail?: string
  userId?: string
}

/**
 * Google Calendar metadata
 */
export interface GoogleCalendar {
  id: string
  googleCalendarId: string
  name: string
  description?: string
  color?: string
  isPrimary: boolean
  isSelected: boolean
  accessRole: 'owner' | 'writer' | 'reader'
  lastSyncedAt?: string
}

/**
 * Google Calendar Event (from API)
 */
export interface GoogleCalendarEvent {
  id: string
  calendarId: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  recurrence?: string[]
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  etag: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
}

// ============================================================================
// EMBEDDED TASK EXTRACTION
// ============================================================================

/**
 * Extracted checkbox from markdown content
 */
export interface ExtractedCheckbox {
  lineNumber: number
  text: string
  checked: boolean
  indentLevel: number
  raw: string // Original line
  priority?: TaskPriority
  dueDate?: string
}

/**
 * Mapping of tasks extracted from a strand
 */
export interface StrandTaskMapping {
  strandPath: string
  checkboxes: ExtractedCheckbox[]
  lastExtractedAt: string
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Drag state for event manipulation
 */
export interface DragState {
  eventId: string
  type: 'move' | 'resize-start' | 'resize-end'
  originalStart: Date
  originalEnd: Date
  currentPosition: { x: number; y: number }
}

/**
 * Time slot for calendar grid rendering
 */
export interface TimeSlot {
  hour: number
  minute: number
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  isNow: boolean
  isPast: boolean
}

/**
 * Planner state for the main view
 */
export interface PlannerState {
  currentDate: Date
  view: PlannerView
  selectedEventId: string | null
  selectedTaskId: string | null
  events: CalendarEvent[]
  tasks: Task[]
  loading: boolean
  error: string | null

  // Filters
  showCompleted: boolean
  categoryFilter: string[]
  tagFilter: string[]
  projectFilter: string | null

  // UI State
  sidebarOpen: boolean
  detailPanelOpen: boolean
  dragState: DragState | null
}

/**
 * Props for calendar view components
 */
export interface CalendarViewProps {
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  onEventClick: (event: CalendarEvent) => void
  onTaskClick: (task: Task) => void
  onSlotClick: (date: Date) => void
  onSlotSelect: (start: Date, end: Date) => void
  onEventDrag: (eventId: string, newStart: Date, newEnd: Date) => void
  onTaskToggle: (taskId: string, completed: boolean) => void
  theme: string
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = 'ics' | 'json' | 'pdf' | 'csv'

export interface ExportOptions {
  format: ExportFormat
  dateRange?: {
    start: Date
    end: Date
  }
  includeCompleted?: boolean
  includeTasks?: boolean
  includeEvents?: boolean
}

export interface ExportResult {
  success: boolean
  filename: string
  data?: Blob | string
  error?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for planner entities
 */
export function generatePlannerId(prefix: 'task' | 'event' | 'change'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  if (!task.dueDate) return false

  const now = new Date()
  const dueDate = new Date(task.dueDate)

  if (task.dueTime) {
    const [hours, minutes] = task.dueTime.split(':').map(Number)
    dueDate.setHours(hours, minutes, 0, 0)
  } else {
    dueDate.setHours(23, 59, 59, 999)
  }

  return now > dueDate
}

/**
 * Check if a task is due today
 */
export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false

  const today = new Date()
  const dueDate = new Date(task.dueDate)

  return (
    today.getFullYear() === dueDate.getFullYear() &&
    today.getMonth() === dueDate.getMonth() &&
    today.getDate() === dueDate.getDate()
  )
}

/**
 * Parse recurrence rule from RFC 5545 RRULE string
 */
export function parseRecurrenceRule(rrule: string): RecurrenceRule | null {
  try {
    const parts = rrule.replace('RRULE:', '').split(';')
    const rule: Partial<RecurrenceRule> = {}

    for (const part of parts) {
      const [key, value] = part.split('=')
      switch (key) {
        case 'FREQ':
          rule.frequency = value.toLowerCase() as RecurrenceFrequency
          break
        case 'INTERVAL':
          rule.interval = parseInt(value, 10)
          break
        case 'UNTIL':
          rule.endDate = value
          break
        case 'COUNT':
          rule.count = parseInt(value, 10)
          break
        case 'BYDAY':
          rule.byDay = value.split(',').map((d) => {
            const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
            return dayMap[d] ?? 0
          })
          break
        case 'BYMONTHDAY':
          rule.byMonthDay = value.split(',').map((d) => parseInt(d, 10))
          break
        case 'BYMONTH':
          rule.byMonth = value.split(',').map((m) => parseInt(m, 10))
          break
      }
    }

    if (!rule.frequency) return null
    return {
      frequency: rule.frequency,
      interval: rule.interval ?? 1,
      ...rule,
    } as RecurrenceRule
  } catch {
    return null
  }
}

/**
 * Serialize recurrence rule to RFC 5545 RRULE string
 */
export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`]

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`)
  }

  if (rule.endDate) {
    parts.push(`UNTIL=${rule.endDate}`)
  }

  if (rule.count) {
    parts.push(`COUNT=${rule.count}`)
  }

  if (rule.byDay && rule.byDay.length > 0) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    parts.push(`BYDAY=${rule.byDay.map((d) => dayMap[d]).join(',')}`)
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`)
  }

  if (rule.byMonth && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`)
  }

  return `RRULE:${parts.join(';')}`
}
