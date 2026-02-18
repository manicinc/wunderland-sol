/**
 * Remote Template Loader Tests
 * @module __tests__/unit/lib/templates/remoteTemplateLoader.test
 *
 * Tests for remote template loading and repository management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock templateCache
vi.mock('@/lib/templates/templateCache', () => ({
  getCachedRegistry: vi.fn().mockResolvedValue(null),
  setCachedRegistry: vi.fn().mockResolvedValue(undefined),
  isRegistryFresh: vi.fn().mockReturnValue(false),
  isRegistryUsable: vi.fn().mockReturnValue(false),
  getCachedTemplate: vi.fn().mockResolvedValue(null),
  setCachedTemplate: vi.fn().mockResolvedValue(undefined),
  getTemplateCacheKey: vi.fn((repoId, templateId) => `${repoId}:${templateId}`),
  isTemplateFresh: vi.fn().mockReturnValue(false),
  isTemplateUsable: vi.fn().mockReturnValue(false),
  getAllCachedTemplates: vi.fn().mockResolvedValue([]),
  getCachedTemplatesByRepo: vi.fn().mockResolvedValue([]),
}))

// Mock navigator
vi.stubGlobal('navigator', {
  onLine: true,
})

describe('remoteTemplateLoader module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // parseGitHubUrl
  // ============================================================================

  describe('parseGitHubUrl', () => {
    it('parses https://github.com/owner/repo URL', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('https://github.com/anthropics/claude-code')

      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'claude-code',
        branch: undefined,
      })
    })

    it('parses https://github.com/owner/repo/tree/branch URL', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('https://github.com/owner/repo/tree/develop')

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
      })
    })

    it('parses git@github.com:owner/repo.git URL', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('git@github.com:anthropics/templates.git')

      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'templates',
        branch: undefined,
      })
    })

    it('parses owner/repo shorthand', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('myorg/myrepo')

      expect(result).toEqual({
        owner: 'myorg',
        repo: 'myrepo',
        branch: undefined,
      })
    })

    it('removes .git suffix from repo name', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('https://github.com/owner/repo.git')

      expect(result?.repo).toBe('repo')
    })

    it('returns null for invalid URL', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      expect(parseGitHubUrl('')).toBeNull()
      expect(parseGitHubUrl('invalid')).toBeNull()
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull()
    })

    it('handles URL with trailing slash', async () => {
      const { parseGitHubUrl } = await import('@/lib/templates/remoteTemplateLoader')

      const result = parseGitHubUrl('https://github.com/owner/repo/')

      expect(result?.owner).toBe('owner')
      expect(result?.repo).toBe('repo')
    })
  })

  // ============================================================================
  // getTemplateSourcePreferences
  // ============================================================================

  describe('getTemplateSourcePreferences', () => {
    it('returns default preferences when nothing stored', async () => {
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()

      expect(prefs.enabled).toBe(true)
      expect(prefs.repositories).toBeDefined()
      expect(prefs.repositories.length).toBeGreaterThan(0)
    })

    it('includes official repository in defaults', async () => {
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()

      const official = prefs.repositories.find((r) => r.isOfficial)
      expect(official).toBeDefined()
    })

    it('returns preferences structure', async () => {
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()

      expect(prefs).toHaveProperty('enabled')
      expect(prefs).toHaveProperty('repositories')
      expect(Array.isArray(prefs.repositories)).toBe(true)
    })

    it('official repository has required properties', async () => {
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()
      const official = prefs.repositories.find((r) => r.isOfficial)

      expect(official).toHaveProperty('id')
      expect(official).toHaveProperty('owner')
      expect(official).toHaveProperty('repo')
      expect(official).toHaveProperty('branch')
      expect(official).toHaveProperty('enabled')
    })

    it('repositories have correct structure', async () => {
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()

      for (const repo of prefs.repositories) {
        expect(typeof repo.id).toBe('string')
        expect(typeof repo.owner).toBe('string')
        expect(typeof repo.repo).toBe('string')
      }
    })
  })

  // ============================================================================
  // saveTemplateSourcePreferences
  // ============================================================================

  describe('saveTemplateSourcePreferences', () => {
    it('does not throw when saving preferences', async () => {
      const { saveTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      expect(() => {
        saveTemplateSourcePreferences({
          enabled: false,
          repositories: [],
        })
      }).not.toThrow()
    })

    it('accepts enabled parameter', async () => {
      const { saveTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      expect(() => {
        saveTemplateSourcePreferences({
          enabled: true,
          repositories: [],
        })
      }).not.toThrow()
    })

    it('accepts repositories array', async () => {
      const { saveTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      expect(() => {
        saveTemplateSourcePreferences({
          repositories: [
            { id: 'test/repo', owner: 'test', repo: 'repo', branch: 'main', enabled: true, isOfficial: false, name: 'Test', description: 'Test repo' },
          ],
        })
      }).not.toThrow()
    })
  })

  // ============================================================================
  // addTemplateRepository
  // ============================================================================

  describe('addTemplateRepository', () => {
    it('returns repository with correct id format', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('myorg', 'templates', 'main')

      expect(repo.id).toBe('myorg/templates')
    })

    it('returns repository with owner and repo', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('myorg', 'mytemplates', 'main')

      expect(repo.owner).toBe('myorg')
      expect(repo.repo).toBe('mytemplates')
    })

    it('returns repository with branch', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('org', 'repo', 'develop')

      expect(repo.branch).toBe('develop')
    })

    it('returns enabled repository', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('org', 'repo2', 'main')

      expect(repo.enabled).toBe(true)
    })

    it('returns non-official repository', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('org', 'repo3', 'main')

      expect(repo.isOfficial).toBe(false)
    })

    it('uses main as default branch', async () => {
      const { addTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      const repo = addTemplateRepository('myorg', 'templates4')

      expect(repo.branch).toBe('main')
    })
  })

  // ============================================================================
  // removeTemplateRepository
  // ============================================================================

  describe('removeTemplateRepository', () => {
    it('does not throw when removing non-official repository', async () => {
      const { addTemplateRepository, removeTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      addTemplateRepository('custom', 'torepo')

      expect(() => {
        removeTemplateRepository('custom/torepo')
      }).not.toThrow()
    })

    it('throws when trying to remove official repository', async () => {
      const { removeTemplateRepository, getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()
      const official = prefs.repositories.find((r) => r.isOfficial)

      if (official) {
        expect(() => removeTemplateRepository(official.id)).toThrow('Cannot remove official')
      }
    })
  })

  // ============================================================================
  // toggleTemplateRepository / setRepositoryEnabled
  // ============================================================================

  describe('toggleTemplateRepository', () => {
    it('does not throw when toggling repository', async () => {
      const { addTemplateRepository, toggleTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      addTemplateRepository('test', 'togglerepo1')

      expect(() => {
        toggleTemplateRepository('test/togglerepo1', false)
      }).not.toThrow()
    })

    it('accepts true to enable', async () => {
      const { addTemplateRepository, toggleTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      addTemplateRepository('test', 'togglerepo2')

      expect(() => {
        toggleTemplateRepository('test/togglerepo2', true)
      }).not.toThrow()
    })

    it('accepts false to disable', async () => {
      const { addTemplateRepository, toggleTemplateRepository } = await import('@/lib/templates/remoteTemplateLoader')

      addTemplateRepository('test', 'togglerepo3')

      expect(() => {
        toggleTemplateRepository('test/togglerepo3', false)
      }).not.toThrow()
    })

    it('is aliased as setRepositoryEnabled', async () => {
      const { toggleTemplateRepository, setRepositoryEnabled } = await import('@/lib/templates/remoteTemplateLoader')

      expect(setRepositoryEnabled).toBe(toggleTemplateRepository)
    })
  })

  // ============================================================================
  // getSyncStatus
  // ============================================================================

  describe('getSyncStatus', () => {
    it('returns current sync status', async () => {
      const { getSyncStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const status = getSyncStatus()

      expect(status).toHaveProperty('isSyncing')
      expect(status).toHaveProperty('progress')
      expect(typeof status.isSyncing).toBe('boolean')
      expect(typeof status.progress).toBe('number')
    })

    it('returns copy of status (not reference)', async () => {
      const { getSyncStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const status1 = getSyncStatus()
      const status2 = getSyncStatus()

      expect(status1).not.toBe(status2)
      expect(status1).toEqual(status2)
    })
  })

  // ============================================================================
  // subscribeSyncStatus
  // ============================================================================

  describe('subscribeSyncStatus', () => {
    it('calls callback immediately with current status', async () => {
      const { subscribeSyncStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const callback = vi.fn()
      subscribeSyncStatus(callback)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isSyncing: expect.any(Boolean),
          progress: expect.any(Number),
        })
      )
    })

    it('returns unsubscribe function', async () => {
      const { subscribeSyncStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const callback = vi.fn()
      const unsubscribe = subscribeSyncStatus(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('is aliased as subscribeToSyncStatus', async () => {
      const { subscribeSyncStatus, subscribeToSyncStatus } = await import('@/lib/templates/remoteTemplateLoader')

      expect(subscribeToSyncStatus).toBe(subscribeSyncStatus)
    })
  })

  // ============================================================================
  // getRateLimitStatus
  // ============================================================================

  describe('getRateLimitStatus', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-RateLimit-Remaining': '50',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
      }))
    })

    it('returns rate limit status', async () => {
      const { getRateLimitStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const status = await getRateLimitStatus()

      expect(status).toHaveProperty('remaining')
      expect(status).toHaveProperty('limit')
      expect(status).toHaveProperty('resetAt')
      expect(status).toHaveProperty('hasAuth')
    })

    it('returns copy of status', async () => {
      const { getRateLimitStatus } = await import('@/lib/templates/remoteTemplateLoader')

      const status1 = await getRateLimitStatus()
      const status2 = await getRateLimitStatus()

      expect(status1).not.toBe(status2)
    })
  })

  // ============================================================================
  // Server-side rendering
  // ============================================================================

  describe('SSR handling', () => {
    it('getTemplateSourcePreferences handles missing window', async () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      vi.resetModules()
      const { getTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      const prefs = getTemplateSourcePreferences()

      expect(prefs.enabled).toBe(true)
      expect(prefs.repositories).toBeDefined()

      // Restore
      global.window = originalWindow
    })

    it('saveTemplateSourcePreferences handles missing window', async () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      vi.resetModules()
      const { saveTemplateSourcePreferences } = await import('@/lib/templates/remoteTemplateLoader')

      // Should not throw
      expect(() => {
        saveTemplateSourcePreferences({ repositories: [] })
      }).not.toThrow()

      // Restore
      global.window = originalWindow
    })
  })
})
