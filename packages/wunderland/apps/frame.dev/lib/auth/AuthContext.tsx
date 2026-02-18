'use client'

/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app.
 * Handles:
 * - Session management
 * - Email/password authentication
 * - Google OAuth authentication
 * - Account linking
 * - Profile updates
 *
 * @module lib/auth/AuthContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  performLoginOAuthFlow,
  loadTokensFromStorage,
  signOut as signOutGoogle,
  hasCalendarScopes,
  type GoogleUserProfile,
} from '@/lib/planner/google/GoogleCalendarOAuth'

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string
  email: string
  authMethod: 'google' | 'email' | 'guest'
  displayName: string | null
  avatarUrl: string | null
  profileSource: 'google' | 'manual'
  googleId: string | null
  googleConnected: boolean
  googleScopes: string[]
  tier: 'free' | 'premium'
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isGuest: boolean
  googleConnected: boolean
  calendarEnabled: boolean
  error: string | null
}

export interface AuthActions {
  // Email/password auth
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string) => Promise<{ warning?: string }>
  logout: () => Promise<void>

  // Google auth
  loginWithGoogle: () => Promise<void>
  linkGoogle: () => Promise<{ calendarEnabled: boolean }>
  unlinkGoogle: () => Promise<void>

  // Profile
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>

  // Session
  refreshSession: () => Promise<void>

  // Clear error
  clearError: () => void
}

export type AuthContextValue = AuthState & AuthActions

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Derived state
  const isAuthenticated = !!user && user.authMethod !== 'guest'
  const isGuest = !user || user.authMethod === 'guest'
  const googleConnected = user?.googleConnected ?? false
  const calendarEnabled = hasCalendarScopes()

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  const refreshSession = useCallback(async () => {
    try {
      // Skip session check on landing/marketing pages (no API routes on static export)
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path.includes('/landing') || path.includes('/about') || path.includes('/faq') || path === '/quarry' || path === '/quarry/') {
          setUser(null)
          return
        }
      }

      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      })

      // Silently handle 404 (static export has no API routes)
      if (response.status === 404) {
        setUser(null)
        return
      }

      if (!response.ok) {
        setUser(null)
        return
      }

      const data = await response.json()

      if (data.authenticated && data.account) {
        setUser(data.account)
      } else {
        setUser(null)
      }
    } catch (err) {
      // Silently fail on network errors (expected on static exports)
      setUser(null)
    }
  }, [])

  // Initial session check
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true)
      await refreshSession()
      setIsLoading(false)
    }
    initSession()
  }, [refreshSession])

  // ========================================================================
  // EMAIL/PASSWORD AUTH
  // ========================================================================

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setUser(data.account)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setUser(data.account)
      return { warning: data.warning }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Also sign out from Google OAuth
      await signOutGoogle()

      setUser(null)
      setError(null)
    } catch (err) {
      console.error('[AuthContext] Logout error:', err)
      // Still clear local state
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ========================================================================
  // GOOGLE AUTH
  // ========================================================================

  const loginWithGoogle = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Perform OAuth flow (opens popup)
      const oauthResult = await performLoginOAuthFlow()

      // Send to our backend
      const response = await fetch('/api/auth/google/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile: oauthResult.profile,
          scopes: oauthResult.scopes,
          refreshToken: oauthResult.tokens.refreshToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Google login failed')
      }

      setUser(data.account)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const linkGoogle = useCallback(async () => {
    if (!user) {
      throw new Error('Must be logged in to link Google')
    }

    setError(null)
    setIsLoading(true)

    try {
      // Perform OAuth flow
      const oauthResult = await performLoginOAuthFlow()

      // Send to our backend
      const response = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile: oauthResult.profile,
          scopes: oauthResult.scopes,
          refreshToken: oauthResult.tokens.refreshToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link Google')
      }

      setUser(data.account)
      return { calendarEnabled: data.calendarEnabled }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link Google'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const unlinkGoogle = useCallback(async () => {
    if (!user) {
      throw new Error('Must be logged in to unlink Google')
    }

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/google/link', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlink Google')
      }

      // Also clear Google tokens from localStorage
      await signOutGoogle()

      setUser(data.account)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlink Google'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // ========================================================================
  // PROFILE
  // ========================================================================

  const updateProfile = useCallback(
    async (updates: { displayName?: string; avatarUrl?: string }) => {
      if (!user) {
        throw new Error('Must be logged in to update profile')
      }

      setError(null)

      try {
        const response = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile')
        }

        setUser(data.account)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        setError(message)
        throw err
      }
    },
    [user]
  )

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      // State
      user,
      isLoading,
      isAuthenticated,
      isGuest,
      googleConnected,
      calendarEnabled,
      error,

      // Actions
      loginWithEmail,
      signupWithEmail,
      logout,
      loginWithGoogle,
      linkGoogle,
      unlinkGoogle,
      updateProfile,
      refreshSession,
      clearError,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      isGuest,
      googleConnected,
      calendarEnabled,
      error,
      loginWithEmail,
      signupWithEmail,
      logout,
      loginWithGoogle,
      linkGoogle,
      unlinkGoogle,
      updateProfile,
      refreshSession,
      clearError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Default guest state for when AuthProvider is not available
 * (e.g., during SSR or outside the provider tree)
 */
const guestState: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isGuest: true,
  googleConnected: false,
  calendarEnabled: false,
  error: null,
  loginWithEmail: async () => { console.warn('[useAuth] AuthProvider not found') },
  signupWithEmail: async () => ({ warning: 'AuthProvider not found' }),
  logout: async () => { console.warn('[useAuth] AuthProvider not found') },
  loginWithGoogle: async () => { console.warn('[useAuth] AuthProvider not found') },
  linkGoogle: async () => ({ calendarEnabled: false }),
  unlinkGoogle: async () => { console.warn('[useAuth] AuthProvider not found') },
  updateProfile: async () => { console.warn('[useAuth] AuthProvider not found') },
  refreshSession: async () => { console.warn('[useAuth] AuthProvider not found') },
  clearError: () => {},
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  // Return guest state if provider is not available (SSR, outside provider tree)
  // This prevents crashes and allows components to gracefully degrade
  if (!context) {
    return guestState
  }

  return context
}

// ============================================================================
// UTILITY HOOK - Check if user needs to connect Google for a feature
// ============================================================================

export function useGoogleRequired(): {
  needsGoogle: boolean
  needsCalendar: boolean
  canUseCalendar: boolean
} {
  const { isAuthenticated, googleConnected, calendarEnabled } = useAuth()

  return {
    needsGoogle: !googleConnected,
    needsCalendar: googleConnected && !calendarEnabled,
    canUseCalendar: googleConnected && calendarEnabled,
  }
}
