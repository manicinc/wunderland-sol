// @ts-nocheck
/**
 * System Routes
 * 
 * Health check and status endpoints.
 * 
 * @module lib/api/routes/system
 */

import { FastifyInstance } from 'fastify'
import { getDatabaseStats, getDatabase } from '@/lib/codexDatabase'
import { getCacheStats, clearCache, HttpCachePresets } from '../cache'

// ============================================================================
// SCHEMAS
// ============================================================================

const healthSchema = {
  description: 'Health check endpoint',
  tags: ['System'],
  security: [], // No auth required
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        database: { type: 'string', enum: ['connected', 'disconnected'] },
        uptime: { type: 'number' }
      }
    }
  }
}

const statsSchema = {
  description: 'Get database and cache statistics',
  tags: ['System'],
  response: {
    200: {
      type: 'object',
      properties: {
        database: {
          type: 'object',
          properties: {
            embeddings: { type: 'number' },
            searchHistory: { type: 'number' },
            readingProgress: { type: 'number' },
            drafts: { type: 'number' },
            bookmarks: { type: 'number' },
            totalSizeKB: { type: 'number' }
          }
        },
        cache: {
          type: 'object',
          properties: {
            hits: { type: 'number' },
            misses: { type: 'number' },
            size: { type: 'number' },
            maxSize: { type: 'number' },
            hitRate: { type: 'string' }
          }
        }
      }
    }
  }
}

const cacheSchema = {
  description: 'Get cache statistics',
  tags: ['System'],
  response: {
    200: {
      type: 'object',
      properties: {
        hits: { type: 'number' },
        misses: { type: 'number' },
        size: { type: 'number' },
        maxSize: { type: 'number' },
        hitRate: { type: 'string' }
      }
    }
  }
}

// ============================================================================
// ROUTES
// ============================================================================

const startTime = Date.now()

export async function registerSystemRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check - no auth required
  fastify.get('/health', {
    schema: healthSchema
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDatabase()
    const dbStatus = db ? 'connected' : 'disconnected'
    
    return {
      status: db ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus,
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }
  })

  // Database & cache stats
  fastify.get('/stats', {
    schema: statsSchema,
    // @ts-expect-error - verifyToken is decorated by auth plugin
    preHandler: fastify.verifyToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const dbStats = await getDatabaseStats()
    const cacheStats = getCacheStats()
    
    return {
      database: dbStats,
      cache: cacheStats
    }
  })

  // Cache stats only
  fastify.get('/cache', {
    schema: cacheSchema,
    // @ts-expect-error - verifyToken is decorated by auth plugin
    preHandler: fastify.verifyToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return getCacheStats()
  })

  // Clear cache (admin action)
  fastify.delete('/cache', {
    schema: {
      description: 'Clear the API cache',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    // @ts-expect-error - verifyToken is decorated by auth plugin
    preHandler: fastify.verifyToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    clearCache()
    return {
      success: true,
      message: 'Cache cleared successfully'
    }
  })

  // API info
  fastify.get('/info', {
    schema: {
      description: 'Get API information',
      tags: ['System'],
      security: [],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            version: { type: 'string' },
            documentation: { type: 'string' },
            endpoints: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      name: 'Quarry Codex API',
      description: 'REST API for the Quarry Codex knowledge base',
      version: '1.0.0',
      documentation: '/api/v1/docs',
      endpoints: [
        'GET /api/v1/health',
        'GET /api/v1/info',
        'GET /api/v1/weaves',
        'GET /api/v1/looms',
        'GET /api/v1/strands',
        'GET /api/v1/search',
        'POST /api/v1/generate/flashcards',
        'POST /api/v1/generate/quiz',
        'GET /api/v1/profile',
        'GET /api/v1/tokens'
      ]
    }
  })
}

