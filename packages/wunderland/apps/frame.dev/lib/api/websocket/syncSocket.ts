/**
 * Sync WebSocket Handler
 *
 * Real-time bidirectional sync via WebSocket.
 * Complements the REST API for low-latency sync operations.
 *
 * @module lib/api/websocket/syncSocket
 */

import { FastifyInstance, FastifyRequest } from 'fastify'
import { WebSocket } from 'ws'
import { getSyncService, SyncOperation } from '../services/syncService'
import { getDeviceAuthService, JWTPayload } from '../services/deviceAuthService'
import type { VectorClockData } from '@framers/sql-storage-adapter/sync'

// ============================================================================
// TYPES
// ============================================================================

/** Message types for sync protocol */
type SyncMessageType =
  | 'auth'
  | 'auth_success'
  | 'auth_error'
  | 'push'
  | 'push_ack'
  | 'pull'
  | 'pull_response'
  | 'change'
  | 'ping'
  | 'pong'
  | 'error'

interface SyncMessage {
  type: SyncMessageType
  id?: string  // Message ID for request/response correlation
  payload?: unknown
}

interface AuthMessage extends SyncMessage {
  type: 'auth'
  payload: {
    token: string
    deviceId: string
  }
}

interface PushMessage extends SyncMessage {
  type: 'push'
  payload: {
    deviceId: string
    operations: Array<{
      resourceType: string
      resourceId: string
      encryptedData: string  // Base64
      vectorClock: VectorClockData
      isDeleted?: boolean
    }>
  }
}

interface PullMessage extends SyncMessage {
  type: 'pull'
  payload: {
    deviceId: string
    since: string
    resourceTypes?: string[]
    limit?: number
  }
}

/** Connected client state */
interface ClientState {
  accountId: string | null
  deviceId: string | null
  authenticated: boolean
  lastPing: number
}

// ============================================================================
// WEBSOCKET HANDLER
// ============================================================================

/**
 * Register WebSocket routes for real-time sync.
 */
