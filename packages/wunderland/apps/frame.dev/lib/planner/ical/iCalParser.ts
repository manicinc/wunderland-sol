/**
 * iCal Parser
 *
 * Parses iCalendar (.ics) format into Quarry calendar events.
 * Supports VEVENT components with recurrence rules.
 *
 * No external dependencies - uses native parsing.
 *
 * @module lib/planner/ical/iCalParser
 */

import type { CalendarEvent } from '../types'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// TYPES
// ============================================================================

export interface ICalEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtstart: Date
  dtend: Date
  allDay: boolean
  rrule?: string
  recurrenceId?: string
  categories?: string[]
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
  organizer?: string
  attendees?: string[]
  url?: string
  lastModified?: Date
  created?: Date
}

export interface ICalCalendar {
  name?: string
  description?: string
  timezone?: string
  events: ICalEvent[]
  prodId?: string
  version?: string
}

export interface ParseResult {
  success: boolean
  calendar?: ICalCalendar
  error?: string
  eventCount: number
}

// ============================================================================
// PARSER
// ============================================================================

/**
 * Parse iCalendar string into structured data
 */
export function parseICalString(icsContent: string): ParseResult {
  try {
    const lines = unfoldLines(icsContent)
    const calendar: ICalCalendar = {
      events: [],
    }

    let currentEvent: Partial<ICalEvent> | null = null
    let inEvent = false
    let inCalendar = false

    for (const line of lines) {
      const { name, params, value } = parseLine(line)

      if (name === 'BEGIN') {
        if (value === 'VCALENDAR') {
          inCalendar = true
        } else if (value === 'VEVENT') {
          inEvent = true
          currentEvent = {}
        }
      } else if (name === 'END') {
        if (value === 'VEVENT' && currentEvent) {
          if (currentEvent.uid && currentEvent.dtstart) {
            calendar.events.push(currentEvent as ICalEvent)
          }
          currentEvent = null
          inEvent = false
        } else if (value === 'VCALENDAR') {
          inCalendar = false
        }
      } else if (inCalendar && !inEvent) {
        // Calendar properties
        switch (name) {
          case 'X-WR-CALNAME':
          case 'NAME':
            calendar.name = value
            break
          case 'X-WR-CALDESC':
            calendar.description = value
            break
          case 'X-WR-TIMEZONE':
            calendar.timezone = value
            break
          case 'PRODID':
            calendar.prodId = value
            break
          case 'VERSION':
            calendar.version = value
            break
        }
      } else if (inEvent && currentEvent) {
        // Event properties
        switch (name) {
          case 'UID':
            currentEvent.uid = value
            break
          case 'SUMMARY':
            currentEvent.summary = unescapeText(value)
            break
          case 'DESCRIPTION':
            currentEvent.description = unescapeText(value)
            break
          case 'LOCATION':
            currentEvent.location = unescapeText(value)
            break
          case 'DTSTART':
            {
              const { date, allDay } = parseDateTime(value, params)
              currentEvent.dtstart = date
              currentEvent.allDay = allDay
            }
            break
          case 'DTEND':
            {
              const { date } = parseDateTime(value, params)
              currentEvent.dtend = date
            }
            break
          case 'RRULE':
            currentEvent.rrule = value
            break
          case 'RECURRENCE-ID':
            currentEvent.recurrenceId = value
            break
          case 'CATEGORIES':
            currentEvent.categories = value.split(',').map((c) => c.trim())
            break
          case 'STATUS':
            currentEvent.status = value as ICalEvent['status']
            break
          case 'ORGANIZER':
            currentEvent.organizer = value.replace(/^mailto:/i, '')
            break
          case 'ATTENDEE':
            if (!currentEvent.attendees) currentEvent.attendees = []
            currentEvent.attendees.push(value.replace(/^mailto:/i, ''))
            break
          case 'URL':
            currentEvent.url = value
            break
          case 'LAST-MODIFIED':
            currentEvent.lastModified = parseDateTime(value, params).date
            break
          case 'CREATED':
            currentEvent.created = parseDateTime(value, params).date
            break
        }
      }
    }

    return {
      success: true,
      calendar,
      eventCount: calendar.events.length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse iCal',
      eventCount: 0,
    }
  }
}

/**
 * Convert iCal events to Quarry CalendarEvents
 */
