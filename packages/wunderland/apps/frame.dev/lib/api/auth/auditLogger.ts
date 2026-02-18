/**
 * API Token Audit Logger
 *
 * Provides logging functions for API token lifecycle and access events.
 * Integrates with the existing audit system at lib/audit/.
 *
 * @module lib/api/auth/auditLogger
 */

import { getDatabase } from '@/lib/codexDatabase'
import type { AuditLogEntry, AuditLogQueryOptions } from '@/lib/audit/types'

// ============================================================================
// TYPES
// ============================================================================

export type APIAuditActionName =
  | 'token_create'
  | 'token_validate'
  | 'token_revoke'
  | 'token_delete'
  | 'auth_fail'
  | 'rate_limit'

export interface APIAuditEvent {
  actionName: APIAuditActionName
  tokenId?: string
  profileId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface APIAuditEntry extends Omit<AuditLogEntry, 'actionType' | 'actionName'> {
  actionType: 'api'
  actionName: APIAuditActionName
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_ID = `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for an audit entry
 */
function generateId(): string {
  return `api_audit_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Mask a token for safe logging (show first 8 chars only)
 */
function maskTokenForLog(token?: string): string | undefined {
  if (!token) return undefined
  if (token.length <= 8) return '****'
  return `${token.slice(0, 8)}...`
}

/**
 * Log an API audit event
 */
export async function logAPIEvent(event: APIAuditEvent): Promise<string | null> {
  const db = await getDatabase()
  if (!db) {
    console.warn('[APIAudit] Database not available, skipping audit log')
    return null
  }

  const id = generateId()
  const now = new Date().toISOString()

  try {
    await db.run(
      `INSERT INTO codex_audit_log (
        id, timestamp, session_id, action_type, action_name,
        target_type, target_id, target_path, old_value, new_value,
        is_undoable, duration_ms, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        SESSION_ID,
        'api',
        event.actionName,
        'api_token',
        event.tokenId || null,
        event.endpoint || null,
        null, // old_value - not used for API events
        JSON.stringify({
          ip: event.ip,
          userAgent: event.userAgent,
          method: event.method,
          reason: event.reason,
          profileId: event.profileId,
          ...event.metadata
        }),
        0, // is_undoable - API events are not undoable
        null, // duration_ms
        'api'
      ]
    )

    console.log(`[APIAudit] Logged ${event.actionName} for token ${maskTokenForLog(event.tokenId)}`)
    return id
  } catch (error) {
    console.error('[APIAudit] Failed to log event:', error)
    return null
  }
}

// ============================================================================
// CONVENIENCE LOGGING FUNCTIONS
// ============================================================================

/**
 * Log token creation
 */
export async function logTokenCreated(
  tokenId: string,
  profileId: string,
  label: string,
  expiresAt?: string
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'token_create',
    tokenId,
    profileId,
    metadata: { label, expiresAt }
  })
}

/**
 * Log successful token validation (API access)
 */
export async function logTokenValidated(
  tokenId: string,
  profileId: string,
  request: {
    ip?: string
    userAgent?: string
    endpoint: string
    method: string
  }
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'token_validate',
    tokenId,
    profileId,
    ip: request.ip,
    userAgent: request.userAgent,
    endpoint: request.endpoint,
    method: request.method
  })
}

/**
 * Log authentication failure
 */
export async function logAuthFailed(
  reason: string,
  request: {
    ip?: string
    userAgent?: string
    endpoint: string
    method: string
    tokenPrefix?: string
  }
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'auth_fail',
    ip: request.ip,
    userAgent: request.userAgent,
    endpoint: request.endpoint,
    method: request.method,
    reason,
    metadata: { tokenPrefix: request.tokenPrefix }
  })
}

/**
 * Log token revocation
 */
export async function logTokenRevoked(
  tokenId: string,
  profileId: string,
  revokedBy?: string
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'token_revoke',
    tokenId,
    profileId,
    metadata: { revokedBy: revokedBy || profileId }
  })
}

/**
 * Log token deletion
 */
export async function logTokenDeleted(
  tokenId: string,
  profileId: string
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'token_delete',
    tokenId,
    profileId
  })
}

/**
 * Log rate limit event
 */
export async function logRateLimited(
  tokenId: string | undefined,
  request: {
    ip?: string
    userAgent?: string
    endpoint: string
    method: string
  }
): Promise<string | null> {
  return logAPIEvent({
    actionName: 'rate_limit',
    tokenId,
    ip: request.ip,
    userAgent: request.userAgent,
    endpoint: request.endpoint,
    method: request.method
  })
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get audit trail for a specific token
 */
export async function getTokenAuditTrail(
  tokenId: string,
  limit: number = 50
): Promise<APIAuditEntry[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM codex_audit_log
       WHERE action_type = 'api' AND target_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [tokenId, limit]
    ) as Array<{
      id: string
      timestamp: string
      session_id: string
      action_type: string
      action_name: string
      target_type: string
      target_id: string | null
      target_path: string | null
      old_value: string | null
      new_value: string | null
      is_undoable: number
      undo_group_id: string | null
      duration_ms: number | null
      source: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      sessionId: row.session_id,
      actionType: 'api' as const,
      actionName: row.action_name as APIAuditActionName,
      targetType: row.target_type as 'api_token',
      targetId: row.target_id || undefined,
      targetPath: row.target_path || undefined,
      oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      isUndoable: row.is_undoable === 1,
      undoGroupId: row.undo_group_id || undefined,
      durationMs: row.duration_ms || undefined,
      source: row.source as 'api'
    }))
  } catch (error) {
    console.error('[APIAudit] Failed to get token audit trail:', error)
    return []
  }
}

/**
 * Get all API audit events with optional filters
 */
export async function getAPIAuditEvents(
  options: Partial<AuditLogQueryOptions> & { actionName?: APIAuditActionName } = {}
): Promise<APIAuditEntry[]> {
  const db = await getDatabase()
  if (!db) return []

  const conditions: string[] = ["action_type = 'api'"]
  const params: unknown[] = []

  if (options.actionName) {
    conditions.push('action_name = ?')
    params.push(options.actionName)
  }

  if (options.targetType) {
    conditions.push('target_type = ?')
    params.push(options.targetType)
  }

  if (options.startTime) {
    conditions.push('timestamp >= ?')
    params.push(options.startTime)
  }

  if (options.endTime) {
    conditions.push('timestamp <= ?')
    params.push(options.endTime)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const orderBy = `ORDER BY timestamp ${options.order === 'asc' ? 'ASC' : 'DESC'}`
  const limit = options.limit ? `LIMIT ${options.limit}` : 'LIMIT 100'
  const offset = options.offset ? `OFFSET ${options.offset}` : ''

  try {
    const rows = await db.all(
      `SELECT * FROM codex_audit_log ${whereClause} ${orderBy} ${limit} ${offset}`,
      params
    ) as Array<{
      id: string
      timestamp: string
      session_id: string
      action_type: string
      action_name: string
      target_type: string
      target_id: string | null
      target_path: string | null
      old_value: string | null
      new_value: string | null
      is_undoable: number
      undo_group_id: string | null
      duration_ms: number | null
      source: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      sessionId: row.session_id,
      actionType: 'api' as const,
      actionName: row.action_name as APIAuditActionName,
      targetType: row.target_type as 'api_token',
      targetId: row.target_id || undefined,
      targetPath: row.target_path || undefined,
      oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      isUndoable: row.is_undoable === 1,
      undoGroupId: row.undo_group_id || undefined,
      durationMs: row.duration_ms || undefined,
      source: row.source as 'api'
    }))
  } catch (error) {
    console.error('[APIAudit] Failed to get API audit events:', error)
    return []
  }
}

/**
 * Get API audit statistics
 */
export async function getAPIAuditStats(): Promise<{
  totalEvents: number
  eventsByAction: Record<APIAuditActionName, number>
  recentFailures: number
  recentRateLimits: number
}> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalEvents: 0,
      eventsByAction: {
        token_create: 0,
        token_validate: 0,
        token_revoke: 0,
        token_delete: 0,
        auth_fail: 0,
        rate_limit: 0
      },
      recentFailures: 0,
      recentRateLimits: 0
    }
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [total, byAction, failures, rateLimits] = await Promise.all([
      db.all("SELECT COUNT(*) as count FROM codex_audit_log WHERE action_type = 'api'") as Promise<Array<{ count: number }>>,
      db.all(`
        SELECT action_name, COUNT(*) as count
        FROM codex_audit_log
        WHERE action_type = 'api'
        GROUP BY action_name
      `) as Promise<Array<{ action_name: string; count: number }>>,
      db.all(`
        SELECT COUNT(*) as count
        FROM codex_audit_log
        WHERE action_type = 'api' AND action_name = 'auth_fail' AND timestamp >= ?
      `, [oneDayAgo]) as Promise<Array<{ count: number }>>,
      db.all(`
        SELECT COUNT(*) as count
        FROM codex_audit_log
        WHERE action_type = 'api' AND action_name = 'rate_limit' AND timestamp >= ?
      `, [oneDayAgo]) as Promise<Array<{ count: number }>>
    ])

    const eventsByAction: Record<APIAuditActionName, number> = {
      token_create: 0,
      token_validate: 0,
      token_revoke: 0,
      token_delete: 0,
      auth_fail: 0,
      rate_limit: 0
    }

    for (const row of byAction || []) {
      if (row.action_name in eventsByAction) {
        eventsByAction[row.action_name as APIAuditActionName] = row.count
      }
    }

    return {
      totalEvents: total?.[0]?.count || 0,
      eventsByAction,
      recentFailures: failures?.[0]?.count || 0,
      recentRateLimits: rateLimits?.[0]?.count || 0
    }
  } catch (error) {
    console.error('[APIAudit] Failed to get stats:', error)
    return {
      totalEvents: 0,
      eventsByAction: {
        token_create: 0,
        token_validate: 0,
        token_revoke: 0,
        token_delete: 0,
        auth_fail: 0,
        rate_limit: 0
      },
      recentFailures: 0,
      recentRateLimits: 0
    }
  }
}
