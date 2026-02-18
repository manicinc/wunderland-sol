/**
 * Planner Export Module
 *
 * Exports calendar events and tasks to various formats:
 * - ICS (iCalendar) for calendar apps
 * - JSON for data backup
 * - CSV for spreadsheet import
 * - PDF for printable views (requires browser)
 *
 * @module lib/planner/export
 */

import { format, parseISO } from 'date-fns'
import type { CalendarEvent, Task } from './types'

// ============================================================================
// ICS EXPORT (iCalendar format - RFC 5545)
// ============================================================================

/**
 * Export events to ICS format
 */
export function exportToICS(events: CalendarEvent[], filename = 'calendar.ics'): void {
  const icsContent = generateICSContent(events)
  downloadFile(icsContent, filename, 'text/calendar;charset=utf-8')
}

/**
 * Generate ICS file content
 */
export function generateICSContent(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Frame.dev//Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Frame.dev Planner`,
    '',
  ]

  for (const event of events.filter((e) => !e.isDeleted)) {
    lines.push(...generateVEvent(event))
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

function generateVEvent(event: CalendarEvent): string[] {
  const uid = event.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const now = formatICSDate(new Date())

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${uid}@frame.dev`,
    `DTSTAMP:${now}`,
  ]

  // Handle all-day vs timed events
  if (event.allDay) {
    const startDate = format(parseISO(event.startDatetime), 'yyyyMMdd')
    const endDate = format(parseISO(event.endDatetime), 'yyyyMMdd')
    lines.push(`DTSTART;VALUE=DATE:${startDate}`)
    lines.push(`DTEND;VALUE=DATE:${endDate}`)
  } else {
    lines.push(`DTSTART:${formatICSDate(parseISO(event.startDatetime))}`)
    lines.push(`DTEND:${formatICSDate(parseISO(event.endDatetime))}`)
  }

  // Event details
  lines.push(`SUMMARY:${escapeICS(event.title)}`)

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`)
  }

  // Recurrence rule
  if (event.recurrenceRule) {
    lines.push(`RRULE:${event.recurrenceRule}`)
  }

  // Color as category
  if (event.color) {
    lines.push(`CATEGORIES:${event.color}`)
  }

  lines.push(`CREATED:${formatICSDate(parseISO(event.createdAt))}`)
  lines.push(`LAST-MODIFIED:${formatICSDate(parseISO(event.updatedAt))}`)
  lines.push('END:VEVENT')
  lines.push('')

  return lines
}

function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// ============================================================================
// JSON EXPORT
// ============================================================================

/**
 * Export events and tasks to JSON
 */
