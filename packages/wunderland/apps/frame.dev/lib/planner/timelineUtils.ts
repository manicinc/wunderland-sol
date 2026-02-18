/**
 * Timeline Utilities
 *
 * Utilities for the StreamlinedDayView timeline component.
 * Handles positioning, overlap detection, and icon/color mapping.
 *
 * @module lib/planner/timelineUtils
 */

import type { Task, CalendarEvent, TaskPriority } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineItem {
  id: string
  type: 'task' | 'event'
  title: string
  startTime: Date
  endTime: Date
  duration: number // minutes
  completed: boolean
  category?: string // supertag or auto-detected
  color: string
  icon: string
  overlaps?: string[] // IDs of overlapping items
  priority?: TaskPriority
  tags?: string[]
  location?: string
  attendeesCount?: number
  source: Task | CalendarEvent
}

export interface StreamlinedDayConfig {
  dayStartHour: number // default: 6
  dayEndHour: number // default: 22
  showEndOfDayCountdown: boolean
  showEndOfWorkCountdown: boolean
  showLastEventCountdown: boolean
  endOfWorkHour: number // default: 18 (6 PM)
  enableHaptics: boolean
  enableOverlapDetection: boolean
  cardStyle: 'minimal' | 'detailed'
}

export const DEFAULT_STREAMLINED_CONFIG: StreamlinedDayConfig = {
  dayStartHour: 6,
  dayEndHour: 22,
  showEndOfDayCountdown: true,
  showEndOfWorkCountdown: true,
  showLastEventCountdown: true,
  endOfWorkHour: 18,
  enableHaptics: true,
  enableOverlapDetection: true,
  cardStyle: 'detailed',
}

// ============================================================================
// CATEGORY ICON MAPPING
// ============================================================================

/**
 * Map of category keywords to Lucide icon names
 */
export const CATEGORY_ICONS: Record<string, string> = {
  // Supertag types
  task: 'CheckSquare',
  meeting: 'Users',
  event: 'CalendarDays',
  person: 'User',
  project: 'Folder',
  idea: 'Lightbulb',
  question: 'HelpCircle',
  decision: 'GitBranch',
  book: 'Book',
  article: 'FileText',

  // Auto-detected from title keywords
  workout: 'Dumbbell',
  exercise: 'Activity',
  gym: 'Dumbbell',
  run: 'PersonStanding',
  running: 'PersonStanding',
  jog: 'PersonStanding',
  walk: 'Footprints',
  yoga: 'Heart',
  meditation: 'Brain',

  shower: 'Droplets',
  bath: 'Bath',

  breakfast: 'Coffee',
  coffee: 'Coffee',
  lunch: 'UtensilsCrossed',
  dinner: 'UtensilsCrossed',
  meal: 'UtensilsCrossed',
  food: 'UtensilsCrossed',
  eat: 'UtensilsCrossed',

  email: 'Mail',
  emails: 'Mail',
  inbox: 'Inbox',

  call: 'Phone',
  phone: 'Phone',
  video: 'Video',
  zoom: 'Video',
  teams: 'Video',
  meet: 'Video',

  work: 'Briefcase',
  office: 'Building2',

  sleep: 'Moon',
  nap: 'Moon',
  rest: 'Sofa',

  read: 'BookOpen',
  reading: 'BookOpen',
  study: 'GraduationCap',
  learn: 'GraduationCap',

  write: 'PenLine',
  writing: 'PenLine',
  blog: 'FileText',

  code: 'Code',
  coding: 'Code',
  program: 'Terminal',
  dev: 'Code',

  review: 'Eye',
  plan: 'ListTodo',
  planning: 'ListTodo',

  doctor: 'Stethoscope',
  dentist: 'Smile',
  appointment: 'CalendarCheck',

  shop: 'ShoppingCart',
  shopping: 'ShoppingCart',
  grocery: 'ShoppingBasket',

  clean: 'Sparkles',
  cleaning: 'Sparkles',
  laundry: 'Shirt',

  travel: 'Plane',
  flight: 'Plane',
  drive: 'Car',
  commute: 'Train',

  focus: 'Target',
  deep: 'Brain',

  // Default
  default: 'Circle',
}

/**
 * Priority-based colors with dark mode support
 */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#10b981',      // emerald-500
  medium: '#f59e0b',   // amber-500
  high: '#f97316',     // orange-500
  urgent: '#ef4444',   // red-500
}

