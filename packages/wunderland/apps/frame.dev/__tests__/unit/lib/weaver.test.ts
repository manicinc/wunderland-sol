/**
 * Weaver Module Tests
 * @module __tests__/unit/lib/weaver.test
 *
 * Tests for weaver status, publishing capabilities, and GitHub URL generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchWeaversList,
  getCurrentGitHubUser,
  checkWeaverStatus,
  getPublishCapability,
  buildGitHubContributeUrl,
  buildGitHubEditUrl,
  getWeaversListUrl,
  getWeaverInfoText,
  type WeaverStatus,
} from '@/lib/weaver'

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
}

describe('Weaver Module', () => {
  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach(key => {
      delete mockLocalStorage[key]
    })
    vi.clearAllMocks()

    vi.stubGlobal('window', { localStorage: localStorageMock })
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // fetchWeaversList
  // ============================================================================

  describe('fetchWeaversList', () => {
    it('returns cached weavers list when valid', async () => {
      const cachedData = {
        weavers: ['user1', 'user2'],
        timestamp: Date.now() - 1000, // 1 second ago
      }
      mockLocalStorage['quarry-codex-weavers-cache'] = JSON.stringify(cachedData)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual(['user1', 'user2'])
    })

    it('fetches from network when cache expired', async () => {
      const cachedData = {
        weavers: ['old-user'],
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
      }
      mockLocalStorage['quarry-codex-weavers-cache'] = JSON.stringify(cachedData)

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('new-user1\nnew-user2\n# comment\n'),
      })
      vi.stubGlobal('fetch', fetchMock)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual(['new-user1', 'new-user2'])
      expect(fetchMock).toHaveBeenCalled()
    })

    it('fetches from network when no cache', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('user1\nuser2'),
      })
      vi.stubGlobal('fetch', fetchMock)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual(['user1', 'user2'])
    })

    it('filters out comments and empty lines', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('user1\n# This is a comment\n\nuser2\n  \n'),
      })
      vi.stubGlobal('fetch', fetchMock)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual(['user1', 'user2'])
    })

    it('caches fetched weavers list', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('user1\nuser2'),
      })
      vi.stubGlobal('fetch', fetchMock)

      await fetchWeaversList()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'quarry-codex-weavers-cache',
        expect.any(String)
      )
    })

    it('returns empty array on network error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', fetchMock)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual([])
    })

    it('returns empty array on non-OK response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
      vi.stubGlobal('fetch', fetchMock)

      const weavers = await fetchWeaversList()

      expect(weavers).toEqual([])
    })
  })

  // ============================================================================
  // getCurrentGitHubUser
  // ============================================================================

  describe('getCurrentGitHubUser', () => {
    it('returns null for empty PAT', async () => {
      const user = await getCurrentGitHubUser('')
      expect(user).toBeNull()
    })

    it('fetches username from GitHub API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const user = await getCurrentGitHubUser('ghp_test123')

      expect(user).toBe('testuser')
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_test123',
          }),
        })
      )
    })

    it('returns null on API error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
      vi.stubGlobal('fetch', fetchMock)

      const user = await getCurrentGitHubUser('invalid-token')

      expect(user).toBeNull()
    })

    it('returns null on network error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', fetchMock)

      const user = await getCurrentGitHubUser('ghp_test123')

      expect(user).toBeNull()
    })
  })

  // ============================================================================
  // checkWeaverStatus
  // ============================================================================

  describe('checkWeaverStatus', () => {
    it('returns isWeaver true when user is in weavers list', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('weaver1\nweaver2\n'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'weaver1' }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const status = await checkWeaverStatus('ghp_test123')

      expect(status.isWeaver).toBe(true)
      expect(status.username).toBe('weaver1')
      expect(status.canAutoMerge).toBe(true)
      expect(status.requiresPR).toBe(false)
    })

    it('returns isWeaver false when user is not in list', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('other-weaver\n'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'regular-user' }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const status = await checkWeaverStatus('ghp_test123')

      expect(status.isWeaver).toBe(false)
      expect(status.username).toBe('regular-user')
      expect(status.canAutoMerge).toBe(false)
      expect(status.requiresPR).toBe(true)
    })

    it('returns requiresPR false when no username', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('weaver1\n'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
      vi.stubGlobal('fetch', fetchMock)

      const status = await checkWeaverStatus('invalid-token')

      expect(status.isWeaver).toBe(false)
      expect(status.username).toBeNull()
      expect(status.requiresPR).toBe(false)
    })

    it('includes lastChecked timestamp', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
        })
      vi.stubGlobal('fetch', fetchMock)

      const before = Date.now()
      const status = await checkWeaverStatus('token')
      const after = Date.now()

      expect(status.lastChecked).toBeGreaterThanOrEqual(before)
      expect(status.lastChecked).toBeLessThanOrEqual(after)
    })
  })

  // ============================================================================
  // getPublishCapability
  // ============================================================================

  describe('getPublishCapability', () => {
    it('returns github-redirect when no PAT', () => {
      const capability = getPublishCapability(false, null)

      expect(capability.canPublish).toBe(true)
      expect(capability.method).toBe('github-redirect')
      expect(capability.reason).toContain('No GitHub authentication')
    })

    it('returns github-redirect when username is null', () => {
      const status: WeaverStatus = {
        isWeaver: false,
        username: null,
        canAutoMerge: false,
        requiresPR: false,
        weaversList: [],
        lastChecked: Date.now(),
      }

      const capability = getPublishCapability(true, status)

      expect(capability.method).toBe('github-redirect')
      expect(capability.reason).toContain('Could not verify')
    })

    it('returns auto-merge for approved weavers', () => {
      const status: WeaverStatus = {
        isWeaver: true,
        username: 'weaver1',
        canAutoMerge: true,
        requiresPR: false,
        weaversList: ['weaver1'],
        lastChecked: Date.now(),
      }

      const capability = getPublishCapability(true, status)

      expect(capability.canPublish).toBe(true)
      expect(capability.method).toBe('auto-merge')
      expect(capability.reason).toContain('approved Weaver')
      expect(capability.reason).toContain('@weaver1')
    })

    it('returns pr for regular contributors', () => {
      const status: WeaverStatus = {
        isWeaver: false,
        username: 'regular-user',
        canAutoMerge: false,
        requiresPR: true,
        weaversList: [],
        lastChecked: Date.now(),
      }

      const capability = getPublishCapability(true, status)

      expect(capability.canPublish).toBe(true)
      expect(capability.method).toBe('pr')
      expect(capability.reason).toContain('Pull Request required')
      expect(capability.helpText).toContain('@regular-user')
    })
  })

  // ============================================================================
  // buildGitHubContributeUrl
  // ============================================================================

  describe('buildGitHubContributeUrl', () => {
    it('builds URL with default options', () => {
      const url = buildGitHubContributeUrl('test.md', 'content')

      expect(url).toContain('github.com/framersai/codex/new/main')
      expect(url).toContain('filename=weaves%2Fcontributions%2Ftest.md')
      expect(url).toContain('value=content')
    })

    it('uses full path if path contains slash', () => {
      const url = buildGitHubContributeUrl('weaves/my-file.md', 'content')

      expect(url).toContain('filename=weaves%2Fmy-file.md')
    })

    it('uses custom options', () => {
      const url = buildGitHubContributeUrl('file.md', 'content', {
        owner: 'myorg',
        repo: 'myrepo',
        branch: 'develop',
        commitMessage: 'My commit message',
      })

      expect(url).toContain('github.com/myorg/myrepo/new/develop')
      expect(url).toContain('message=My+commit+message')
    })
  })

  // ============================================================================
  // buildGitHubEditUrl
  // ============================================================================

  describe('buildGitHubEditUrl', () => {
    it('builds URL with default options', () => {
      const url = buildGitHubEditUrl('weaves/intro.md')

      expect(url).toBe('https://github.com/framersai/codex/edit/main/weaves/intro.md')
    })

    it('uses custom options', () => {
      const url = buildGitHubEditUrl('docs/readme.md', {
        owner: 'myorg',
        repo: 'myrepo',
        branch: 'feature',
      })

      expect(url).toBe('https://github.com/myorg/myrepo/edit/feature/docs/readme.md')
    })
  })

  // ============================================================================
  // getWeaversListUrl
  // ============================================================================

  describe('getWeaversListUrl', () => {
    it('returns the WEAVERS.txt URL', () => {
      const url = getWeaversListUrl()

      expect(url).toBe('https://github.com/framersai/quarry/blob/main/.github/WEAVERS.txt')
    })
  })

  // ============================================================================
  // getWeaverInfoText
  // ============================================================================

  describe('getWeaverInfoText', () => {
    it('returns informational text', () => {
      const text = getWeaverInfoText()

      expect(text).toContain('How Publishing Works')
      expect(text).toContain('Approved Weavers')
      expect(text).toContain('Pull Request')
      expect(text).toContain('How to Become a Weaver')
    })

    it('mentions requirements', () => {
      const text = getWeaverInfoText()

      expect(text).toContain('5+ high-quality PRs')
      expect(text).toContain('validation')
    })
  })
})

// ============================================================================
// SERVER-SIDE BEHAVIOR
// ============================================================================

describe('Weaver Module - Server Side', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchWeaversList fetches without cache on server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('serveruser'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const weavers = await fetchWeaversList()

    expect(weavers).toEqual(['serveruser'])
    expect(fetchMock).toHaveBeenCalled()
  })
})
