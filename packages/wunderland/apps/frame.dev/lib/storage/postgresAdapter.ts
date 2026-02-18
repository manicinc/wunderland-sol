/**
 * PostgreSQL Adapter
 * @module lib/storage/postgresAdapter
 *
 * Wrapper around @framers/sql-storage-adapter for PostgreSQL connections.
 * Provides connection management, health checks, and schema initialization.
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  PostgresConnection,
  ConnectionTestResult,
  ConnectionStatus,
} from './types'
import { buildPostgresConnectionString } from './types'

// ============================================================================
// TYPES
// ============================================================================

interface PostgresAdapterOptions {
  /** Connection configuration */
  connection: PostgresConnection
  /** Decrypted password (not stored, passed at runtime) */
  password?: string
  /** Enable verbose logging */
  debug?: boolean
  /** Auto-initialize schema on connect */
  autoInitSchema?: boolean
}

interface PostgresAdapterState {
  adapter: StorageAdapter | null
  status: ConnectionStatus
  lastError: string | null
  connectedAt: string | null
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * PostgreSQL-specific schema (differs slightly from SQLite)
 * Using JSONB for metadata, TEXT for content, UUID for IDs
 */
const POSTGRES_SCHEMA = `
-- Fabrics (content sources)
CREATE TABLE IF NOT EXISTS fabrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  github_owner TEXT,
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  last_sync_at TIMESTAMPTZ,
  sync_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weaves (top-level folders)
CREATE TABLE IF NOT EXISTS weaves (
  id TEXT PRIMARY KEY,
  fabric_id TEXT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fabric_id, slug)
);

-- Looms (sub-folders within weaves)
CREATE TABLE IF NOT EXISTS looms (
  id TEXT PRIMARY KEY,
  weave_id TEXT NOT NULL REFERENCES weaves(id) ON DELETE CASCADE,
  parent_loom_id TEXT REFERENCES looms(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(weave_id, parent_loom_id, slug)
);

-- Strands (content documents)
CREATE TABLE IF NOT EXISTS strands (
  id TEXT PRIMARY KEY,
  loom_id TEXT NOT NULL REFERENCES looms(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  author TEXT,
  tags TEXT[], -- PostgreSQL array
  frontmatter JSONB DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER DEFAULT 0,
  is_draft BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  publish_date TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  strand_id TEXT REFERENCES strands(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('strand', 'section', 'paragraph', 'code')),
  embedding REAL[] NOT NULL, -- Vector stored as array
  weave TEXT,
  loom TEXT,
  tags TEXT[],
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync tracking for conflict resolution
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data JSONB,
  vector_clock JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device registry for cross-platform sync
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('electron', 'web', 'mobile', 'unknown')),
  platform TEXT NOT NULL,
  app_version TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strand relationships (Zettelkasten link context)
CREATE TABLE IF NOT EXISTS strand_relationships (
  id TEXT PRIMARY KEY,
  source_strand_path TEXT NOT NULL,
  source_strand_id TEXT REFERENCES strands(id) ON DELETE CASCADE,
  target_strand_path TEXT NOT NULL,
  target_strand_id TEXT REFERENCES strands(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'extends', 'contrasts', 'supports', 'example-of', 'implements',
    'questions', 'refines', 'applies', 'summarizes', 'prerequisite',
    'related', 'follows', 'references', 'contradicts', 'updates', 'custom'
  )),
  context TEXT,
  source_block_id TEXT,
  bidirectional BOOLEAN DEFAULT FALSE,
  strength REAL DEFAULT 1.0,
  auto_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_strand_path, target_strand_path, relation_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_strands_loom ON strands(loom_id);
CREATE INDEX IF NOT EXISTS idx_strands_path ON strands(path);
CREATE INDEX IF NOT EXISTS idx_strands_tags ON strands USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_looms_weave ON looms(weave_id);
CREATE INDEX IF NOT EXISTS idx_weaves_fabric ON weaves(fabric_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_strand ON embeddings(strand_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_connection ON sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_device ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_strand_rels_source ON strand_relationships(source_strand_path);
CREATE INDEX IF NOT EXISTS idx_strand_rels_target ON strand_relationships(target_strand_path);
CREATE INDEX IF NOT EXISTS idx_strand_rels_type ON strand_relationships(relation_type);
`;

/**
 * Migrations for Zettelkasten workflow fields
 * Run these after initial schema to add new columns
 */
const POSTGRES_MIGRATIONS = `
-- Add Zettelkasten workflow columns to strands (if not exist)
DO $$ BEGIN
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS strand_type TEXT DEFAULT 'file';
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS maturity_status TEXT;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS maturity_last_refined TIMESTAMPTZ;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS maturity_refinement_count INTEGER DEFAULT 0;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS maturity_future_value TEXT;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS is_moc BOOLEAN DEFAULT FALSE;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS moc_topic TEXT;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS moc_scope TEXT;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS quality_has_context BOOLEAN;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS quality_has_connections BOOLEAN;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS quality_is_atomic BOOLEAN;
  ALTER TABLE strands ADD COLUMN IF NOT EXISTS quality_is_self_contained BOOLEAN;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_strands_type ON strands(strand_type);
CREATE INDEX IF NOT EXISTS idx_strands_maturity ON strands(maturity_status);
CREATE INDEX IF NOT EXISTS idx_strands_moc ON strands(is_moc);
`;

// ============================================================================
// POSTGRES ADAPTER CLASS
// ============================================================================

/**
 * PostgreSQL adapter wrapper with connection management
 */
export class PostgresAdapter {
  private options: PostgresAdapterOptions
  private state: PostgresAdapterState = {
    adapter: null,
    status: 'disconnected',
    lastError: null,
    connectedAt: null,
  }
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set()