export function convertToCalendarEvents(
  icalEvents: ICalEvent[],
  sourceId: string
): CalendarEvent[] {
  return icalEvents.map((ical) => ({
    id: `ical-${sourceId}-${ical.uid}`,
    title: ical.summary || 'Untitled Event',
    description: ical.description,
    location: ical.location,
    startDatetime: ical.dtstart.toISOString(),
    endDatetime: (ical.dtend || ical.dtstart).toISOString(),
    allDay: ical.allDay || false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    color: getColorFromCategories(ical.categories),
    syncStatus: 'synced',
    localVersion: 1,
    remoteVersion: 1,
    isDeleted: ical.status === 'CANCELLED',
    createdAt: (ical.created || new Date()).toISOString(),
    updatedAt: (ical.lastModified || new Date()).toISOString(),
    // Store original UID for reference
    googleEventId: ical.uid, // Reusing field for external ID
    googleCalendarId: sourceId,
  }))
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Unfold continued lines (lines starting with space are continuations)
 */
function unfoldLines(content: string): string[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Unfold continued lines
  const unfolded = normalized.replace(/\n[ \t]/g, '')

  return unfolded.split('\n').filter((line) => line.trim())
}

/**
 * Parse a single iCal line into name, params, and value
 */
function parseLine(line: string): { name: string; params: Record<string, string>; value: string } {
  // Split on first colon (but handle quoted values)
  const colonIndex = findUnquotedColon(line)
  if (colonIndex === -1) {
    return { name: line, params: {}, value: '' }
  }

  const nameAndParams = line.substring(0, colonIndex)
  const value = line.substring(colonIndex + 1)

  // Split name and parameters
  const semicolonIndex = nameAndParams.indexOf(';')
  if (semicolonIndex === -1) {
    return { name: nameAndParams.toUpperCase(), params: {}, value }
  }

  const name = nameAndParams.substring(0, semicolonIndex).toUpperCase()
  const paramsStr = nameAndParams.substring(semicolonIndex + 1)
  const params: Record<string, string> = {}

  // Parse parameters
  for (const param of paramsStr.split(';')) {
    const [key, val] = param.split('=')
    if (key && val) {
      params[key.toUpperCase()] = val.replace(/^"(.*)"$/, '$1')
    }
  }

  return { name, params, value }
}

/**
 * Find the first colon that's not inside quotes
 */
function findUnquotedColon(line: string): number {
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes
    } else if (line[i] === ':' && !inQuotes) {
      return i
    }
  }
  return -1
}

/**
 * Parse iCal date/datetime value
 */
function parseDateTime(
  value: string,
  params: Record<string, string>
): { date: Date; allDay: boolean } {
  // Check if it's a date-only value (all-day event)
  const isDateOnly = params.VALUE === 'DATE' || value.length === 8

  if (isDateOnly) {
    // Format: YYYYMMDD
    const year = parseInt(value.substring(0, 4), 10)
    const month = parseInt(value.substring(4, 6), 10) - 1
    const day = parseInt(value.substring(6, 8), 10)
    return { date: new Date(year, month, day), allDay: true }
  }

  // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const hasZ = value.endsWith('Z')
  const dateStr = hasZ ? value.slice(0, -1) : value

  const year = parseInt(dateStr.substring(0, 4), 10)
  const month = parseInt(dateStr.substring(4, 6), 10) - 1
  const day = parseInt(dateStr.substring(6, 8), 10)
  const hour = parseInt(dateStr.substring(9, 11), 10)
  const minute = parseInt(dateStr.substring(11, 13), 10)
  const second = parseInt(dateStr.substring(13, 15), 10) || 0

  if (hasZ) {
    // UTC time
    return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), allDay: false }
  }

  // Local time (or timezone specified in params)
  return { date: new Date(year, month, day, hour, minute, second), allDay: false }
}

/**
 * Unescape iCal text values
 */
function unescapeText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * Get a color based on event categories
 */
function getColorFromCategories(categories?: string[]): string {
  if (!categories || categories.length === 0) {
    return '#4285f4' // Default blue
  }

  const categoryColors: Record<string, string> = {
    work: '#1a73e8',
    personal: '#7c3aed',
    meeting: '#ea4335',
    travel: '#34a853',
    health: '#10b981',
    birthday: '#f59e0b',
    holiday: '#ec4899',
    reminder: '#6366f1',
  }

  for (const cat of categories) {
    const lower = cat.toLowerCase()
    if (categoryColors[lower]) {
      return categoryColors[lower]
    }
  }

  return '#4285f4'
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate iCal string from CalendarEvents
 */
export function generateICalString(
  events: CalendarEvent[],
  calendarName: string = 'Quarry Calendar'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quarry//Calendar//EN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    if (event.isDeleted) continue

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@quarry`)
    lines.push(`DTSTAMP:${formatDateTime(new Date())}`)

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(new Date(event.startDatetime))}`)
      lines.push(`DTEND;VALUE=DATE:${formatDate(new Date(event.endDatetime))}`)
    } else {
      lines.push(`DTSTART:${formatDateTime(new Date(event.startDatetime))}`)
      lines.push(`DTEND:${formatDateTime(new Date(event.endDatetime))}`)
    }

    lines.push(`SUMMARY:${escapeText(event.title)}`)

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`)
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`)
    }

    lines.push(`CREATED:${formatDateTime(new Date(event.createdAt))}`)
    lines.push(`LAST-MODIFIED:${formatDateTime(new Date(event.updatedAt))}`)

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Format date for iCal (YYYYMMDD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Format datetime for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatDateTime(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  const second = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hour}${minute}${second}Z`
}

/**
 * Escape text for iCal
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}



