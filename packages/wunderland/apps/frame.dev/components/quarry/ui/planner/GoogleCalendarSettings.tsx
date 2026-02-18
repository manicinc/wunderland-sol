'use client'

/**
 * Google Calendar Settings Component
 *
 * Settings UI for Google Calendar integration with auth integration.
 * Shows different UX based on:
 * - User signed in with Google → Calendar auto-enabled
 * - User signed in with email → Shows "Connect Google" prompt
 * - Guest user → Shows standalone calendar auth
 *
 * @module components/quarry/ui/planner/GoogleCalendarSettings
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  GoogleCalendarIcon,
  SyncingIcon,
  SyncedIcon,
  SyncErrorIcon,
  SyncPendingIcon,
} from '@/lib/planner/icons/PlannerIcons'
import {
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  Info,
  Settings,
  User,
} from 'lucide-react'
import { useGoogleCalendarSync } from '@/lib/planner/hooks/useGoogleCalendarSync'
import Link from 'next/link'

// ============================================================================
// COMPONENT
// ============================================================================

interface GoogleCalendarSettingsProps {
  className?: string
}

export function GoogleCalendarSettings({ className }: GoogleCalendarSettingsProps) {
  // Check environment for public access mode
  const isPublicAccess = process.env.NEXT_PUBLIC_GOOGLE_PUBLIC_ACCESS === 'true'

  // Use the unified Google Calendar sync hook
  const {
    isAuthenticated,
    userEmail,
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
  } = useGoogleCalendarSync()

  const handleConnect = async () => {
    await signIn()
  }

  const handleDisconnect = async () => {
    if (isPublicAccess) {
      const confirmed = window.confirm(
        'Public Access Mode is enabled. Disconnecting will affect all users. Are you sure?'
      )
      if (!confirmed) return
    }
    await signOut()
  }

  const handleSync = async () => {
    await syncNow()
  }

  const toggleCalendar = (calendarId: string) => {
    if (isPublicAccess) return
    toggleCalendarSelection(calendarId)
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-stone-200 dark:border-stone-700',
        'bg-white dark:bg-stone-900',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          'border-b border-stone-200 dark:border-stone-700',
          'bg-stone-50 dark:bg-stone-800/50'
        )}
      >
        <GoogleCalendarIcon size={24} />
        <div className="flex-1">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">
            Google Calendar
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Sync events with Google Calendar
          </p>
        </div>

        {/* Sync status indicator */}
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <SyncingIcon size={18} />
            ) : error ? (
              <SyncErrorIcon size={18} />
            ) : lastSyncAt ? (
              <SyncedIcon size={18} />
            ) : (
              <SyncPendingIcon size={18} />
            )}
          </div>
        )}
      </div>

      {/* Public Access Warning */}
      {isPublicAccess && (
        <div
          className={cn(
            'flex items-start gap-3 px-4 py-3',
            'bg-amber-50 dark:bg-amber-900/20',
            'border-b border-amber-200 dark:border-amber-800/50'
          )}
        >
          <Lock size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Public Access Mode Enabled
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Settings are locked. To modify, set{' '}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                NEXT_PUBLIC_GOOGLE_PUBLIC_ACCESS=false
              </code>{' '}
              in your environment.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Not Connected State */}
        {!isAuthenticated && !isLoading && (
          <div className="text-center py-6">
            <div
              className={cn(
                'w-16 h-16 mx-auto mb-4 rounded-full',
                'bg-stone-100 dark:bg-stone-800',
                'flex items-center justify-center'
              )}
            >
              <GoogleCalendarIcon size={32} />
            </div>

            <p className="text-stone-600 dark:text-stone-400 mb-4">
              Connect your Google account to sync calendar events
            </p>

            {/* Auth Integration: Recommend signing in with Google */}
            {requiresStandaloneAuth && (
              <div
                className={cn(
                  'mb-4 p-3 rounded-lg text-left',
                  'bg-violet-50 dark:bg-violet-900/20',
                  'border border-violet-200 dark:border-violet-800/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <User
                    size={16}
                    className="text-violet-600 dark:text-violet-400 mt-0.5"
                  />
                  <div className="text-sm text-violet-800 dark:text-violet-200">
                    <p className="font-medium">Recommended: Sign in with Google</p>
                    <p className="text-xs mt-1 text-violet-600 dark:text-violet-400">
                      For the best experience, sign in with Google in Settings. This automatically
                      enables calendar sync, syncs your profile picture, and allows future Drive integration.
                    </p>
                    <Link
                      href="/quarry/login"
                      className={cn(
                        'inline-flex items-center gap-1 mt-2 text-xs font-medium',
                        'text-violet-700 dark:text-violet-300 hover:underline'
                      )}
                    >
                      <Settings size={12} />
                      Go to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Show connect button if standalone auth is available */}
            {!requiresStandaloneAuth && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'font-medium text-white',
                  'bg-blue-600 hover:bg-blue-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                <GoogleCalendarIcon size={18} />
                {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
            )}

            {/* Show error if any */}
            {error && (
              <div
                className={cn(
                  'mt-4 p-3 rounded-lg text-left',
                  'bg-red-50 dark:bg-red-900/20',
                  'border border-red-200 dark:border-red-800/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isAuthenticated && (
          <div className="text-center py-8">
            <SyncingIcon size={32} />
            <p className="mt-2 text-sm text-stone-500">Checking connection...</p>
          </div>
        )}

        {/* Connected State */}
        {isAuthenticated && (
          <>
            {/* Account Info with Auth Source Badge */}
            <div
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                'bg-emerald-50 dark:bg-emerald-900/20',
                'border border-emerald-200 dark:border-emerald-800/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full',
                    'bg-emerald-500 text-white',
                    'flex items-center justify-center'
                  )}
                >
                  <Check size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Connected
                    </p>
                    {isConnectedViaAuth && (
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          'bg-violet-100 dark:bg-violet-900/50',
                          'text-violet-700 dark:text-violet-300'
                        )}
                        title="Calendar connected via your Google account sign-in"
                      >
                        via Account
                      </span>
                    )}
                  </div>
                  {userEmail && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>

              {!isPublicAccess && !isConnectedViaAuth && (
                <button
                  onClick={handleDisconnect}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium',
                    'text-red-600 dark:text-red-400',
                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                    'transition-colors'
                  )}
                >
                  Disconnect
                </button>
              )}

              {isConnectedViaAuth && (
                <Link
                  href="/quarry/login"
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium',
                    'text-stone-600 dark:text-stone-400',
                    'hover:bg-stone-100 dark:hover:bg-stone-800',
                    'transition-colors inline-flex items-center gap-1'
                  )}
                >
                  <Settings size={14} />
                  Account
                </Link>
              )}
            </div>

            {/* Auth Integration Info */}
            {isConnectedViaAuth && (
              <div
                className={cn(
                  'p-3 rounded-lg',
                  'bg-violet-50 dark:bg-violet-900/20',
                  'border border-violet-200 dark:border-violet-800/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-violet-600 dark:text-violet-400 mt-0.5" />
                  <div className="text-sm text-violet-800 dark:text-violet-200">
                    <p className="font-medium">Calendar sync enabled via your account</p>
                    <p className="text-xs mt-1 text-violet-600 dark:text-violet-400">
                      Your calendar is connected through your Google account. To disconnect,
                      manage your account in Settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calendars List */}
            {calendars.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  Calendars to sync:
                </h4>
                <div className="space-y-2">
                  {calendars.map((calendar) => (
                    <label
                      key={calendar.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg',
                        'hover:bg-stone-50 dark:hover:bg-stone-800/50',
                        'transition-colors',
                        isPublicAccess && 'cursor-not-allowed opacity-75'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCalendarIds.includes(calendar.id)}
                        onChange={() => toggleCalendar(calendar.id)}
                        disabled={isPublicAccess}
                        className={cn(
                          'w-4 h-4 rounded',
                          'text-emerald-600 focus:ring-emerald-500',
                          'border-stone-300 dark:border-stone-600'
                        )}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: calendar.color || '#22c55e' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
                          {calendar.name}
                          {calendar.isPrimary && (
                            <span className="ml-2 text-xs text-stone-500">
                              (primary)
                            </span>
                          )}
                        </p>
                        {calendar.description && (
                          <p className="text-xs text-stone-500 truncate">
                            {calendar.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          'bg-stone-100 dark:bg-stone-700',
                          'text-stone-500 dark:text-stone-400'
                        )}
                      >
                        {calendar.accessRole}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Controls */}
            <div
              className={cn(
                'flex items-center justify-between pt-3',
                'border-t border-stone-200 dark:border-stone-700'
              )}
            >
              <div className="text-sm text-stone-500 dark:text-stone-400">
                {lastSyncAt ? (
                  <>
                    Last synced:{' '}
                    {new Date(lastSyncAt).toLocaleString()}
                  </>
                ) : (
                  'Never synced'
                )}
              </div>

              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
                  'text-sm font-medium',
                  'bg-stone-100 dark:bg-stone-800',
                  'text-stone-700 dark:text-stone-300',
                  'hover:bg-stone-200 dark:hover:bg-stone-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                <RefreshCw
                  size={14}
                  className={isSyncing ? 'animate-spin' : ''}
                />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div
                className={cn(
                  'flex items-start gap-2 p-3 rounded-lg',
                  'bg-red-50 dark:bg-red-900/20',
                  'border border-red-200 dark:border-red-800/50'
                )}
              >
                <AlertTriangle
                  size={16}
                  className="text-red-600 dark:text-red-400 mt-0.5"
                />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}
          </>
        )}

        {/* Admin Settings (only when not in public access mode) */}
        {isAuthenticated && !isPublicAccess && !isConnectedViaAuth && (
          <div
            className={cn(
              'pt-4 mt-4',
              'border-t border-stone-200 dark:border-stone-700'
            )}
          >
            <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
              Admin Settings
            </h4>

            <div
              className={cn(
                'p-3 rounded-lg',
                'bg-stone-50 dark:bg-stone-800/50',
                'border border-stone-200 dark:border-stone-700'
              )}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {
                    // This would set the environment variable
                    alert(
                      'To enable public access mode, set NEXT_PUBLIC_GOOGLE_PUBLIC_ACCESS=true in your environment and restart the server.'
                    )
                  }}
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded',
                    'text-emerald-600 focus:ring-emerald-500',
                    'border-stone-300 dark:border-stone-600'
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                    Enable Public Access Mode
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Locks settings for all users. The current Google Calendar
                    connection will be shared with everyone using this instance.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Setup Documentation Link */}
        <div className="text-center pt-2">
          <a
            href="https://github.com/your-repo/docs/GOOGLE_CALENDAR_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1 text-sm',
              'text-stone-500 dark:text-stone-400',
              'hover:text-stone-700 dark:hover:text-stone-200',
              'transition-colors'
            )}
          >
            View setup documentation
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default GoogleCalendarSettings