export function exportToJSON(
  data: { events?: CalendarEvent[]; tasks?: Task[] },
  filename = 'planner-backup.json'
): void {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    source: 'frame.dev/planner',
    events: data.events?.filter((e) => !e.isDeleted) || [],
    tasks: data.tasks?.filter((t) => !t.isDeleted) || [],
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  downloadFile(jsonContent, filename, 'application/json')
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export events to CSV
 */
export function exportEventsToCSV(events: CalendarEvent[], filename = 'events.csv'): void {
  const headers = [
    'Title',
    'Description',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'All Day',
    'Location',
    'Color',
    'Created At',
  ]

  const rows = events
    .filter((e) => !e.isDeleted)
    .map((event) => {
      const startDate = parseISO(event.startDatetime)
      const endDate = parseISO(event.endDatetime)

      return [
        escapeCSV(event.title),
        escapeCSV(event.description || ''),
        format(startDate, 'yyyy-MM-dd'),
        event.allDay ? '' : format(startDate, 'HH:mm'),
        format(endDate, 'yyyy-MM-dd'),
        event.allDay ? '' : format(endDate, 'HH:mm'),
        event.allDay ? 'Yes' : 'No',
        escapeCSV(event.location || ''),
        event.color || '',
        format(parseISO(event.createdAt), 'yyyy-MM-dd HH:mm'),
      ]
    })

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8')
}

/**
 * Export tasks to CSV
 */
export function exportTasksToCSV(tasks: Task[], filename = 'tasks.csv'): void {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Due Time',
    'Task Type',
    'Strand Path',
    'Tags',
    'Created At',
    'Completed At',
  ]

  const rows = tasks
    .filter((t) => !t.isDeleted)
    .map((task) => [
      escapeCSV(task.title),
      escapeCSV(task.description || ''),
      task.status,
      task.priority,
      task.dueDate || '',
      task.dueTime || '',
      task.taskType,
      escapeCSV(task.strandPath || ''),
      escapeCSV(task.tags?.join('; ') || ''),
      format(parseISO(task.createdAt), 'yyyy-MM-dd HH:mm'),
      task.completedAt ? format(parseISO(task.completedAt), 'yyyy-MM-dd HH:mm') : '',
    ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8')
}

function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

// ============================================================================
// PDF EXPORT (Browser-based)
// ============================================================================

/**
 * Export calendar view to PDF
 * Uses browser print functionality
 */
export function exportToPDF(viewType: 'day' | 'week' | 'month'): void {
  // Create a print-friendly version
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      .planner-print-area,
      .planner-print-area * {
        visibility: visible;
      }
      .planner-print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  `

  // Add print styles
  const styleSheet = document.createElement('style')
  styleSheet.id = 'planner-print-styles'
  styleSheet.textContent = printStyles
  document.head.appendChild(styleSheet)

  // Trigger print
  window.print()

  // Remove print styles after a delay
  setTimeout(() => {
    const printStyleSheet = document.getElementById('planner-print-styles')
    if (printStyleSheet) {
      printStyleSheet.remove()
    }
  }, 1000)
}

/**
 * Generate printable HTML for calendar
 */
export function generatePrintableHTML(
  events: CalendarEvent[],
  tasks: Task[],
  viewType: 'day' | 'week' | 'month',
  date: Date
): string {
  const title = viewType === 'day'
    ? format(date, 'EEEE, MMMM d, yyyy')
    : viewType === 'week'
      ? format(date, "'Week of' MMMM d, yyyy")
      : format(date, 'MMMM yyyy')

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Planner - ${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #374151; }
    .event {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      border-left: 3px solid #10B981;
      background: #f9fafb;
    }
    .event-time { font-size: 0.875rem; color: #6b7280; }
    .task {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .task-checkbox {
      width: 1rem;
      height: 1rem;
      border: 2px solid #d1d5db;
      border-radius: 50%;
    }
    .task.completed .task-checkbox {
      background: #10B981;
      border-color: #10B981;
    }
    .task.completed .task-title {
      text-decoration: line-through;
      color: #9ca3af;
    }
    .priority-urgent { border-left: 3px solid #dc2626; }
    .priority-high { border-left: 3px solid #f97316; }
    .priority-low { border-left: 3px solid #22c55e; }
    @media print {
      body { padding: 0.5rem; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
`

  // Events section
  if (events.length > 0) {
    html += `<h2>Events</h2>`
    for (const event of events.filter((e) => !e.isDeleted)) {
      const time = event.allDay
        ? 'All day'
        : format(parseISO(event.startDatetime), 'h:mm a')

      html += `
<div class="event" style="border-left-color: ${event.color || '#10B981'}">
  <div class="event-time">${time}</div>
  <div><strong>${escapeHTML(event.title)}</strong></div>
  ${event.location ? `<div style="font-size: 0.875rem; color: #6b7280;">${escapeHTML(event.location)}</div>` : ''}
</div>
`
    }
  }

  // Tasks section
  if (tasks.length > 0) {
    html += `<h2>Tasks</h2>`
    for (const task of tasks.filter((t) => !t.isDeleted)) {
      const isCompleted = task.status === 'completed'
      html += `
<div class="task ${isCompleted ? 'completed' : ''} priority-${task.priority}">
  <div class="task-checkbox"></div>
  <span class="task-title">${escapeHTML(task.title)}</span>
</div>
`
    }
  }

  html += `
</body>
</html>
`

  return html
}

function escapeHTML(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Download a file with the given content
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate a dated filename
 */
export function generateFilename(base: string, extension: string): string {
  const date = format(new Date(), 'yyyy-MM-dd')
  return `${base}-${date}.${extension}`
}
