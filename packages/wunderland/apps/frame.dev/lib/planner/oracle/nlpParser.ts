/**
 * NLP-Enhanced Task Parser for Oracle
 * @module lib/planner/oracle/nlpParser
 *
 * Uses Compromise.js for natural language understanding of task commands.
 * Extracts intents, entities, dates, times, priorities from free-form text.
 */

// Lazy-load compromise to avoid SSR issues
let nlp: typeof import('compromise').default | null = null

async function loadCompromise() {
  if (nlp) return nlp
  try {
    const module = await import('compromise')
    nlp = module.default
    return nlp
  } catch {
    console.warn('[NLP Parser] Compromise.js not available, using regex fallback')
    return null
  }
}

/**
 * Parsed task intent from natural language
 */
export interface ParsedTaskIntent {
  action: 'create' | 'update' | 'delete' | 'complete' | 'schedule' | 'query' | 'suggest' | 'unknown'
  confidence: number
  title?: string
  description?: string
  dueDate?: string // ISO date
  dueTime?: string // HH:mm
  duration?: number // minutes
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  project?: string
  tags?: string[]
  subtasks?: string[]
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval?: number
  }
  targetTaskQuery?: string // For update/delete/complete actions
  rawEntities: {
    dates: string[]
    times: string[]
    people: string[]
    organizations: string[]
    numbers: string[]
    nouns: string[]
  }
}

/**
 * Action verb patterns for intent classification
 */
const ACTION_PATTERNS = {
  create: /\b(add|create|new|make|start|begin|schedule|set up|plan|book|insert)\b/i,
  update: /\b(update|change|modify|edit|reschedule|move|postpone|delay|adjust|rename)\b/i,
  delete: /\b(delete|remove|cancel|drop|clear|trash|discard)\b/i,
  complete: /\b(complete|done|finish|mark|check off|tick|close|resolve)\b/i,
  query: /\b(show|list|find|search|what|when|where|how many|get|display|view)\b/i,
  suggest: /\b(suggest|recommend|what should|help me|focus|prioritize|next)\b/i,
}

/**
 * Priority indicators
 */
const PRIORITY_PATTERNS = {
  urgent: /\b(urgent|asap|immediately|critical|emergency|right now|highest priority)\b/i,
  high: /\b(high priority|important|soon|pressing|time-sensitive)\b/i,
  low: /\b(low priority|whenever|eventually|not urgent|no rush|someday)\b/i,
}

/**
 * Relative date patterns
 */
const DATE_PATTERNS = {
  today: /\b(today|tonight|this evening|this morning)\b/i,
  tomorrow: /\b(tomorrow|tmr|tmrw)\b/i,
  nextWeek: /\b(next week)\b/i,
  thisWeek: /\b(this week|end of week|by friday)\b/i,
  weekend: /\b(weekend|saturday|sunday|this weekend|next weekend)\b/i,
  monday: /\b(monday|mon)\b/i,
  tuesday: /\b(tuesday|tue|tues)\b/i,
  wednesday: /\b(wednesday|wed)\b/i,
  thursday: /\b(thursday|thu|thur|thurs)\b/i,
  friday: /\b(friday|fri)\b/i,
  // ISO format
  isoDate: /\b(\d{4}-\d{2}-\d{2})\b/,
  // US format
  usDate: /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
  // Written dates
  writtenDate: /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\b/i,
  // In X days
  inDays: /\bin\s+(\d+)\s+days?\b/i,
  inWeeks: /\bin\s+(\d+)\s+weeks?\b/i,
}

/**
 * Time patterns
 */
const TIME_PATTERNS = {
  amPm: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  military: /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
  noon: /\b(noon|midday)\b/i,
  morning: /\b(morning|in the morning)\b/i,
  afternoon: /\b(afternoon|in the afternoon)\b/i,
  evening: /\b(evening|in the evening|tonight)\b/i,
  atTime: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
}

/**
 * Duration patterns
 */
