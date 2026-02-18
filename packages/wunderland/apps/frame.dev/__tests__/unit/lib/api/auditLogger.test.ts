/**
 * API Audit Logger Tests
 *
 * Tests for the API token audit logging functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions using vi.hoisted so they're available to vi.mock
const { mockRun, mockAll, mockGetDatabase } = vi.hoisted(() => {
  const mockRun = vi.fn()
  const mockAll = vi.fn()
  const mockGetDatabase = vi.fn()
  return { mockRun, mockAll, mockGetDatabase }
})

vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: mockGetDatabase
}))

// Import after mocking
import {
  logTokenCreated,
  logTokenValidated,
  logAuthFailed,
  logTokenRevoked,
  logTokenDeleted,
  logRateLimited,
  getTokenAuditTrail,
  getAPIAuditEvents,
  getAPIAuditStats
} from '@/lib/api/auth/auditLogger'

describe('API Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockRun.mockResolvedValue(undefined)
    mockAll.mockResolvedValue([])
    mockGetDatabase.mockResolvedValue({
      run: mockRun,
      all: mockAll
    })
  })

  describe('logAPIEvent', () => {
    it('should log token creation events', async () => {
      const result = await logTokenCreated('token-123', 'profile-456', 'Test Token', '2025-12-31T00:00:00Z')

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[0]).toContain('INSERT INTO codex_audit_log')
      expect(callArgs[1]).toContain('api') // action_type
      expect(callArgs[1]).toContain('token_create') // action_name
      expect(callArgs[1]).toContain('token-123') // target_id
    })

    it('should log token validation events with request metadata', async () => {
      const result = await logTokenValidated('token-123', 'profile-456', {
        ip: '192.168.1.1',
        userAgent: 'TestClient/1.0',
        endpoint: '/api/v1/strands',
        method: 'GET'
      })

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[1]).toContain('token_validate')

      // Check metadata in newValue
      const newValueJson = callArgs[1][9]
      const newValue = JSON.parse(newValueJson)
      expect(newValue.ip).toBe('192.168.1.1')
      expect(newValue.userAgent).toBe('TestClient/1.0')
      expect(newValue.method).toBe('GET')
    })

    it('should log auth failure events with masked token prefix', async () => {
      const result = await logAuthFailed('Invalid token', {
        ip: '10.0.0.1',
        userAgent: 'BadClient/1.0',
        endpoint: '/api/v1/tokens',
        method: 'POST',
        tokenPrefix: 'fdev_abc'
      })

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[1]).toContain('auth_fail')

      const newValueJson = callArgs[1][9]
      const newValue = JSON.parse(newValueJson)
      expect(newValue.reason).toBe('Invalid token')
      expect(newValue.tokenPrefix).toBe('fdev_abc')
    })

    it('should log token revocation events', async () => {
      const result = await logTokenRevoked('token-123', 'profile-456', 'admin-user')

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[1]).toContain('token_revoke')
      expect(callArgs[1]).toContain('token-123')
    })

    it('should log token deletion events', async () => {
      const result = await logTokenDeleted('token-123', 'profile-456')

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[1]).toContain('token_delete')
    })

    it('should log rate limit events', async () => {
      const result = await logRateLimited('token-123', {
        ip: '192.168.1.100',
        userAgent: 'SpamClient/1.0',
        endpoint: '/api/v1/search',
        method: 'GET'
      })

      expect(result).toBeTruthy()
      expect(mockRun).toHaveBeenCalledTimes(1)

      const callArgs = mockRun.mock.calls[0]
      expect(callArgs[1]).toContain('rate_limit')
    })
  })

  describe('getTokenAuditTrail', () => {
    it('should return audit events for specific token', async () => {
      mockAll.mockResolvedValueOnce([
        {
          id: 'audit-1',
          timestamp: '2025-01-01T00:00:00Z',
          session_id: 'session-1',
          action_type: 'api',
          action_name: 'token_validate',
          target_type: 'api_token',
          target_id: 'token-123',
          target_path: '/api/v1/strands',
          old_value: null,
          new_value: JSON.stringify({ ip: '127.0.0.1', method: 'GET' }),
          is_undoable: 0,
          undo_group_id: null,
          duration_ms: null,
          source: 'api'
        }
      ])

      const result = await getTokenAuditTrail('token-123', 50)

      expect(result).toHaveLength(1)
      expect(result[0].actionName).toBe('token_validate')
      expect(result[0].targetId).toBe('token-123')
      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining("WHERE action_type = 'api' AND target_id = ?"),
        ['token-123', 50]
      )
    })

    it('should respect limit parameter', async () => {
      mockAll.mockResolvedValueOnce([])

      await getTokenAuditTrail('token-123', 10)

      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['token-123', 10]
      )
    })

    it('should order by timestamp descending', async () => {
      mockAll.mockResolvedValueOnce([])

      await getTokenAuditTrail('token-123')

      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        expect.any(Array)
      )
    })
  })

  describe('getAPIAuditEvents', () => {
    it('should filter by action name', async () => {
      mockAll.mockResolvedValueOnce([])

      await getAPIAuditEvents({ actionName: 'auth_fail' })

      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('action_name = ?'),
        expect.arrayContaining(['auth_fail'])
      )
    })

    it('should filter by date range', async () => {
      mockAll.mockResolvedValueOnce([])

      await getAPIAuditEvents({
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-31T23:59:59Z'
      })

      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= ?'),
        expect.arrayContaining(['2025-01-01T00:00:00Z'])
      )
      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('timestamp <= ?'),
        expect.arrayContaining(['2025-01-31T23:59:59Z'])
      )
    })

    it('should paginate results', async () => {
      mockAll.mockResolvedValueOnce([])

      await getAPIAuditEvents({ limit: 20, offset: 40 })

      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 20'),
        expect.any(Array)
      )
      expect(mockAll).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 40'),
        expect.any(Array)
      )
    })
  })

  describe('getAPIAuditStats', () => {
    it('should return aggregated statistics', async () => {
      // Mock all the parallel queries in order
      mockAll
        .mockResolvedValueOnce([{ count: 100 }]) // total
        .mockResolvedValueOnce([
          { action_name: 'token_create', count: 10 },
          { action_name: 'token_validate', count: 80 },
          { action_name: 'auth_fail', count: 5 },
          { action_name: 'rate_limit', count: 5 }
        ]) // byAction
        .mockResolvedValueOnce([{ count: 5 }]) // failures
        .mockResolvedValueOnce([{ count: 3 }]) // rateLimits

      const stats = await getAPIAuditStats()

      expect(stats.totalEvents).toBe(100)
      expect(stats.eventsByAction.token_create).toBe(10)
      expect(stats.eventsByAction.token_validate).toBe(80)
      expect(stats.recentFailures).toBe(5)
      expect(stats.recentRateLimits).toBe(3)
    })

    it('should handle empty database gracefully', async () => {
      mockAll
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])

      const stats = await getAPIAuditStats()

      expect(stats.totalEvents).toBe(0)
      expect(stats.eventsByAction.token_create).toBe(0)
      expect(stats.recentFailures).toBe(0)
      expect(stats.recentRateLimits).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle database returning null', async () => {
      mockGetDatabase.mockResolvedValueOnce(null)

      const result = await logTokenCreated('token-123', 'profile-456', 'Test Token')
      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      mockRun.mockRejectedValueOnce(new Error('Database error'))

      const result = await logTokenCreated('token-123', 'profile-456', 'Test Token')
      expect(result).toBeNull()
    })

    it('should return empty array when database is not available for queries', async () => {
      mockGetDatabase.mockResolvedValueOnce(null)

      const result = await getTokenAuditTrail('token-123')
      expect(result).toEqual([])
    })

    it('should return default stats when database is not available', async () => {
      mockGetDatabase.mockResolvedValueOnce(null)

      const stats = await getAPIAuditStats()
      expect(stats.totalEvents).toBe(0)
      expect(stats.eventsByAction.token_create).toBe(0)
      expect(stats.recentFailures).toBe(0)
      expect(stats.recentRateLimits).toBe(0)
    })
  })
})
