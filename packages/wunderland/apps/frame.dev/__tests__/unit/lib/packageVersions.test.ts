/**
 * Package Versions Tests
 * @module __tests__/unit/lib/packageVersions.test
 *
 * Tests for npm package version fetching functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPackageVersions, type PackageVersions } from '@/lib/packageVersions'

describe('Package Versions', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // getPackageVersions
  // ============================================================================

  describe('getPackageVersions', () => {
    it('returns all package versions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0' }),
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBeDefined()
      expect(result.codexViewer).toBeDefined()
      expect(result.sqlStorageAdapter).toBeDefined()
      expect(result.openstrandSdk).toBeDefined()
    })

    it('fetches from npm registry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '2.0.0' }),
      })

      await getPackageVersions()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@framers/agentos/latest',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@framers/codex-viewer/latest',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@framers/sql-storage-adapter/latest',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@framers/openstrand-sdk/latest',
        expect.any(Object)
      )
    })

    it('makes 4 fetch calls (one per package)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0' }),
      })

      await getPackageVersions()

      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    it('returns correct version numbers', async () => {
      let callCount = 0
      const versions = ['1.0.0', '2.0.0', '3.0.0', '4.0.0']

      mockFetch.mockImplementation(() => {
        const version = versions[callCount++ % versions.length]
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version }),
        })
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('1.0.0')
      expect(result.codexViewer).toBe('2.0.0')
      expect(result.sqlStorageAdapter).toBe('3.0.0')
      expect(result.openstrandSdk).toBe('4.0.0')
    })

    it('returns N/A when fetch fails with non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
      expect(result.codexViewer).toBe('N/A')
      expect(result.sqlStorageAdapter).toBe('N/A')
      expect(result.openstrandSdk).toBe('N/A')
    })

    it('returns N/A when fetch throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
      expect(result.codexViewer).toBe('N/A')
      expect(result.sqlStorageAdapter).toBe('N/A')
      expect(result.openstrandSdk).toBe('N/A')
    })

    it('returns N/A when version is missing from response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // No version field
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
    })

    it('handles partial failures', async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ version: '1.0.0' }),
          })
        }
        return Promise.reject(new Error('Failed'))
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('1.0.0')
      expect(result.codexViewer).toBe('N/A')
      expect(result.sqlStorageAdapter).toBe('N/A')
      expect(result.openstrandSdk).toBe('N/A')
    })

    it('uses Next.js caching options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0' }),
      })

      await getPackageVersions()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 3600 },
        })
      )
    })
  })

  // ============================================================================
  // PackageVersions type
  // ============================================================================

  describe('PackageVersions type', () => {
    it('has correct structure', () => {
      const versions: PackageVersions = {
        agentos: '1.0.0',
        codexViewer: '2.0.0',
        sqlStorageAdapter: '3.0.0',
        openstrandSdk: '4.0.0',
      }

      expect(versions.agentos).toBe('1.0.0')
      expect(versions.codexViewer).toBe('2.0.0')
      expect(versions.sqlStorageAdapter).toBe('3.0.0')
      expect(versions.openstrandSdk).toBe('4.0.0')
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
    })

    it('handles rate limiting (429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
    })

    it('handles null version in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: null }),
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
    })

    it('handles empty string version', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '' }),
      })

      const result = await getPackageVersions()

      // Empty string is falsy, should return N/A
      expect(result.agentos).toBe('N/A')
    })

    it('handles valid semver versions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '1.2.3-beta.1' }),
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('1.2.3-beta.1')
    })

    it('handles json parse error gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const result = await getPackageVersions()

      expect(result.agentos).toBe('N/A')
    })
  })
})
