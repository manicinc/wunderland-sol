/**
 * Collections API Tests
 * @module __tests__/api/collections
 *
 * Tests for the collections REST API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import fs from 'fs/promises'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

const mockFs = vi.mocked(fs)

// Import after mocking
import { GET, POST, PUT, DELETE, PATCH } from '@/app/api/collections/route'

// Shared state for mock data
let mockData: any[] = []

// Helper to create a mock NextRequest
function createMockRequest(
  url: string,
  options: { method?: string; body?: any } = {}
): NextRequest {
  const { method = 'GET', body } = options
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  return request
}

describe('Collections API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockData = []

    // Default mock implementations
    mockFs.readFile.mockImplementation(async () => JSON.stringify(mockData))
    mockFs.writeFile.mockImplementation(async (_path, data) => {
      mockData = JSON.parse(data as string)
    })
    mockFs.mkdir.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ==========================================================================
  // GET Endpoint
  // ==========================================================================

  describe('GET /api/collections', () => {
    it('returns empty array when no collections exist', async () => {
      const request = createMockRequest('/api/collections')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('returns all collections sorted by pinned first', async () => {
      mockData = [
        { id: '1', title: 'Unpinned', pinned: false, sortOrder: 0 },
        { id: '2', title: 'Pinned', pinned: true, sortOrder: 1 },
      ]

      const request = createMockRequest('/api/collections')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].title).toBe('Pinned')
      expect(data[1].title).toBe('Unpinned')
    })

    it('returns single collection by id', async () => {
      mockData = [
        { id: 'col-1', title: 'First Collection' },
        { id: 'col-2', title: 'Second Collection' },
      ]

      const request = createMockRequest('/api/collections?id=col-2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Second Collection')
    })

    it('returns 404 for non-existent collection id', async () => {
      mockData = [{ id: 'col-1', title: 'Existing' }]

      const request = createMockRequest('/api/collections?id=non-existent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })

    it('sorts by sortOrder when pinned status is equal', async () => {
      mockData = [
        { id: '1', title: 'Third', pinned: false, sortOrder: 2 },
        { id: '2', title: 'First', pinned: false, sortOrder: 0 },
        { id: '3', title: 'Second', pinned: false, sortOrder: 1 },
      ]

      const request = createMockRequest('/api/collections')
      const response = await GET(request)
      const data = await response.json()

      expect(data[0].title).toBe('First')
      expect(data[1].title).toBe('Second')
      expect(data[2].title).toBe('Third')
    })
  })

  // ==========================================================================
  // POST Endpoint
  // ==========================================================================

  describe('POST /api/collections', () => {
    it('creates a new collection with required fields', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: { title: 'New Collection' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe('New Collection')
      expect(data.strandPaths).toEqual([])
      expect(data.viewMode).toBe('cards')
      expect(data.pinned).toBe(false)
    })

    it('creates collection with optional fields', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: {
          title: 'Full Collection',
          description: 'A description',
          icon: '📚',
          color: '#ff0000',
          strandPaths: ['path/to/strand.md'],
          viewMode: 'grid',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.description).toBe('A description')
      expect(data.icon).toBe('📚')
      expect(data.color).toBe('#ff0000')
      expect(data.strandPaths).toEqual(['path/to/strand.md'])
      expect(data.viewMode).toBe('grid')
    })

    it('returns 400 when title is missing', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: { description: 'No title' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('returns 400 when title is empty', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: { title: '   ' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('assigns default color from palette', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: { title: 'Color Test' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.color).toBe('#8b5cf6') // First color in palette
    })

    it('trims whitespace from title and description', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'POST',
        body: { title: '  Trimmed Title  ', description: '  Trimmed Desc  ' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.title).toBe('Trimmed Title')
      expect(data.description).toBe('Trimmed Desc')
    })
  })

  // ==========================================================================
  // PUT Endpoint
  // ==========================================================================

  describe('PUT /api/collections', () => {
    it('updates an existing collection', async () => {
      mockData = [
        {
          id: 'update-me',
          title: 'Original',
          strandPaths: [],
          viewMode: 'cards',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]

      const request = createMockRequest('/api/collections?id=update-me', {
        method: 'PUT',
        body: { title: 'Updated Title', description: 'New description' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Title')
      expect(data.description).toBe('New description')
    })

    it('returns 400 when id is missing', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'PUT',
        body: { title: 'No ID' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Collection ID is required')
    })

    it('returns 404 for non-existent collection', async () => {
      const request = createMockRequest('/api/collections?id=not-found', {
        method: 'PUT',
        body: { title: 'Update' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })

    it('only updates provided fields', async () => {
      mockData = [
        {
          id: 'partial-update',
          title: 'Original',
          description: 'Original desc',
          color: '#000000',
          strandPaths: ['existing.md'],
          viewMode: 'cards',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]

      const request = createMockRequest('/api/collections?id=partial-update', {
        method: 'PUT',
        body: { title: 'New Title' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(data.title).toBe('New Title')
      expect(data.description).toBe('Original desc')
      expect(data.color).toBe('#000000')
    })

    it('can update pinned status', async () => {
      mockData = [
        {
          id: 'pin-test',
          title: 'Pin Test',
          pinned: false,
          strandPaths: [],
          viewMode: 'cards',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]

      const request = createMockRequest('/api/collections?id=pin-test', {
        method: 'PUT',
        body: { pinned: true },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(data.pinned).toBe(true)
    })
  })

  // ==========================================================================
  // DELETE Endpoint
  // ==========================================================================

  describe('DELETE /api/collections', () => {
    it('deletes an existing collection', async () => {
      mockData = [{ id: 'delete-me', title: 'Delete Me' }]

      const request = createMockRequest('/api/collections?id=delete-me', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 400 when id is missing', async () => {
      const request = createMockRequest('/api/collections', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Collection ID is required')
    })

    it('returns 404 for non-existent collection', async () => {
      const request = createMockRequest('/api/collections?id=not-found', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })
  })

  // ==========================================================================
  // PATCH Endpoint
  // ==========================================================================

  describe('PATCH /api/collections', () => {
    beforeEach(() => {
      mockData = [
        {
          id: 'patch-test',
          title: 'Patch Test',
          strandPaths: ['existing.md'],
          positions: {},
          pinned: false,
          viewMode: 'cards',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]
    })

    describe('add-strand action', () => {
      it('adds a strand to collection', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=add-strand',
          {
            method: 'PATCH',
            body: { strandPath: 'new-strand.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.strandPaths).toContain('new-strand.md')
        expect(data.strandPaths).toContain('existing.md')
      })

      it('does not duplicate existing strand', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=add-strand',
          {
            method: 'PATCH',
            body: { strandPath: 'existing.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(
          data.strandPaths.filter((p: string) => p === 'existing.md')
        ).toHaveLength(1)
      })

      it('returns 400 when strandPath is missing', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=add-strand',
          {
            method: 'PATCH',
            body: {},
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('strandPath is required')
      })
    })

    describe('remove-strand action', () => {
      it('removes a strand from collection', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=remove-strand',
          {
            method: 'PATCH',
            body: { strandPath: 'existing.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.strandPaths).not.toContain('existing.md')
      })

      it('also removes position data for strand', async () => {
        mockData[0].positions = { 'existing.md': { x: 100, y: 200 } }

        const request = createMockRequest(
          '/api/collections?id=patch-test&action=remove-strand',
          {
            method: 'PATCH',
            body: { strandPath: 'existing.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(data.positions['existing.md']).toBeUndefined()
      })
    })

    describe('update-position action', () => {
      it('updates position for a strand', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=update-position',
          {
            method: 'PATCH',
            body: {
              strandPath: 'existing.md',
              position: { x: 100, y: 200, width: 300, height: 400 },
            },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(data.positions['existing.md']).toEqual({
          x: 100,
          y: 200,
          width: 300,
          height: 400,
        })
      })

      it('returns 400 when strandPath or position is missing', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=update-position',
          {
            method: 'PATCH',
            body: { strandPath: 'test.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('strandPath and position are required')
      })
    })

    describe('update-positions action', () => {
      it('updates multiple positions at once', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=update-positions',
          {
            method: 'PATCH',
            body: {
              positions: {
                'strand1.md': { x: 0, y: 0 },
                'strand2.md': { x: 100, y: 100 },
              },
            },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(data.positions['strand1.md']).toEqual({ x: 0, y: 0 })
        expect(data.positions['strand2.md']).toEqual({ x: 100, y: 100 })
      })

      it('returns 400 when positions is missing', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=update-positions',
          {
            method: 'PATCH',
            body: {},
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('positions is required')
      })
    })

    describe('toggle-pin action', () => {
      it('toggles pinned status from false to true', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=toggle-pin',
          {
            method: 'PATCH',
            body: {},
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(data.pinned).toBe(true)
      })

      it('toggles pinned status from true to false', async () => {
        mockData[0].pinned = true

        const request = createMockRequest(
          '/api/collections?id=patch-test&action=toggle-pin',
          {
            method: 'PATCH',
            body: {},
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(data.pinned).toBe(false)
      })
    })

    describe('error handling', () => {
      it('returns 400 for missing collection id', async () => {
        const request = createMockRequest('/api/collections?action=add-strand', {
          method: 'PATCH',
          body: { strandPath: 'test.md' },
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Collection ID is required')
      })

      it('returns 404 for non-existent collection', async () => {
        mockData = [] // Empty the collections

        const request = createMockRequest(
          '/api/collections?id=not-found&action=add-strand',
          {
            method: 'PATCH',
            body: { strandPath: 'test.md' },
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Collection not found')
      })

      it('returns 400 for unknown action', async () => {
        const request = createMockRequest(
          '/api/collections?id=patch-test&action=unknown-action',
          {
            method: 'PATCH',
            body: {},
          }
        )

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Unknown action: unknown-action')
      })
    })
  })
})
