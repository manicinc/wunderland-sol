/**
 * Temporal Search Utilities
 * Time-aware search with natural language date parsing
 * @module lib/search/temporalSearch
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TemporalContext {
  detected: boolean
  dateRange: { start: Date; end: Date } | null
  relativeTerms: string[]
  confidence: number
  type: 'explicit' | 'relative' | 'named' | null
}

export interface TemporalSearchOptions {
  boostRecent?: boolean
  recentDays?: number
  dateWeightFactor?: number
}

// ============================================================================
// PATTERNS
// ============================================================================

const RELATIVE_PATTERNS = [
  // Today, yesterday, tomorrow
  { pattern: /\b(today)\b/i, compute: () => ({ start: startOfDay(), end: endOfDay() }) },
  { pattern: /\b(yesterday)\b/i, compute: () => ({ start: startOfDay(-1), end: endOfDay(-1) }) },
  { pattern: /\b(tomorrow)\b/i, compute: () => ({ start: startOfDay(1), end: endOfDay(1) }) },

  // This/last/next week
  { pattern: /\b(this week)\b/i, compute: () => ({ start: startOfWeek(), end: endOfWeek() }) },
  { pattern: /\b(last week)\b/i, compute: () => ({ start: startOfWeek(-1), end: endOfWeek(-1) }) },
  { pattern: /\b(next week)\b/i, compute: () => ({ start: startOfWeek(1), end: endOfWeek(1) }) },

  // This/last/next month
  { pattern: /\b(this month)\b/i, compute: () => ({ start: startOfMonth(), end: endOfMonth() }) },
  { pattern: /\b(last month)\b/i, compute: () => ({ start: startOfMonth(-1), end: endOfMonth(-1) }) },
  { pattern: /\b(next month)\b/i, compute: () => ({ start: startOfMonth(1), end: endOfMonth(1) }) },

  // This/last/next year
  { pattern: /\b(this year)\b/i, compute: () => ({ start: startOfYear(), end: endOfYear() }) },
  { pattern: /\b(last year)\b/i, compute: () => ({ start: startOfYear(-1), end: endOfYear(-1) }) },

  // N days/weeks/months ago
  {
    pattern: /\b(\d+)\s*(day|days)\s+ago\b/i,
    compute: (match: RegExpMatchArray) => {
      const n = parseInt(match[1])
      return { start: startOfDay(-n), end: endOfDay(-n) }
    },
  },
  {
    pattern: /\b(\d+)\s*(week|weeks)\s+ago\b/i,
    compute: (match: RegExpMatchArray) => {
      const n = parseInt(match[1])
      return { start: startOfWeek(-n), end: endOfWeek(-n) }
    },
  },
  {
    pattern: /\b(\d+)\s*(month|months)\s+ago\b/i,
    compute: (match: RegExpMatchArray) => {
      const n = parseInt(match[1])
      return { start: startOfMonth(-n), end: endOfMonth(-n) }
    },
  },

  // Past N days/weeks
  {
    pattern: /\b(past|last)\s+(\d+)\s*(day|days)\b/i,
    compute: (match: RegExpMatchArray) => {
      const n = parseInt(match[2])
      return { start: startOfDay(-n), end: endOfDay() }
    },
  },
  {
    pattern: /\b(past|last)\s+(\d+)\s*(week|weeks)\b/i,
    compute: (match: RegExpMatchArray) => {
      const n = parseInt(match[2])
      return { start: startOfWeek(-n), end: endOfDay() }
    },
  },

  // Recently
  { pattern: /\b(recently|recent)\b/i, compute: () => ({ start: startOfDay(-7), end: endOfDay() }) },
]

const MONTH_PATTERNS = [
  { pattern: /\bin\s+(january|jan)\b/i, month: 0 },
  { pattern: /\bin\s+(february|feb)\b/i, month: 1 },
  { pattern: /\bin\s+(march|mar)\b/i, month: 2 },
  { pattern: /\bin\s+(april|apr)\b/i, month: 3 },
  { pattern: /\bin\s+(may)\b/i, month: 4 },
  { pattern: /\bin\s+(june|jun)\b/i, month: 5 },
  { pattern: /\bin\s+(july|jul)\b/i, month: 6 },
  { pattern: /\bin\s+(august|aug)\b/i, month: 7 },
  { pattern: /\bin\s+(september|sep|sept)\b/i, month: 8 },
  { pattern: /\bin\s+(october|oct)\b/i, month: 9 },
  { pattern: /\bin\s+(november|nov)\b/i, month: 10 },
  { pattern: /\bin\s+(december|dec)\b/i, month: 11 },
]

const SEMANTIC_PATTERNS = [
  // Before/after patterns
  { pattern: /\bbefore\s+(the|my)?\s*(\w+)\b/i, type: 'before' as const },
  { pattern: /\bafter\s+(the|my)?\s*(\w+)\b/i, type: 'after' as const },
  { pattern: /\bduring\s+(the|my)?\s*(\w+)\b/i, type: 'during' as const },
]

// ============================================================================
// DATE HELPERS
// ============================================================================

function startOfDay(offsetDays = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(offsetDays = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfWeek(offsetWeeks = 0): Date {
  const date = new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
  date.setDate(diff + offsetWeeks * 7)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeek(offsetWeeks = 0): Date {
  const date = startOfWeek(offsetWeeks)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfMonth(offsetMonths = 0): Date {
  const date = new Date()
  date.setMonth(date.getMonth() + offsetMonths, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfMonth(offsetMonths = 0): Date {
  const date = new Date()
  date.setMonth(date.getMonth() + offsetMonths + 1, 0)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfYear(offsetYears = 0): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() + offsetYears, 0, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfYear(offsetYears = 0): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() + offsetYears, 11, 31)
  date.setHours(23, 59, 59, 999)
  return date
}

function getMonthRange(month: number, year?: number): { start: Date; end: Date } {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const start = new Date(y, month, 1, 0, 0, 0, 0)
  const end = new Date(y, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Parse temporal context from a query string
 */
