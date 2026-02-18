// @ts-nocheck
/**
 * Token Management Routes
 * 
 * API token CRUD operations.
 * 
 * @module lib/api/routes/tokens
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/plugin'
import {
  createToken,
  listTokens,
  revokeToken,
  deleteToken,
  maskToken
} from '../auth/tokenStorage'
import {
  getTokenAuditTrail,
  getAPIAuditEvents,
  getAPIAuditStats
} from '../auth/auditLogger'

// ============================================================================
// SCHEMAS
// ============================================================================

const tokenSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    token: { type: 'string', description: 'Masked token (only shown in full on creation)' },
    createdAt: { type: 'string', format: 'date-time' },
    lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    isActive: { type: 'boolean' },
    usageCount: { type: 'number' }
  }
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerTokenRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // LIST TOKENS
  // ========================================================================

  fastify.get('/tokens', {
    schema: {
      description: 'List all API tokens for the current profile',
      tags: ['Tokens'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: tokenSchema },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                active: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profileId = request.profileId
    
    if (!profileId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Profile not found' })
    }

    const tokens = await listTokens(profileId)
    const activeCount = tokens.filter(t => t.isActive).length

    return {
      data: tokens.map(t => ({
        id: t.id,
        label: t.label,
        token: t.token, // Already masked
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.expiresAt,
        isActive: t.isActive,
        usageCount: t.usageCount
      })),
      meta: {
        total: tokens.length,
        active: activeCount
      }
    }
  })

  // ========================================================================
  // CREATE TOKEN
  // ========================================================================

  fastify.post('/tokens', {
    schema: {
      description: 'Create a new API token. The full token is only returned once.',
      tags: ['Tokens'],
      body: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 100, description: 'Label for the token' },
          expiresInDays: { type: 'number', minimum: 1, maximum: 365, description: 'Token expiration in days (optional)' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                token: { type: 'string', description: 'Full token (only shown once!)' },
                createdAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time', nullable: true }
              }
            },
            meta: {
              type: 'object',
              properties: {
                warning: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const profileId = request.profileId
    
    if (!profileId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Profile not found' })
    }

    const { label, expiresInDays } = request.body as { label?: string; expiresInDays?: number }

    try {
      const { token, rawToken } = await createToken({
        profileId,
        label,
        expiresInDays
      })

      return reply.status(201).send({
        data: {
          id: token.id,
          label: token.label,
          token: rawToken, // Full token, only shown once
          createdAt: token.createdAt,
          expiresAt: token.expiresAt
        },
        meta: {
          warning: 'Store this token securely. It will not be shown again.'
        }
      })
    } catch (error) {
      return reply.status(500).send({ 
        error: 'TOKEN_CREATION_FAILED', 
        message: 'Failed to create token' 
      })
    }
  })

  // ========================================================================
  // REVOKE TOKEN
  // ========================================================================

  fastify.delete('/tokens/:tokenId', {
    schema: {
      description: 'Revoke an API token (requires confirmation header)',
      tags: ['Tokens'],
      params: {
        type: 'object',
        properties: {
          tokenId: { type: 'string' }
        },
        required: ['tokenId']
      },
      headers: {
        type: 'object',
        properties: {
          'x-confirm-revoke': { 
            type: 'string', 
            enum: ['true'],
            description: 'Set to "true" to confirm revocation' 
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                revoked: { type: 'boolean' }
              }
            },
            meta: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const profileId = request.profileId
    const { tokenId } = request.params as { tokenId: string }
    const confirmHeader = request.headers['x-confirm-revoke'] as string | undefined
    
    if (!profileId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Profile not found' })
    }

    // Require confirmation header for safety
    if (confirmHeader !== 'true') {
      return reply.status(400).send({ 
        error: 'CONFIRMATION_REQUIRED', 
        message: 'Set X-Confirm-Revoke: true header to confirm token revocation' 
      })
    }

    const success = await revokeToken(tokenId, profileId)

    if (!success) {
      return reply.status(404).send({ 
        error: 'NOT_FOUND', 
        message: 'Token not found or already revoked' 
      })
    }

    return {
      data: {
        id: tokenId,
        revoked: true
      },
      meta: {
        message: 'Token has been revoked and can no longer be used'
      }
    }
  })

  // ========================================================================
  // PERMANENT DELETE
  // ========================================================================

  fastify.delete('/tokens/:tokenId/permanent', {
    schema: {
      description: 'Permanently delete a token (cannot be undone)',
      tags: ['Tokens'],
      params: {
        type: 'object',
        properties: {
          tokenId: { type: 'string' }
        },
        required: ['tokenId']
      },
      headers: {
        type: 'object',
        properties: {
          'x-confirm-delete': { 
            type: 'string', 
            enum: ['true'],
            description: 'Set to "true" to confirm permanent deletion' 
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                deleted: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const profileId = request.profileId
    const { tokenId } = request.params as { tokenId: string }
    const confirmHeader = request.headers['x-confirm-delete'] as string | undefined
    
    if (!profileId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Profile not found' })
    }

    if (confirmHeader !== 'true') {
      return reply.status(400).send({ 
        error: 'CONFIRMATION_REQUIRED', 
        message: 'Set X-Confirm-Delete: true header to confirm permanent deletion' 
      })
    }

    const success = await deleteToken(tokenId, profileId)

    if (!success) {
      return reply.status(404).send({ 
        error: 'NOT_FOUND', 
        message: 'Token not found' 
      })
    }

    return {
      data: {
        id: tokenId,
        deleted: true
      }
    }
  })

  // ========================================================================
  // TOKEN AUDIT TRAIL
  // ========================================================================

  fastify.get('/tokens/:tokenId/audit', {
    schema: {
      description: 'Get audit trail for a specific token',
      tags: ['Tokens', 'Audit'],
      params: {
        type: 'object',
        properties: {
          tokenId: { type: 'string' }
        },
        required: ['tokenId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  actionName: { type: 'string' },
                  endpoint: { type: 'string', nullable: true },
                  method: { type: 'string', nullable: true },
                  ip: { type: 'string', nullable: true },
                  reason: { type: 'string', nullable: true }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                tokenId: { type: 'string' },
                total: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const { tokenId } = request.params as { tokenId: string }
    const { limit = 50 } = request.query as { limit?: number }

    const auditTrail = await getTokenAuditTrail(tokenId, limit)

    return {
      data: auditTrail.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        actionName: entry.actionName,
        endpoint: entry.targetPath || null,
        method: entry.newValue?.method || null,
        ip: entry.newValue?.ip || null,
        reason: entry.newValue?.reason || null
      })),
      meta: {
        tokenId,
        total: auditTrail.length
      }
    }
  })

  // ========================================================================
  // API AUDIT EVENTS
  // ========================================================================

  fastify.get('/audit/api', {
    schema: {
      description: 'Get all API audit events (auth failures, rate limits, token operations)',
      tags: ['Audit'],
      querystring: {
        type: 'object',
        properties: {
          actionName: {
            type: 'string',
            enum: ['token_create', 'token_validate', 'token_revoke', 'token_delete', 'auth_fail', 'rate_limit']
          },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  actionName: { type: 'string' },
                  tokenId: { type: 'string', nullable: true },
                  endpoint: { type: 'string', nullable: true },
                  method: { type: 'string', nullable: true },
                  ip: { type: 'string', nullable: true },
                  reason: { type: 'string', nullable: true }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const { actionName, startTime, endTime, limit = 50, offset = 0 } = request.query as {
      actionName?: string
      startTime?: string
      endTime?: string
      limit?: number
      offset?: number
    }

    const events = await getAPIAuditEvents({
      actionName: actionName as any,
      startTime,
      endTime,
      limit,
      offset
    })

    return {
      data: events.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        actionName: entry.actionName,
        tokenId: entry.targetId || null,
        endpoint: entry.targetPath || null,
        method: entry.newValue?.method || null,
        ip: entry.newValue?.ip || null,
        reason: entry.newValue?.reason || null
      })),
      meta: {
        total: events.length,
        limit,
        offset
      }
    }
  })

  // ========================================================================
  // API AUDIT STATS
  // ========================================================================

  fastify.get('/audit/api/stats', {
    schema: {
      description: 'Get API audit statistics (total events, failures, rate limits)',
      tags: ['Audit'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalEvents: { type: 'number' },
                eventsByAction: {
                  type: 'object',
                  additionalProperties: { type: 'number' }
                },
                recentFailures: { type: 'number', description: 'Auth failures in last 24h' },
                recentRateLimits: { type: 'number', description: 'Rate limits in last 24h' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const stats = await getAPIAuditStats()

    return {
      data: stats
    }
  })
}

