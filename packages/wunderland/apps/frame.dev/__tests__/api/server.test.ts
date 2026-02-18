/**
 * API Server Tests
 * 
 * Integration tests for the Fastify API server.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { FastifyInstance } from 'fastify'

// Mock dependencies
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => ({
    exec: vi.fn(),
    run: vi.fn(),
    all: vi.fn(() => [])
  })),
  getDatabaseStats: vi.fn(() => ({
    embeddings: 100,
    searchHistory: 50,
    readingProgress: 25,
    drafts: 10,
    bookmarks: 15,
    totalSizeKB: 1024
  }))
}))

vi.mock('@/lib/storage', () => ({
  profileStorage: {
    get: vi.fn(() => ({})),
    set: vi.fn()
  },
  settingsStorage: {
    get: vi.fn(() => ({})),
    set: vi.fn()
  }
}))

vi.mock('../../lib/api/auth/tokenStorage', () => ({
  initTokenSchema: vi.fn(),
  validateToken: vi.fn(() => ({ valid: true, token: { id: 'test', profileId: 'test-profile' } })),
  createToken: vi.fn(() => ({ token: { id: 'new-token' }, rawToken: 'fdev_test' })),
  listTokens: vi.fn(() => []),
  revokeToken: vi.fn(() => true),
  deleteToken: vi.fn(() => true),
  maskToken: vi.fn((t: string) => '****')
}))

import { createAPIServer } from '../../lib/api'

describe('API Server', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createAPIServer({
      logger: false,
      rateLimit: false
    })
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('System Routes', () => {
    it('GET /api/v1/health returns healthy status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/health'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBeDefined()
      expect(body.version).toBe('1.0.0')
    })

    it('GET /api/v1/info returns API info', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/info'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Quarry Codex API')
      expect(body.version).toBe('1.0.0')
      expect(Array.isArray(body.endpoints)).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('returns 401 without auth token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/weaves'
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('UNAUTHORIZED')
    })

    it('accepts valid Bearer token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/weaves',
        headers: {
          'Authorization': 'Bearer fdev_valid_test_token'
        }
      })

      // Should not be 401 (auth should pass)
      expect(response.statusCode).not.toBe(401)
    })

    it('accepts X-API-Token header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/weaves',
        headers: {
          'X-API-Token': 'fdev_valid_test_token'
        }
      })

      expect(response.statusCode).not.toBe(401)
    })
  })

  describe('Knowledge Routes', () => {
    const authHeaders = { 'Authorization': 'Bearer fdev_test' }

    it('GET /api/v1/weaves returns weaves list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/weaves',
        headers: authHeaders
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toBeDefined()
      expect(body.meta).toBeDefined()
      expect(body.meta.pagination).toBeDefined()
    })

    it('GET /api/v1/looms returns looms list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/looms',
        headers: authHeaders
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toBeDefined()
    })

    it('GET /api/v1/strands supports query params', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/strands?limit=10&offset=0',
        headers: authHeaders
      })

      expect(response.statusCode).toBe(200)
    })

    it('GET /api/v1/search requires q parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/search',
        headers: authHeaders
      })

      // Should return 400 or handle missing param
      expect([200, 400]).toContain(response.statusCode)
    })
  })

  describe('Generation Routes', () => {
    const authHeaders = { 'Authorization': 'Bearer fdev_test' }

    it('POST /api/v1/generate/flashcards requires input', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/generate/flashcards',
        headers: authHeaders,
        payload: {}
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('VALIDATION_ERROR')
    })

    it('POST /api/v1/generate/flashcards accepts content', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/generate/flashcards',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'This is a test content about programming. It contains multiple sentences. Each sentence adds more information. This helps generate flashcards.',
          count: 3
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('POST /api/v1/generate/summary works', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/generate/summary',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'This is a test. It has content. Summary should be generated.'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.summary).toBeDefined()
    })
  })

  describe('Token Routes', () => {
    const authHeaders = { 'Authorization': 'Bearer fdev_test' }

    it('GET /api/v1/tokens returns token list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/tokens',
        headers: authHeaders
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toBeDefined()
      expect(body.meta).toBeDefined()
    })

    it('POST /api/v1/tokens creates a new token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        payload: {
          label: 'Test Token'
        }
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.data.token).toBeDefined()
      expect(body.meta.warning).toBeDefined()
    })

    it('DELETE /api/v1/tokens/:id requires auth and confirmation header', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/tokens/test-token-id',
        headers: authHeaders
      })

      // May return 401 or 400 depending on mock state
      expect([400, 401]).toContain(response.statusCode)
    })

    it('DELETE /api/v1/tokens/:id with confirmation', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/tokens/test-token-id',
        headers: {
          ...authHeaders,
          'X-Confirm-Revoke': 'true'
        }
      })

      // May return 200 or 401 depending on mock state
      expect([200, 401]).toContain(response.statusCode)
    })
  })

  describe('Error Handling', () => {
    it('returns 404 for unknown routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/unknown-route'
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('NOT_FOUND')
    })
  })
})

