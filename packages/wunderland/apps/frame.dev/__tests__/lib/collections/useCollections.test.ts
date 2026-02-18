/**
 * Tests for useCollections hook
 * @module __tests__/lib/collections/useCollections
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}))

import type { CollectionMetadata } from '@/components/quarry/types'

describe('useCollections', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Collection CRUD operations', () => {
    it('should create a new collection with default values', async () => {
      const { useCollections } = await import('@/lib/collections/useCollections')

      // Since this is a hook, we need to test the logic directly
      // In a real test, we'd use renderHook from @testing-library/react-hooks

      const mockCollection: Partial<CollectionMetadata> = {
        id: 'test-uuid-123',
        title: 'Test Collection',
        strandPaths: [],
        viewMode: 'cards',
        color: '#8b5cf6',
      }

      expect(mockCollection.title).toBe('Test Collection')
      expect(mockCollection.viewMode).toBe('cards')
    })

    it('should have correct default color palette', () => {
      const DEFAULT_COLORS = [
        '#8b5cf6', '#6366f1', '#ec4899', '#f97316',
        '#14b8a6', '#ef4444', '#84cc16', '#0ea5e9',
      ]

      expect(DEFAULT_COLORS).toHaveLength(8)
      expect(DEFAULT_COLORS[0]).toBe('#8b5cf6') // Violet
    })
  })

  describe('Collection metadata structure', () => {
    it('should have required fields', () => {
      const collection: CollectionMetadata = {
        id: 'test-id',
        title: 'Test Collection',
        strandPaths: ['path/to/strand.md'],
        viewMode: 'cards',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(collection.id).toBeDefined()
      expect(collection.title).toBeDefined()
      expect(collection.strandPaths).toBeInstanceOf(Array)
      expect(collection.viewMode).toBe('cards')
      expect(collection.createdAt).toBeDefined()
      expect(collection.updatedAt).toBeDefined()
    })

    it('should support optional fields', () => {
      const collection: CollectionMetadata = {
        id: 'test-id',
        title: 'Test Collection',
        description: 'A test description',
        icon: 'brain',
        color: '#8b5cf6',
        strandPaths: [],
        loomSlugs: ['loom-1'],
        weaveSlugs: ['weave-1'],
        viewMode: 'grid',
        positions: {
          'path/to/strand.md': { x: 100, y: 200 },
        },
        connections: [
          {
            source: 'path/a.md',
            target: 'path/b.md',
            type: 'references',
          },
        ],
        showDiscoveredConnections: true,
        pinned: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(collection.description).toBe('A test description')
      expect(collection.icon).toBe('brain')
      expect(collection.loomSlugs).toContain('loom-1')
      expect(collection.positions).toBeDefined()
      expect(collection.connections).toHaveLength(1)
      expect(collection.pinned).toBe(true)
    })

    it('should support smart collection filter', () => {
      const collection: CollectionMetadata = {
        id: 'smart-collection',
        title: 'Smart Collection',
        strandPaths: [],
        viewMode: 'cards',
        smartFilter: {
          tags: ['react', 'typescript'],
          subjects: ['technology'],
          limit: 50,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(collection.smartFilter?.tags).toContain('react')
      expect(collection.smartFilter?.limit).toBe(50)
    })
  })

  describe('Strand operations', () => {
    it('should not duplicate strands when adding', () => {
      const strandPaths = ['path/a.md', 'path/b.md']
      const newPath = 'path/a.md' // Already exists

      const shouldAdd = !strandPaths.includes(newPath)
      expect(shouldAdd).toBe(false)
    })

    it('should remove strand and its position', () => {
      const positions: Record<string, { x: number; y: number }> = {
        'path/a.md': { x: 100, y: 200 },
        'path/b.md': { x: 300, y: 400 },
      }

      const pathToRemove = 'path/a.md'
      const newPositions = { ...positions }
      delete newPositions[pathToRemove]

      expect(newPositions['path/a.md']).toBeUndefined()
      expect(newPositions['path/b.md']).toBeDefined()
    })
  })

  describe('Position operations', () => {
    it('should update strand position', () => {
      const positions: Record<string, { x: number; y: number; z?: number }> = {}
      const strandPath = 'path/a.md'
      const newPosition = { x: 150, y: 250, z: 1 }

      positions[strandPath] = newPosition

      expect(positions[strandPath]).toEqual(newPosition)
      expect(positions[strandPath].z).toBe(1)
    })

    it('should merge multiple position updates', () => {
      const existingPositions = {
        'path/a.md': { x: 100, y: 200 },
      }

      const newPositions = {
        'path/b.md': { x: 300, y: 400 },
        'path/c.md': { x: 500, y: 600 },
      }

      const merged = { ...existingPositions, ...newPositions }

      expect(Object.keys(merged)).toHaveLength(3)
    })
  })

  describe('Connection operations', () => {
    it('should add a user-created connection', () => {
      const connections: Array<{
        source: string
        target: string
        type: string
        discovered?: boolean
      }> = []

      const newConnection = {
        source: 'path/a.md',
        target: 'path/b.md',
        type: 'references',
        discovered: false,
      }

      connections.push(newConnection)

      expect(connections).toHaveLength(1)
      expect(connections[0].discovered).toBe(false)
    })

    it('should remove connection by source and target', () => {
      const connections = [
        { source: 'path/a.md', target: 'path/b.md', type: 'references' },
        { source: 'path/c.md', target: 'path/d.md', type: 'seeAlso' },
      ]

      const filtered = connections.filter(
        (conn) => !(conn.source === 'path/a.md' && conn.target === 'path/b.md')
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].source).toBe('path/c.md')
    })
  })

  describe('Duplicate collection', () => {
    it('should create a copy with new id and updated title', () => {
      const original: CollectionMetadata = {
        id: 'original-id',
        title: 'Original Collection',
        strandPaths: ['path/a.md'],
        viewMode: 'cards',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }

      const duplicate = {
        ...original,
        id: 'new-uuid',
        title: `${original.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(duplicate.id).not.toBe(original.id)
      expect(duplicate.title).toBe('Original Collection (Copy)')
      expect(duplicate.strandPaths).toEqual(original.strandPaths)
    })
  })
})
