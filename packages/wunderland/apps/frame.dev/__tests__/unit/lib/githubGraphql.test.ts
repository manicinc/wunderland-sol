/**
 * GitHub GraphQL API Tests
 * @module __tests__/unit/lib/githubGraphql.test
 *
 * Tests for GitHub GraphQL API wrapper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hasGithubAuthToken,
  fetchGithubDirectory,
  fetchGithubTree,
  fetchGithubTreeREST,
  type GitHubTreeEntry,
} from '@/lib/githubGraphql'

// Mock the config module
vi.mock('@/lib/config/deploymentMode', () => ({
  isStaticExport: vi.fn(() => false),
}))

describe('GitHub GraphQL', () => {
  const mockFetch = vi.fn()
  let mockLocalStorage: Record<string, string>

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)

    mockLocalStorage = {}
    const mockStorageApi = {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
      removeItem: (key: string) => { delete mockLocalStorage[key] },
      clear: () => { mockLocalStorage = {} },
    }
    vi.stubGlobal('window', { localStorage: mockStorageApi, location: { origin: 'http://localhost:3000' } })
    vi.stubGlobal('localStorage', mockStorageApi)

    // Clear any PAT from env
    delete process.env.GH_PAT
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // hasGithubAuthToken
  // ============================================================================

  describe('hasGithubAuthToken', () => {
    it('returns false when no token available', () => {
      expect(hasGithubAuthToken()).toBe(false)
    })

    it('returns true when GH_PAT env is set', () => {
      process.env.GH_PAT = 'ghp_test_token'
      expect(hasGithubAuthToken()).toBe(true)
    })

    it('returns true when localStorage has PAT', () => {
      mockLocalStorage['quarry-codex-preferences'] = JSON.stringify({
        githubPAT: 'ghp_stored_token'
      })
      expect(hasGithubAuthToken()).toBe(true)
    })

    it('returns false when localStorage PAT is empty', () => {
      mockLocalStorage['quarry-codex-preferences'] = JSON.stringify({
        githubPAT: ''
      })
      expect(hasGithubAuthToken()).toBe(false)
    })

    it('returns false when localStorage has invalid JSON', () => {
      mockLocalStorage['quarry-codex-preferences'] = 'not-json'
      expect(hasGithubAuthToken()).toBe(false)
    })
  })

  // ============================================================================
  // fetchGithubDirectory
  // ============================================================================

  describe('fetchGithubDirectory', () => {
    it('fetches directory entries', async () => {
      const mockResponse = {
        data: {
          repository: {
            object: {
              entries: [
                { name: 'file.md', type: 'blob', path: 'file.md', object: { byteSize: 1024 } },
                { name: 'folder', type: 'tree', path: 'folder', object: null },
              ],
            },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchGithubDirectory('owner', 'repo', 'HEAD:')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        name: 'file.md',
        type: 'blob',
        path: 'file.md',
        size: 1024,
      })
      expect(result[1]).toEqual({
        name: 'folder',
        type: 'tree',
        path: 'folder',
        size: undefined,
      })
    })

    it('calls GitHub GraphQL endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { repository: { object: { entries: [] } } } }),
      })

      await fetchGithubDirectory('testowner', 'testrepo', 'main:path')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('includes authorization header when token provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { repository: { object: { entries: [] } } } }),
      })

      await fetchGithubDirectory('owner', 'repo', 'HEAD:', 'ghp_explicit_token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'bearer ghp_explicit_token',
          }),
        })
      )
    })

    it('returns empty array when no entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { repository: { object: null } } }),
      })

      const result = await fetchGithubDirectory('owner', 'repo', 'HEAD:')

      expect(result).toEqual([])
    })

    it('throws error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(fetchGithubDirectory('owner', 'repo', 'HEAD:')).rejects.toThrow(
        'GitHub GraphQL error: 401 Unauthorized'
      )
    })
  })

  // ============================================================================
  // fetchGithubTree
  // ============================================================================

  describe('fetchGithubTree', () => {
    it('recursively fetches tree', async () => {
      // First call: root directory with a subdirectory
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            repository: {
              object: {
                entries: [
                  { name: 'README.md', type: 'blob', path: 'README.md', object: { byteSize: 100 } },
                  { name: 'src', type: 'tree', path: 'src', object: null },
                ],
              },
            },
          },
        }),
      })

      // Second call: subdirectory
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            repository: {
              object: {
                entries: [
                  { name: 'index.ts', type: 'blob', path: 'src/index.ts', object: { byteSize: 500 } },
                ],
              },
            },
          },
        }),
      })

      const result = await fetchGithubTree('owner', 'repo', 'main')

      expect(result).toHaveLength(3)
      expect(result.map((e) => e.path)).toEqual(['README.md', 'src', 'src/index.ts'])
    })

    it('respects maxDepth limit', async () => {
      // Deep nested structure - only fetch 1 level
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            repository: {
              object: {
                entries: [
                  { name: 'nested', type: 'tree', path: 'nested', object: null },
                ],
              },
            },
          },
        }),
      })

      const result = await fetchGithubTree('owner', 'repo', 'main', undefined, 1)

      // Should stop after depth 1
      expect(mockFetch).toHaveBeenCalledTimes(2) // root + 1 level
    })

    it('uses default branch of main', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { repository: { object: { entries: [] } } } }),
      })

      await fetchGithubTree('owner', 'repo')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.variables.expression).toBe('main:')
    })
  })

  // ============================================================================
  // fetchGithubTreeREST
  // ============================================================================

  describe('fetchGithubTreeREST', () => {
    it('falls back to direct API in SSR mode', async () => {
      vi.stubGlobal('window', undefined)

      // Branch request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commit: { sha: 'abc123' } }),
      })

      // Tree request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tree: [
            { path: 'file.md', type: 'blob', size: 100 },
          ],
        }),
      })

      const result = await fetchGithubTreeREST('owner', 'repo', 'main')

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file.md')
    })

    it('throws on branch fetch failure', async () => {
      vi.stubGlobal('window', undefined)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(fetchGithubTreeREST('owner', 'repo')).rejects.toThrow(
        'GitHub REST API error (branch): Not Found'
      )
    })

    it('throws when SHA cannot be resolved', async () => {
      vi.stubGlobal('window', undefined)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commit: {} }), // No SHA
      })

      await expect(fetchGithubTreeREST('owner', 'repo')).rejects.toThrow(
        'Failed to resolve branch SHA'
      )
    })

    it('returns empty array when tree is missing', async () => {
      vi.stubGlobal('window', undefined)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commit: { sha: 'abc123' } }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // No tree
      })

      const result = await fetchGithubTreeREST('owner', 'repo')

      expect(result).toEqual([])
    })

    it('includes auth header when PAT is available', async () => {
      vi.stubGlobal('window', undefined)
      process.env.GH_PAT = 'ghp_test_token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commit: { sha: 'abc123' } }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tree: [] }),
      })

      await fetchGithubTreeREST('owner', 'repo')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('branches/main'),
        expect.objectContaining({
          headers: { Authorization: 'token ghp_test_token' },
        })
      )
    })
  })

  // ============================================================================
  // GitHubTreeEntry type
  // ============================================================================

  describe('GitHubTreeEntry type', () => {
    it('represents a file entry', () => {
      const entry: GitHubTreeEntry = {
        name: 'index.ts',
        type: 'blob',
        path: 'src/index.ts',
        size: 1024,
      }

      expect(entry.name).toBe('index.ts')
      expect(entry.type).toBe('blob')
      expect(entry.size).toBe(1024)
    })

    it('represents a directory entry', () => {
      const entry: GitHubTreeEntry = {
        name: 'src',
        type: 'tree',
        path: 'src',
      }

      expect(entry.type).toBe('tree')
      expect(entry.size).toBeUndefined()
    })
  })
})
