/**
 * Hook for building and querying a date index from strand metadata
 * @module codex/hooks/useDateIndex
 *
 * @remarks
 * - Extracts date field from strand frontmatter
 * - Builds an index for efficient date-based filtering
 * - Provides min/max dates and available date ranges
 *
 * @example
 * ```tsx
 * const { dateIndex, getStrandsForDate, getStrandsInRange } = useDateIndex(metadataMap)
 * ```
 */

import { useMemo, useCallback } from 'react'
import type { StrandMetadata, DateIndex, DateIndexEntry, DateFilter } from '../types'

/**
 * Parse a date string or date field into ISO format
 * Handles various date formats commonly found in frontmatter
 */
function parseDate(dateValue: unknown): string | null {
  if (!dateValue) return null

  try {
    // Handle Date objects
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0]
    }

    // Handle strings
    if (typeof dateValue === 'string') {
      // Already ISO format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue
      }
      // Full ISO datetime
      if (/^\d{4}-\d{2}-\d{2}T/.test(dateValue)) {
        return dateValue.split('T')[0]
      }
      // Try parsing as date
      const parsed = new Date(dateValue)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }

    // Handle numbers (timestamps)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return null
}

/**
 * Extract unique years from date entries
 */
function extractYears(entries: DateIndexEntry[]): number[] {
  const years = new Set<number>()
  for (const entry of entries) {
    const year = parseInt(entry.date.substring(0, 4), 10)
    if (!isNaN(year)) years.add(year)
  }
  return Array.from(years).sort((a, b) => b - a) // Descending
}

/**
 * Extract unique year-month pairs from date entries
 */
function extractMonths(entries: DateIndexEntry[]): { year: number; month: number }[] {
  const monthSet = new Set<string>()
  const result: { year: number; month: number }[] = []

  for (const entry of entries) {
    const yearMonth = entry.date.substring(0, 7) // YYYY-MM
    if (!monthSet.has(yearMonth)) {
      monthSet.add(yearMonth)
      const [year, month] = yearMonth.split('-').map(Number)
      result.push({ year, month })
    }
  }

  // Sort by date descending
  return result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
}

interface UseDateIndexResult {
  /** The complete date index */
  dateIndex: DateIndex
  /** Get all strand paths for a specific date */
  getStrandsForDate: (date: string) => string[]
  /** Get all strand paths within a date range (inclusive) */
  getStrandsInRange: (startDate: string, endDate: string) => string[]
  /** Check if a path matches the given date filter */
  matchesDateFilter: (path: string, filter: DateFilter) => boolean
  /** Check if a path has a date in the index */
  hasDate: (path: string) => boolean
  /** Get the date for a specific path */
  getDateForPath: (path: string) => string | null
  /** Total number of dated strands */
  totalDatedStrands: number
}

/**
 * Build and query a date index from strand metadata
 *
 * @param metadataMap - Map of file paths to their parsed metadata
 *
 * @remarks
 * Creates an indexed structure for efficient date-based filtering.
 * Extracts the `date` field from frontmatter (ISO 8601 format preferred).
 *
 * @example
 * ```tsx
 * function CalendarFilter() {
 *   const { dateIndex, getStrandsInRange, matchesDateFilter } = useDateIndex(metadataMap)
 *
 *   const filteredPaths = useMemo(() => {
 *     if (dateFilter.mode === 'none') return allPaths
 *     if (dateFilter.mode === 'single') {
 *       return getStrandsForDate(dateFilter.startDate!)
 *     }
 *     return getStrandsInRange(dateFilter.startDate!, dateFilter.endDate!)
 *   }, [dateFilter, allPaths])
 *
 *   return (
 *     <Calendar
 *       availableYears={dateIndex.availableYears}
 *       availableMonths={dateIndex.availableMonths}
 *     />
 *   )
 * }
 * ```
 */
export function useDateIndex(
  metadataMap: Map<string, StrandMetadata>
): UseDateIndexResult {
  // Build the date index from metadata
  const dateIndex = useMemo<DateIndex>(() => {
    const entries: DateIndexEntry[] = []

    for (const [path, metadata] of metadataMap) {
      // Try to extract date from frontmatter
      const dateValue = metadata.date || metadata.createdAt || metadata.created
      const parsedDate = parseDate(dateValue)

      if (parsedDate) {
        entries.push({
          path,
          date: parsedDate,
          dateSource: 'frontmatter',
        })
      }
    }

    // Sort entries by date descending
    entries.sort((a, b) => b.date.localeCompare(a.date))

    // Calculate min/max
    const dates = entries.map(e => e.date)
    const minDate = dates.length > 0 ? dates[dates.length - 1] : undefined
    const maxDate = dates.length > 0 ? dates[0] : undefined

    return {
      entries,
      minDate,
      maxDate,
      availableYears: extractYears(entries),
      availableMonths: extractMonths(entries),
    }
  }, [metadataMap])

  // Create a path-to-date lookup map for O(1) access
  const pathToDate = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of dateIndex.entries) {
      map.set(entry.path, entry.date)
    }
    return map
  }, [dateIndex])

  // Get strands for a specific date
  const getStrandsForDate = useCallback(
    (date: string): string[] => {
      return dateIndex.entries
        .filter(entry => entry.date === date)
        .map(entry => entry.path)
    },
    [dateIndex]
  )

  // Get strands within a date range
  const getStrandsInRange = useCallback(
    (startDate: string, endDate: string): string[] => {
      return dateIndex.entries
        .filter(entry => entry.date >= startDate && entry.date <= endDate)
        .map(entry => entry.path)
    },
    [dateIndex]
  )

  // Check if a path matches the date filter
  const matchesDateFilter = useCallback(
    (path: string, filter: DateFilter): boolean => {
      if (filter.mode === 'none') return true

      const date = pathToDate.get(path)
      if (!date) return false // No date = doesn't match filter

      if (filter.mode === 'single' && filter.startDate) {
        return date === filter.startDate
      }

      if (filter.mode === 'range' && filter.startDate && filter.endDate) {
        return date >= filter.startDate && date <= filter.endDate
      }

      return false
    },
    [pathToDate]
  )

  // Check if a path has a date
  const hasDate = useCallback(
    (path: string): boolean => pathToDate.has(path),
    [pathToDate]
  )

  // Get date for a path
  const getDateForPath = useCallback(
    (path: string): string | null => pathToDate.get(path) || null,
    [pathToDate]
  )

  return {
    dateIndex,
    getStrandsForDate,
    getStrandsInRange,
    matchesDateFilter,
    hasDate,
    getDateForPath,
    totalDatedStrands: dateIndex.entries.length,
  }
}

export default useDateIndex
