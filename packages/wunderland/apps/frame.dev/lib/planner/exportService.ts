/**
 * Planner Export Service
 * Export planner data in various formats
 * @module lib/planner/exportService
 */

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'json' | 'ical' | 'csv'

export interface ExportOptions {
  format: ExportFormat
  dateRange?: {
    from: Date
    to: Date
  }
  types?: ('task' | 'event' | 'goal' | 'project')[]
  status?: ('pending' | 'completed' | 'in-progress' | 'cancelled')[]
  includeArchived?: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'completed' | 'in-progress' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  projectId?: string
  tags?: string[]
}

export interface Event {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay?: boolean
  location?: string
  recurrence?: string
  createdAt: string
  updatedAt: string
  projectId?: string
  tags?: string[]
}

export interface Goal {
  id: string
  title: string
  description?: string
  targetDate?: string
  progress: number
  status: 'active' | 'achieved' | 'abandoned'
  milestones?: {
    title: string
    completed: boolean
    dueDate?: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export interface PlannerExportData {
  exportedAt: string
  version: string
  dateRange: {
    from: string
    to: string
  }
  counts: {
    tasks: number
    events: number
    goals: number
    projects: number
  }
  data: {
    tasks: Task[]
    events: Event[]
    goals: Goal[]
    projects: Project[]
  }
}

export interface AutoSyncSettings {
  enabled: boolean
  destination: 'local-file' | 'google-drive' | 'dropbox' | 'webhook'
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  webhookUrl?: string
  lastSynced?: string
}

// ============================================================================
// DATA FETCHING (Mock - replace with actual data source)
// ============================================================================

async function fetchTasks(options: ExportOptions): Promise<Task[]> {
  // TODO: Replace with actual data fetching from your data store
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Review project proposal',
      description: 'Go through the Q1 project proposals',
      status: 'pending',
      priority: 'high',
      dueDate: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['work', 'review'],
    },
    {
      id: 'task-2',
      title: 'Complete documentation',
      status: 'in-progress',
      priority: 'medium',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return filterByOptions(mockTasks, options)
}

async function fetchEvents(options: ExportOptions): Promise<Event[]> {
  // TODO: Replace with actual data fetching
  const mockEvents: Event[] = [
    {
      id: 'event-1',
      title: 'Team Meeting',
      description: 'Weekly sync',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      location: 'Conference Room A',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['meeting', 'team'],
    },
  ]

  return filterByOptions(mockEvents, options)
}

async function fetchGoals(options: ExportOptions): Promise<Goal[]> {
  // TODO: Replace with actual data fetching
  const mockGoals: Goal[] = [
    {
      id: 'goal-1',
      title: 'Learn TypeScript',
      description: 'Master TypeScript for better code quality',
      progress: 65,
      status: 'active',
      targetDate: new Date(Date.now() + 2592000000).toISOString(),
      milestones: [
        { title: 'Complete basics', completed: true },
        { title: 'Build project', completed: false },
      ],
      createdAt: new Date(Date.now() - 1209600000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return mockGoals
}

async function fetchProjects(options: ExportOptions): Promise<Project[]> {
  // TODO: Replace with actual data fetching
  const mockProjects: Project[] = [
    {
      id: 'project-1',
      name: 'Website Redesign',
      description: 'Modernize company website',
      status: 'active',
      startDate: new Date(Date.now() - 1209600000).toISOString(),
      createdAt: new Date(Date.now() - 1209600000).toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['design', 'web'],
    },
  ]

  return mockProjects
}

function filterByOptions<T extends { createdAt: string; status?: string }>(
  items: T[],
  options: ExportOptions
): T[] {
  let filtered = items

  // Filter by date range
  if (options.dateRange) {
    const from = options.dateRange.from.getTime()
    const to = options.dateRange.to.getTime()
    filtered = filtered.filter((item) => {
      const created = new Date(item.createdAt).getTime()
      return created >= from && created <= to
    })
  }

  // Filter by status
  if (options.status && options.status.length > 0) {
    filtered = filtered.filter((item) =>
      item.status && options.status!.includes(item.status as any)
    )
  }

  return filtered
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export planner data in the specified format
 */
export async function exportPlannerData(options: ExportOptions): Promise<string | Blob> {
  const { format, dateRange } = options

  // Fetch data
  const shouldInclude = (type: string) =>
    !options.types || options.types.length === 0 || options.types.includes(type as any)

  const [tasks, events, goals, projects] = await Promise.all([
    shouldInclude('task') ? fetchTasks(options) : Promise.resolve([]),
    shouldInclude('event') ? fetchEvents(options) : Promise.resolve([]),
    shouldInclude('goal') ? fetchGoals(options) : Promise.resolve([]),
    shouldInclude('project') ? fetchProjects(options) : Promise.resolve([]),
  ])

  const data: PlannerExportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    dateRange: {
      from: dateRange?.from.toISOString() || new Date(0).toISOString(),
      to: dateRange?.to.toISOString() || new Date().toISOString(),
    },
    counts: {
      tasks: tasks.length,
      events: events.length,
      goals: goals.length,
      projects: projects.length,
    },
    data: {
      tasks,
      events,
      goals,
      projects,
    },
  }

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)
    case 'ical':
      return generateICalendar(events, tasks)
    case 'csv':
      return generateCSV(tasks, events)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Generate iCalendar format
 */
function generateICalendar(events: Event[], tasks: Task[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quarry//Planner Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  // Add events
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@quarry`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${formatICalDate(new Date(event.startDate))}`,
      event.endDate ? `DTEND:${formatICalDate(new Date(event.endDate))}` : '',
      `SUMMARY:${escapeICalText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeICalText(event.description)}` : '',
      event.location ? `LOCATION:${escapeICalText(event.location)}` : '',
      'END:VEVENT'
    )
  }

  // Add tasks as todos
  for (const task of tasks) {
    lines.push(
      'BEGIN:VTODO',
      `UID:${task.id}@quarry`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `SUMMARY:${escapeICalText(task.title)}`,
      task.description ? `DESCRIPTION:${escapeICalText(task.description)}` : '',
      task.dueDate ? `DUE:${formatICalDate(new Date(task.dueDate))}` : '',
      `STATUS:${task.status === 'completed' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      task.priority ? `PRIORITY:${getPriorityNumber(task.priority)}` : '',
      'END:VTODO'
    )
  }

  lines.push('END:VCALENDAR')

  return lines.filter(Boolean).join('\r\n')
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function getPriorityNumber(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 1
    case 'high':
      return 3
    case 'medium':
      return 5
    case 'low':
      return 9
    default:
      return 5
  }
}

/**
 * Generate CSV format
 */
function generateCSV(tasks: Task[], events: Event[]): string {
  const headers = [
    'Type',
    'ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Start Date',
    'Due Date',
    'Created At',
    'Tags',
  ]

  const rows: string[][] = [headers]

  // Add tasks
  for (const task of tasks) {
    rows.push([
      'Task',
      task.id,
      escapeCSV(task.title),
      escapeCSV(task.description || ''),
      task.status,
      task.priority || '',
      '',
      task.dueDate || '',
      task.createdAt,
      (task.tags || []).join(';'),
    ])
  }

  // Add events
  for (const event of events) {
    rows.push([
      'Event',
      event.id,
      escapeCSV(event.title),
      escapeCSV(event.description || ''),
      '',
      '',
      event.startDate,
      event.endDate || '',
      event.createdAt,
      (event.tags || []).join(';'),
    ])
  }

  return rows.map((row) => row.join(',')).join('\n')
}

function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Download export data as file
 */
export function downloadExport(data: string | Blob, format: ExportFormat): void {
  const mimeTypes: Record<ExportFormat, string> = {
    json: 'application/json',
    ical: 'text/calendar',
    csv: 'text/csv',
  }

  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    ical: 'ics',
    csv: 'csv',
  }

  const blob = typeof data === 'string' ? new Blob([data], { type: mimeTypes[format] }) : data

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quarry-planner-export-${new Date().toISOString().split('T')[0]}.${extensions[format]}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get export stats without downloading
 */
export async function getExportStats(options: Omit<ExportOptions, 'format'>): Promise<{
  tasks: number
  events: number
  goals: number
  projects: number
  total: number
}> {
  const shouldInclude = (type: string) =>
    !options.types || options.types.length === 0 || options.types.includes(type as any)

  const [tasks, events, goals, projects] = await Promise.all([
    shouldInclude('task') ? fetchTasks({ ...options, format: 'json' }) : Promise.resolve([]),
    shouldInclude('event') ? fetchEvents({ ...options, format: 'json' }) : Promise.resolve([]),
    shouldInclude('goal') ? fetchGoals({ ...options, format: 'json' }) : Promise.resolve([]),
    shouldInclude('project') ? fetchProjects({ ...options, format: 'json' }) : Promise.resolve([]),
  ])

  return {
    tasks: tasks.length,
    events: events.length,
    goals: goals.length,
    projects: projects.length,
    total: tasks.length + events.length + goals.length + projects.length,
  }
}