const DURATION_PATTERNS = {
  minutes: /\b(\d+)\s*(?:min(?:ute)?s?|m)\b/i,
  hours: /\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i,
  hoursMinutes: /\b(\d+)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(\d+)\s*(?:min(?:ute)?s?|m)\b/i,
}

/**
 * Parse natural language input into structured task intent
 */
export async function parseNaturalLanguage(input: string): Promise<ParsedTaskIntent> {
  const compromise = await loadCompromise()
  const lowerInput = input.toLowerCase()

  // Initialize result
  const result: ParsedTaskIntent = {
    action: 'unknown',
    confidence: 0,
    rawEntities: {
      dates: [],
      times: [],
      people: [],
      organizations: [],
      numbers: [],
      nouns: [],
    },
  }

  // 1. Detect action/intent
  const { action, confidence: actionConfidence } = detectAction(input)
  result.action = action
  result.confidence = actionConfidence

  // 2. Extract date
  const dateInfo = extractDate(input)
  if (dateInfo) {
    result.dueDate = dateInfo.date
    result.rawEntities.dates.push(dateInfo.original)
  }

  // 3. Extract time
  const timeInfo = extractTime(input)
  if (timeInfo) {
    result.dueTime = timeInfo.time
    result.rawEntities.times.push(timeInfo.original)
  }

  // 4. Extract duration
  const duration = extractDuration(input)
  if (duration) {
    result.duration = duration
  }

  // 5. Extract priority
  result.priority = extractPriority(input)

  // 6. Extract title (remove action verbs, dates, times, etc.)
  result.title = extractTitle(input, action, dateInfo?.original, timeInfo?.original)

  // 7. Extract subtasks if mentioned
  result.subtasks = extractSubtasks(input)

  // 8. Extract recurring pattern
  result.recurring = extractRecurring(input)

  // 9. Use Compromise for additional entity extraction
  if (compromise) {
    const doc = compromise(input)

    // Extract people mentions
    doc.people().forEach((p: any) => {
      const name = p.text().trim()
      if (name.length > 1) {
        result.rawEntities.people.push(name)
      }
    })

    // Extract organizations
    doc.organizations().forEach((o: any) => {
      const org = o.text().trim()
      if (org.length > 1) {
        result.rawEntities.organizations.push(org)
      }
    })

    // Extract numbers
    doc.numbers().forEach((n: any) => {
      result.rawEntities.numbers.push(n.text())
    })

    // Extract nouns for potential tags/projects
    doc.nouns().forEach((n: any) => {
      const noun = n.text().trim()
      if (noun.length > 2) {
        result.rawEntities.nouns.push(noun)
      }
    })

    // Look for project mentions (e.g., "for project X", "in the X project")
    const projectMatch = input.match(/(?:for|in|on|under)\s+(?:project|proj)\s+["']?([^"'\s,]+)["']?/i)
      || input.match(/(?:for|in|on)\s+(?:the\s+)?["']?([^"'\s,]+)["']?\s+project/i)
    if (projectMatch) {
      result.project = projectMatch[1]
    }

    // Look for tags (e.g., "#work", "tag:personal")
    const tagMatches = input.matchAll(/#(\w+)|tag:(\w+)/gi)
    const tags: string[] = []
    for (const match of tagMatches) {
      tags.push(match[1] || match[2])
    }
    if (tags.length > 0) {
      result.tags = tags
    }
  }

  // Boost confidence if we found multiple components
  const componentCount = [
    result.dueDate,
    result.dueTime,
    result.priority,
    result.title && result.title.length > 3,
    result.project,
    result.tags?.length,
  ].filter(Boolean).length

  result.confidence = Math.min(1, result.confidence + componentCount * 0.1)

  return result
}

/**
 * Detect the primary action/intent from the input
 */
function detectAction(input: string): { action: ParsedTaskIntent['action']; confidence: number } {
  // Check each action pattern
  for (const [action, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(input)) {
      return {
        action: action as ParsedTaskIntent['action'],
        confidence: 0.7,
      }
    }
  }

  // Default to create if it looks like a task description
  const looksLikeTask = /^[A-Z]|^[a-z]+\s+[a-z]/i.test(input.trim())
  if (looksLikeTask) {
    return { action: 'create', confidence: 0.4 }
  }

  return { action: 'unknown', confidence: 0.1 }
}

/**
 * Extract date from natural language
 */
function extractDate(input: string): { date: string; original: string } | null {
  const today = new Date()

  // Check relative dates first
  if (DATE_PATTERNS.today.test(input)) {
    return { date: formatDate(today), original: input.match(DATE_PATTERNS.today)![0] }
  }

  if (DATE_PATTERNS.tomorrow.test(input)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return { date: formatDate(tomorrow), original: input.match(DATE_PATTERNS.tomorrow)![0] }
  }

  // Day of week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < daysOfWeek.length; i++) {
    const dayPattern = new RegExp(`\\b${daysOfWeek[i]}|${daysOfWeek[i].slice(0, 3)}\\b`, 'i')
    if (dayPattern.test(input)) {
      const targetDay = i
      const currentDay = today.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7 // Next occurrence
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + daysUntil)
      return { date: formatDate(targetDate), original: input.match(dayPattern)![0] }
    }
  }

  // "In X days"
  const inDaysMatch = input.match(DATE_PATTERNS.inDays)
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1])
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + days)
    return { date: formatDate(targetDate), original: inDaysMatch[0] }
  }

  // "In X weeks"
  const inWeeksMatch = input.match(DATE_PATTERNS.inWeeks)
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1])
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + weeks * 7)
    return { date: formatDate(targetDate), original: inWeeksMatch[0] }
  }

  // Next week
  if (DATE_PATTERNS.nextWeek.test(input)) {
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7 + 7)
    return { date: formatDate(nextMonday), original: input.match(DATE_PATTERNS.nextWeek)![0] }
  }

  // This week / end of week
  if (DATE_PATTERNS.thisWeek.test(input)) {
    const friday = new Date(today)
    friday.setDate(today.getDate() + (5 - today.getDay() + 7) % 7)
    return { date: formatDate(friday), original: input.match(DATE_PATTERNS.thisWeek)![0] }
  }

  // ISO date
  const isoMatch = input.match(DATE_PATTERNS.isoDate)
  if (isoMatch) {
    return { date: isoMatch[1], original: isoMatch[0] }
  }

  // US date
  const usMatch = input.match(DATE_PATTERNS.usDate)
  if (usMatch) {
    const parts = usMatch[1].split('/')
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    const year = parts[2] ? (parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])) : today.getFullYear()
    const date = new Date(year, month - 1, day)
    return { date: formatDate(date), original: usMatch[0] }
  }

  return null
}

