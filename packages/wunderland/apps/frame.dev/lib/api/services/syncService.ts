/**
 * Sync Service
 *
 * Handles zero-knowledge sync operations for Quarry.
 * Server only stores encrypted blobs - never sees plaintext user data.
 *
 * @module lib/api/services/syncService
 */

import { Pool, PoolClient } from 'pg'
import {
  VectorClock,
  VectorClockData,
  compareClocks,
  type CausalRelation,
} from '@framers/sql-storage-adapter/sync'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncOperation {
  /** Type of resource being synced */
  resourceType: string
  /** Unique ID of the resource */
  resourceId: string
  /** Encrypted data (AES-256-GCM ciphertext) */
  encryptedData: Buffer
  /** Vector clock for causality tracking */
  vectorClock: VectorClockData
  /** Whether this is a deletion tombstone */
  isDeleted?: boolean
}

export interface SyncPushRequest {
  /** Account ID (from JWT) */
  accountId: string
  /** Device ID making the push */
  deviceId: string
  /** Operations to push */
  operations: SyncOperation[]
}

export interface SyncPushResult {
  /** Number of operations successfully synced */
  synced: number
  /** Operations that resulted in conflicts */
  conflicts: ConflictInfo[]
  /** Server timestamp for cursor */
  serverTimestamp: string
}

export interface ConflictInfo {
  resourceType: string
  resourceId: string
  localClock: VectorClockData
  remoteClock: VectorClockData
  /** ID of conflict record for manual resolution */
  conflictId: string
}

export interface SyncPullRequest {
  /** Account ID (from JWT) */
  accountId: string
  /** Device ID making the pull */
  deviceId: string
  /** Cursor - ISO timestamp of last successful pull */
  since: string
  /** Optional filter by resource types */
  resourceTypes?: string[]
  /** Max records to return (default 1000) */
  limit?: number
}

export interface SyncPullResult {
  /** Changed resources since cursor */
  changes: SyncChange[]
  /** New cursor for next pull */
  cursor: string
  /** Whether there are more changes */
  hasMore: boolean
}

export interface SyncChange {
  resourceType: string
  resourceId: string
  encryptedData: Buffer | null
  vectorClock: VectorClockData
  isDeleted: boolean
  updatedAt: string
}

export interface SyncStatus {
  /** Account ID */
  accountId: string
  /** Number of registered devices */
  deviceCount: number
  /** Device limit (null = unlimited) */
  deviceLimit: number | null
  /** Last sync timestamp */
  lastSyncAt: string | null
  /** Pending conflicts requiring resolution */
  pendingConflicts: number
  /** Account tier */
  tier: 'free' | 'premium'
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string | null
  deviceType: string
  lastSeenAt: string | null
  vectorClock: VectorClockData
}

// ============================================================================
// SYNC SERVICE
// ============================================================================

