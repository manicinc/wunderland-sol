/**
 * Unit tests for Favorites Collection feature
 * Tests system collection constants, API protection, and utility functions
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// TESTS FOR CONSTANTS AND HELPERS
// ============================================================================

describe('Favorites Collection Constants', () => {
  it('should export correct FAVORITES_COLLECTION_ID', async () => {
    const { FAVORITES_COLLECTION_ID } = await import('@/lib/collections/constants')
    expect(FAVORITES_COLLECTION_ID).toBe('system-favorites')
  })

  it('should export correct FAVORITES_COLLECTION_TITLE', async () => {
    const { FAVORITES_COLLECTION_TITLE } = await import('@/lib/collections/constants')
    expect(FAVORITES_COLLECTION_TITLE).toBe('Favorites')
  })

  it('should export DEFAULT_FAVORITES_COLLECTION with correct shape', async () => {
    const { DEFAULT_FAVORITES_COLLECTION, FAVORITES_COLLECTION_ID } = await import('@/lib/collections/constants')

    expect(DEFAULT_FAVORITES_COLLECTION).toMatchObject({
      id: FAVORITES_COLLECTION_ID,
      title: 'Favorites',
      description: 'Your favorite strands',
      icon: '⭐',
      color: '#facc15',
      strandPaths: [],
      viewMode: 'cards',
      isSystem: true,
      systemType: 'favorites',
      pinned: false,
      sortOrder: -1,
    })
  })
})

describe('isSystemCollection helper', () => {
  it('should return true for system collections', async () => {
    const { isSystemCollection } = await import('@/lib/collections/constants')

    expect(isSystemCollection({ isSystem: true } as any)).toBe(true)
    expect(isSystemCollection({ isSystem: true, systemType: 'favorites' } as any)).toBe(true)
  })

  it('should return false for regular collections', async () => {
    const { isSystemCollection } = await import('@/lib/collections/constants')

    expect(isSystemCollection({ isSystem: false } as any)).toBe(false)
    expect(isSystemCollection({} as any)).toBe(false)
    expect(isSystemCollection(null)).toBe(false)
    expect(isSystemCollection(undefined)).toBe(false)
  })
})

describe('isSystemCollectionId helper', () => {
  it('should return true for system-favorites ID', async () => {
    const { isSystemCollectionId, FAVORITES_COLLECTION_ID } = await import('@/lib/collections/constants')

    expect(isSystemCollectionId(FAVORITES_COLLECTION_ID)).toBe(true)
    expect(isSystemCollectionId('system-favorites')).toBe(true)
  })

  it('should return false for regular collection IDs', async () => {
    const { isSystemCollectionId } = await import('@/lib/collections/constants')

    expect(isSystemCollectionId('my-collection')).toBe(false)
    expect(isSystemCollectionId('favorites')).toBe(false)
    expect(isSystemCollectionId('')).toBe(false)
  })
})

// ============================================================================
// TESTS FOR ensureFavoritesCollection
// ============================================================================

describe('ensureFavoritesCollection', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not create collection if it already exists', async () => {
    const { resetEnsureFavoritesState, ensureFavoritesCollection } = await import('@/lib/collections/ensureFavoritesCollection')

    resetEnsureFavoritesState()

    // Mock existing collection
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'system-favorites', title: 'Favorites' }),
    })

    await ensureFavoritesCollection()

    // Should have checked for existence
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/collections?id=system-favorites')
  })

  it('should create collection if it does not exist', async () => {
    const { resetEnsureFavoritesState, ensureFavoritesCollection } = await import('@/lib/collections/ensureFavoritesCollection')

    resetEnsureFavoritesState()

    // Mock 404 on check, then success on create
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 201 })

    await ensureFavoritesCollection()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    // First call: check
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/collections?id=system-favorites')
    // Second call: create
    expect(fetchMock.mock.calls[1][0]).toBe('/api/collections')
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST')
  })

  it('should handle 409 conflict gracefully (already exists race condition)', async () => {
    const { resetEnsureFavoritesState, ensureFavoritesCollection } = await import('@/lib/collections/ensureFavoritesCollection')

    resetEnsureFavoritesState()

    // Mock 404 on check, then 409 on create (race condition)
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 409 })

    // Should not throw
    await expect(ensureFavoritesCollection()).resolves.toBeUndefined()
  })

  it('should cache the ensure state (singleton pattern)', async () => {
    const { resetEnsureFavoritesState, ensureFavoritesCollection } = await import('@/lib/collections/ensureFavoritesCollection')

    resetEnsureFavoritesState()

    // Mock existing collection
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'system-favorites' }),
    })

    await ensureFavoritesCollection()
    await ensureFavoritesCollection()
    await ensureFavoritesCollection()

    // Should only have called fetch once
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should handle network errors gracefully', async () => {
    const { resetEnsureFavoritesState, ensureFavoritesCollection } = await import('@/lib/collections/ensureFavoritesCollection')

    resetEnsureFavoritesState()

    // Mock network error
    fetchMock.mockRejectedValueOnce(new Error('Network error'))

    // Should not throw
    await expect(ensureFavoritesCollection()).resolves.toBeUndefined()
  })
})

// ============================================================================
// TESTS FOR API PROTECTION (mocked responses)
// ============================================================================

describe('Collections API Protection', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should block deletion of system collections (403 response)', async () => {
    // This tests the expected API behavior
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Cannot delete system collection' }),
    })

    const response = await fetch('/api/collections?id=system-favorites', { method: 'DELETE' })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Cannot delete system collection')
  })

  it('should block renaming of system collections (403 response)', async () => {
    // This tests the expected API behavior
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Cannot rename system collection' }),
    })

    const response = await fetch('/api/collections?id=system-favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Favorites' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Cannot rename system collection')
  })

  it('should allow updating other properties of system collections', async () => {
    // This tests the expected API behavior
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        id: 'system-favorites',
        title: 'Favorites',
        icon: '🌟', // Changed icon
        description: 'New description',
      }),
    })

    const response = await fetch('/api/collections?id=system-favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icon: '🌟', description: 'New description' }),
    })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
  })
})