/**
 * Extract time from natural language
 */
function extractTime(input: string): { time: string; original: string } | null {
  // AM/PM format
  const amPmMatch = input.match(TIME_PATTERNS.amPm) || input.match(TIME_PATTERNS.atTime)
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1])
    const minutes = amPmMatch[2] ? parseInt(amPmMatch[2]) : 0
    const period = (amPmMatch[3] || '').toLowerCase()

    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0

    return {
      time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      original: amPmMatch[0],
    }
  }

  // Military time
  const militaryMatch = input.match(TIME_PATTERNS.military)
  if (militaryMatch) {
    return {
      time: `${militaryMatch[1].padStart(2, '0')}:${militaryMatch[2]}`,
      original: militaryMatch[0],
    }
  }

  // Named times
  if (TIME_PATTERNS.noon.test(input)) {
    return { time: '12:00', original: input.match(TIME_PATTERNS.noon)![0] }
  }
  if (TIME_PATTERNS.morning.test(input)) {
    return { time: '09:00', original: input.match(TIME_PATTERNS.morning)![0] }
  }
  if (TIME_PATTERNS.afternoon.test(input)) {
    return { time: '14:00', original: input.match(TIME_PATTERNS.afternoon)![0] }
  }
  if (TIME_PATTERNS.evening.test(input)) {
    return { time: '18:00', original: input.match(TIME_PATTERNS.evening)![0] }
  }

  return null
}

/**
 * Extract duration from natural language
 */
