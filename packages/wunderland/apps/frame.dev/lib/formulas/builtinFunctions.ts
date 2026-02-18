/**
 * Built-in Formula Functions
 * @module lib/formulas/builtinFunctions
 *
 * @description
 * Embark-inspired built-in functions for formulas.
 * Includes math, string, date, aggregate, and travel functions.
 */

import type {
  FunctionDefinition,
  FormulaContext,
  FormulaFunction,
} from './types'
import { FormulaError } from './types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) return parsed
  }
  throw new FormulaError(`Cannot convert ${typeof value} to number`, 'TYPE_ERROR')
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) return date
  }
  if (typeof value === 'number') return new Date(value)
  throw new FormulaError(`Cannot convert ${typeof value} to date`, 'TYPE_ERROR')
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined) return []
  return [value]
}

// ============================================================================
// MATH FUNCTIONS
// ============================================================================

const mathFunctions: FunctionDefinition[] = [
  {
    name: 'Sum',
    category: 'math',
    description: 'Sum of all numeric arguments or array elements',
    example: 'Sum(1, 2, 3) → 6',
    parameters: [
      { name: 'values', type: 'number[]', description: 'Numbers to sum', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const numbers = args.flatMap(a => toArray(a)).map(toNumber)
      return numbers.reduce((sum, n) => sum + n, 0)
    }
  },
  {
    name: 'Average',
    category: 'math',
    description: 'Average of all numeric arguments',
    example: 'Average(10, 20, 30) → 20',
    parameters: [
      { name: 'values', type: 'number[]', description: 'Numbers to average', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const numbers = args.flatMap(a => toArray(a)).map(toNumber)
      if (numbers.length === 0) return 0
      return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
    }
  },
  {
    name: 'Min',
    category: 'math',
    description: 'Minimum value',
    example: 'Min(5, 3, 8) → 3',
    parameters: [
      { name: 'values', type: 'number[]', description: 'Numbers to compare', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const numbers = args.flatMap(a => toArray(a)).map(toNumber)
      if (numbers.length === 0) return 0
      return Math.min(...numbers)
    }
  },
  {
    name: 'Max',
    category: 'math',
    description: 'Maximum value',
    example: 'Max(5, 3, 8) → 8',
    parameters: [
      { name: 'values', type: 'number[]', description: 'Numbers to compare', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const numbers = args.flatMap(a => toArray(a)).map(toNumber)
      if (numbers.length === 0) return 0
      return Math.max(...numbers)
    }
  },
  {
    name: 'Round',
    category: 'math',
    description: 'Round to specified decimal places',
    example: 'Round(3.14159, 2) → 3.14',
    parameters: [
      { name: 'value', type: 'number', description: 'Number to round', required: true },
      { name: 'decimals', type: 'number', description: 'Decimal places', required: false, defaultValue: 0 }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const value = toNumber(args[0])
      const decimals = args[1] !== undefined ? toNumber(args[1]) : 0
      const factor = Math.pow(10, decimals)
      return Math.round(value * factor) / factor
    }
  },
  {
    name: 'Abs',
    category: 'math',
    description: 'Absolute value',
    example: 'Abs(-5) → 5',
    parameters: [
      { name: 'value', type: 'number', description: 'Number', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => Math.abs(toNumber(args[0]))
  },
]

// ============================================================================
// STRING FUNCTIONS
// ============================================================================

const stringFunctions: FunctionDefinition[] = [
  {
    name: 'Concat',
    category: 'string',
    description: 'Concatenate strings',
    example: 'Concat("Hello", " ", "World") → "Hello World"',
    parameters: [
      { name: 'strings', type: 'string[]', description: 'Strings to join', required: true }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => args.map(toString).join('')
  },
  {
    name: 'Upper',
    category: 'string',
    description: 'Convert to uppercase',
    example: 'Upper("hello") → "HELLO"',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to convert', required: true }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => toString(args[0]).toUpperCase()
  },
  {
    name: 'Lower',
    category: 'string',
    description: 'Convert to lowercase',
    example: 'Lower("HELLO") → "hello"',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to convert', required: true }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => toString(args[0]).toLowerCase()
  },
  {
    name: 'Length',
    category: 'string',
    description: 'Length of string or array',
    example: 'Length("hello") → 5',
    parameters: [
      { name: 'value', type: 'string|array', description: 'String or array', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => {
      const value = args[0]
      if (Array.isArray(value)) return value.length
      return toString(value).length
    }
  },
  {
    name: 'Trim',
    category: 'string',
    description: 'Remove leading/trailing whitespace',
    example: 'Trim("  hello  ") → "hello"',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to trim', required: true }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => toString(args[0]).trim()
  },
  {
    name: 'Replace',
    category: 'string',
    description: 'Replace occurrences in string',
    example: 'Replace("hello", "l", "w") → "hewwo"',
    parameters: [
      { name: 'text', type: 'string', description: 'Source text', required: true },
      { name: 'search', type: 'string', description: 'Text to find', required: true },
      { name: 'replace', type: 'string', description: 'Replacement', required: true }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => {
      const text = toString(args[0])
      const search = toString(args[1])
      const replace = toString(args[2])
      return text.split(search).join(replace)
    }
  },
]

// ============================================================================
// DATE FUNCTIONS
// ============================================================================

const dateFunctions: FunctionDefinition[] = [
  {
    name: 'Now',
    category: 'date',
    description: 'Current date and time',
    example: 'Now() → "2024-01-15T10:30:00"',
    parameters: [],
    returnType: 'datetime',
    isAsync: false,
    implementation: (_, context) => context.now.toISOString()
  },
  {
    name: 'Today',
    category: 'date',
    description: 'Current date (no time)',
    example: 'Today() → "2024-01-15"',
    parameters: [],
    returnType: 'date',
    isAsync: false,
    implementation: (_, context) => context.now.toISOString().split('T')[0]
  },
  {
    name: 'Duration',
    category: 'date',
    description: 'Calculate duration between two dates',
    example: 'Duration(@start, @end) → "3 days"',
    parameters: [
      { name: 'start', type: 'date', description: 'Start date', required: true },
      { name: 'end', type: 'date', description: 'End date', required: true },
      { name: 'unit', type: 'string', description: 'Unit (days/hours/minutes)', required: false, defaultValue: 'days' }
    ],
    returnType: 'number|string',
    isAsync: false,
    implementation: (args) => {
      const start = toDate(args[0])
      const end = toDate(args[1])
      const unit = args[2] ? toString(args[2]) : 'days'
      
      const diffMs = end.getTime() - start.getTime()
      
      switch (unit.toLowerCase()) {
        case 'milliseconds':
        case 'ms':
          return diffMs
        case 'seconds':
        case 's':
          return Math.round(diffMs / 1000)
        case 'minutes':
        case 'm':
          return Math.round(diffMs / (1000 * 60))
        case 'hours':
        case 'h':
          return Math.round(diffMs / (1000 * 60 * 60))
        case 'days':
        case 'd':
        default:
          return Math.round(diffMs / (1000 * 60 * 60 * 24))
      }
    }
  },
  {
    name: 'DateAdd',
    category: 'date',
    description: 'Add duration to a date',
    example: 'DateAdd(@date, 7, "days") → next week',
    parameters: [
      { name: 'date', type: 'date', description: 'Base date', required: true },
      { name: 'amount', type: 'number', description: 'Amount to add', required: true },
      { name: 'unit', type: 'string', description: 'Unit (days/hours/minutes)', required: false, defaultValue: 'days' }
    ],
    returnType: 'date',
    isAsync: false,
    implementation: (args) => {
      const date = toDate(args[0])
      const amount = toNumber(args[1])
      const unit = args[2] ? toString(args[2]) : 'days'
      
      const result = new Date(date)
      
      switch (unit.toLowerCase()) {
        case 'minutes':
        case 'm':
          result.setMinutes(result.getMinutes() + amount)
          break
        case 'hours':
        case 'h':
          result.setHours(result.getHours() + amount)
          break
        case 'days':
        case 'd':
          result.setDate(result.getDate() + amount)
          break
        case 'weeks':
        case 'w':
          result.setDate(result.getDate() + amount * 7)
          break
        case 'months':
          result.setMonth(result.getMonth() + amount)
          break
        case 'years':
        case 'y':
          result.setFullYear(result.getFullYear() + amount)
          break
      }
      
      return result.toISOString()
    }
  },
  {
    name: 'FormatDate',
    category: 'date',
    description: 'Format date for display',
    example: 'FormatDate(@date, "short") → "Jan 15"',
    parameters: [
      { name: 'date', type: 'date', description: 'Date to format', required: true },
      { name: 'format', type: 'string', description: 'Format style', required: false, defaultValue: 'medium' }
    ],
    returnType: 'string',
    isAsync: false,
    implementation: (args) => {
      const date = toDate(args[0])
      const format = args[1] ? toString(args[1]) : 'medium'
      
      const options: Intl.DateTimeFormatOptions = {}
      
      switch (format) {
        case 'short':
          options.month = 'short'
          options.day = 'numeric'
          break
        case 'medium':
          options.month = 'short'
          options.day = 'numeric'
          options.year = 'numeric'
          break
        case 'long':
          options.weekday = 'long'
          options.month = 'long'
          options.day = 'numeric'
          options.year = 'numeric'
          break
        case 'iso':
          return date.toISOString().split('T')[0]
        case 'time':
          options.hour = '2-digit'
          options.minute = '2-digit'
          break
        case 'datetime':
          options.month = 'short'
          options.day = 'numeric'
          options.hour = '2-digit'
          options.minute = '2-digit'
          break
        default:
          options.month = 'short'
          options.day = 'numeric'
          options.year = 'numeric'
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(date)
    }
  },
  {
    name: 'DayOfWeek',
    category: 'date',
    description: 'Get day of week (0=Sunday, 6=Saturday)',
    example: 'DayOfWeek(@date) → 1 (Monday)',
    parameters: [
      { name: 'date', type: 'date', description: 'Date', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args) => toDate(args[0]).getDay()
  },
]

// ============================================================================
// LOGIC FUNCTIONS
// ============================================================================

const logicFunctions: FunctionDefinition[] = [
  {
    name: 'If',
    category: 'logic',
    description: 'Conditional expression',
    example: 'If(status = "done", "✓", "○") → "✓"',
    parameters: [
      { name: 'condition', type: 'boolean', description: 'Condition to test', required: true },
      { name: 'ifTrue', type: 'any', description: 'Value if true', required: true },
      { name: 'ifFalse', type: 'any', description: 'Value if false', required: true }
    ],
    returnType: 'any',
    isAsync: false,
    implementation: (args) => args[0] ? args[1] : args[2]
  },
  {
    name: 'And',
    category: 'logic',
    description: 'Logical AND',
    example: 'And(true, true) → true',
    parameters: [
      { name: 'conditions', type: 'boolean[]', description: 'Conditions', required: true }
    ],
    returnType: 'boolean',
    isAsync: false,
    implementation: (args) => args.every(Boolean)
  },
  {
    name: 'Or',
    category: 'logic',
    description: 'Logical OR',
    example: 'Or(false, true) → true',
    parameters: [
      { name: 'conditions', type: 'boolean[]', description: 'Conditions', required: true }
    ],
    returnType: 'boolean',
    isAsync: false,
    implementation: (args) => args.some(Boolean)
  },
  {
    name: 'Not',
    category: 'logic',
    description: 'Logical NOT',
    example: 'Not(false) → true',
    parameters: [
      { name: 'value', type: 'boolean', description: 'Value to negate', required: true }
    ],
    returnType: 'boolean',
    isAsync: false,
    implementation: (args) => !args[0]
  },
  {
    name: 'IsEmpty',
    category: 'logic',
    description: 'Check if value is empty',
    example: 'IsEmpty("") → true',
    parameters: [
      { name: 'value', type: 'any', description: 'Value to check', required: true }
    ],
    returnType: 'boolean',
    isAsync: false,
    implementation: (args) => {
      const value = args[0]
      if (value === null || value === undefined) return true
      if (typeof value === 'string') return value.trim() === ''
      if (Array.isArray(value)) return value.length === 0
      if (typeof value === 'object') return Object.keys(value).length === 0
      return false
    }
  },
  {
    name: 'Coalesce',
    category: 'logic',
    description: 'Return first non-empty value',
    example: 'Coalesce(null, "", "default") → "default"',
    parameters: [
      { name: 'values', type: 'any[]', description: 'Values to check', required: true }
    ],
    returnType: 'any',
    isAsync: false,
    implementation: (args) => {
      for (const arg of args) {
        if (arg !== null && arg !== undefined && arg !== '') {
          return arg
        }
      }
      return null
    }
  },
]

// ============================================================================
// AGGREGATE FUNCTIONS
// ============================================================================

const aggregateFunctions: FunctionDefinition[] = [
  {
    name: 'Count',
    category: 'aggregate',
    description: 'Count items matching a filter',
    example: 'Count(siblings, "status", "done")',
    parameters: [
      { name: 'collection', type: 'array', description: 'Items to count', required: true },
      { name: 'field', type: 'string', description: 'Field to filter on', required: false },
      { name: 'value', type: 'any', description: 'Value to match', required: false }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args, context) => {
      let items = toArray(args[0])
      
      // If first arg is "siblings", use context.siblings
      if (args[0] === 'siblings') {
        items = context.siblings
      }
      
      // If field and value provided, filter
      if (args[1] !== undefined) {
        const field = toString(args[1])
        const value = args[2]
        items = items.filter((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>
            const fields = obj.fields as Record<string, unknown> | undefined
            return fields?.[field] === value || obj[field] === value
          }
          return false
        })
      }
      
      return items.length
    }
  },
  {
    name: 'SumField',
    category: 'aggregate',
    description: 'Sum a specific field across items',
    example: 'SumField(siblings, "amount")',
    parameters: [
      { name: 'collection', type: 'array', description: 'Items to sum', required: true },
      { name: 'field', type: 'string', description: 'Field to sum', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args, context) => {
      let items = toArray(args[0])
      
      if (args[0] === 'siblings') {
        items = context.siblings
      }
      
      const field = toString(args[1])
      
      return items.reduce((sum: number, item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          const fields = obj.fields as Record<string, unknown> | undefined
          const value = fields?.[field] ?? obj[field]
          if (typeof value === 'number') return sum + value
          if (typeof value === 'string') {
            const parsed = parseFloat(value)
            if (!isNaN(parsed)) return sum + parsed
          }
        }
        return sum
      }, 0)
    }
  },
  {
    name: 'Filter',
    category: 'aggregate',
    description: 'Filter items by field value',
    example: 'Filter(siblings, "status", "done")',
    parameters: [
      { name: 'collection', type: 'array', description: 'Items to filter', required: true },
      { name: 'field', type: 'string', description: 'Field to match', required: true },
      { name: 'value', type: 'any', description: 'Value to match', required: true }
    ],
    returnType: 'array',
    isAsync: false,
    implementation: (args, context) => {
      let items = toArray(args[0])
      
      if (args[0] === 'siblings') {
        items = context.siblings
      }
      
      const field = toString(args[1])
      const value = args[2]
      
      return items.filter((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          const fields = obj.fields as Record<string, unknown> | undefined
          return fields?.[field] === value || obj[field] === value
        }
        return false
      })
    }
  },
]

// ============================================================================
// TRAVEL FUNCTIONS (Embark-inspired)
// ============================================================================

const travelFunctions: FunctionDefinition[] = [
  {
    name: 'Route',
    category: 'travel',
    description: 'Calculate route between two places (requires external API)',
    example: 'Route(@home, @office)',
    parameters: [
      { name: 'from', type: 'place', description: 'Starting location', required: true },
      { name: 'to', type: 'place', description: 'Destination', required: true },
      { name: 'mode', type: 'string', description: 'Travel mode (drive/walk/transit)', required: false, defaultValue: 'drive' }
    ],
    returnType: 'object',
    isAsync: true,
    implementation: async (args) => {
      // Placeholder - would integrate with Google Maps API
      const from = toString(args[0])
      const to = toString(args[1])
      const mode = args[2] ? toString(args[2]) : 'drive'
      
      // Return mock data - real implementation would call API
      return {
        from,
        to,
        mode,
        distance: '-- km',
        duration: '-- min',
        message: 'Route API not configured. Connect Google Maps API for real routes.',
      }
    }
  },
  {
    name: 'Weather',
    category: 'travel',
    description: 'Get weather forecast for a place and date',
    example: 'Weather(@paris, @friday)',
    parameters: [
      { name: 'place', type: 'place', description: 'Location', required: true },
      { name: 'date', type: 'date', description: 'Date for forecast', required: false }
    ],
    returnType: 'object',
    isAsync: true,
    implementation: async (args, context) => {
      const place = toString(args[0])
      const date = args[1] ? toDate(args[1]) : context.now
      
      // Return mock data - real implementation would call weather API
      return {
        place,
        date: date.toISOString().split('T')[0],
        condition: 'Unknown',
        temperature: '--°',
        message: 'Weather API not configured. Connect OpenWeatherMap API for real forecasts.',
      }
    }
  },
  {
    name: 'Distance',
    category: 'travel',
    description: 'Calculate straight-line distance between coordinates',
    example: 'Distance(@paris, @london)',
    parameters: [
      { name: 'from', type: 'place', description: 'Starting point', required: true },
      { name: 'to', type: 'place', description: 'End point', required: true }
    ],
    returnType: 'number',
    isAsync: false,
    implementation: (args, context) => {
      // Try to find coordinates from mentions
      const fromArg = args[0]
      const toArg = args[1]
      
      const getCoords = (arg: unknown): { lat: number; lng: number } | null => {
        if (typeof arg === 'string') {
          // Look up in mentions
          const mention = context.mentions.find(m => 
            m.label.toLowerCase() === arg.toLowerCase() && m.type === 'place'
          )
          if (mention && 'properties' in mention) {
            const props = mention.properties as Record<string, unknown>
            if (typeof props.latitude === 'number' && typeof props.longitude === 'number') {
              return { lat: props.latitude, lng: props.longitude }
            }
          }
        }
        if (typeof arg === 'object' && arg !== null) {
          const obj = arg as Record<string, unknown>
          if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
            return { lat: obj.latitude, lng: obj.longitude }
          }
        }
        return null
      }
      
      const fromCoords = getCoords(fromArg)
      const toCoords = getCoords(toArg)
      
      if (!fromCoords || !toCoords) {
        return 0 // No coordinates available
      }
      
      // Haversine formula
      const R = 6371 // Earth's radius in km
      const dLat = (toCoords.lat - fromCoords.lat) * Math.PI / 180
      const dLon = (toCoords.lng - fromCoords.lng) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(fromCoords.lat * Math.PI / 180) * Math.cos(toCoords.lat * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      
      return Math.round(R * c * 10) / 10 // km with 1 decimal
    }
  },
]

// ============================================================================
// REFERENCE FUNCTIONS
// ============================================================================

const referenceFunctions: FunctionDefinition[] = [
  {
    name: 'Get',
    category: 'reference',
    description: 'Get a field value from current block',
    example: 'Get("status")',
    parameters: [
      { name: 'fieldName', type: 'string', description: 'Field name', required: true }
    ],
    returnType: 'any',
    isAsync: false,
    implementation: (args, context) => {
      const fieldName = toString(args[0])
      return context.fields[fieldName]
    }
  },
  {
    name: 'Mention',
    category: 'reference',
    description: 'Get a mentioned entity by label',
    example: 'Mention("paris")',
    parameters: [
      { name: 'label', type: 'string', description: 'Entity label', required: true }
    ],
    returnType: 'entity',
    isAsync: false,
    implementation: (args, context) => {
      const label = toString(args[0]).toLowerCase()
      return context.mentions.find(m => m.label.toLowerCase() === label) || null
    }
  },
  {
    name: 'MentionsOfType',
    category: 'reference',
    description: 'Get all mentions of a specific type',
    example: 'MentionsOfType("place")',
    parameters: [
      { name: 'type', type: 'string', description: 'Entity type', required: true }
    ],
    returnType: 'entity[]',
    isAsync: false,
    implementation: (args, context) => {
      const type = toString(args[0]).toLowerCase()
      return context.mentions.filter(m => m.type === type)
    }
  },
]

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

/**
 * All built-in functions
 */
export const BUILTIN_FUNCTIONS: FunctionDefinition[] = [
  ...mathFunctions,
  ...stringFunctions,
  ...dateFunctions,
  ...logicFunctions,
  ...aggregateFunctions,
  ...travelFunctions,
  ...referenceFunctions,
]

/**
 * Function lookup map (case-insensitive)
 */
export const FUNCTION_MAP: Map<string, FunctionDefinition> = new Map(
  BUILTIN_FUNCTIONS.map(fn => [fn.name.toLowerCase(), fn])
)

/**
 * Get a function by name
 */
export function getFunction(name: string): FunctionDefinition | undefined {
  return FUNCTION_MAP.get(name.toLowerCase())
}

/**
 * Check if a function exists
 */
export function hasFunction(name: string): boolean {
  return FUNCTION_MAP.has(name.toLowerCase())
}

/**
 * Get all functions in a category
 */
export function getFunctionsByCategory(category: string): FunctionDefinition[] {
  return BUILTIN_FUNCTIONS.filter(fn => fn.category === category)
}

/**
 * Alias for BUILTIN_FUNCTIONS for backward compatibility
 */
export const builtinFunctions = BUILTIN_FUNCTIONS

