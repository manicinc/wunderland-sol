/**
 * useGoogleCalendarSync Hook
 *
 * Manages Google Calendar integration with two-way sync.
 * Handles authentication, calendar fetching, and event sync.
 *
 * Integration with AuthContext:
 * - When user signs in with Google via auth, calendar is auto-enabled
 * - Tokens are synced between auth context and local storage
 * - Standalone calendar auth still works for guest users
 *
 * @module lib/planner/hooks/useGoogleCalendarSync
 */

'use client'

import { useState, useCallback, useEffect, useContext, createContext } from 'react'
import {
  performOAuthFlow,
  loadTokensFromStorage,
  signOut as oauthSignOut,
  getValidAccessToken,
  isTokenExpired,
} from '../google/GoogleCalendarOAuth'
import type { GoogleCalendarTokens, GoogleCalendar, CalendarEvent } from '../types'
import { generatePlannerId } from '../types'
import * as db from '../database'

// ============================================================================
// AUTH INTEGRATION CONTEXT
// ============================================================================

/**
 * Context for receiving auth state from parent AuthProvider
 * This allows calendar sync to be auto-enabled when user logs in with Google
 */
interface AuthIntegrationState {
  isGoogleConnected: boolean
  googleTokens?: GoogleCalendarTokens
  userEmail?: string
}

const AuthIntegrationContext = createContext<AuthIntegrationState | null>(null)

export function useAuthIntegration() {
  return useContext(AuthIntegrationContext)
}

export { AuthIntegrationContext }

// ============================================================================
// TYPES
// ============================================================================

export interface UseGoogleCalendarSyncReturn {
  // Auth state
  isAuthenticated: boolean
  userEmail: string | null
  isLoading: boolean
  error: string | null

  // Auth integration state
  isConnectedViaAuth: boolean  // True if connected via main auth context
  requiresStandaloneAuth: boolean  // True if needs separate calendar auth

  // Auth actions
  signIn: () => Promise<void>
  signOut: () => Promise<void>

  // Calendars
  calendars: GoogleCalendar[]
  selectedCalendarIds: string[]
  toggleCalendarSelection: (calendarId: string) => void

  // Sync
  isSyncing: boolean
  lastSyncAt: string | null
  syncNow: () => Promise<void>

  // Remote events
  remoteEvents: CalendarEvent[]
}

interface GoogleCalendarListItem {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  selected?: boolean
  primary?: boolean
  accessRole: string
}

