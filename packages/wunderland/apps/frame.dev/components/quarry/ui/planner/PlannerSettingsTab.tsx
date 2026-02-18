/**
 * Planner Settings Tab
 *
 * Settings panel for planner integrations including Google Calendar.
 * Features disabled states with tooltips when not configured.
 *
 * @module codex/ui/PlannerSettingsTab
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Info,
  Lock,
  RefreshCw,
  Settings2,
  Check,
  X,
  AlertCircle,
  Clock,
  Globe,
  Loader2,
  LogOut,
  Calendar,
  HelpCircle,
  Sparkles,
  Timer,
  ListTree,
  Columns3,
  Brain,
  Eye,
  EyeOff,
  Key,
  Plus,
  Trash2,
  Link2,
  Download,
  Upload,
  FileText,
  Rss,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoogleCalendarSync } from '@/lib/planner/hooks/useGoogleCalendarSync'
import {
  COUNTRY_OPTIONS,
  DEFAULT_HOLIDAY_SETTINGS,
  type HolidaySettings,
  type CountryCode,
} from '@/lib/planner/holidays'
import {
  getOracleConfig,
  saveOracleConfig,
  type OracleLLMConfig,
} from '@/lib/planner/oracle/llmParser'
import {
  getICalFeeds,
  addICalFeed,
  removeICalFeed,
  updateICalFeed,
  syncICalFeed,
  syncAllICalFeeds,
  getICalSyncStatus,
  type ICalFeed,
} from '@/lib/planner/ical'
import { generateICalString } from '@/lib/planner/ical/iCalParser'
import * as db from '@/lib/planner/database'
import {
  detectOAuthMode,
  saveBYOKCredentials,
  loadBYOKCredentials,
  clearBYOKCredentials,
  setForceBYOKMode,
  isBYOKModeForced,
  isElectron,
  clearOAuthModeCache,
  type OAuthMode,
  type BYOKCredentials,
} from '@/lib/planner/google/GoogleCalendarOAuth'

// ============================================================================
// TYPES
// ============================================================================

interface ExpandableSectionProps {
  title: string
  description?: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  disabled?: boolean
  disabledReason?: string
}

// ============================================================================
// EXPANDABLE SECTION COMPONENT
// ============================================================================

function ExpandableSection({
  title,
  description,
  icon,
  children,
  defaultExpanded = false,
  disabled = false,
  disabledReason,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        'bg-white dark:bg-zinc-900',
        disabled
          ? 'border-zinc-200 dark:border-zinc-800 opacity-60'
          : 'border-zinc-200 dark:border-zinc-700'
      )}
    >
      <button
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'transition-colors',
          disabled
            ? 'cursor-not-allowed'
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            disabled
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
            {disabled && disabledReason && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-zinc-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {disabledReason}
                </div>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {description}
            </p>
          )}
        </div>
        {disabled ? (
          <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
        ) : (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && !disabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// INFO BOX COMPONENT
// ============================================================================

function InfoBox({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warning' | 'success' | 'error'
  title?: string
  children: React.ReactNode
}) {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/50',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-600 dark:text-blue-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/50',
      icon: <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      title: 'text-amber-800 dark:text-amber-200',
      text: 'text-amber-600 dark:text-amber-400',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      icon: <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      title: 'text-emerald-800 dark:text-emerald-200',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/50',
      icon: <X className="w-4 h-4 text-red-600 dark:text-red-400" />,
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-600 dark:text-red-400',
    },
  }

  const s = styles[type]

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', s.bg, s.border)}>
      <div className="mt-0.5 flex-shrink-0">{s.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('text-sm font-medium', s.title)}>{title}</p>}
        <div className={cn('text-xs', s.text, title && 'mt-1')}>{children}</div>
      </div>
    </div>
  )
}

// ============================================================================
// SETUP GUIDE COMPONENT
// ============================================================================

function SetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  const steps = [
    {
      step: 1,
      title: 'Create a Google Cloud Project',
      description: 'Go to the Google Cloud Console and create a new project or select an existing one.',
    },
    {
      step: 2,
      title: 'Enable the Calendar API',
      description: 'Navigate to "APIs & Services" then "Library" and enable the Google Calendar API.',
    },
    {
      step: 3,
      title: 'Create OAuth Credentials',
      description: 'Go to "Credentials" then "Create Credentials" then "OAuth client ID". Select "Web application".',
    },
    {
      step: 4,
      title: 'Configure Redirect URI',
      description: 'Add your callback URL: your-domain.com/api/auth/google-calendar/callback',
    },
    {
      step: 5,
      title: 'Set Environment Variables',
      description: 'Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env.local file.',
    },
  ]

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
        )}
      >
        <Info className="w-4 h-4 text-blue-500" />
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Setup Instructions
        </span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700">
              <ol className="mt-4 space-y-4">
                {steps.map((item) => (
                  <li key={item.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                  'hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors'
                )}
              >
                Open Google Cloud Console
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// GOOGLE CALENDAR SECTION
// ============================================================================

function GoogleCalendarSection() {
  const {
    isAuthenticated,
    isLoading,
    isSyncing,
    userEmail,
    calendars,
    lastSyncAt,
    error,
    signIn,
    signOut,
    syncNow,
    toggleCalendarSelection,
    selectedCalendarIds,
  } = useGoogleCalendarSync()

  const hasCredentials = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const isPublicAccess = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_PUBLIC_ACCESS === 'true'

  // Format last synced time
  const formatLastSynced = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return diffMins + ' min ago'
    if (diffHours < 24) return diffHours + ' hr ago'
    return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago'
  }

  // Not configured state
  if (!hasCredentials) {
    return (
      <div className="space-y-4">
        <InfoBox type="warning" title="Setup Required">
          <p>Google Calendar API credentials are not configured.</p>
          <p className="mt-2">
            To enable Google Calendar sync, you need to set up API credentials in the{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline inline-flex items-center gap-1"
            >
              Google Cloud Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </InfoBox>

        <SetupGuide />
      </div>
    )
  }

  // Public access warning
  if (isPublicAccess) {
    return (
      <div className="space-y-4">
        <InfoBox type="warning" title="Public Access Mode">
          <p>
            Google Calendar settings are locked in public access mode. This ensures a single
            calendar connection is shared across all users.
          </p>
          <p className="mt-2">
            To modify settings, set{' '}
            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono text-[10px]">
              NEXT_PUBLIC_GOOGLE_PUBLIC_ACCESS=false
            </code>{' '}
            in your environment.
          </p>
        </InfoBox>

        {isAuthenticated && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-800 dark:text-emerald-200">
              Connected as {userEmail}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-zinc-500">Loading...</span>
      </div>
    )
  }

  // Not connected state
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Connect your Google account to sync calendar events with the planner.
          </p>
          <button
            onClick={signIn}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'font-medium text-white',
              'bg-blue-600 hover:bg-blue-700 transition-colors'
            )}
          >
            <Calendar className="w-4 h-4" />
            Connect Google Account
          </button>
        </div>

        <SetupGuide />
      </div>
    )
  }

  // Connected state
  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
        <div className="flex items-center gap-3">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Connected
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
            'text-zinc-600 dark:text-zinc-400',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          Disconnect
        </button>
      </div>

      {/* Error display */}
      {error && (
        <InfoBox type="error" title="Sync Error">
          {error}
        </InfoBox>
      )}

      {/* Calendar list */}
      {calendars.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Calendars to Sync
          </h4>
          <div className="space-y-1">
            {calendars.map((cal) => (
              <label
                key={cal.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg cursor-pointer',
                  'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedCalendarIds.includes(cal.id)}
                  onChange={() => toggleCalendarSelection(cal.id)}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cal.color || '#4285F4' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {cal.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {cal.accessRole} {cal.isPrimary && ' - Primary'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sync controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {lastSyncAt ? (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last synced: {formatLastSynced(lastSyncAt)}
            </span>
          ) : (
            'Not synced yet'
          )}
        </div>
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-700 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Now
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// BYOK CREDENTIALS SECTION (Advanced)
// ============================================================================

function BYOKCredentialsSection() {
  const [credentials, setCredentials] = useState<BYOKCredentials | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saved, setSaved] = useState(false)
  const [forceBYOK, setForceBYOK] = useState(false)
  const [oauthMode, setOAuthMode] = useState<OAuthMode>('none')

  // Load on mount
  React.useEffect(() => {
    const creds = loadBYOKCredentials()
    if (creds) {
      setCredentials(creds)
      setClientId(creds.clientId)
      setClientSecret(creds.clientSecret)
    }
    setForceBYOK(isBYOKModeForced())
    detectOAuthMode().then((mode) => setOAuthMode(mode.mode))
  }, [])

  const handleSave = () => {
    if (!clientId.trim() || !clientSecret.trim()) return

    saveBYOKCredentials({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    })
    setCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearBYOKCredentials()
    setCredentials(null)
    setClientId('')
    setClientSecret('')
  }

  const handleToggleForceBYOK = () => {
    const newValue = !forceBYOK
    setForceBYOK(newValue)
    setForceBYOKMode(newValue)
    // Refresh mode detection
    detectOAuthMode().then((mode) => setOAuthMode(mode.mode))
  }

  return (
    <div className="space-y-4">
      <InfoBox type="info" title="Bring Your Own Key (BYOK)">
        <p>
          For self-hosted deployments or if you prefer using your own Google OAuth credentials.
          This gives you full control over the OAuth app and its quotas.
        </p>
      </InfoBox>

      {/* Current mode indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Current mode:</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          oauthMode === 'pkce' && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
          oauthMode === 'preconfigured' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          oauthMode === 'byok' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
          oauthMode === 'none' && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
        )}>
          {oauthMode === 'pkce' && 'Desktop (PKCE)'}
          {oauthMode === 'preconfigured' && 'Pre-configured'}
          {oauthMode === 'byok' && 'BYOK'}
          {oauthMode === 'none' && 'Not configured'}
        </span>
      </div>

      {/* Force BYOK toggle (only show if not in Electron or if other modes available) */}
      {!isElectron() && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Use my own credentials
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Override pre-configured OAuth with BYOK
            </p>
          </div>
          <button
            onClick={handleToggleForceBYOK}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              forceBYOK ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-600'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                forceBYOK && 'translate-x-5'
              )}
            />
          </button>
        </div>
      )}

      {/* Credentials form */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Your OAuth Credentials
        </h4>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxx.apps.googleusercontent.com"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm font-mono',
              'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
              'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
              'focus:outline-none focus:ring-2 focus:ring-purple-500'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
              className={cn(
                'w-full px-3 py-2 pr-10 rounded-lg text-sm font-mono',
                'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
                'focus:outline-none focus:ring-2 focus:ring-purple-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!clientId.trim() || !clientSecret.trim()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-purple-600 text-white hover:bg-purple-700 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Credentials'}
          </button>
          
          {credentials && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Setup guide link */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <a
          href="/docs/GOOGLE_CALENDAR_SETUP.md"
          target="_blank"
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4" />
          How to get OAuth credentials
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

// ============================================================================
// ICAL IMPORT SECTION
// ============================================================================

function ICalImportSection() {
  const [feeds, setFeeds] = useState<ICalFeed[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isSyncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load feeds on mount
  React.useEffect(() => {
    setFeeds(getICalFeeds())
  }, [])

  const handleAddFeed = async () => {
    if (!newUrl.trim()) {
      setError('Please enter a calendar URL')
      return
    }

    try {
      setIsAdding(true)
      setError(null)

      const feed = addICalFeed(newUrl.trim(), newName.trim() || undefined)
      setFeeds(getICalFeeds())
      setNewUrl('')
      setNewName('')

      // Sync immediately
      setSyncing(feed.id)
      await syncICalFeed(feed.id)
      setFeeds(getICalFeeds())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add calendar')
    } finally {
      setIsAdding(false)
      setSyncing(null)
    }
  }

  const handleRemoveFeed = (id: string) => {
    removeICalFeed(id)
    setFeeds(getICalFeeds())
  }

  const handleSyncFeed = async (id: string) => {
    try {
      setSyncing(id)
      setError(null)
      await syncICalFeed(id)
      setFeeds(getICalFeeds())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncAll = async () => {
    try {
      setSyncing('all')
      setError(null)
      await syncAllICalFeeds()
      setFeeds(getICalFeeds())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  const handleToggleFeed = (id: string, enabled: boolean) => {
    updateICalFeed(id, { enabled })
    setFeeds(getICalFeeds())
  }

  return (
    <div className="space-y-4">
      <InfoBox type="info" title="iCal Import">
        <p>
          Import calendars from any service that provides an iCal URL (Google Calendar, Outlook,
          Apple Calendar, etc.). Events are read-only and sync automatically.
        </p>
      </InfoBox>

      {/* Add new feed */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Add Calendar Feed
        </h4>
        <div className="space-y-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Paste iCal URL (.ics)"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
              'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Calendar name (optional)"
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm',
                'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            />
            <button
              onClick={handleAddFeed}
              disabled={isAdding || !newUrl.trim()}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
                'bg-blue-600 text-white hover:bg-blue-700 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          </div>
        </div>

        {/* How to get iCal URL */}
        <details className="text-xs text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
            How to get your calendar URL
          </summary>
          <div className="mt-2 space-y-2 pl-4">
            <p>
              <strong>Google Calendar:</strong> Settings → Calendar → Integrate Calendar → Secret
              address in iCal format
            </p>
            <p>
              <strong>Outlook:</strong> Settings → View all Outlook settings → Calendar → Shared
              calendars → Publish
            </p>
            <p>
              <strong>Apple Calendar:</strong> Calendar → File → Export → Export to .ics, then
              host the file
            </p>
          </div>
        </details>
      </div>

      {/* Error display */}
      {error && (
        <InfoBox type="error" title="Error">
          {error}
        </InfoBox>
      )}

      {/* Feed list */}
      {feeds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Subscribed Calendars ({feeds.length})
            </h4>
            {feeds.length > 1 && (
              <button
                onClick={handleSyncAll}
                disabled={isSyncing !== null}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {isSyncing === 'all' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Sync All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className={cn(
                  'p-3 rounded-lg border',
                  feed.enabled
                    ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: feed.color || '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {feed.name}
                      </p>
                      {feed.lastError && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {feed.eventCount} events
                      {feed.lastSynced && (
                        <> · Last synced {new Date(feed.lastSynced).toLocaleString()}</>
                      )}
                    </p>
                    {feed.lastError && (
                      <p className="text-xs text-red-500 mt-1">{feed.lastError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleFeed(feed.id, !feed.enabled)}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        feed.enabled
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                      title={feed.enabled ? 'Disable' : 'Enable'}
                    >
                      {feed.enabled ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSyncFeed(feed.id)}
                      disabled={isSyncing !== null}
                      className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Sync now"
                    >
                      {isSyncing === feed.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveFeed(feed.id)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {feeds.length === 0 && (
        <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
          <Rss className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No calendar feeds added yet</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CALENDAR EXPORT SECTION
// ============================================================================

function CalendarExportSection() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setExportStatus(null)

      // Get all events from database
      const events = await db.getEvents({})

      if (events.length === 0) {
        setExportStatus('No events to export')
        return
      }

      // Generate iCal content
      const icsContent = generateICalString(events, 'Quarry Calendar')

      // Create download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quarry-calendar-${new Date().toISOString().split('T')[0]}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportStatus(`Exported ${events.length} events`)
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <InfoBox type="info" title="Export Calendar">
        <p>
          Export all your Quarry calendar events to an .ics file that can be imported into
          Google Calendar, Outlook, Apple Calendar, or any other calendar app.
        </p>
      </InfoBox>

      <div className="flex items-center gap-4">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export to .ics
        </button>

        {exportStatus && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{exportStatus}</span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// HOLIDAY SETTINGS SECTION
// ============================================================================

function HolidaySettingsSection() {
  const [settings, setSettings] = useState<HolidaySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('holidaySettings')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return DEFAULT_HOLIDAY_SETTINGS
        }
      }
    }
    return DEFAULT_HOLIDAY_SETTINGS
  })

  const updateSettings = (updates: Partial<HolidaySettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    localStorage.setItem('holidaySettings', JSON.stringify(newSettings))
  }

  return (
    <div className="space-y-4">
      {/* Country selector */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Country
        </label>
        <select
          value={settings.country}
          onChange={(e) => updateSettings({ country: e.target.value as CountryCode })}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
            'text-zinc-900 dark:text-zinc-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          {COUNTRY_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.flag} {opt.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Select your country to show local holidays
        </p>
      </div>

      {/* Holiday type toggles */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Show Holidays
        </label>

        <label className="flex items-center gap-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showFederal}
            onChange={(e) => updateSettings({ showFederal: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Federal/Public Holidays</span>
          </div>
        </label>

        <label className="flex items-center gap-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showObservances}
            onChange={(e) => updateSettings({ showObservances: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Observances</span>
          </div>
        </label>

        <label className="flex items-center gap-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showReligious}
            onChange={(e) => updateSettings({ showReligious: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Religious Holidays</span>
          </div>
        </label>
      </div>
    </div>
  )
}

// ============================================================================
// POWER FEATURES SECTION
// ============================================================================

interface PowerFeature {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  defaultEnabled: boolean
}

const POWER_FEATURES: PowerFeature[] = [
  {
    id: 'subtasks',
    name: 'Subtasks',
    description: 'Break tasks into smaller subtasks with progress tracking',
    icon: <ListTree className="w-4 h-4" />,
    defaultEnabled: true,
  },
  {
    id: 'taskTimer',
    name: 'Task Timer',
    description: 'Track time spent on tasks with start/pause/stop controls',
    icon: <Timer className="w-4 h-4" />,
    defaultEnabled: true,
  },
  {
    id: 'oracleAI',
    name: 'Oracle AI Assistant',
    description: 'Natural language task management via the Ask panel',
    icon: <Sparkles className="w-4 h-4" />,
    defaultEnabled: true,
  },
  {
    id: 'multiDayView',
    name: 'Multi-Day Calendar View',
    description: 'Kanban-style view spanning 3-7 days with drag-and-drop',
    icon: <Columns3 className="w-4 h-4" />,
    defaultEnabled: true,
  },
]

function PowerFeaturesSection() {
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('plannerPowerFeatures')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return POWER_FEATURES.reduce((acc, f) => ({ ...acc, [f.id]: f.defaultEnabled }), {})
        }
      }
    }
    return POWER_FEATURES.reduce((acc, f) => ({ ...acc, [f.id]: f.defaultEnabled }), {})
  })

  const toggleFeature = (featureId: string) => {
    const newFeatures = { ...features, [featureId]: !features[featureId] }
    setFeatures(newFeatures)
    localStorage.setItem('plannerPowerFeatures', JSON.stringify(newFeatures))
  }

  const enabledCount = Object.values(features).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {enabledCount} of {POWER_FEATURES.length} features enabled
        </p>
        <button
          onClick={() => {
            const allEnabled = POWER_FEATURES.reduce((acc, f) => ({ ...acc, [f.id]: true }), {})
            setFeatures(allEnabled)
            localStorage.setItem('plannerPowerFeatures', JSON.stringify(allEnabled))
          }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Enable all
        </button>
      </div>

      <div className="space-y-3">
        {POWER_FEATURES.map((feature) => (
          <div
            key={feature.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border transition-colors',
              features[feature.id]
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  features[feature.id]
                    ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                )}
              >
                {feature.icon}
              </div>
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    features[feature.id]
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {feature.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{feature.description}</p>
              </div>
            </div>
            <button
              onClick={() => toggleFeature(feature.id)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                features[feature.id] ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                  features[feature.id] && 'translate-x-5'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Power features enhance your planner with advanced capabilities. Disable any you don't
          need to simplify your workflow.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// ORACLE AI SETTINGS SECTION
// ============================================================================

function OracleAISettingsSection() {
  const [config, setConfig] = useState<OracleLLMConfig>(() => {
    if (typeof window !== 'undefined') {
      return getOracleConfig()
    }
    return {
      enabled: false,
      provider: 'auto',
      claudeModel: 'claude-sonnet-4-20250514',
      openaiModel: 'gpt-4.1-2025-04-14',
      openaiVisionModel: 'gpt-4.1-2025-04-14',
      temperature: 0.3,
    }
  })

  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [claudeKeyInput, setClaudeKeyInput] = useState(config.claudeApiKey || '')
  const [openaiKeyInput, setOpenaiKeyInput] = useState(config.openaiApiKey || '')

  const updateConfig = (updates: Partial<OracleLLMConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    saveOracleConfig(updates)
  }

  const handleSaveClaudeKey = () => {
    updateConfig({ claudeApiKey: claudeKeyInput || undefined })
  }

  const handleSaveOpenAIKey = () => {
    updateConfig({ openaiApiKey: openaiKeyInput || undefined })
  }

  const CLAUDE_MODELS = [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Latest)' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)' },
  ]

  const OPENAI_MODELS = [
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Latest)' },
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)' },
  ]

  return (
    <div className="space-y-6">
      {/* LLM Mode Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">AI-Powered Mode</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {config.enabled ? 'Using AI for advanced understanding' : 'Using local NLP (no API keys required)'}
            </p>
          </div>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={cn(
            'relative w-12 h-7 rounded-full transition-colors',
            config.enabled ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-600'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform shadow-sm',
              config.enabled && 'translate-x-5'
            )}
          />
        </button>
      </div>

      {/* Provider Selection */}
      {config.enabled && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Provider Preference
            </label>
            <select
              value={config.provider}
              onChange={(e) => updateConfig({ provider: e.target.value as 'claude' | 'openai' | 'auto' })}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:ring-2 focus:ring-violet-500'
              )}
            >
              <option value="auto">Auto (Claude → OpenAI → Local)</option>
              <option value="claude">Claude Only</option>
              <option value="openai">OpenAI Only</option>
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Auto mode falls back to the next provider if one is unavailable
            </p>
          </div>

          {/* Claude API Key */}
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Claude API Key</h4>
              {config.claudeApiKey && (
                <Check className="w-4 h-4 text-emerald-500 ml-auto" />
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                  placeholder="sk-ant-api..."
                  className={cn(
                    'w-full px-3 py-2 pr-10 rounded-lg text-sm font-mono',
                    'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                    'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveClaudeKey}
                disabled={claudeKeyInput === (config.claudeApiKey || '')}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  claudeKeyInput !== (config.claudeApiKey || '')
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                )}
              >
                Save
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={config.claudeModel}
                onChange={(e) => updateConfig({ claudeModel: e.target.value })}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-xs',
                  'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                  'text-zinc-900 dark:text-zinc-100',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500'
                )}
              >
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
            >
              Get an API key from Anthropic Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* OpenAI API Key */}
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">OpenAI API Key</h4>
              {config.openaiApiKey && (
                <Check className="w-4 h-4 text-emerald-500 ml-auto" />
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className={cn(
                    'w-full px-3 py-2 pr-10 rounded-lg text-sm font-mono',
                    'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                    'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
                >
                  {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveOpenAIKey}
                disabled={openaiKeyInput === (config.openaiApiKey || '')}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  openaiKeyInput !== (config.openaiApiKey || '')
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                )}
              >
                Save
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={config.openaiModel}
                onChange={(e) => updateConfig({ openaiModel: e.target.value })}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-xs',
                  'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                  'text-zinc-900 dark:text-zinc-100',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500'
                )}
              >
                {OPENAI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Get an API key from OpenAI Platform
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Advanced Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  Temperature: {config.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info when disabled */}
      {!config.enabled && (
        <InfoBox type="info" title="Local NLP Mode">
          <p>
            Oracle uses local NLP (Compromise.js) for natural language understanding.
            This works offline and requires no API keys.
          </p>
          <p className="mt-2">
            Enable AI-Powered Mode for advanced understanding with Claude or OpenAI.
          </p>
        </InfoBox>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PlannerSettingsTabProps {
  /** Callback to navigate to calendar settings in Integrations tab */
  onNavigateToCalendar?: () => void
}

export default function PlannerSettingsTab({ onNavigateToCalendar }: PlannerSettingsTabProps = {}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Planner Settings
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure calendar integrations and planner preferences.
        </p>
      </div>

      {/* Power Features Section */}
      <ExpandableSection
        title="Power Features"
        description="Advanced planner capabilities"
        icon={<Sparkles className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <PowerFeaturesSection />
      </ExpandableSection>

      {/* Oracle AI Settings Section */}
      <ExpandableSection
        title="Oracle AI Assistant"
        description="Configure LLM providers for natural language"
        icon={<Brain className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <OracleAISettingsSection />
      </ExpandableSection>

      {/* Google Calendar Section */}
      <ExpandableSection
        title="Google Calendar"
        description="Sync events with Google Calendar"
        icon={<Calendar className="w-4 h-4" />}
        defaultExpanded={true}
        disabled={false}
      >
        <div className="space-y-4">
          {/* Link to full settings */}
          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg',
                'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
                'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30',
                'transition-colors group'
              )}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">Open Full Calendar Settings</span>
              </div>
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100" />
            </button>
          )}

          {/* Quick calendar view */}
          <GoogleCalendarSection />
        </div>
      </ExpandableSection>

      {/* BYOK Credentials (Advanced) */}
      <ExpandableSection
        title="Custom OAuth Credentials"
        description="Use your own Google Cloud credentials (BYOK)"
        icon={<Key className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <BYOKCredentialsSection />
      </ExpandableSection>

      {/* iCal Import */}
      <ExpandableSection
        title="iCal Import (Any Calendar)"
        description="Import from Google, Outlook, Apple via iCal URL"
        icon={<Rss className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <ICalImportSection />
      </ExpandableSection>

      {/* Calendar Export */}
      <ExpandableSection
        title="Export Calendar"
        description="Export events to .ics file"
        icon={<Download className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <CalendarExportSection />
      </ExpandableSection>

      {/* Holiday Settings */}
      <ExpandableSection
        title="Holidays"
        description="Show holidays on calendar"
        icon={<CalendarDays className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <HolidaySettingsSection />
      </ExpandableSection>

      {/* Planner Preferences */}
      <ExpandableSection
        title="Planner Preferences"
        description="Default views and behavior"
        icon={<Settings2 className="w-4 h-4" />}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Default View
            </label>
            <select
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              defaultValue="week"
            >
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
              <option value="agenda">Agenda View</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Week Starts On
            </label>
            <select
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              defaultValue="sunday"
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
              <option value="saturday">Saturday</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Show Completed Tasks
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Display completed tasks in calendar view
              </p>
            </div>
            <button
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                'bg-blue-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>
      </ExpandableSection>
    </div>
  )
}
