/**
 * Fastify Auth Plugin
 *
 * Provides token-based authentication for API endpoints.
 * Supports both API tokens (for Codex) and JWT tokens (for Sync).
 *
 * @module lib/api/auth/plugin
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { validateToken, APIToken } from './tokenStorage'
import { logTokenValidated, logAuthFailed } from './auditLogger'
import { getDeviceAuthService, type JWTPayload } from '../services/deviceAuthService'

// ============================================================================
// TYPES
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    apiToken?: APIToken
    profileId?: string
    /** Sync account ID (from JWT) */
    syncAccountId?: string
    /** Sync device ID (from JWT) */
    syncDeviceId?: string
    /** Full JWT payload for sync */
    syncPayload?: JWTPayload
  }
}

// ============================================================================
// AUTH PLUGIN
// ============================================================================

async function authPluginImpl(fastify: FastifyInstance): Promise<void> {
  // Decorate request with token info
  fastify.decorateRequest('apiToken', undefined)
  fastify.decorateRequest('profileId', undefined)
  fastify.decorateRequest('syncAccountId', undefined)
  fastify.decorateRequest('syncDeviceId', undefined)
  fastify.decorateRequest('syncPayload', undefined)
  
  // Helper to extract request metadata for audit logging
  const getRequestMeta = (request: FastifyRequest) => ({
    ip: request.ip,
    userAgent: request.headers['user-agent'] || undefined,
    endpoint: request.url,
    method: request.method
  })

  // Auth verification function
  fastify.decorate('verifyToken', async function(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization
    const tokenHeader = request.headers['x-api-token']

    // Extract token from header
    let token: string | undefined

    if (authHeader) {
      const [scheme, value] = authHeader.split(' ')
      if (scheme.toLowerCase() === 'bearer' && value) {
        token = value
      }
    } else if (typeof tokenHeader === 'string') {
      token = tokenHeader
    }

    if (!token) {
      // Log auth failure - missing token
      await logAuthFailed('Missing API token', getRequestMeta(request))

      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing API token. Include Authorization: Bearer YOUR_TOKEN header.'
      })
    }

    // Validate token
    const result = await validateToken(token)

    if (!result.valid || !result.token) {
      // Log auth failure - invalid or expired token
      await logAuthFailed(result.error || 'Invalid or expired token', {
        ...getRequestMeta(request),
        tokenPrefix: token.slice(0, 8) // Log only prefix for debugging
      })

      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: result.error || 'Invalid or expired API token'
      })
    }

    // Log successful token validation
    await logTokenValidated(
      result.token.id,
      result.token.profileId,
      getRequestMeta(request)
    )

    // Attach token info to request
    request.apiToken = result.token
    request.profileId = result.token.profileId
  })
  
  // Optional auth - doesn't fail if no token, just decorates if present
  fastify.decorate('optionalAuth', async function(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization
    const tokenHeader = request.headers['x-api-token']

    let token: string | undefined

    if (authHeader) {
      const [scheme, value] = authHeader.split(' ')
      if (scheme.toLowerCase() === 'bearer' && value) {
        token = value
      }
    } else if (typeof tokenHeader === 'string') {
      token = tokenHeader
    }

    if (token) {
      const result = await validateToken(token)
      if (result.valid && result.token) {
        request.apiToken = result.token
        request.profileId = result.token.profileId
      }
    }
  })

  // Sync account JWT verification
  fastify.decorate('verifySyncToken', async function(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      await logAuthFailed('Missing sync token', getRequestMeta(request))
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing Authorization header. Include Authorization: Bearer YOUR_JWT_TOKEN.'
      })
    }

    const [scheme, token] = authHeader.split(' ')
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      await logAuthFailed('Invalid auth header format', getRequestMeta(request))
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid Authorization header format. Use: Bearer YOUR_JWT_TOKEN'
      })
    }

    try {
      const authService = getDeviceAuthService()
      const payload = authService.verifyToken(token)

      request.syncAccountId = payload.sub
      request.syncDeviceId = payload.deviceId
      request.syncPayload = payload
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token verification failed'

      await logAuthFailed(message, {
        ...getRequestMeta(request),
        tokenPrefix: token.slice(0, 8)
      })

      if (message.includes('expired')) {
        return reply.status(401).send({
          error: 'TOKEN_EXPIRED',
          message: 'Access token expired. Use refresh token to get a new one.'
        })
      }

      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid sync token'
      })
    }
  })
}

export const authPlugin = fp(authPluginImpl, {
  name: 'auth-plugin',
  fastify: '5.x'
})

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Require authentication on a route
 * Usage: { preHandler: requireAuth }
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // @ts-expect-error - verifyToken is decorated
  await request.server.verifyToken(request, reply)
}

/**
 * Optional authentication on a route
 * Usage: { preHandler: optionalAuth }
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // @ts-expect-error - optionalAuth is decorated
  await request.server.optionalAuth(request, reply)
}