interface GoogleEventItem {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status?: string
  colorId?: string
  recurrence?: string[]
  created?: string
  updated?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// These should be set via environment variables in production
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/google-calendar/callback`
    : ''

// ============================================================================
// HOOK
// ============================================================================

export function useGoogleCalendarSync(): UseGoogleCalendarSyncReturn {
  const [tokens, setTokens] = useState<GoogleCalendarTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [remoteEvents, setRemoteEvents] = useState<CalendarEvent[]>([])

  // Check for auth integration from parent context
  const authIntegration = useAuthIntegration()

  // Load tokens on mount - check auth integration first, then local storage
  useEffect(() => {
    const loadTokens = () => {
      setIsLoading(true)
      try {
        // If user is signed in with Google via auth, use those tokens
        if (authIntegration?.isGoogleConnected && authIntegration.googleTokens) {
          console.log('[useGoogleCalendarSync] Using tokens from auth context')
          setTokens(authIntegration.googleTokens)
          setIsLoading(false)
          return
        }

        // Otherwise, check local storage for standalone calendar auth
        const stored = loadTokensFromStorage()
        if (stored && !isTokenExpired(stored)) {
          setTokens(stored)
        }
      } catch (err) {
        console.error('[useGoogleCalendarSync] Failed to load tokens:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [authIntegration?.isGoogleConnected, authIntegration?.googleTokens])

  // Load calendars when authenticated
  useEffect(() => {
    if (tokens) {
      fetchCalendars()
    }
  }, [tokens])

  // Derived state
  const isAuthenticated = !!tokens && !isTokenExpired(tokens)
  const userEmail = tokens?.userEmail || null

  // Sign in
  const signIn = useCallback(async () => {
    // If already authenticated via auth context, no need to sign in again
    if (authIntegration?.isGoogleConnected) {
      console.log('[useGoogleCalendarSync] Already connected via auth context')
      return
    }

    if (!GOOGLE_CLIENT_ID) {
      setError('Google Calendar integration is not configured. Sign in with Google in Settings to enable calendar sync.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // performOAuthFlow() detects mode automatically (preconfigured vs BYOK)
      const { tokens: newTokens, userEmail } = await performOAuthFlow()

      setTokens(newTokens)

      // Save tokens to database as well
      await db.saveOAuthTokens({
        ...newTokens,
        userEmail,
      })

      console.log('[useGoogleCalendarSync] Signed in as:', userEmail)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      console.error('[useGoogleCalendarSync] Sign in error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [authIntegration?.isGoogleConnected])

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true)

    try {
      await oauthSignOut()
      await db.deleteOAuthTokens()
      setTokens(null)
      setCalendars([])
      setSelectedCalendarIds([])
      setRemoteEvents([])
      setLastSyncAt(null)
      console.log('[useGoogleCalendarSync] Signed out')
    } catch (err) {
      console.error('[useGoogleCalendarSync] Sign out error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch calendars from Google
  const fetchCalendars = useCallback(async () => {
    // getValidAccessToken() detects mode and refreshes token if needed
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      setError('Failed to get access token')
      return
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch calendars')
      }

      const data = await response.json()
      const items: GoogleCalendarListItem[] = data.items || []

      const calendarList: GoogleCalendar[] = items.map((item) => ({
        id: `cal_${item.id}`,
        googleCalendarId: item.id,
        name: item.summary,
        description: item.description,
        color: item.backgroundColor,
        isPrimary: item.primary || false,
        isSelected: true, // Select all by default
        accessRole: item.accessRole as 'owner' | 'writer' | 'reader',
      }))

      setCalendars(calendarList)
      setSelectedCalendarIds(calendarList.map((c) => c.id))

      // Save calendars to database
      await db.saveCalendars(calendarList)
    } catch (err) {
      console.error('[useGoogleCalendarSync] Failed to fetch calendars:', err)
      setError('Failed to fetch calendars')
    }
  }, [])

  // Toggle calendar selection
  const toggleCalendarSelection = useCallback((calendarId: string) => {
    setSelectedCalendarIds((prev) => {
      const isCurrentlySelected = prev.includes(calendarId)
      const newSelection = isCurrentlySelected
        ? prev.filter((id) => id !== calendarId)
        : [...prev, calendarId]

      // Update database
      db.toggleCalendarSelection(calendarId, !isCurrentlySelected)

      return newSelection
    })
  }, [])

  // Sync events from Google Calendar
  const syncNow = useCallback(async () => {
    if (!isAuthenticated || selectedCalendarIds.length === 0) {
      return
    }

    setIsSyncing(true)
    setError(null)

    try {
      // getValidAccessToken() detects mode and refreshes token if needed
      const accessToken = await getValidAccessToken()

      if (!accessToken) {
        throw new Error('Failed to get access token')
      }

      const allEvents: CalendarEvent[] = []

      // Fetch events from each selected calendar
      for (const calendarId of selectedCalendarIds) {
        const events = await fetchCalendarEvents(accessToken, calendarId)
        allEvents.push(...events)
      }

      setRemoteEvents(allEvents)
      setLastSyncAt(new Date().toISOString())

      console.log(`[useGoogleCalendarSync] Synced ${allEvents.length} events`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setError(message)
      console.error('[useGoogleCalendarSync] Sync error:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [isAuthenticated, selectedCalendarIds])

  // Derived state for auth integration
  const isConnectedViaAuth = authIntegration?.isGoogleConnected || false
  const requiresStandaloneAuth = !isConnectedViaAuth && !GOOGLE_CLIENT_ID

  return {
    isAuthenticated,
    userEmail: authIntegration?.userEmail || userEmail,
    isLoading,
    error,
    isConnectedViaAuth,
    requiresStandaloneAuth,
    signIn,
    signOut,
    calendars,
    selectedCalendarIds,
    toggleCalendarSelection,
    isSyncing,
    lastSyncAt,
    syncNow,
    remoteEvents,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string
): Promise<CalendarEvent[]> {
  // Fetch events for the next 3 months
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    console.warn(`[fetchCalendarEvents] Failed for calendar ${calendarId}`)
    return []
  }

  const data = await response.json()
  const items: GoogleEventItem[] = data.items || []

  return items.map((item) => ({
    id: generatePlannerId('event'),
    title: item.summary || '(No title)',
    description: item.description,
    location: item.location,
    startDatetime: item.start.dateTime || item.start.date || '',
    endDatetime: item.end.dateTime || item.end.date || '',
    allDay: !!item.start.date,
    timezone: item.start.timeZone || 'UTC',
    color: getColorFromId(item.colorId),
    googleEventId: item.id,
    googleCalendarId: calendarId,
    syncStatus: 'synced' as const,
    localVersion: 0,
    remoteVersion: 1,
    isDeleted: item.status === 'cancelled',
    createdAt: item.created || new Date().toISOString(),
    updatedAt: item.updated || new Date().toISOString(),
  }))
}

function getColorFromId(colorId?: string): string {
  // Google Calendar color IDs mapping
  const colorMap: Record<string, string> = {
    '1': '#7986CB', // Lavender
    '2': '#33B679', // Sage
    '3': '#8E24AA', // Grape
    '4': '#E67C73', // Flamingo
    '5': '#F6BF26', // Banana
    '6': '#F4511E', // Tangerine
    '7': '#039BE5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3F51B5', // Blueberry
    '10': '#0B8043', // Basil
    '11': '#D50000', // Tomato
  }

  return colorMap[colorId || ''] || '#10B981' // Default to emerald
}