/**
 * Default color palette for events without supertag colors
 */
export const EVENT_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
]

// ============================================================================
// POSITIONING FUNCTIONS
// ============================================================================

/**
 * Calculate Y position as percentage of visible day
 * @param time - The time to position
 * @param dayStartHour - Start of visible day (e.g., 6 for 6 AM)
 * @param dayEndHour - End of visible day (e.g., 22 for 10 PM)
 * @returns Percentage (0-100) representing vertical position
 */
export function getTimelinePosition(
  time: Date,
  dayStartHour: number = 6,
  dayEndHour: number = 22
): number {
  const totalMinutes = (dayEndHour - dayStartHour) * 60
  const minutesSinceStart =
    (time.getHours() - dayStartHour) * 60 + time.getMinutes()

  // Clamp to valid range
  const clampedMinutes = Math.max(0, Math.min(totalMinutes, minutesSinceStart))
  return (clampedMinutes / totalMinutes) * 100
}

/**
 * Calculate the height of an event card based on duration
 * @param durationMinutes - Duration in minutes
 * @param dayStartHour - Start of visible day
 * @param dayEndHour - End of visible day
 * @returns Height as percentage of timeline
 */
export function getTimelineHeight(
  durationMinutes: number,
  dayStartHour: number = 6,
  dayEndHour: number = 22
): number {
  const totalMinutes = (dayEndHour - dayStartHour) * 60
  return (durationMinutes / totalMinutes) * 100
}

// ============================================================================
// OVERLAP DETECTION
// ============================================================================

/**
 * Check if two time ranges overlap
 */
function timesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Detect overlapping items in a list
 * @param items - List of timeline items
 * @returns Map of item ID to array of overlapping item IDs
 */
export function detectOverlaps(items?: TimelineItem[] | null): Map<string, string[]> {
  const overlaps = new Map<string, string[]>()
  if (!items || items.length === 0) return overlaps

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i]
      const item2 = items[j]

      if (timesOverlap(item1.startTime, item1.endTime, item2.startTime, item2.endTime)) {
        // Track overlap for item1
        const existing1 = overlaps.get(item1.id) || []
        overlaps.set(item1.id, [...existing1, item2.id])

        // Track overlap for item2
        const existing2 = overlaps.get(item2.id) || []
        overlaps.set(item2.id, [...existing2, item1.id])
      }
    }
  }

  return overlaps
}

/**
 * Get overlap index for staggered display
 * @param itemId - The item to get index for
 * @param overlaps - Map of overlapping items
 * @param items - All items (sorted by start time)
 * @returns Index (0, 1, 2...) for horizontal offset
 */
export function getOverlapIndex(
  itemId: string,
  overlaps: Map<string, string[]>,
  items?: TimelineItem[] | null
): number {
  const overlappingIds = overlaps.get(itemId)
  if (!overlappingIds || overlappingIds.length === 0) return 0
  if (!items || items.length === 0) return 0

  // Find all items in this overlap group
  const groupIds = [itemId, ...overlappingIds]
  const groupItems = items.filter(item => groupIds.includes(item.id))

  // Sort by start time to assign consistent indices
  groupItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return groupItems.findIndex(item => item.id === itemId)
}

// ============================================================================
// ICON & COLOR MAPPING
// ============================================================================

/**
 * Get category icon for a timeline item
 * Auto-detects from title keywords or uses supertag icon
 * @param item - The timeline item
 * @returns Lucide icon name
 */
export function getCategoryIcon(item: TimelineItem): string {
  // If category is explicitly set, use it
  if (item.category && CATEGORY_ICONS[item.category.toLowerCase()]) {
    return CATEGORY_ICONS[item.category.toLowerCase()]
  }

  // Check tags for known supertag types
  if (item.tags && item.tags.length > 0) {
    for (const tag of item.tags) {
      const tagLower = tag.toLowerCase()
      if (CATEGORY_ICONS[tagLower]) {
        return CATEGORY_ICONS[tagLower]
      }
    }
  }

  // Auto-detect from title keywords
  const titleLower = item.title.toLowerCase()
  for (const [keyword, icon] of Object.entries(CATEGORY_ICONS)) {
    if (keyword !== 'default' && titleLower.includes(keyword)) {
      return icon
    }
  }

  // Default based on type
  return item.type === 'task' ? 'CheckSquare' : 'CalendarDays'
}

