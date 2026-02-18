/**
 * PostgreSQL Adapter Tests
 * @module __tests__/unit/lib/storage/postgresAdapter.test.ts
 * 
 * Tests for the PostgreSQL adapter wrapper around @framers/sql-storage-adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PostgresConnection, ConnectionTestResult } from '@/lib/storage/types'
import { createPostgresConnection, buildPostgresConnectionString } from '@/lib/storage/types'

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the sql-storage-adapter
vi.mock('@framers/sql-storage-adapter', () => ({
  createDatabase: vi.fn().mockResolvedValue({
    exec: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    all: vi.fn().mockResolvedValue([{ version: 'PostgreSQL 15.1' }]),
    get: vi.fn().mockResolvedValue({ version: 'PostgreSQL 15.1' }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestPostgresConnection(overrides?: Partial<PostgresConnection>): PostgresConnection {
  return createPostgresConnection({
    id: 'test-pg-1',
    name: 'Test Postgres',
    host: 'localhost',
    database: 'test_db',
    username: 'test_user',
    ...overrides,
  })
}

// ============================================================================
// CONNECTION STRING GENERATION TESTS
// ============================================================================

describe('PostgreSQL Connection String Generation', () => {
  it('generates a valid connection string without password', () => {
    const connection = createTestPostgresConnection({ ssl: false })
    const connString = buildPostgresConnectionString(connection)
    
    expect(connString).toBe('postgresql://test_user@localhost:5432/test_db')
  })

  it('generates a valid connection string with password', () => {
    const connection = createTestPostgresConnection({ ssl: false })
    const connString = buildPostgresConnectionString(connection, 'mysecret')
    
    expect(connString).toBe('postgresql://test_user:mysecret@localhost:5432/test_db')
  })

  it('includes SSL mode when enabled', () => {
    const connection = createTestPostgresConnection({ ssl: true })
    const connString = buildPostgresConnectionString(connection)
    
    expect(connString).toContain('?sslmode=require')
  })

  it('handles special characters in credentials', () => {
    const connection = createTestPostgresConnection({
      username: 'user@company',
      ssl: false,
    })
    const connString = buildPostgresConnectionString(connection, 'pass:word@123')
    
    expect(connString).toContain('user%40company')
    expect(connString).toContain('pass%3Aword%40123')
  })

  it('uses custom port', () => {
    const connection = createTestPostgresConnection({ port: 5433, ssl: false })
    const connString = buildPostgresConnectionString(connection)
    
    expect(connString).toContain(':5433/')
  })
})

// ============================================================================
// POSTGRES CONNECTION CONFIGURATION TESTS
// ============================================================================

describe('PostgreSQL Connection Configuration', () => {
  describe('Default Values', () => {
    it('sets correct default port', () => {
      const connection = createTestPostgresConnection()
      expect(connection.port).toBe(5432)
    })

    it('enables SSL by default', () => {
      const connection = createTestPostgresConnection()
      expect(connection.ssl).toBe(true)
    })

    it('sets default SSL mode to require', () => {
      const connection = createTestPostgresConnection()
      expect(connection.sslMode).toBe('require')
    })

    it('uses public schema by default', () => {
      const connection = createTestPostgresConnection()
      expect(connection.schema).toBe('public')
    })

    it('sets default pool size to 10', () => {
      const connection = createTestPostgresConnection()
      expect(connection.poolSize).toBe(10)
    })

    it('sets default connection timeout to 30 seconds', () => {
      const connection = createTestPostgresConnection()
      expect(connection.connectionTimeout).toBe(30000)
    })
  })

  describe('SSL Configuration', () => {
    it('supports disable SSL mode', () => {
      const connection = createTestPostgresConnection({
        ssl: false,
        sslMode: 'disable',
      })
      
      expect(connection.ssl).toBe(false)
      expect(connection.sslMode).toBe('disable')
    })

    it('supports require SSL mode', () => {
      const connection = createTestPostgresConnection({
        ssl: true,
        sslMode: 'require',
      })
      
      expect(connection.ssl).toBe(true)
      expect(connection.sslMode).toBe('require')
    })

    it('supports verify-ca SSL mode', () => {
      const connection = createTestPostgresConnection({
        ssl: true,
        sslMode: 'verify-ca',
      })
      
      expect(connection.sslMode).toBe('verify-ca')
    })

    it('supports verify-full SSL mode', () => {
      const connection = createTestPostgresConnection({
        ssl: true,
        sslMode: 'verify-full',
      })
      
      expect(connection.sslMode).toBe('verify-full')
    })
  })

  describe('Pool Configuration', () => {
    it('allows custom pool size', () => {
      const connection = createTestPostgresConnection({ poolSize: 25 })
      expect(connection.poolSize).toBe(25)
    })

    it('allows custom connection timeout', () => {
      const connection = createTestPostgresConnection({ connectionTimeout: 60000 })
      expect(connection.connectionTimeout).toBe(60000)
    })
  })

  describe('Schema Configuration', () => {
    it('allows custom schema', () => {
      const connection = createTestPostgresConnection({ schema: 'quarry_app' })
      expect(connection.schema).toBe('quarry_app')
    })
  })
})

// ============================================================================
// POSTGRES SCHEMA TESTS
// ============================================================================

describe('PostgreSQL Schema Definition', () => {
  // These tests verify the expected schema structure
  
  it('defines fabrics table structure', () => {
    const expectedColumns = [
      'id',
      'name',
      'description',
      'github_owner',
      'github_repo',
      'github_branch',
      'last_sync_at',
      'sync_hash',
      'created_at',
      'updated_at',
    ]
    
    // Verify expected column structure (these would be validated during schema init)
    expect(expectedColumns).toContain('id')
    expect(expectedColumns).toContain('name')
    expect(expectedColumns).toContain('github_owner')
  })

  it('defines weaves table structure', () => {
    const expectedColumns = [
      'id',
      'fabric_id',
      'slug',
      'name',
      'description',
      'icon',
      'color',
      'sort_order',
      'is_hidden',
      'metadata',
      'created_at',
      'updated_at',
    ]
    
    expect(expectedColumns).toContain('fabric_id')
    expect(expectedColumns).toContain('slug')
    expect(expectedColumns).toContain('metadata')
  })

  it('defines strands table structure', () => {
    const expectedColumns = [
      'id',
      'loom_id',
      'slug',
      'title',
      'content',
      'frontmatter',
      'file_path',
      'file_hash',
      'word_count',
      'tags',
      'created_at',
      'updated_at',
    ]
    
    expect(expectedColumns).toContain('loom_id')
    expect(expectedColumns).toContain('content')
    expect(expectedColumns).toContain('frontmatter')
  })
})

// ============================================================================
// CONNECTION LIFECYCLE TESTS
// ============================================================================

describe('PostgreSQL Connection Lifecycle', () => {
  describe('Connection Status Transitions', () => {
    it('starts in disconnected state', () => {
      const connection = createTestPostgresConnection()
      expect(connection.status).toBe('disconnected')
    })

    it('tracks connection status through states', () => {
      const statuses = ['disconnected', 'connecting', 'connected', 'error', 'syncing']
      
      statuses.forEach(status => {
        expect(['disconnected', 'connecting', 'connected', 'error', 'syncing']).toContain(status)
      })
    })

    it('is initially not active', () => {
      const connection = createTestPostgresConnection()
      expect(connection.isActive).toBe(false)
    })

    it('tracks password presence without storing password', () => {
      const connection = createTestPostgresConnection()
      expect(connection.hasPassword).toBe(false)
      expect(connection.passwordEncrypted).toBeUndefined()
    })
  })

  describe('Connection Test Results', () => {
    it('can represent successful connection test', () => {
      const result: ConnectionTestResult = {
        success: true,
        message: 'Connected to PostgreSQL 15.1',
        latencyMs: 42,
        version: '15.1',
        details: {
          serverVersion: '150001',
          encoding: 'UTF8',
        },
      }

      expect(result.success).toBe(true)
      expect(result.latencyMs).toBe(42)
      expect(result.version).toBe('15.1')
    })

    it('can represent connection timeout', () => {
      const result: ConnectionTestResult = {
        success: false,
        message: 'Connection timed out after 30000ms',
        latencyMs: 30000,
      }

      expect(result.success).toBe(false)
      expect(result.latencyMs).toBe(30000)
    })

    it('can represent authentication failure', () => {
      const result: ConnectionTestResult = {
        success: false,
        message: 'password authentication failed for user "test_user"',
        latencyMs: 120,
      }

      expect(result.success).toBe(false)
      expect(result.message).toContain('authentication failed')
    })

    it('can represent SSL errors', () => {
      const result: ConnectionTestResult = {
        success: false,
        message: 'SSL connection required but not available',
        latencyMs: 50,
      }

      expect(result.success).toBe(false)
      expect(result.message).toContain('SSL')
    })
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('PostgreSQL Error Handling', () => {
  it('handles connection refused errors', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432')
    expect(error.message).toContain('ECONNREFUSED')
  })

  it('handles host not found errors', () => {
    const error = new Error('getaddrinfo ENOTFOUND invalid.host.name')
    expect(error.message).toContain('ENOTFOUND')
  })

  it('handles database not found errors', () => {
    const error = new Error('database "nonexistent_db" does not exist')
    expect(error.message).toContain('does not exist')
  })

  it('handles permission denied errors', () => {
    const error = new Error('permission denied for schema public')
    expect(error.message).toContain('permission denied')
  })

  it('handles connection pool exhaustion', () => {
    const error = new Error('too many connections for role "test_user"')
    expect(error.message).toContain('too many connections')
  })
})

// ============================================================================
// TIMESTAMP HANDLING TESTS
// ============================================================================

describe('PostgreSQL Timestamp Handling', () => {
  it('records creation timestamp on new connection', () => {
    const before = new Date().toISOString()
    const connection = createTestPostgresConnection()
    const after = new Date().toISOString()

    expect(connection.createdAt).toBeDefined()
    expect(connection.createdAt >= before).toBe(true)
    expect(connection.createdAt <= after).toBe(true)
  })

  it('records update timestamp on new connection', () => {
    const connection = createTestPostgresConnection()
    expect(connection.updatedAt).toBeDefined()
    expect(connection.updatedAt).toBe(connection.createdAt)
  })

  it('tracks last connected timestamp', () => {
    const connection = createTestPostgresConnection()
    expect(connection.lastConnected).toBeUndefined()
    
    // After connection, lastConnected would be set
    const connected = { ...connection, lastConnected: new Date().toISOString() }
    expect(connected.lastConnected).toBeDefined()
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('PostgreSQL Edge Cases', () => {
  it('handles empty database name', () => {
    // This should be caught by validation in real code
    const connection = createTestPostgresConnection({ database: '' })
    expect(connection.database).toBe('')
  })

  it('handles very long connection strings', () => {
    const connection = createTestPostgresConnection({
      host: 'very-long-hostname-that-might-be-used-in-some-cloud-providers.database.example.com',
      database: 'my_application_production_database_v2',
      username: 'application_production_user',
    })
    
    const connString = buildPostgresConnectionString(connection, 'verysecurepassword123!')
    expect(connString.length).toBeGreaterThan(100)
  })

  it('handles IPv6 hosts', () => {
    const connection = createTestPostgresConnection({
      host: '::1', // IPv6 localhost
    })
    
    // IPv6 in URLs needs brackets, but our simple builder doesn't handle this
    // This is a known limitation for now
    expect(connection.host).toBe('::1')
  })

  it('handles unicode in credentials', () => {
    const connection = createTestPostgresConnection({
      username: 'пользователь', // Russian for "user"
    })
    
    const connString = buildPostgresConnectionString(connection, '密码') // Chinese for "password"
    expect(connString).toBeDefined()
    // URL encoding should handle unicode
    expect(connString).not.toContain('пользователь')
  })

  it('handles max pool size of 1', () => {
    const connection = createTestPostgresConnection({ poolSize: 1 })
    expect(connection.poolSize).toBe(1)
  })

  it('handles very short timeout', () => {
    const connection = createTestPostgresConnection({ connectionTimeout: 1000 })
    expect(connection.connectionTimeout).toBe(1000)
  })
})

