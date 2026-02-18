/**
 * User Session Tests
 * @module __tests__/unit/lib/userSession.test
 *
 * Tests for user session management and Git identity caching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUserSession,
  updateCreatorInfo,
  getGitIdentity,
  clearGitIdentityCache,
  clearUserSession,
  getCreatorName,
  hasGitHubPAT,
  type UserSession,
  type GitIdentity,
} from '@/lib/userSession'

// ============================================================================
// MOCKS
// ============================================================================

const mockLocalStorage: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach(key => {
      delete mockLocalStorage[key]
    })
  }),
}

const cryptoMock = {
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}

describe('User Session Management', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach(key => {
      delete mockLocalStorage[key]
    })
    vi.clearAllMocks()

    // Mock window object first (needed for typeof window !== 'undefined' checks)
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      crypto: cryptoMock,
    })
    // Then stub the globals directly for direct access
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('crypto', cryptoMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // getUserSession
  // ============================================================================

  describe('getUserSession', () => {
    it('creates new session when none exists', () => {
      const session = getUserSession()

      expect(session.sessionId).toBe('test-uuid-1234')
      expect(session.creatorName).toBe('Traveler')
      expect(session.lastActive).toBeDefined()
    })

    it('stores new session in localStorage', () => {
      getUserSession()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codex-user-session',
        expect.any(String)
      )
    })

    it('returns existing session from localStorage', () => {
      const existingSession: UserSession = {
        sessionId: 'existing-123',
        creatorName: 'Test User',
        lastActive: '2024-01-01T00:00:00Z',
      }
      mockLocalStorage['codex-user-session'] = JSON.stringify(existingSession)

      const session = getUserSession()

      expect(session.sessionId).toBe('existing-123')
      expect(session.creatorName).toBe('Test User')
    })

    it('updates lastActive on existing session', () => {
      const existingSession: UserSession = {
        sessionId: 'existing-123',
        creatorName: 'Test User',
        lastActive: '2024-01-01T00:00:00Z',
      }
      mockLocalStorage['codex-user-session'] = JSON.stringify(existingSession)

      const session = getUserSession()

      // lastActive should be updated to current time
      expect(session.lastActive).not.toBe('2024-01-01T00:00:00Z')
    })

    it('creates new session if stored data is invalid JSON', () => {
      mockLocalStorage['codex-user-session'] = 'invalid-json'

      const session = getUserSession()

      expect(session.sessionId).toBe('test-uuid-1234')
      expect(session.creatorName).toBe('Traveler')
    })
  })

  // ============================================================================
  // updateCreatorInfo
  // ============================================================================

  describe('updateCreatorInfo', () => {
    it('updates creator name', () => {
      getUserSession() // Initialize session
      vi.clearAllMocks()

      updateCreatorInfo('New Name')

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const stored = JSON.parse(mockLocalStorage['codex-user-session'])
      expect(stored.creatorName).toBe('New Name')
    })

    it('updates creator email when provided', () => {
      getUserSession() // Initialize session

      updateCreatorInfo('Name', 'email@test.com')

      const stored = JSON.parse(mockLocalStorage['codex-user-session'])
      expect(stored.creatorEmail).toBe('email@test.com')
    })

    it('updates lastActive timestamp', () => {
      const existingSession: UserSession = {
        sessionId: 'test',
        creatorName: 'Old Name',
        lastActive: '2024-01-01T00:00:00Z',
      }
      mockLocalStorage['codex-user-session'] = JSON.stringify(existingSession)

      updateCreatorInfo('New Name')

      const stored = JSON.parse(mockLocalStorage['codex-user-session'])
      expect(stored.lastActive).not.toBe('2024-01-01T00:00:00Z')
    })
  })

  // ============================================================================
  // getCreatorName
  // ============================================================================

  describe('getCreatorName', () => {
    it('returns creator name from session', () => {
      const session: UserSession = {
        sessionId: 'test',
        creatorName: 'Test Creator',
        lastActive: new Date().toISOString(),
      }
      mockLocalStorage['codex-user-session'] = JSON.stringify(session)

      expect(getCreatorName()).toBe('Test Creator')
    })

    it('returns default name when no session', () => {
      expect(getCreatorName()).toBe('Traveler')
    })
  })

  // ============================================================================
  // clearUserSession
  // ============================================================================

  describe('clearUserSession', () => {
    it('removes session from localStorage', () => {
      mockLocalStorage['codex-user-session'] = '{"test": true}'
      mockLocalStorage['codex-git-identity'] = '{"test": true}'

      clearUserSession()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('codex-user-session')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('codex-git-identity')
    })
  })

  // ============================================================================
  // hasGitHubPAT
  // ============================================================================

  describe('hasGitHubPAT', () => {
    it('returns false when no PAT', () => {
      expect(hasGitHubPAT()).toBe(false)
    })

    it('returns true when PAT exists', () => {
      mockLocalStorage['github-pat'] = 'ghp_test123'

      expect(hasGitHubPAT()).toBe(true)
    })
  })

  // ============================================================================
  // clearGitIdentityCache
  // ============================================================================

  describe('clearGitIdentityCache', () => {
    it('removes git identity cache from localStorage', () => {
      mockLocalStorage['codex-git-identity'] = '{"test": true}'

      clearGitIdentityCache()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('codex-git-identity')
    })
  })

  // ============================================================================
  // getGitIdentity
  // ============================================================================

  describe('getGitIdentity', () => {
    it('returns null when no PAT configured', async () => {
      const identity = await getGitIdentity()

      expect(identity).toBeNull()
    })

    it('returns cached identity when valid', async () => {
      const cachedData = {
        identity: { name: 'Cached User', email: 'cached@test.com', source: 'git' },
        timestamp: Date.now() - 1000, // 1 second ago
      }
      mockLocalStorage['codex-git-identity'] = JSON.stringify(cachedData)
      mockLocalStorage['github-pat'] = 'ghp_test123'

      const identity = await getGitIdentity()

      expect(identity?.name).toBe('Cached User')
      expect(identity?.email).toBe('cached@test.com')
    })

    it('ignores expired cache', async () => {
      const cachedData = {
        identity: { name: 'Old User', email: 'old@test.com', source: 'git' },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
      }
      mockLocalStorage['codex-git-identity'] = JSON.stringify(cachedData)
      // No PAT, so should return null after cache is expired

      const identity = await getGitIdentity()

      expect(identity).toBeNull()
    })

    it('fetches from GitHub API when cache expired and PAT exists', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'GitHub User', email: 'github@test.com' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      mockLocalStorage['github-pat'] = 'ghp_test123'

      const identity = await getGitIdentity()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_test123',
          }),
        })
      )
      expect(identity?.name).toBe('GitHub User')
      expect(identity?.email).toBe('github@test.com')
    })

    it('caches fetched identity', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'New User', email: 'new@test.com' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      mockLocalStorage['github-pat'] = 'ghp_test123'

      await getGitIdentity()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codex-git-identity',
        expect.any(String)
      )
    })

    it('returns null on API error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
      vi.stubGlobal('fetch', fetchMock)

      mockLocalStorage['github-pat'] = 'ghp_invalid'

      const identity = await getGitIdentity()

      expect(identity).toBeNull()
    })

    it('returns null on network error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', fetchMock)

      mockLocalStorage['github-pat'] = 'ghp_test123'

      const identity = await getGitIdentity()

      expect(identity).toBeNull()
    })

    it('uses login as name fallback', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser', email: null }),
      })
      vi.stubGlobal('fetch', fetchMock)

      mockLocalStorage['github-pat'] = 'ghp_test123'

      const identity = await getGitIdentity()

      expect(identity?.name).toBe('testuser')
    })
  })
})

// ============================================================================
// SERVER-SIDE BEHAVIOR
// ============================================================================

describe('Server-Side Behavior', () => {
  beforeEach(() => {
    // Simulate server-side by removing window
    vi.stubGlobal('window', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getUserSession returns server fallback', () => {
    const session = getUserSession()

    expect(session.sessionId).toBe('server')
    expect(session.creatorName).toBe('Unknown')
  })

  it('updateCreatorInfo does nothing', () => {
    // Should not throw
    expect(() => updateCreatorInfo('Test')).not.toThrow()
  })

  it('getGitIdentity returns null', async () => {
    const identity = await getGitIdentity()
    expect(identity).toBeNull()
  })

  it('hasGitHubPAT returns false', () => {
    expect(hasGitHubPAT()).toBe(false)
  })

  it('clearGitIdentityCache does nothing', () => {
    expect(() => clearGitIdentityCache()).not.toThrow()
  })

  it('clearUserSession does nothing', () => {
    expect(() => clearUserSession()).not.toThrow()
  })
})