export class SyncService {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }

  // ==========================================================================
  // PUSH OPERATIONS
  // ==========================================================================

  /**
   * Push changes from client to server.
   * Handles conflict detection using vector clocks.
   */
  async push(request: SyncPushRequest): Promise<SyncPushResult> {
    const { accountId, deviceId, operations } = request
    const conflicts: ConflictInfo[] = []
    let synced = 0

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      for (const op of operations) {
        const result = await this.pushOperation(client, accountId, deviceId, op)

        if (result.conflict) {
          conflicts.push(result.conflict)
        } else {
          synced++
        }
      }

      // Update activity timestamps
      await this.touchSyncActivity(client, accountId, deviceId)

      await client.query('COMMIT')

      return {
        synced,
        conflicts,
        serverTimestamp: new Date().toISOString(),
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Push a single operation, detecting conflicts.
   */
  private async pushOperation(
    client: PoolClient,
    accountId: string,
    deviceId: string,
    op: SyncOperation
  ): Promise<{ conflict?: ConflictInfo }> {
    const { resourceType, resourceId, encryptedData, vectorClock, isDeleted } = op

    // Get existing record if any
    const existing = await client.query<{
      encrypted_data: Buffer
      vector_clock: VectorClockData
    }>(
      `SELECT encrypted_data, vector_clock
       FROM sync_data
       WHERE account_id = $1 AND resource_type = $2 AND resource_id = $3`,
      [accountId, resourceType, resourceId]
    )

    if (existing.rows.length === 0) {
      // No existing record - simple insert
      await client.query(
        `INSERT INTO sync_data (account_id, device_id, resource_type, resource_id, encrypted_data, vector_clock, is_deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [accountId, deviceId, resourceType, resourceId, encryptedData, vectorClock, isDeleted ?? false]
      )

      await this.logSyncOperation(client, accountId, deviceId, resourceType, resourceId, 'INSERT', vectorClock, encryptedData.length)

      return {}
    }

    // Check for conflicts using vector clocks
    const existingClock = existing.rows[0].vector_clock
    const relation = compareClocks(vectorClock, existingClock)

    if (relation === 'concurrent') {
      // Conflict detected - store for resolution
      const conflictResult = await client.query<{ id: string }>(
        `INSERT INTO sync_conflicts (
           account_id, resource_type, resource_id,
           local_data, remote_data,
           local_clock, remote_clock,
           local_device_id, remote_device_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          accountId, resourceType, resourceId,
          encryptedData, existing.rows[0].encrypted_data,
          vectorClock, existingClock,
          deviceId, 'server'  // remote is current server state
        ]
      )

      return {
        conflict: {
          resourceType,
          resourceId,
          localClock: vectorClock,
          remoteClock: existingClock,
          conflictId: conflictResult.rows[0].id,
        },
      }
    }

    if (relation === 'after' || relation === 'equal') {
      // Client has newer or equal version - update
      await client.query(
        `UPDATE sync_data
         SET encrypted_data = $1, vector_clock = $2, device_id = $3, is_deleted = $4, updated_at = NOW()
         WHERE account_id = $5 AND resource_type = $6 AND resource_id = $7`,
        [encryptedData, vectorClock, deviceId, isDeleted ?? false, accountId, resourceType, resourceId]
      )

      await this.logSyncOperation(client, accountId, deviceId, resourceType, resourceId, 'UPDATE', vectorClock, encryptedData.length)

      return {}
    }

    // relation === 'before' - client has older version, ignore (will get updated on pull)
    return {}
  }

  // ==========================================================================
  // PULL OPERATIONS
  // ==========================================================================

  /**
   * Pull changes from server since a cursor.
   */
  async pull(request: SyncPullRequest): Promise<SyncPullResult> {
    const { accountId, deviceId, since, resourceTypes, limit = 1000 } = request

    const client = await this.pool.connect()

    try {
      // Build query with optional resource type filter
      let query = `
        SELECT resource_type, resource_id, encrypted_data, vector_clock, is_deleted, updated_at
        FROM sync_data
        WHERE account_id = $1 AND updated_at > $2
      `
      const params: (string | string[] | number)[] = [accountId, since]

      if (resourceTypes && resourceTypes.length > 0) {
        query += ` AND resource_type = ANY($3)`
        params.push(resourceTypes)
      }

      query += ` ORDER BY updated_at ASC LIMIT $${params.length + 1}`
      params.push(limit + 1)  // Fetch one extra to check hasMore

      const result = await client.query<{
        resource_type: string
        resource_id: string
        encrypted_data: Buffer
        vector_clock: VectorClockData
        is_deleted: boolean
        updated_at: Date
      }>(query, params)

      const hasMore = result.rows.length > limit
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows

      const changes: SyncChange[] = rows.map(row => ({
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        encryptedData: row.is_deleted ? null : row.encrypted_data,
        vectorClock: row.vector_clock,
        isDeleted: row.is_deleted,
        updatedAt: row.updated_at.toISOString(),
      }))

      // Update activity timestamps
      await this.touchSyncActivity(client, accountId, deviceId)

      // New cursor is the latest updated_at
      const cursor = rows.length > 0
        ? rows[rows.length - 1].updated_at.toISOString()
        : since

      return {
        changes,
        cursor,
        hasMore,
      }
    } finally {
      client.release()
    }
  }

  // ==========================================================================
  // STATUS & DEVICES
  // ==========================================================================

  /**
   * Get sync status for an account.
   */
  async getStatus(accountId: string): Promise<SyncStatus> {
    const client = await this.pool.connect()

    try {
      // Get account info
      const accountResult = await client.query<{
        tier: 'free' | 'premium'
        device_limit: number | null
        last_sync_at: Date | null
      }>(
        `SELECT tier, device_limit, last_sync_at FROM sync_accounts WHERE id = $1`,
        [accountId]
      )

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found')
      }

      const account = accountResult.rows[0]

      // Get device count
      const deviceResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM sync_devices WHERE account_id = $1`,
        [accountId]
      )

      // Get pending conflicts
      const conflictResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM sync_conflicts WHERE account_id = $1 AND status = 'pending'`,
        [accountId]
      )

      return {
        accountId,
        deviceCount: parseInt(deviceResult.rows[0].count),
        deviceLimit: account.device_limit,
        lastSyncAt: account.last_sync_at?.toISOString() ?? null,
        pendingConflicts: parseInt(conflictResult.rows[0].count),
        tier: account.tier,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Get registered devices for an account.
   */
  async getDevices(accountId: string): Promise<DeviceInfo[]> {
    const result = await this.pool.query<{
      device_id: string
      device_name: string | null
      device_type: string
      last_seen_at: Date | null
      vector_clock: VectorClockData
    }>(
      `SELECT device_id, device_name, device_type, last_seen_at, vector_clock
       FROM sync_devices
       WHERE account_id = $1
       ORDER BY last_seen_at DESC NULLS LAST`,
      [accountId]
    )

    return result.rows.map(row => ({
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      lastSeenAt: row.last_seen_at?.toISOString() ?? null,
      vectorClock: row.vector_clock,
    }))
  }

  /**
   * Register a new device.
   * Device limit is enforced by database trigger.
   */
  async registerDevice(
    accountId: string,
    deviceId: string,
    deviceName: string,
    deviceType: string,
    metadata?: { osName?: string; osVersion?: string; appVersion?: string }
  ): Promise<DeviceInfo> {
    const result = await this.pool.query<{
      device_id: string
      device_name: string
      device_type: string
      last_seen_at: Date | null
      vector_clock: VectorClockData
    }>(
      `INSERT INTO sync_devices (account_id, device_id, device_name, device_type, os_name, os_version, app_version, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (account_id, device_id) DO UPDATE SET
         device_name = EXCLUDED.device_name,
         device_type = EXCLUDED.device_type,
         os_name = EXCLUDED.os_name,
         os_version = EXCLUDED.os_version,
         app_version = EXCLUDED.app_version,
         last_seen_at = NOW()
       RETURNING device_id, device_name, device_type, last_seen_at, vector_clock`,
      [accountId, deviceId, deviceName, deviceType, metadata?.osName, metadata?.osVersion, metadata?.appVersion]
    )

    const row = result.rows[0]
    return {
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      lastSeenAt: row.last_seen_at?.toISOString() ?? null,
      vectorClock: row.vector_clock,
    }
  }

  /**
   * Unregister a device.
   */
  async unregisterDevice(accountId: string, deviceId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM sync_devices WHERE account_id = $1 AND device_id = $2`,
      [accountId, deviceId]
    )
    return result.rowCount !== null && result.rowCount > 0
  }

  // ==========================================================================
  // CONFLICTS
  // ==========================================================================

  /**
   * Get pending conflicts for an account.
   */
  async getPendingConflicts(accountId: string): Promise<ConflictInfo[]> {
    const result = await this.pool.query<{
      id: string
      resource_type: string
      resource_id: string
      local_clock: VectorClockData
      remote_clock: VectorClockData
    }>(
      `SELECT id, resource_type, resource_id, local_clock, remote_clock
       FROM sync_conflicts
       WHERE account_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
      [accountId]
    )

    return result.rows.map(row => ({
      conflictId: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      localClock: row.local_clock,
      remoteClock: row.remote_clock,
    }))
  }

  /**
   * Resolve a conflict.
   */
  async resolveConflict(
    accountId: string,
    conflictId: string,
    resolution: 'local_wins' | 'remote_wins' | 'merged',
    mergedData?: Buffer
  ): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Get conflict details
      const conflictResult = await client.query<{
        resource_type: string
        resource_id: string
        local_data: Buffer
        remote_data: Buffer
        local_clock: VectorClockData
        remote_clock: VectorClockData
      }>(
        `SELECT resource_type, resource_id, local_data, remote_data, local_clock, remote_clock
         FROM sync_conflicts
         WHERE id = $1 AND account_id = $2 AND status = 'pending'`,
        [conflictId, accountId]
      )

      if (conflictResult.rows.length === 0) {
        throw new Error('Conflict not found or already resolved')
      }

      const conflict = conflictResult.rows[0]

      // Determine final data and clock
      let finalData: Buffer
      let finalClock: VectorClockData

      switch (resolution) {
        case 'local_wins':
          finalData = conflict.local_data
          finalClock = conflict.local_clock
          break
        case 'remote_wins':
          finalData = conflict.remote_data
          finalClock = conflict.remote_clock
          break
        case 'merged':
          if (!mergedData) {
            throw new Error('Merged data required for merge resolution')
          }
          finalData = mergedData
          // Merge clocks for merged resolution
          finalClock = this.mergeClocks(conflict.local_clock, conflict.remote_clock)
          break
      }

      // Update sync_data with resolved version
      await client.query(
        `UPDATE sync_data
         SET encrypted_data = $1, vector_clock = $2, updated_at = NOW()
         WHERE account_id = $3 AND resource_type = $4 AND resource_id = $5`,
        [finalData, finalClock, accountId, conflict.resource_type, conflict.resource_id]
      )

      // Mark conflict as resolved
      await client.query(
        `UPDATE sync_conflicts
         SET status = 'resolved', resolution = $1, resolved_data = $2, resolved_at = NOW()
         WHERE id = $3`,
        [resolution, finalData, conflictId]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Update activity timestamps for account and device.
   */
  private async touchSyncActivity(client: PoolClient, accountId: string, deviceId: string): Promise<void> {
    await client.query(
      `UPDATE sync_accounts SET last_sync_at = NOW() WHERE id = $1`,
      [accountId]
    )
    await client.query(
      `UPDATE sync_devices SET last_seen_at = NOW() WHERE account_id = $1 AND device_id = $2`,
      [accountId, deviceId]
    )
  }

  /**
   * Log a sync operation.
   */
  private async logSyncOperation(
    client: PoolClient,
    accountId: string,
    deviceId: string,
    resourceType: string,
    resourceId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    vectorClock: VectorClockData,
    bytesSize: number
  ): Promise<void> {
    await client.query(
      `INSERT INTO sync_log (account_id, device_id, resource_type, resource_id, operation, vector_clock, bytes_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [accountId, deviceId, resourceType, resourceId, operation, vectorClock, bytesSize]
    )
  }

  /**
   * Merge two vector clocks (take max of each device counter).
   */
  private mergeClocks(a: VectorClockData, b: VectorClockData): VectorClockData {
    const result: VectorClockData = { ...a }
    for (const [device, value] of Object.entries(b)) {
      result[device] = Math.max(result[device] ?? 0, value)
    }
    return result
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Initialize database tables.
   */
  async initialize(): Promise<void> {
    // Tables are created via migration/SQL file
    // This method can run health checks
    await this.pool.query('SELECT 1')
  }

  /**
   * Close database connections.
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let syncServiceInstance: SyncService | null = null

/**
 * Get or create the sync service singleton.
 */
export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.SYNC_DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL or SYNC_DATABASE_URL environment variable required')
    }
    syncServiceInstance = new SyncService(connectionString)
  }
  return syncServiceInstance
}

/**
 * Close the sync service (for graceful shutdown).
 */
export async function closeSyncService(): Promise<void> {
  if (syncServiceInstance) {
    await syncServiceInstance.close()
    syncServiceInstance = null
  }
}
