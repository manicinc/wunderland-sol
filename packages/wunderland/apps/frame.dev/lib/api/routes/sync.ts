/**
 * Sync Routes
 *
 * REST API endpoints for zero-knowledge sync operations.
 * All data is encrypted client-side - server only stores ciphertext.
 *
 * @module lib/api/routes/sync
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getSyncService } from '../services/syncService'
import type { VectorClockData } from '@framers/sql-storage-adapter/sync'

// ============================================================================
// SCHEMAS
// ============================================================================

const pushSchema = {
  description: 'Push encrypted changes to sync server',
  tags: ['Sync'],
  body: {
    type: 'object',
    required: ['deviceId', 'operations'],
    properties: {
      deviceId: { type: 'string', description: 'Client device ID' },
      operations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['resourceType', 'resourceId', 'encryptedData', 'vectorClock'],
          properties: {
            resourceType: { type: 'string', description: 'Resource type (strand, supernote, collection)' },
            resourceId: { type: 'string', description: 'Unique resource identifier' },
            encryptedData: { type: 'string', description: 'Base64-encoded AES-256-GCM ciphertext' },
            vectorClock: {
              type: 'object',
              additionalProperties: { type: 'number' },
              description: 'Vector clock for causality tracking'
            },
            isDeleted: { type: 'boolean', description: 'Whether this is a deletion tombstone' }
          }
        }
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        synced: { type: 'number', description: 'Number of operations synced' },
        conflicts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resourceType: { type: 'string' },
              resourceId: { type: 'string' },
              localClock: { type: 'object' },
              remoteClock: { type: 'object' },
              conflictId: { type: 'string' }
            }
          }
        },
        serverTimestamp: { type: 'string', format: 'date-time' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

const pullSchema = {
  description: 'Pull changes from sync server since a cursor',
  tags: ['Sync'],
  querystring: {
    type: 'object',
    required: ['deviceId', 'since'],
    properties: {
      deviceId: { type: 'string', description: 'Client device ID' },
      since: { type: 'string', format: 'date-time', description: 'Cursor timestamp from last pull' },
      resourceTypes: { type: 'string', description: 'Comma-separated resource types to filter' },
      limit: { type: 'number', minimum: 1, maximum: 5000, default: 1000 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resourceType: { type: 'string' },
              resourceId: { type: 'string' },
              encryptedData: { type: 'string', nullable: true, description: 'Base64-encoded ciphertext (null if deleted)' },
              vectorClock: { type: 'object' },
              isDeleted: { type: 'boolean' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        cursor: { type: 'string', format: 'date-time' },
        hasMore: { type: 'boolean' }
      }
    }
  }
}

const statusSchema = {
  description: 'Get sync status for the authenticated account',
  tags: ['Sync'],
  response: {
    200: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        deviceCount: { type: 'number' },
        deviceLimit: { type: 'number', nullable: true },
        lastSyncAt: { type: 'string', nullable: true },
        pendingConflicts: { type: 'number' },
        tier: { type: 'string', enum: ['free', 'premium'] }
      }
    }
  }
}

const devicesSchema = {
  description: 'List registered devices for the account',
  tags: ['Sync'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
          deviceName: { type: 'string', nullable: true },
          deviceType: { type: 'string' },
          lastSeenAt: { type: 'string', nullable: true },
          vectorClock: { type: 'object' }
        }
      }
    }
  }
}

const registerDeviceSchema = {
  description: 'Register a new device for sync',
  tags: ['Sync'],
  body: {
    type: 'object',
    required: ['deviceId', 'deviceName', 'deviceType'],
    properties: {
      deviceId: { type: 'string', description: 'Client-generated device UUID' },
      deviceName: { type: 'string', description: 'User-friendly device name' },
      deviceType: { type: 'string', enum: ['electron', 'browser', 'capacitor', 'server'] },
      osName: { type: 'string' },
      osVersion: { type: 'string' },
      appVersion: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        deviceName: { type: 'string' },
        deviceType: { type: 'string' },
        lastSeenAt: { type: 'string', nullable: true },
        vectorClock: { type: 'object' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

const unregisterDeviceSchema = {
  description: 'Unregister a device',
  tags: ['Sync'],
  params: {
    type: 'object',
    required: ['deviceId'],
    properties: {
      deviceId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
}

const conflictsSchema = {
  description: 'Get pending conflicts for manual resolution',
  tags: ['Sync'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          conflictId: { type: 'string' },
          resourceType: { type: 'string' },
          resourceId: { type: 'string' },
          localClock: { type: 'object' },
          remoteClock: { type: 'object' }
        }
      }
    }
  }
}

const resolveConflictSchema = {
  description: 'Resolve a sync conflict',
  tags: ['Sync'],
  params: {
    type: 'object',
    required: ['conflictId'],
    properties: {
      conflictId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['resolution'],
    properties: {
      resolution: { type: 'string', enum: ['local_wins', 'remote_wins', 'merged'] },
      mergedData: { type: 'string', description: 'Base64-encoded merged data (required for merged resolution)' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

interface PushBody {
  deviceId: string
  operations: Array<{
    resourceType: string
    resourceId: string
    encryptedData: string  // Base64
    vectorClock: VectorClockData
    isDeleted?: boolean
  }>
}

interface PullQuery {
  deviceId: string
  since: string
  resourceTypes?: string
  limit?: number
}

interface RegisterDeviceBody {
  deviceId: string
  deviceName: string
  deviceType: string
  osName?: string
  osVersion?: string
  appVersion?: string
}

interface ResolveConflictBody {
  resolution: 'local_wins' | 'remote_wins' | 'merged'
  mergedData?: string
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerSyncRoutes(fastify: FastifyInstance): Promise<void> {
  const syncService = getSyncService()

  // --------------------------------------------------------------------------
  // Push changes
  // --------------------------------------------------------------------------

  fastify.post<{ Body: PushBody }>('/sync/push', {
    schema: pushSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    const { deviceId, operations } = request.body

    // Convert base64 to Buffer
    const decodedOperations = operations.map(op => ({
      resourceType: op.resourceType,
      resourceId: op.resourceId,
      encryptedData: Buffer.from(op.encryptedData, 'base64'),
      vectorClock: op.vectorClock,
      isDeleted: op.isDeleted,
    }))

    const result = await syncService.push({
      accountId,
      deviceId,
      operations: decodedOperations,
    })

    return result
  })

  // --------------------------------------------------------------------------
  // Pull changes
  // --------------------------------------------------------------------------

  fastify.get<{ Querystring: PullQuery }>('/sync/pull', {
    schema: pullSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    const { deviceId, since, resourceTypes, limit } = request.query

    const result = await syncService.pull({
      accountId,
      deviceId,
      since,
      resourceTypes: resourceTypes?.split(',').map(t => t.trim()),
      limit,
    })

    // Convert Buffer to base64 for response
    return {
      ...result,
      changes: result.changes.map(change => ({
        ...change,
        encryptedData: change.encryptedData?.toString('base64') ?? null,
      })),
    }
  })

  // --------------------------------------------------------------------------
  // Sync status
  // --------------------------------------------------------------------------

  fastify.get('/sync/status', {
    schema: statusSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    return syncService.getStatus(accountId)
  })

  // --------------------------------------------------------------------------
  // List devices
  // --------------------------------------------------------------------------

  fastify.get('/sync/devices', {
    schema: devicesSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    return syncService.getDevices(accountId)
  })

  // --------------------------------------------------------------------------
  // Register device
  // --------------------------------------------------------------------------

  fastify.post<{ Body: RegisterDeviceBody }>('/sync/devices', {
    schema: registerDeviceSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    const { deviceId, deviceName, deviceType, osName, osVersion, appVersion } = request.body

    try {
      const device = await syncService.registerDevice(
        accountId,
        deviceId,
        deviceName,
        deviceType,
        { osName, osVersion, appVersion }
      )
      return device
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Device registration failed'

      // Check for device limit exceeded
      if (message.includes('DEVICE_LIMIT_EXCEEDED')) {
        return reply.status(400).send({
          error: 'DEVICE_LIMIT_EXCEEDED',
          message: 'Maximum device limit reached. Upgrade to premium for unlimited devices.'
        })
      }

      throw error
    }
  })

  // --------------------------------------------------------------------------
  // Unregister device
  // --------------------------------------------------------------------------

  fastify.delete<{ Params: { deviceId: string } }>('/sync/devices/:deviceId', {
    schema: unregisterDeviceSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    const { deviceId } = request.params
    const removed = await syncService.unregisterDevice(accountId, deviceId)

    return {
      success: removed,
      message: removed ? 'Device unregistered successfully' : 'Device not found'
    }
  })

  // --------------------------------------------------------------------------
  // Get conflicts
  // --------------------------------------------------------------------------

  fastify.get('/sync/conflicts', {
    schema: conflictsSchema,
    // @ts-expect-error - verifySyncToken is decorated by auth plugin
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Sync account authentication required'
      })
    }

    return syncService.getPendingConflicts(accountId)
  })

  // --------------------------------------------------------------------------
  // Resolve conflict
  // --------------------------------------------------------------------------

  fastify.post<{ Params: { conflictId: string }; Body: ResolveConflictBody }>(
    '/sync/conflicts/:conflictId/resolve',
    {
      schema: resolveConflictSchema,
      // @ts-expect-error - verifyToken is decorated by auth plugin
      preHandler: fastify.verifyToken
    },
    async (request, reply) => {
      const accountId = request.syncAccountId
      if (!accountId) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Sync account authentication required'
        })
      }

      const { conflictId } = request.params
      const { resolution, mergedData } = request.body

      await syncService.resolveConflict(
        accountId,
        conflictId,
        resolution,
        mergedData ? Buffer.from(mergedData, 'base64') : undefined
      )

      return {
        success: true,
        message: 'Conflict resolved successfully'
      }
    }
  )
}
