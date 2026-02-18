/**
 * User Session Management
 * @module lib/userSession
 *
 * @description
 * Manages user identity and session persistence for strand creation.
 * Tracks creator information across browser sessions with Git fallback.
 */

const SESSION_STORAGE_KEY = 'codex-user-session'
const GIT_IDENTITY_CACHE_KEY = 'codex-git-identity'
const GIT_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * User session data stored in localStorage
 */
export interface UserSession {
  /** Unique session identifier */
  sessionId: string
  /** Creator/author name */
  creatorName: string
  /** Creator email (optional) */
  creatorEmail?: string
  /** Last active timestamp (ISO) */
  lastActive: string
  /** Optional browser fingerprint */
  browserFingerprint?: string
}

/**
 * Git identity from GitHub API
 */
export interface GitIdentity {
  /** User's name from GitHub */
  name?: string
  /** User's email from GitHub */
  email?: string
  /** Source indicator */
  source: 'git'
}

/**
 * Get or create user session
 * Returns stored session or creates new one with default values
 *
 * @returns UserSession object with session data
 */
export function getUserSession(): UserSession {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      sessionId: 'server',
      creatorName: 'Unknown',
      lastActive: new Date().toISOString(),
    }
  }

  const stored = localStorage.getItem(SESSION_STORAGE_KEY)

  if (stored) {
    try {
      const session = JSON.parse(stored) as UserSession
      // Update last active timestamp
      session.lastActive = new Date().toISOString()
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      return session
    } catch (error) {
      console.warn('[userSession] Failed to parse stored session:', error)
      // Fall through to create new session
    }
  }

  // Create new session
  const newSession: UserSession = {
    sessionId: crypto.randomUUID(),
    creatorName: 'Traveler',
    lastActive: new Date().toISOString(),
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession))
  return newSession
}

/**
 * Update creator information in session
 * Stores updated info in localStorage for future use
 *
 * @param name - Creator name
 * @param email - Creator email (optional)
 */
export function updateCreatorInfo(name: string, email?: string): void {
  if (typeof window === 'undefined') return

  const session = getUserSession()
  session.creatorName = name
  if (email) {
    session.creatorEmail = email
  }
  session.lastActive = new Date().toISOString()

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

/**
 * Get Git identity from GitHub API
 * Uses cached value if available and not expired
 * Requires GitHub PAT to be configured
 *
 * @returns GitIdentity if available, null otherwise
 */
export async function getGitIdentity(): Promise<GitIdentity | null> {
  if (typeof window === 'undefined') return null

  // Check cache first
  const cached = localStorage.getItem(GIT_IDENTITY_CACHE_KEY)
  if (cached) {
    try {
      const data = JSON.parse(cached) as {
        identity: GitIdentity
        timestamp: number
      }

      // Check if cache is still valid (24 hours)
      if (Date.now() - data.timestamp < GIT_CACHE_DURATION) {
        return data.identity
      }
    } catch (error) {
      console.warn('[userSession] Failed to parse cached Git identity:', error)
      // Fall through to fetch fresh
    }
  }

  // Try to fetch from GitHub API
  const pat = localStorage.getItem('github-pat')
  if (!pat) {
    return null
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      console.warn('[userSession] GitHub API returned non-OK status:', response.status)
      return null
    }

    const user = await response.json()

    const identity: GitIdentity = {
      name: user.name || user.login,
      email: user.email,
      source: 'git',
    }

    // Cache the result
    localStorage.setItem(
      GIT_IDENTITY_CACHE_KEY,
      JSON.stringify({
        identity,
        timestamp: Date.now(),
      })
    )

    return identity
  } catch (error) {
    console.warn('[userSession] Failed to fetch Git identity:', error)
    return null
  }
}

/**
 * Clear Git identity cache
 * Forces fresh fetch on next getGitIdentity() call
 */
export function clearGitIdentityCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GIT_IDENTITY_CACHE_KEY)
}

/**
 * Clear user session
 * Removes all session data from localStorage
 */
export function clearUserSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(GIT_IDENTITY_CACHE_KEY)
}

/**
 * Get current creator name
 * Convenience function to get just the creator name
 *
 * @returns Creator name from session
 */
export function getCreatorName(): string {
  return getUserSession().creatorName
}

/**
 * Check if user has configured GitHub PAT
 *
 * @returns true if PAT is configured
 */
export function hasGitHubPAT(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('github-pat')
}