export async function registerSyncWebSocket(fastify: FastifyInstance): Promise<void> {
  const syncService = getSyncService()
  const authService = getDeviceAuthService()

  // Track connected clients for broadcasting
  const clients = new Map<WebSocket, ClientState>()

  // Heartbeat interval (30 seconds)
  const HEARTBEAT_INTERVAL = 30000
  const HEARTBEAT_TIMEOUT = 60000

  // Start heartbeat checker
  const heartbeatInterval = setInterval(() => {
    const now = Date.now()
    clients.forEach((state, ws) => {
      if (now - state.lastPing > HEARTBEAT_TIMEOUT) {
        fastify.log.info({ deviceId: state.deviceId }, 'WebSocket heartbeat timeout, closing')
        ws.terminate()
        clients.delete(ws)
      }
    })
  }, HEARTBEAT_INTERVAL)

  // Clean up on server close
  fastify.addHook('onClose', () => {
    clearInterval(heartbeatInterval)
    clients.forEach((_, ws) => ws.terminate())
    clients.clear()
  })

  // WebSocket route
  fastify.get('/sync', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const clientState: ClientState = {
      accountId: null,
      deviceId: null,
      authenticated: false,
      lastPing: Date.now(),
    }
    clients.set(socket, clientState)

    fastify.log.info({ ip: request.ip }, 'WebSocket client connected')

    // Message handler
    socket.on('message', async (data: Buffer | string) => {
      try {
        const message: SyncMessage = JSON.parse(data.toString())
        clientState.lastPing = Date.now()

        switch (message.type) {
          case 'auth':
            await handleAuth(socket, clientState, message as AuthMessage)
            break

          case 'push':
            await handlePush(socket, clientState, message as PushMessage)
            break

          case 'pull':
            await handlePull(socket, clientState, message as PullMessage)
            break

          case 'ping':
            sendMessage(socket, { type: 'pong', id: message.id })
            break

          default:
            sendError(socket, message.id, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Message parsing failed'
        fastify.log.error({ error }, 'WebSocket message error')
        sendError(socket, undefined, 'PARSE_ERROR', errorMessage)
      }
    })

    // Close handler
    socket.on('close', () => {
      fastify.log.info({ deviceId: clientState.deviceId }, 'WebSocket client disconnected')
      clients.delete(socket)
    })

    // Error handler
    socket.on('error', (error) => {
      fastify.log.error({ error, deviceId: clientState.deviceId }, 'WebSocket error')
    })
  })

  // --------------------------------------------------------------------------
  // MESSAGE HANDLERS
  // --------------------------------------------------------------------------

  async function handleAuth(
    socket: WebSocket,
    state: ClientState,
    message: AuthMessage
  ): Promise<void> {
    try {
      const { token, deviceId } = message.payload

      // Verify JWT
      const payload = authService.verifyToken(token)

      state.accountId = payload.sub
      state.deviceId = deviceId
      state.authenticated = true

      fastify.log.info({ accountId: payload.sub, deviceId }, 'WebSocket authenticated')

      sendMessage(socket, {
        type: 'auth_success',
        id: message.id,
        payload: {
          accountId: payload.sub,
          deviceId,
          tier: payload.tier,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      fastify.log.warn({ error }, 'WebSocket auth failed')

      sendMessage(socket, {
        type: 'auth_error',
        id: message.id,
        payload: { error: errorMessage },
      })

      // Close socket after auth failure
      setTimeout(() => socket.close(4001, 'Authentication failed'), 100)
    }
  }

  async function handlePush(
    socket: WebSocket,
    state: ClientState,
    message: PushMessage
  ): Promise<void> {
    if (!state.authenticated || !state.accountId) {
      sendError(socket, message.id, 'UNAUTHORIZED', 'Authentication required')
      return
    }

    try {
      const { deviceId, operations } = message.payload

      // Convert base64 to Buffer
      const decodedOperations: SyncOperation[] = operations.map(op => ({
        resourceType: op.resourceType,
        resourceId: op.resourceId,
        encryptedData: Buffer.from(op.encryptedData, 'base64'),
        vectorClock: op.vectorClock,
        isDeleted: op.isDeleted,
      }))

      const result = await syncService.push({
        accountId: state.accountId,
        deviceId,
        operations: decodedOperations,
      })

      // Send ack to sender
      sendMessage(socket, {
        type: 'push_ack',
        id: message.id,
        payload: result,
      })

      // Broadcast changes to other devices of same account
      if (result.synced > 0) {
        broadcastToAccount(state.accountId, deviceId, operations)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push failed'
      fastify.log.error({ error, accountId: state.accountId }, 'WebSocket push error')
      sendError(socket, message.id, 'PUSH_ERROR', errorMessage)
    }
  }

  async function handlePull(
    socket: WebSocket,
    state: ClientState,
    message: PullMessage
  ): Promise<void> {
    if (!state.authenticated || !state.accountId) {
      sendError(socket, message.id, 'UNAUTHORIZED', 'Authentication required')
      return
    }

    try {
      const { deviceId, since, resourceTypes, limit } = message.payload

      const result = await syncService.pull({
        accountId: state.accountId,
        deviceId,
        since,
        resourceTypes,
        limit,
      })

      // Convert Buffer to base64 for response
      const changes = result.changes.map(change => ({
        ...change,
        encryptedData: change.encryptedData?.toString('base64') ?? null,
      }))

      sendMessage(socket, {
        type: 'pull_response',
        id: message.id,
        payload: {
          changes,
          cursor: result.cursor,
          hasMore: result.hasMore,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Pull failed'
      fastify.log.error({ error, accountId: state.accountId }, 'WebSocket pull error')
      sendError(socket, message.id, 'PULL_ERROR', errorMessage)
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  function sendMessage(socket: WebSocket, message: SyncMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  function sendError(
    socket: WebSocket,
    messageId: string | undefined,
    code: string,
    message: string
  ): void {
    sendMessage(socket, {
      type: 'error',
      id: messageId,
      payload: { code, message },
    })
  }

  /**
   * Broadcast changes to all connected devices of the same account
   * (excluding the sender device).
   */
  function broadcastToAccount(
    accountId: string,
    senderDeviceId: string,
    operations: PushMessage['payload']['operations']
  ): void {
    clients.forEach((state, socket) => {
      if (
        state.authenticated &&
        state.accountId === accountId &&
        state.deviceId !== senderDeviceId &&
        socket.readyState === WebSocket.OPEN
      ) {
        sendMessage(socket, {
          type: 'change',
          payload: {
            operations,
            fromDevice: senderDeviceId,
          },
        })
      }
    })
  }
}