  constructor(options: PostgresAdapterOptions) {
    this.options = options
  }

  /**
   * Get current connection status
   */
  get status(): ConnectionStatus {
    return this.state.status
  }

  /**
   * Get underlying storage adapter (if connected)
   */
  get adapter(): StorageAdapter | null {
    return this.state.adapter
  }

  /**
   * Get last error message
   */
  get lastError(): string | null {
    return this.state.lastError
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }

  private setStatus(status: ConnectionStatus, error?: string) {
    this.state.status = status
    if (error) {
      this.state.lastError = error
    }
    this.statusListeners.forEach((cb) => cb(status))
  }

  /**
   * Connect to PostgreSQL database
   */
  async connect(): Promise<boolean> {
    if (this.state.status === 'connected' && this.state.adapter) {
      return true
    }

    this.setStatus('connecting')

    try {
      const { createDatabase } = await import('@framers/sql-storage-adapter')

      const connectionString = this.options.connection.connectionString
        || buildPostgresConnectionString(this.options.connection, this.options.password)

      this.state.adapter = await createDatabase({
        type: 'postgres',
        postgres: {
          connectionString,
          ssl: this.options.connection.ssl
            ? { rejectUnauthorized: false }
            : undefined,
        },
      })

      // Initialize schema if requested
      if (this.options.autoInitSchema) {
        await this.initializeSchema()
      }

      this.state.connectedAt = new Date().toISOString()
      this.setStatus('connected')

      if (this.options.debug) {
        console.log('[PostgresAdapter] Connected successfully')
      }

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setStatus('error', message)
      console.error('[PostgresAdapter] Connection failed:', error)
      return false
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.state.adapter) {
      try {
        await this.state.adapter.close()
      } catch (error) {
        console.warn('[PostgresAdapter] Error closing connection:', error)
      }
      this.state.adapter = null
    }
    this.state.connectedAt = null
    this.setStatus('disconnected')
  }

  /**
   * Initialize database schema
   */
  async initializeSchema(): Promise<void> {
    if (!this.state.adapter) {
      throw new Error('Not connected to database')
    }

    try {
      // Create base tables
      await this.state.adapter.exec(POSTGRES_SCHEMA)
      
      // Run migrations for Zettelkasten workflow fields
      await this.state.adapter.exec(POSTGRES_MIGRATIONS)
      
      if (this.options.debug) {
        console.log('[PostgresAdapter] Schema initialized with Zettelkasten migrations')
      }
    } catch (error) {
      console.error('[PostgresAdapter] Schema initialization failed:', error)
      throw error
    }
  }

  /**
   * Test connection (ping database)
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const wasConnected = this.state.status === 'connected'

      if (!wasConnected) {
        const connected = await this.connect()
        if (!connected) {
          return {
            success: false,
            message: this.state.lastError || 'Failed to connect',
          }
        }
      }

      if (!this.state.adapter) {
        return {
          success: false,
          message: 'No adapter available',
        }
      }

      // Query PostgreSQL version
      const result = await this.state.adapter.all<{ version: string }>(
        'SELECT version() as version'
      )
      const version = result?.[0]?.version

      // Disconnect if we weren't connected before
      if (!wasConnected) {
        await this.disconnect()
      }

      return {
        success: true,
        message: 'Connection successful',
        latencyMs: Date.now() - startTime,
        version: version?.split(' ').slice(0, 2).join(' '),
        details: {
          fullVersion: version,
          host: this.options.connection.host,
          database: this.options.connection.database,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        message: `Connection test failed: ${message}`,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Execute SQL query
   */
  async exec(sql: string): Promise<void> {
    if (!this.state.adapter) {
      throw new Error('Not connected to database')
    }
    await this.state.adapter.exec(sql)
  }

  /**
   * Run SQL with parameters (INSERT/UPDATE/DELETE)
   */
  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number | string | null }> {
    if (!this.state.adapter) {
      throw new Error('Not connected to database')
    }
    return await this.state.adapter.run(sql, params)
  }

  /**
   * Query all rows
   */
  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.state.adapter) {
      throw new Error('Not connected to database')
    }
    return await this.state.adapter.all<T>(sql, params)
  }

  /**
   * Query single row
   */
  async get<T>(sql: string, params?: unknown[]): Promise<T | undefined | null> {
    if (!this.state.adapter) {
      throw new Error('Not connected to database')
    }
    return await this.state.adapter.get<T>(sql, params)
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new PostgreSQL adapter instance
 */
export function createPostgresAdapter(options: PostgresAdapterOptions): PostgresAdapter {
  return new PostgresAdapter(options)
}

/**
 * Quick connect to PostgreSQL and return adapter
 */
export async function connectPostgres(
  connection: PostgresConnection,
  password?: string,
  options?: Partial<PostgresAdapterOptions>
): Promise<PostgresAdapter> {
  const adapter = new PostgresAdapter({
    connection,
    password,
    autoInitSchema: true,
    ...options,
  })

  const success = await adapter.connect()
  if (!success) {
    throw new Error(adapter.lastError || 'Failed to connect to PostgreSQL')
  }

  return adapter
}

