/**
 * Fastify API Server for Frame.dev
 * 
 * Lightweight REST API for the Quarry Codex knowledge base.
 * Provides token-based authentication, CRUD operations, and AI generation endpoints.
 * 
 * @module lib/api
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import etag from '@fastify/etag'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'

import { registerKnowledgeRoutes } from './routes/knowledge'
import { registerGenerationRoutes } from './routes/generation'
import { registerProfileRoutes } from './routes/profile'
import { registerTokenRoutes } from './routes/tokens'
import { registerSystemRoutes } from './routes/system'
import { registerQuestionsRoutes } from './routes/questions'
import { registerRelationshipsRoutes } from './routes/relationships'
import { registerMaturityRoutes } from './routes/maturity'
import { registerMOCsRoutes } from './routes/mocs'
import { registerSyncRoutes } from './routes/sync'
import { registerSyncAuthRoutes } from './routes/syncAuth'
import { registerBillingRoutes } from './routes/billing'
import { registerSyncWebSocket } from './websocket/syncSocket'
import { authPlugin } from './auth/plugin'
import { logRateLimited } from './auth/auditLogger'

// ============================================================================
// TYPES
// ============================================================================

export interface APIServerOptions {
  /** Port to listen on (default: 3847) */
  port?: number
  /** Host to bind to (default: '0.0.0.0') */
  host?: string
  /** Enable CORS (default: true) */
  cors?: boolean
  /** Enable rate limiting (default: true) */
  rateLimit?: boolean
  /** Logger options */
  logger?: boolean | object
}

// ============================================================================
// SERVER FACTORY
// ============================================================================

/**
 * Create and configure the Fastify API server
 */
export async function createAPIServer(options: APIServerOptions = {}): Promise<FastifyInstance> {
  const {
    cors: enableCors = true,
    rateLimit: enableRateLimit = true,
    logger = {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        }
      } : undefined
    }
  } = options

  // Create Fastify instance
  const fastify = Fastify({
    logger,
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      }
    }
  })

  // ========================================================================
  // PLUGINS
  // ========================================================================

  // CORS
  if (enableCors) {
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3847',
        process.env.FRONTEND_URL || 'https://frame.dev',
        ...(process.env.ADDITIONAL_CORS_ORIGINS?.split(',') || [])
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Token'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    })
  }

  // Rate limiting
  if (enableRateLimit) {
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => ({
        error: 'RATE_LIMITED',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000)
      }),
      onExceeded: async (request) => {
        // Log rate limit event to audit trail
        await logRateLimited(
          request.apiToken?.id,
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'] || undefined,
            endpoint: request.url,
            method: request.method
          }
        )
      }
    })
  }

  // ETag support for HTTP caching
  await fastify.register(etag, {
    algorithm: 'fnv1a' // Fast hash algorithm
  })

  // WebSocket support for real-time sync
  await fastify.register(websocket, {
    options: {
      maxPayload: 10 * 1024 * 1024, // 10MB max message size
      clientTracking: true,
    }
  })

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Quarry API',
        description: `
REST API for the Quarry Codex knowledge base.

## Authentication

All endpoints require a valid API token. Include it in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_API_TOKEN
\`\`\`

Generate tokens in your Frame.dev profile settings.

## Rate Limits

- 100 requests per minute per token
- Rate limit headers are included in all responses

## Errors

All errors follow this format:
\`\`\`json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {} // Optional additional info
}
\`\`\`
        `,
        version: '1.0.0',
        contact: {
          name: 'Frame.dev Support',
          email: 'support@frame.dev',
          url: 'https://frame.dev'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:3847',
          description: 'Local development'
        },
        {
          url: 'https://api.frame.dev',
          description: 'Production'
        }
      ],
      tags: [
        { name: 'Knowledge', description: 'Knowledge base operations (weaves, looms, strands)' },
        { name: 'Search', description: 'Search and discovery' },
        { name: 'Relationships', description: 'Strand relationships (Zettelkasten link context)' },
        { name: 'Maturity', description: 'Note maturity tracking and quality checks' },
        { name: 'MOCs', description: 'Maps of Content - topic entry points' },
        { name: 'Questions', description: 'Suggested questions generation and retrieval' },
        { name: 'Generation', description: 'AI-powered content generation' },
        { name: 'Profile', description: 'User profile and settings' },
        { name: 'Tokens', description: 'API token management' },
        { name: 'System', description: 'Health and status endpoints' },
        { name: 'Sync', description: 'Zero-knowledge cloud sync - encrypted data sync across devices' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Token',
            description: 'API token from Frame.dev profile settings'
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/api/v1/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        theme: 'obsidian'
      }
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => swaggerObject,
    transformSpecificationClone: true
  })

  // Auth plugin
  await fastify.register(authPlugin)

  // ========================================================================
  // ROUTES
  // ========================================================================

  // API prefix
  await fastify.register(async (api) => {
    // System routes (no auth required for health)
    await api.register(registerSystemRoutes)
    
    // Protected routes
    await api.register(registerKnowledgeRoutes)
    await api.register(registerGenerationRoutes)
    await api.register(registerQuestionsRoutes)
    await api.register(registerProfileRoutes)
    await api.register(registerTokenRoutes)
    
    // Zettelkasten workflow routes
    await api.register(registerRelationshipsRoutes)
    await api.register(registerMaturityRoutes)
    await api.register(registerMOCsRoutes)

    // Sync routes (zero-knowledge cloud sync)
    await api.register(registerSyncRoutes)
    await api.register(registerSyncAuthRoutes)

    // Billing routes (Stripe + license keys)
    await api.register(registerBillingRoutes)

    // WebSocket sync (real-time)
    await api.register(registerSyncWebSocket)
  }, { prefix: '/api/v1' })

  // Root redirect
  fastify.get('/', async (request, reply) => {
    return reply.redirect('/api/v1/docs')
  })

  // ========================================================================
  // ERROR HANDLERS
  // ========================================================================

  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const statusCode = error.statusCode || 500
    
    fastify.log.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers
      }
    })

    reply.status(statusCode).send({
      error: error.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'Internal server error' : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    })
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`
    })
  })

  return fastify
}

/**
 * Start the API server
 */
export async function startAPIServer(options: APIServerOptions = {}): Promise<FastifyInstance> {
  const { port = 3847, host = '0.0.0.0' } = options
  
  const server = await createAPIServer(options)
  
  try {
    await server.listen({ port, host })
    console.log(`🚀 FABRIC API server running at http://${host}:${port}`)
    console.log(`📚 API documentation: http://${host}:${port}/api/v1/docs`)
    return server
  } catch (err) {
    server.log.error(err)
    throw err
  }
}

export type { FastifyInstance, FastifyRequest, FastifyReply }