export function parseTemporalContext(query: string): TemporalContext {
  const result: TemporalContext = {
    detected: false,
    dateRange: null,
    relativeTerms: [],
    confidence: 0,
    type: null,
  }

  // Check relative patterns
  for (const { pattern, compute } of RELATIVE_PATTERNS) {
    const match = query.match(pattern)
    if (match) {
      result.detected = true
      result.dateRange = compute(match)
      result.relativeTerms.push(match[0])
      result.confidence = 0.9
      result.type = 'relative'
      return result
    }
  }

  // Check month patterns
  for (const { pattern, month } of MONTH_PATTERNS) {
    const match = query.match(pattern)
    if (match) {
      result.detected = true
      result.dateRange = getMonthRange(month)
      result.relativeTerms.push(match[0])
      result.confidence = 0.85
      result.type = 'named'
      return result
    }
  }

  // Check for explicit date patterns (YYYY-MM-DD, MM/DD/YYYY, etc.)
  const explicitDatePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g
  const explicitMatches = query.match(explicitDatePattern)
  if (explicitMatches && explicitMatches.length > 0) {
    result.detected = true
    result.relativeTerms = explicitMatches

    const dates = explicitMatches.map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()))
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime())
      result.dateRange = {
        start: dates[0],
        end: dates.length > 1 ? dates[dates.length - 1] : endOfDay(0),
      }
      result.confidence = 0.95
      result.type = 'explicit'
    }
    return result
  }

  // Check semantic patterns (lower confidence, needs context)
  for (const { pattern, type } of SEMANTIC_PATTERNS) {
    const match = query.match(pattern)
    if (match) {
      result.detected = true
      result.relativeTerms.push(match[0])
      result.confidence = 0.5 // Lower confidence - semantic interpretation needed
      result.type = null // Needs additional context to resolve
      // Don't return here - let it be flagged but without a date range
    }
  }

  return result
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(
  date: Date | string,
  range: { start: Date; end: Date }
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d >= range.start && d <= range.end
}

/**
 * Calculate a temporal relevance boost for a document
 */
export function calculateTemporalBoost(
  docDate: Date | string | undefined,
  options: TemporalSearchOptions = {}
): number {
  if (!docDate) return 1

  const { boostRecent = true, recentDays = 30, dateWeightFactor = 0.3 } = options

  if (!boostRecent) return 1

  const date = typeof docDate === 'string' ? new Date(docDate) : docDate
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 0) return 1 + dateWeightFactor
  if (daysDiff <= recentDays) {
    // Linear decay over recentDays
    const decayFactor = 1 - daysDiff / recentDays
    return 1 + dateWeightFactor * decayFactor
  }
  return 1
}

/**
 * Filter and boost search results based on temporal context
 */
export function applyTemporalFilter<T extends { date?: string; createdAt?: string; updatedAt?: string }>(
  results: T[],
  temporalContext: TemporalContext,
  options: TemporalSearchOptions = {}
): T[] {
  if (!temporalContext.detected || !temporalContext.dateRange) {
    // No temporal filter - just apply recency boost if enabled
    if (options.boostRecent) {
      return results.map((r) => ({
        ...r,
        _temporalBoost: calculateTemporalBoost(r.date || r.createdAt || r.updatedAt, options),
      }))
    }
    return results
  }

  // Filter by date range
  const filtered = results.filter((r) => {
    const date = r.date || r.createdAt || r.updatedAt
    if (!date) return true // Include items without dates
    return isDateInRange(date, temporalContext.dateRange!)
  })

  return filtered
}

/**
 * Get human-readable description of a date range
 */
export function formatDateRange(range: { start: Date; end: Date }): string {
  const start = range.start.toLocaleDateString()
  const end = range.end.toLocaleDateString()

  if (start === end) {
    return start
  }

  // Check for common ranges
  const today = new Date()
  const startOfToday = startOfDay()
  const endOfToday = endOfDay()

  if (range.start.getTime() === startOfToday.getTime() && range.end.getTime() === endOfToday.getTime()) {
    return 'Today'
  }

  const startOfYesterday = startOfDay(-1)
  const endOfYesterday = endOfDay(-1)
  if (range.start.getTime() === startOfYesterday.getTime() && range.end.getTime() === endOfYesterday.getTime()) {
    return 'Yesterday'
  }

  return `${start} - ${end}`
}

/**
 * Get suggested date ranges for quick selection
 */
export function getQuickDateRanges(): Array<{ label: string; range: { start: Date; end: Date } }> {
  return [
    { label: 'Today', range: { start: startOfDay(), end: endOfDay() } },
    { label: 'Yesterday', range: { start: startOfDay(-1), end: endOfDay(-1) } },
    { label: 'This Week', range: { start: startOfWeek(), end: endOfWeek() } },
    { label: 'Last Week', range: { start: startOfWeek(-1), end: endOfWeek(-1) } },
    { label: 'This Month', range: { start: startOfMonth(), end: endOfMonth() } },
    { label: 'Last Month', range: { start: startOfMonth(-1), end: endOfMonth(-1) } },
    { label: 'Last 7 Days', range: { start: startOfDay(-7), end: endOfDay() } },
    { label: 'Last 30 Days', range: { start: startOfDay(-30), end: endOfDay() } },
    { label: 'Last 90 Days', range: { start: startOfDay(-90), end: endOfDay() } },
  ]
}