function extractDuration(input: string): number | null {
  // Hours and minutes combined
  const hoursMinutesMatch = input.match(DURATION_PATTERNS.hoursMinutes)
  if (hoursMinutesMatch) {
    const hours = parseInt(hoursMinutesMatch[1])
    const minutes = parseInt(hoursMinutesMatch[2])
    return hours * 60 + minutes
  }

  // Hours only
  const hoursMatch = input.match(DURATION_PATTERNS.hours)
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60)
  }

  // Minutes only
  const minutesMatch = input.match(DURATION_PATTERNS.minutes)
  if (minutesMatch) {
    return parseInt(minutesMatch[1])
  }

  return null
}

/**
 * Extract priority from natural language
 */
function extractPriority(input: string): 'low' | 'medium' | 'high' | 'urgent' | undefined {
  if (PRIORITY_PATTERNS.urgent.test(input)) return 'urgent'
  if (PRIORITY_PATTERNS.high.test(input)) return 'high'
  if (PRIORITY_PATTERNS.low.test(input)) return 'low'
  return undefined // Will default to medium in the action executor
}

/**
 * Extract task title by removing action verbs, dates, times, etc.
 */
function extractTitle(
  input: string,
  action: string,
  dateStr?: string,
  timeStr?: string
): string {
  let title = input

  // Remove action verbs
  for (const pattern of Object.values(ACTION_PATTERNS)) {
    title = title.replace(pattern, '')
  }

  // Remove common filler words at the start
  title = title.replace(/^(a|an|the|my|to|please|can you|could you|i need to|i want to|i'd like to)\s+/gi, '')

  // Remove task/reminder words
  title = title.replace(/\b(task|todo|reminder|item|thing)\s*/gi, '')

  // Remove date/time strings if provided
  if (dateStr) {
    title = title.replace(new RegExp(escapeRegex(dateStr), 'gi'), '')
  }
  if (timeStr) {
    title = title.replace(new RegExp(escapeRegex(timeStr), 'gi'), '')
  }

  // Remove common date/time prepositions if they're now dangling
  title = title.replace(/\b(for|on|at|by|due|before|until|till)\s*$/gi, '')
  title = title.replace(/\s+(for|on|at|by|due|before|until|till)\s+/gi, ' ')

  // Remove priority markers
  for (const pattern of Object.values(PRIORITY_PATTERNS)) {
    title = title.replace(pattern, '')
  }

  // Remove quotes if wrapping the entire title
  title = title.replace(/^["'](.+)["']$/, '$1')

  // Clean up whitespace
  title = title.replace(/\s+/g, ' ').trim()

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  return title
}

/**
 * Extract subtasks from input (e.g., "with subtasks: a, b, c" or "including: x, y, z")
 */
function extractSubtasks(input: string): string[] | undefined {
  const subtaskMatch = input.match(
    /(?:with\s+subtasks?|including|subtasks?)[:\s]+(.+?)(?:\.|$)/i
  )

  if (subtaskMatch) {
    return subtaskMatch[1]
      .split(/[,;]|\band\b/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  return undefined
}

/**
 * Extract recurring pattern
 */
function extractRecurring(input: string): ParsedTaskIntent['recurring'] | undefined {
  if (/\b(every day|daily)\b/i.test(input)) {
    return { frequency: 'daily' }
  }
  if (/\b(every week|weekly)\b/i.test(input)) {
    return { frequency: 'weekly' }
  }
  if (/\b(every month|monthly)\b/i.test(input)) {
    return { frequency: 'monthly' }
  }

  // "every X days/weeks"
  const everyDaysMatch = input.match(/every\s+(\d+)\s+days?/i)
  if (everyDaysMatch) {
    return { frequency: 'daily', interval: parseInt(everyDaysMatch[1]) }
  }

  const everyWeeksMatch = input.match(/every\s+(\d+)\s+weeks?/i)
  if (everyWeeksMatch) {
    return { frequency: 'weekly', interval: parseInt(everyWeeksMatch[1]) }
  }

  return undefined
}

/**
 * Format date as ISO string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