/**
 * Get color for a timeline item
 * Priority: supertag color > explicit color > priority color > default
 * @param item - The timeline item
 * @param supertagColor - Optional color from supertag schema
 * @returns Hex color string
 */
export function getCategoryColor(
  item: TimelineItem,
  supertagColor?: string
): string {
  // Supertag color takes priority
  if (supertagColor) {
    return supertagColor
  }

  // Explicit color on event
  if (item.color) {
    return item.color
  }

  // Priority-based color for tasks
  if (item.type === 'task' && item.priority) {
    return PRIORITY_COLORS[item.priority]
  }

  // Hash-based color from title for consistency
  let hash = 0
  for (let i = 0; i < item.title.length; i++) {
    hash = item.title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % EVENT_COLORS.length
  return EVENT_COLORS[index]
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert a Task to a TimelineItem
 */
export function taskToTimelineItem(task: Task): TimelineItem | null {
  // Must have both date and time for timeline display
  if (!task.dueDate || !task.dueTime) {
    return null
  }

  const [hours, minutes] = task.dueTime.split(':').map(Number)
  const startTime = new Date(task.dueDate)
  startTime.setHours(hours, minutes, 0, 0)

  const duration = task.duration || 30 // Default 30 min
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

  return {
    id: task.id,
    type: 'task',
    title: task.title,
    startTime,
    endTime,
    duration,
    completed: task.status === 'completed',
    priority: task.priority,
    tags: task.tags,
    color: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium,
    icon: 'CheckSquare',
    source: task,
  }
}

/**
 * Convert a CalendarEvent to a TimelineItem
 */
export function eventToTimelineItem(event: CalendarEvent): TimelineItem | null {
  // Skip all-day events for timeline
  if (event.allDay) {
    return null
  }

  const startTime = new Date(event.startDatetime)
  const endTime = new Date(event.endDatetime)
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

  return {
    id: event.id,
    type: 'event',
    title: event.title,
    startTime,
    endTime,
    duration,
    completed: false, // Events don't have completion state
    color: event.color || EVENT_COLORS[0],
    icon: 'CalendarDays',
    location: event.location,
    attendeesCount: event.attendees?.length,
    source: event,
  }
}

/**
 * Convert tasks and events to timeline items for a specific date
 * @param tasks - All tasks
 * @param events - All events
 * @param date - The date to filter for
 * @param enableOverlapDetection - Whether to detect overlaps
 * @returns Sorted list of timeline items with overlap info
 */
export function prepareTimelineItems(
  tasks?: Task[] | null,
  events?: CalendarEvent[] | null,
  date?: Date | null,
  enableOverlapDetection: boolean = true
): TimelineItem[] {
  // Guard against null/undefined inputs
  if (!date) return []
  const safeTasks = tasks ?? []
  const safeEvents = events ?? []

  const dateStr = date.toISOString().split('T')[0]

  // Convert tasks for this date
  const taskItems = safeTasks
    .filter(task => task.dueDate === dateStr && task.dueTime)
    .map(taskToTimelineItem)
    .filter((item): item is TimelineItem => item !== null)

  // Convert events for this date
  const eventItems = safeEvents
    .filter(event => {
      const eventDate = new Date(event.startDatetime).toISOString().split('T')[0]
      return eventDate === dateStr && !event.allDay
    })
    .map(eventToTimelineItem)
    .filter((item): item is TimelineItem => item !== null)

  // Combine and sort by start time
  const allItems = [...taskItems, ...eventItems].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )

  // Detect overlaps if enabled
  if (enableOverlapDetection && allItems.length > 1) {
    const overlaps = detectOverlaps(allItems)
    allItems.forEach(item => {
      item.overlaps = overlaps.get(item.id)
    })
  }

  return allItems
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format time for display (e.g., "9:30 AM")
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format time range (e.g., "9:30 - 10:00 AM")
 */
export function formatTimeRange(start: Date, end: Date): string {
  const startStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const endStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  // If same AM/PM, don't repeat it
  const startPeriod = start.getHours() < 12 ? 'AM' : 'PM'
  const endPeriod = end.getHours() < 12 ? 'AM' : 'PM'

  if (startPeriod === endPeriod) {
    return `${startStr.replace(` ${startPeriod}`, '')} - ${endStr}`
  }

  return `${startStr} - ${endStr}`
}

/**
 * Format duration for display
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
