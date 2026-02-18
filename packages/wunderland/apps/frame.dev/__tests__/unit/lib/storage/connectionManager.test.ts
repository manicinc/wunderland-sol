/**
 * Connection Manager Tests
 * @module __tests__/unit/lib/storage/connectionManager.test.ts
 * 
 * Tests for the unified database connection management system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  DatabaseConnection,
  LocalConnection,
  GitHubConnection,
  PostgresConnection,
  ConnectionStatus,
  ConnectionTestResult,
} from '@/lib/storage/types'
import {
  createLocalConnection,
  createGitHubConnection,
  createPostgresConnection,
  buildPostgresConnectionString,
  parsePostgresConnectionString,
  getConnectionTypeLabel,
  getConnectionTypeIcon,
  CONNECTION_DEFAULTS,
} from '@/lib/storage/types'

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock crypto for encryption tests
const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue('mockKey'),
    deriveKey: vi.fn().mockResolvedValue('mockDerivedKey'),
    encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: vi.fn().mockResolvedValue(new TextEncoder().encode('decrypted')),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
}

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}

// Setup mocks before tests
beforeEach(() => {
  vi.stubGlobal('crypto', mockCrypto)
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================================
// TYPE CREATION TESTS
// ============================================================================

describe('Connection Type Creation Functions', () => {
  describe('createLocalConnection', () => {
    it('creates a local connection with required fields', () => {
      const connection = createLocalConnection({
        id: 'local-1',
        name: 'My Vault',
        vaultPath: '/Users/test/Documents/Quarry',
      })

      expect(connection.id).toBe('local-1')
      expect(connection.name).toBe('My Vault')
      expect(connection.type).toBe('local')
      expect(connection.vaultPath).toBe('/Users/test/Documents/Quarry')
      expect(connection.isActive).toBe(false)
      expect(connection.status).toBe('disconnected')
      expect(connection.adapterType).toBe('indexeddb')
      expect(connection.createdAt).toBeDefined()
      expect(connection.updatedAt).toBeDefined()
    })

    it('merges partial fields with defaults', () => {
      const connection = createLocalConnection({
        id: 'local-2',
        name: 'Custom Vault',
        vaultPath: '/custom/path',
        isActive: true,
        adapterType: 'electron',
      })

      expect(connection.isActive).toBe(true)
      expect(connection.adapterType).toBe('electron')
    })
  })

  describe('createGitHubConnection', () => {
    it('creates a GitHub connection with required fields', () => {
      const connection = createGitHubConnection({
        id: 'github-1',
        name: 'My Repo',
        owner: 'testuser',
        repo: 'testrepo',
      })

      expect(connection.id).toBe('github-1')
      expect(connection.name).toBe('My Repo')
      expect(connection.type).toBe('github')
      expect(connection.owner).toBe('testuser')
      expect(connection.repo).toBe('testrepo')
      expect(connection.branch).toBe('main')
      expect(connection.basePath).toBe('')
      expect(connection.hasToken).toBe(false)
      expect(connection.isActive).toBe(false)
      expect(connection.status).toBe('disconnected')
    })

    it('allows custom branch and basePath', () => {
      const connection = createGitHubConnection({
        id: 'github-2',
        name: 'Docs Repo',
        owner: 'org',
        repo: 'docs',
        branch: 'develop',
        basePath: 'content/notes',
      })

      expect(connection.branch).toBe('develop')
      expect(connection.basePath).toBe('content/notes')
    })
  })

  describe('createPostgresConnection', () => {
    it('creates a Postgres connection with required fields', () => {
      const connection = createPostgresConnection({
        id: 'pg-1',
        name: 'Production DB',
        host: 'db.example.com',
        database: 'quarry_prod',
        username: 'quarry_user',
      })

      expect(connection.id).toBe('pg-1')
      expect(connection.name).toBe('Production DB')
      expect(connection.type).toBe('postgres')
      expect(connection.host).toBe('db.example.com')
      expect(connection.database).toBe('quarry_prod')
      expect(connection.username).toBe('quarry_user')
      expect(connection.port).toBe(5432)
      expect(connection.ssl).toBe(true)
      expect(connection.sslMode).toBe('require')
      expect(connection.schema).toBe('public')
      expect(connection.poolSize).toBe(10)
      expect(connection.connectionTimeout).toBe(30000)
      expect(connection.hasPassword).toBe(false)
    })

    it('allows custom port and pool settings', () => {
      const connection = createPostgresConnection({
        id: 'pg-2',
        name: 'Dev DB',
        host: 'localhost',
        database: 'quarry_dev',
        username: 'dev',
        port: 5433,
        poolSize: 5,
        ssl: false,
      })

      expect(connection.port).toBe(5433)
      expect(connection.poolSize).toBe(5)
      expect(connection.ssl).toBe(false)
    })
  })
})

// ============================================================================
// CONNECTION STRING TESTS
// ============================================================================

describe('PostgreSQL Connection String Utilities', () => {
  describe('buildPostgresConnectionString', () => {
    it('builds a basic connection string', () => {
      const connection = createPostgresConnection({
        id: 'pg-test',
        name: 'Test',
        host: 'localhost',
        database: 'testdb',
        username: 'testuser',
        ssl: false,
      })

      const connString = buildPostgresConnectionString(connection)
      expect(connString).toBe('postgresql://testuser@localhost:5432/testdb')
    })

    it('includes password when provided', () => {
      const connection = createPostgresConnection({
        id: 'pg-test',
        name: 'Test',
        host: 'db.example.com',
        database: 'proddb',
        username: 'admin',
        ssl: true,
      })

      const connString = buildPostgresConnectionString(connection, 'secret123')
      expect(connString).toBe('postgresql://admin:secret123@db.example.com:5432/proddb?sslmode=require')
    })

    it('URL-encodes special characters', () => {
      const connection = createPostgresConnection({
        id: 'pg-test',
        name: 'Test',
        host: 'localhost',
        database: 'mydb',
        username: 'user@domain',
        ssl: false,
      })

      const connString = buildPostgresConnectionString(connection, 'p@ss:word!')
      expect(connString).toContain('user%40domain')
      expect(connString).toContain('p%40ss%3Aword!')
    })

    it('adds sslmode when ssl is enabled', () => {
      const connection = createPostgresConnection({
        id: 'pg-test',
        name: 'Test',
        host: 'localhost',
        database: 'testdb',
        username: 'user',
        ssl: true,
      })

      const connString = buildPostgresConnectionString(connection)
      expect(connString).toContain('?sslmode=require')
    })
  })

  describe('parsePostgresConnectionString', () => {
    it('parses a basic connection string', () => {
      const result = parsePostgresConnectionString('postgresql://user@localhost:5432/mydb')
      
      expect(result).not.toBeNull()
      expect(result?.host).toBe('localhost')
      expect(result?.port).toBe(5432)
      expect(result?.database).toBe('mydb')
      expect(result?.username).toBe('user')
    })

    it('handles postgres:// protocol', () => {
      const result = parsePostgresConnectionString('postgres://admin@db.example.com:5433/production')
      
      expect(result).not.toBeNull()
      expect(result?.host).toBe('db.example.com')
      expect(result?.port).toBe(5433)
      expect(result?.database).toBe('production')
    })

    it('parses SSL mode from query string', () => {
      const result = parsePostgresConnectionString('postgresql://user@localhost/db?sslmode=verify-full')
      
      expect(result?.ssl).toBe(true)
      expect(result?.sslMode).toBe('verify-full')
    })

    it('handles disabled SSL', () => {
      const result = parsePostgresConnectionString('postgresql://user@localhost/db?sslmode=disable')
      
      expect(result?.ssl).toBe(false)
      expect(result?.sslMode).toBe('disable')
    })

    it('returns null for invalid URLs', () => {
      expect(parsePostgresConnectionString('http://localhost/db')).toBeNull()
      expect(parsePostgresConnectionString('not-a-url')).toBeNull()
      expect(parsePostgresConnectionString('')).toBeNull()
    })

    it('decodes URL-encoded usernames', () => {
      const result = parsePostgresConnectionString('postgresql://user%40domain@localhost/db')
      expect(result?.username).toBe('user@domain')
    })

    it('defaults port to 5432 if not specified', () => {
      const result = parsePostgresConnectionString('postgresql://user@localhost/db')
      expect(result?.port).toBe(5432)
    })
  })
})

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Connection Utility Functions', () => {
  describe('getConnectionTypeLabel', () => {
    it('returns correct labels', () => {
      expect(getConnectionTypeLabel('local')).toBe('Local Vault')
      expect(getConnectionTypeLabel('github')).toBe('GitHub')
      expect(getConnectionTypeLabel('postgres')).toBe('PostgreSQL')
    })
  })

  describe('getConnectionTypeIcon', () => {
    it('returns correct icon names', () => {
      expect(getConnectionTypeIcon('local')).toBe('HardDrive')
      expect(getConnectionTypeIcon('github')).toBe('Github')
      expect(getConnectionTypeIcon('postgres')).toBe('Database')
    })
  })

  describe('CONNECTION_DEFAULTS', () => {
    it('has correct local defaults', () => {
      expect(CONNECTION_DEFAULTS.local.vaultPath).toBe('~/Documents/Quarry')
      expect(CONNECTION_DEFAULTS.local.adapterType).toBe('indexeddb')
    })

    it('has correct github defaults', () => {
      expect(CONNECTION_DEFAULTS.github.branch).toBe('main')
      expect(CONNECTION_DEFAULTS.github.basePath).toBe('')
    })

    it('has correct postgres defaults', () => {
      expect(CONNECTION_DEFAULTS.postgres.port).toBe(5432)
      expect(CONNECTION_DEFAULTS.postgres.ssl).toBe(true)
      expect(CONNECTION_DEFAULTS.postgres.sslMode).toBe('require')
      expect(CONNECTION_DEFAULTS.postgres.schema).toBe('public')
      expect(CONNECTION_DEFAULTS.postgres.poolSize).toBe(10)
      expect(CONNECTION_DEFAULTS.postgres.connectionTimeout).toBe(30000)
    })
  })
})

// ============================================================================
// CONNECTION STATUS TESTS
// ============================================================================

describe('Connection Status Type', () => {
  it('defines all valid statuses', () => {
    const statuses: ConnectionStatus[] = [
      'disconnected',
      'connecting',
      'connected',
      'error',
      'syncing',
    ]

    statuses.forEach(status => {
      expect(['disconnected', 'connecting', 'connected', 'error', 'syncing']).toContain(status)
    })
  })
})

// ============================================================================
// CONNECTION TEST RESULT TESTS
// ============================================================================

describe('ConnectionTestResult', () => {
  it('can represent a successful test', () => {
    const result: ConnectionTestResult = {
      success: true,
      message: 'Connection successful',
      latencyMs: 42,
      version: '15.1',
      details: {
        serverTime: '2024-01-15T12:00:00Z',
      },
    }

    expect(result.success).toBe(true)
    expect(result.latencyMs).toBe(42)
    expect(result.version).toBe('15.1')
  })

  it('can represent a failed test', () => {
    const result: ConnectionTestResult = {
      success: false,
      message: 'Connection refused',
      latencyMs: 5000,
    }

    expect(result.success).toBe(false)
    expect(result.message).toBe('Connection refused')
    expect(result.version).toBeUndefined()
  })
})

// ============================================================================
// TYPE GUARD / DISCRIMINATOR TESTS
// ============================================================================

describe('Connection Type Discrimination', () => {
  it('can discriminate local connections', () => {
    const connection: DatabaseConnection = createLocalConnection({
      id: 'test',
      name: 'Test',
      vaultPath: '/test',
    })

    if (connection.type === 'local') {
      // TypeScript should narrow the type to LocalConnection
      expect(connection.vaultPath).toBe('/test')
    }
    expect(connection.type).toBe('local')
  })

  it('can discriminate github connections', () => {
    const connection: DatabaseConnection = createGitHubConnection({
      id: 'test',
      name: 'Test',
      owner: 'testowner',
      repo: 'testrepo',
    })

    if (connection.type === 'github') {
      // TypeScript should narrow the type to GitHubConnection
      expect(connection.owner).toBe('testowner')
      expect(connection.repo).toBe('testrepo')
    }
    expect(connection.type).toBe('github')
  })

  it('can discriminate postgres connections', () => {
    const connection: DatabaseConnection = createPostgresConnection({
      id: 'test',
      name: 'Test',
      host: 'localhost',
      database: 'testdb',
      username: 'testuser',
    })

    if (connection.type === 'postgres') {
      // TypeScript should narrow the type to PostgresConnection
      expect(connection.host).toBe('localhost')
      expect(connection.database).toBe('testdb')
    }
    expect(connection.type).toBe('postgres')
  })
})

