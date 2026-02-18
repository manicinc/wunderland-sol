/**
 * iCal Sync Service
 *
 * Fetches and syncs iCalendar feeds into Quarry calendar.
 * Supports auto-refresh on configurable intervals.
 *
 * @module lib/planner/ical/iCalSync
 */

import { parseICalString, convertToCalendarEvents, type ICalCalendar } from './iCalParser'
import type { CalendarEvent } from '../types'
import * as db from '../database'

// ============================================================================
// TYPES
// ============================================================================

export interface ICalFeed {
  id: string
  name: string
  url: string
  color?: string
  refreshInterval: number // minutes, 0 = manual only
  enabled: boolean
  lastSynced?: string
  lastError?: string
  eventCount: number
  createdAt: string
  updatedAt: string
}

export interface ICalSyncResult {
  success: boolean
  feedId: string
  eventsImported: number
  eventsUpdated: number
  eventsDeleted: number
  error?: string
  syncedAt: string
}

export interface ICalSyncStatus {
  feeds: ICalFeed[]
  totalEvents: number
  lastSync?: string
  nextSync?: string
  syncInProgress: boolean
}

// Storage key for iCal feeds
const ICAL_FEEDS_KEY = 'planner_ical_feeds'
const ICAL_EVENTS_PREFIX = 'ical_events_'

// ============================================================================
// FEED MANAGEMENT
// ============================================================================

/**
 * Get all configured iCal feeds
 */
