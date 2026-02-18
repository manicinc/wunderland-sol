'use client'

/**
 * Account Settings Component
 *
 * Displays and manages user account settings including:
 * - Account info and authentication method
 * - Profile (name, avatar)
 * - Google integration status
 * - Security (password, sessions)
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Image as ImageIcon,
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2,
  LogOut,
  Link as LinkIcon,
  Unlink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

// Google icon
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export default function AccountSettings() {
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')

  const {
    user,
    isAuthenticated,
    isGuest,
    googleConnected,
    calendarEnabled,
    logout,
    linkGoogle,
    unlinkGoogle,
    updateProfile,
    isLoading,
  } = useAuth()

  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Handle linking Google
  const handleLinkGoogle = useCallback(async () => {
    setIsLinkingGoogle(true)
    setError(null)
    try {
      const result = await linkGoogle()
      if (result.calendarEnabled) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link Google')
    } finally {
      setIsLinkingGoogle(false)
    }
  }, [linkGoogle])

  // Handle unlinking Google
  const handleUnlinkGoogle = useCallback(async () => {
    if (!confirm('Disconnect Google? You will lose calendar sync. You can reconnect later.')) {
      return
    }
    setIsUnlinkingGoogle(true)
    setError(null)
    try {
      await unlinkGoogle()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink Google')
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }, [unlinkGoogle])

  // Handle saving name
  const handleSaveName = useCallback(async () => {
    if (newName === user?.displayName) {
      setEditingName(false)
      return
    }
    setIsSavingProfile(true)
    setError(null)
    try {
      await updateProfile({ displayName: newName || undefined })
      setEditingName(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }, [newName, user?.displayName, updateProfile])

  // Guest state - show sign in prompt
  if (isGuest || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account
          </h3>
        </div>

        <div className={`
          p-6 rounded-xl text-center
          ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-50 border border-zinc-200'}
        `}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <User className="w-8 h-8 text-violet-500" />
          </div>
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            You&apos;re browsing as Traveler
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Create an account to sync across devices, enable calendar integration,
            and unlock premium features.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/quarry/signup"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create Account
            </Link>
            <Link
              href="/quarry/login"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-medium text-sm transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account
          </h3>
        </div>
        <AnimatePresence mode="wait">
          {saveStatus === 'saved' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 text-emerald-500 text-xs"
            >
              <Check className="w-4 h-4" />
              Saved
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className={`
        p-4 rounded-xl border
        ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
      `}>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || 'User'}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-violet-500 flex items-center justify-center text-xl font-bold text-white">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {user.profileSource === 'google' && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm">
                <GoogleIcon className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Your name"
                  className={`
                    flex-1 px-2 py-1 rounded text-sm
                    ${isDark
                      ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                      : 'bg-white border-zinc-300 text-zinc-900'
                    }
                    border focus:outline-none focus:ring-2 focus:ring-violet-500/20
                  `}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') {
                      setNewName(user.displayName || '')
                      setEditingName(false)
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingProfile}
                  className="p-1.5 rounded bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setNewName(user.displayName || '')
                    setEditingName(false)
                  }}
                  className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:text-violet-600 dark:hover:text-violet-400 text-left"
              >
                {user.displayName || 'Set your name'}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <Mail className="w-3 h-3" />
              {user.email}
            </div>
          </div>

          {/* Auth Badge */}
          <div className={`
            px-2 py-1 rounded text-xs font-medium
            ${user.authMethod === 'google'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
            }
          `}>
            {user.authMethod === 'google' ? 'Google' : 'Email'}
          </div>
        </div>
      </div>

      {/* Google Integration */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Google Integration
        </h4>

        <div className={`
          p-4 rounded-xl border
          ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
        `}>
          {googleConnected ? (
            <>
              {/* Connected State */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <GoogleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Google Connected
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {calendarEnabled
                        ? 'Calendar sync enabled'
                        : 'Calendar permissions not granted'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={isUnlinkingGoogle || user.authMethod === 'google'}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    ${user.authMethod === 'google'
                      ? 'text-zinc-400 cursor-not-allowed'
                      : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                    }
                    disabled:opacity-50
                  `}
                  title={user.authMethod === 'google' ? 'Cannot disconnect - account uses Google login' : ''}
                >
                  {isUnlinkingGoogle ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Unlink className="w-3 h-3" />
                  )}
                  Disconnect
                </button>
              </div>

              {/* Calendar Status */}
              <div className={`
                mt-3 p-3 rounded-lg flex items-start gap-2
                ${calendarEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-amber-50 dark:bg-amber-900/20'
                }
              `}>
                <Calendar className={`
                  w-4 h-4 flex-shrink-0 mt-0.5
                  ${calendarEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
                `} />
                <div className={`text-xs ${calendarEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {calendarEnabled ? (
                    <span>Your Google Calendar syncs with Quarry Planner automatically. Events appear bi-directionally.</span>
                  ) : (
                    <span>Calendar sync requires additional permissions. Reconnect Google to enable calendar.</span>
                  )}
                </div>
              </div>

              {user.authMethod === 'google' && (
                <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                  You signed up with Google, so it cannot be disconnected.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                    <GoogleIcon className="w-5 h-5 opacity-50" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Connect Google
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Enable calendar sync and profile picture
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-violet-600 text-white hover:bg-violet-700
                    disabled:opacity-50
                  `}
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LinkIcon className="w-3 h-3" />
                  )}
                  Connect
                </button>
              </div>

              {/* Benefits */}
              <div className={`
                mt-3 p-3 rounded-lg
                ${isDark ? 'bg-violet-900/20' : 'bg-violet-50'}
              `}>
                <div className="flex items-start gap-2 text-xs text-violet-700 dark:text-violet-300">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Benefits of connecting Google:</span>
                    <ul className="mt-1 space-y-0.5 text-violet-600 dark:text-violet-400">
                      <li className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Bi-directional calendar sync
                      </li>
                      <li className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Profile picture from Google
                      </li>
                      <li className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Future: Drive integration
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Account Actions
        </h4>

        <div className={`
          rounded-xl border overflow-hidden
          ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
        `}>
          {/* Sign Out */}
          <button
            onClick={() => logout()}
            disabled={isLoading}
            className={`
              w-full flex items-center justify-between px-4 py-3 text-left
              ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}
              transition-colors
            `}
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-900 dark:text-zinc-100">Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Tier Info */}
      <div className={`
        p-4 rounded-xl border
        ${user.tier === 'premium'
          ? isDark ? 'bg-violet-900/20 border-violet-700' : 'bg-violet-50 border-violet-200'
          : isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
        }
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${user.tier === 'premium' ? 'text-violet-500' : 'text-zinc-500'}`} />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.tier === 'premium' ? 'Premium' : 'Free Tier'}
            </span>
          </div>
          {user.tier === 'free' && (
            <Link
              href="/quarry/pricing"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              Upgrade
            </Link>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {user.tier === 'premium'
            ? 'Unlimited devices and premium features enabled'
            : 'Up to 3 devices. Upgrade for unlimited sync.'}
        </p>
      </div>
    </div>
  )
}