export function getICalFeeds(): ICalFeed[] {
  if (typeof localStorage === 'undefined') return []

  const stored = localStorage.getItem(ICAL_FEEDS_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save iCal feeds
 */
function saveICalFeeds(feeds: ICalFeed[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(ICAL_FEEDS_KEY, JSON.stringify(feeds))
}

/**
 * Add a new iCal feed
 */
export function addICalFeed(
  url: string,
  name?: string,
  options?: Partial<Pick<ICalFeed, 'color' | 'refreshInterval' | 'enabled'>>
): ICalFeed {
  const feeds = getICalFeeds()

  // Check for duplicate URL
  if (feeds.some((f) => f.url === url)) {
    throw new Error('This calendar URL is already added')
  }

  const now = new Date().toISOString()
  const feed: ICalFeed = {
    id: `ical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name || extractNameFromUrl(url),
    url,
    color: options?.color,
    refreshInterval: options?.refreshInterval ?? 60, // Default: 1 hour
    enabled: options?.enabled ?? true,
    eventCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  feeds.push(feed)
  saveICalFeeds(feeds)

  return feed
}

/**
 * Update an iCal feed
 */
export function updateICalFeed(
  id: string,
  updates: Partial<Pick<ICalFeed, 'name' | 'color' | 'refreshInterval' | 'enabled'>>
): ICalFeed | null {
  const feeds = getICalFeeds()
  const index = feeds.findIndex((f) => f.id === id)

  if (index === -1) return null

  feeds[index] = {
    ...feeds[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  saveICalFeeds(feeds)
  return feeds[index]
}

/**
 * Remove an iCal feed and its cached events
 */
export function removeICalFeed(id: string): boolean {
  const feeds = getICalFeeds()
  const index = feeds.findIndex((f) => f.id === id)

  if (index === -1) return false

  feeds.splice(index, 1)
  saveICalFeeds(feeds)

  // Clear cached events
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${ICAL_EVENTS_PREFIX}${id}`)
  }

  return true
}

/**
 * Get a specific feed by ID
 */
export function getICalFeed(id: string): ICalFeed | null {
  return getICalFeeds().find((f) => f.id === id) || null
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Fetch and parse an iCal feed
 */
export async function fetchICalFeed(url: string): Promise<ICalCalendar> {
  // Use a CORS proxy for external URLs
  const fetchUrl = getCorsProxyUrl(url)

  const response = await fetch(fetchUrl, {
    headers: {
      Accept: 'text/calendar, application/calendar+json, */*',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`)
  }

  const icsContent = await response.text()
  const result = parseICalString(icsContent)

  if (!result.success || !result.calendar) {
    throw new Error(result.error || 'Failed to parse calendar')
  }

  return result.calendar
}

/**
 * Sync a single iCal feed
 */
export async function syncICalFeed(feedId: string): Promise<ICalSyncResult> {
  const feed = getICalFeed(feedId)
  if (!feed) {
    return {
      success: false,
      feedId,
      eventsImported: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      error: 'Feed not found',
      syncedAt: new Date().toISOString(),
    }
  }

  try {
    // Fetch and parse the feed
    const calendar = await fetchICalFeed(feed.url)

    // Convert to calendar events
    const newEvents = convertToCalendarEvents(calendar.events, feedId)

    // Get existing events for this feed
    const existingEvents = getCachedEvents(feedId)
    const existingIds = new Set(existingEvents.map((e) => e.id))
    const newIds = new Set(newEvents.map((e) => e.id))

    // Calculate changes
    const eventsToAdd = newEvents.filter((e) => !existingIds.has(e.id))
    const eventsToUpdate = newEvents.filter((e) => existingIds.has(e.id))
    const eventsToDelete = existingEvents.filter((e) => !newIds.has(e.id))

    // Save new events to cache
    saveCachedEvents(feedId, newEvents)

    // Update feed metadata
    const updatedFeed = updateICalFeed(feedId, {})
    if (updatedFeed) {
      const feeds = getICalFeeds()
      const index = feeds.findIndex((f) => f.id === feedId)
      if (index !== -1) {
        feeds[index].lastSynced = new Date().toISOString()
        feeds[index].lastError = undefined
        feeds[index].eventCount = newEvents.length
        saveICalFeeds(feeds)
      }
    }

    return {
      success: true,
      feedId,
      eventsImported: eventsToAdd.length,
      eventsUpdated: eventsToUpdate.length,
      eventsDeleted: eventsToDelete.length,
      syncedAt: new Date().toISOString(),
    }
  } catch (error) {
    // Update feed with error
    const feeds = getICalFeeds()
    const index = feeds.findIndex((f) => f.id === feedId)
    if (index !== -1) {
      feeds[index].lastError = error instanceof Error ? error.message : 'Sync failed'
      feeds[index].updatedAt = new Date().toISOString()
      saveICalFeeds(feeds)
    }

    return {
      success: false,
      feedId,
      eventsImported: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      error: error instanceof Error ? error.message : 'Sync failed',
      syncedAt: new Date().toISOString(),
    }
  }
}

/**
 * Sync all enabled iCal feeds
 */
export async function syncAllICalFeeds(): Promise<ICalSyncResult[]> {
  const feeds = getICalFeeds().filter((f) => f.enabled)
  const results: ICalSyncResult[] = []

  for (const feed of feeds) {
    const result = await syncICalFeed(feed.id)
    results.push(result)
  }

  return results
}

/**
 * Get all iCal events from all feeds
 */
export function getAllICalEvents(): CalendarEvent[] {
  const feeds = getICalFeeds().filter((f) => f.enabled)
  const allEvents: CalendarEvent[] = []

  for (const feed of feeds) {
    const events = getCachedEvents(feed.id)
    // Apply feed color if not set on event
    for (const event of events) {
      if (!event.color && feed.color) {
        event.color = feed.color
      }
    }
    allEvents.push(...events)
  }

  return allEvents
}

/**
 * Get iCal events for a specific date range
 */
export function getICalEventsInRange(start: Date, end: Date): CalendarEvent[] {
  const allEvents = getAllICalEvents()

  return allEvents.filter((event) => {
    const eventStart = new Date(event.startDatetime)
    const eventEnd = new Date(event.endDatetime)
    return eventStart <= end && eventEnd >= start
  })
}

// ============================================================================
// CACHED EVENTS STORAGE
// ============================================================================

/**
 * Get cached events for a feed
 */
function getCachedEvents(feedId: string): CalendarEvent[] {
  if (typeof localStorage === 'undefined') return []

  const stored = localStorage.getItem(`${ICAL_EVENTS_PREFIX}${feedId}`)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save cached events for a feed
 */
function saveCachedEvents(feedId: string, events: CalendarEvent[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`${ICAL_EVENTS_PREFIX}${feedId}`, JSON.stringify(events))
}

// ============================================================================
// AUTO-REFRESH
// ============================================================================

let refreshIntervalId: NodeJS.Timeout | null = null

/**
 * Start auto-refresh for iCal feeds
 */
export function startAutoRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
  }

  // Check every minute which feeds need refreshing
  refreshIntervalId = setInterval(async () => {
    const feeds = getICalFeeds().filter((f) => f.enabled && f.refreshInterval > 0)
    const now = Date.now()

    for (const feed of feeds) {
      if (!feed.lastSynced) {
        // Never synced, sync now
        await syncICalFeed(feed.id)
        continue
      }

      const lastSynced = new Date(feed.lastSynced).getTime()
      const refreshMs = feed.refreshInterval * 60 * 1000
      
      if (now - lastSynced >= refreshMs) {
        await syncICalFeed(feed.id)
      }
    }
  }, 60 * 1000) // Check every minute
}

/**
 * Stop auto-refresh
 */
export function stopAutoRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }
}

/**
 * Get sync status for all feeds
 */
export function getICalSyncStatus(): ICalSyncStatus {
  const feeds = getICalFeeds()
  const totalEvents = feeds.reduce((sum, f) => sum + f.eventCount, 0)

  // Find last and next sync times
  let lastSync: string | undefined
  let nextSync: string | undefined

  for (const feed of feeds) {
    if (feed.lastSynced) {
      if (!lastSync || feed.lastSynced > lastSync) {
        lastSync = feed.lastSynced
      }
    }

    if (feed.enabled && feed.refreshInterval > 0 && feed.lastSynced) {
      const nextSyncTime = new Date(
        new Date(feed.lastSynced).getTime() + feed.refreshInterval * 60 * 1000
      ).toISOString()

      if (!nextSync || nextSyncTime < nextSync) {
        nextSync = nextSyncTime
      }
    }
  }

  return {
    feeds,
    totalEvents,
    lastSync,
    nextSync,
    syncInProgress: false, // Would need state management for accurate tracking
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract a readable name from a calendar URL
 */
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    
    // Try to get calendar name from path
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      const last = pathParts[pathParts.length - 1]
      // Remove file extension
      const name = last.replace(/\.(ics|ical)$/i, '')
      if (name && name !== 'basic' && name !== 'calendar') {
        return decodeURIComponent(name)
      }
    }

    // Fall back to hostname
    return urlObj.hostname.replace(/^www\./, '').split('.')[0] || 'Calendar'
  } catch {
    return 'Calendar'
  }
}

/**
 * Get CORS proxy URL for external calendar fetches
 */
function getCorsProxyUrl(url: string): string {
  // For same-origin or localhost, no proxy needed
  if (typeof window !== 'undefined') {
    try {
      const urlObj = new URL(url)
      if (urlObj.origin === window.location.origin) {
        return url
      }
    } catch {
      // Invalid URL, return as-is
      return url
    }
  }

  // Use our internal proxy route
  return `/api/proxy/ical?url=${encodeURIComponent(url)}`
}



