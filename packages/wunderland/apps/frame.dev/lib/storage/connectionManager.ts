/**
 * Connection Manager
 * @module lib/storage/connectionManager
 *
 * Unified lifecycle management for all database connections:
 * - Local vault (SQLite/IndexedDB)
 * - GitHub repository
 * - Remote PostgreSQL
 *
 * Handles connection persistence, switching, and status tracking.
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  DatabaseConnection,
  LocalConnection,
  GitHubConnection,
  PostgresConnection,
  ConnectionStatus,
  ConnectionTestResult,
  ConnectionManagerState,
  SyncStatus,
  SyncDevice,
} from './types'
import { PostgresAdapter, createPostgresAdapter } from './postgresAdapter'

// Platform detection helper (avoids import issues with Electron module)
function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).electronAPI
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONNECTIONS_STORAGE_KEY = 'quarry_database_connections'
const ACTIVE_CONNECTION_KEY = 'quarry_active_connection_id'
const CREDENTIALS_PREFIX = 'quarry_cred_'

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Encrypt sensitive data (passwords, tokens)
 */
async function encryptCredential(value: string, connectionId: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const passphrase = `quarry_${connectionId}_${navigator.userAgent.slice(0, 20)}`

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode.apply(null, Array.from(combined)))
}

/**
 * Decrypt sensitive data
 */
async function decryptCredential(ciphertext: string, connectionId: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder()
    const combined = new Uint8Array(Array.from(atob(ciphertext), (c) => c.charCodeAt(0)))
    const passphrase = `quarry_${connectionId}_${navigator.userAgent.slice(0, 20)}`

    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Get connections from storage (localStorage or electron-store)
 */
async function loadConnectionsFromStorage(): Promise<DatabaseConnection[]> {
  try {
    if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
      const data = await (window as any).electronAPI.settings.get(CONNECTIONS_STORAGE_KEY)
      return data ? JSON.parse(data as string) : []
    } else if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    }
  } catch (error) {
    console.error('[ConnectionManager] Failed to load connections:', error)
  }
  return []
}

/**
 * Save connections to storage
 */
async function saveConnectionsToStorage(connections: DatabaseConnection[]): Promise<void> {
  try {
    const data = JSON.stringify(connections)
    if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.settings.set(CONNECTIONS_STORAGE_KEY, data)
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, data)
    }
  } catch (error) {
    console.error('[ConnectionManager] Failed to save connections:', error)
  }
}

/**
 * Get active connection ID from storage
 */
async function loadActiveConnectionId(): Promise<string | null> {
  try {
    if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
      return (await (window as any).electronAPI.settings.get(ACTIVE_CONNECTION_KEY)) as string | null
    } else if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACTIVE_CONNECTION_KEY)
    }
  } catch (error) {
    console.error('[ConnectionManager] Failed to load active connection ID:', error)
  }
  return null
}

/**
 * Save active connection ID to storage
 */
async function saveActiveConnectionId(id: string | null): Promise<void> {
  try {
    if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
      if (id) {
        await (window as any).electronAPI.settings.set(ACTIVE_CONNECTION_KEY, id)
      } else {
        await (window as any).electronAPI.settings.set(ACTIVE_CONNECTION_KEY, '')
      }
    } else if (typeof localStorage !== 'undefined') {
      if (id) {
        localStorage.setItem(ACTIVE_CONNECTION_KEY, id)
      } else {
        localStorage.removeItem(ACTIVE_CONNECTION_KEY)
      }
    }
  } catch (error) {
    console.error('[ConnectionManager] Failed to save active connection ID:', error)
  }
}

/**
 * Store credential securely
 */
async function storeCredential(connectionId: string, credentialType: string, value: string): Promise<void> {
  const key = `${CREDENTIALS_PREFIX}${connectionId}_${credentialType}`
  const encrypted = await encryptCredential(value, connectionId)

  if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
    await (window as any).electronAPI.settings.set(key, encrypted)
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, encrypted)
  }
}

/**
 * Retrieve credential securely
 */
async function getCredential(connectionId: string, credentialType: string): Promise<string | null> {
  const key = `${CREDENTIALS_PREFIX}${connectionId}_${credentialType}`

  let encrypted: string | null = null
  if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
    encrypted = (await (window as any).electronAPI.settings.get(key)) as string | null
  } else if (typeof localStorage !== 'undefined') {
    encrypted = localStorage.getItem(key)
  }

  if (!encrypted) return null
  return decryptCredential(encrypted, connectionId)
}

/**
 * Delete credential
 */
async function deleteCredential(connectionId: string, credentialType: string): Promise<void> {
  const key = `${CREDENTIALS_PREFIX}${connectionId}_${credentialType}`

  if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
    await (window as any).electronAPI.settings.set(key, '')
  } else if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key)
  }
}

// ============================================================================
// CONNECTION MANAGER CLASS
// ============================================================================

type ConnectionManagerListener = (state: ConnectionManagerState) => void
type StatusChangeListener = (connectionId: string, status: ConnectionStatus) => void

/**
 * Unified connection manager for all database backends
 */
class ConnectionManager {
  private state: ConnectionManagerState = {
    connections: [],
    activeConnectionId: null,
    isInitialized: false,
    isLoading: false,
    error: null,
  }

  private listeners: Set<ConnectionManagerListener> = new Set()
  private statusListeners: Set<StatusChangeListener> = new Set()

  // Active adapters
  private postgresAdapter: PostgresAdapter | null = null
  private localAdapter: StorageAdapter | null = null
  private githubClient: unknown | null = null // GitHubContentSource type

  // Sync status
  private syncStatus: Map<string, SyncStatus> = new Map()
  private devices: SyncDevice[] = []

  /**
   * Initialize the connection manager
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) return

    this.setState({ isLoading: true })

    try {
      // Load saved connections
      const connections = await loadConnectionsFromStorage()
      const activeConnectionId = await loadActiveConnectionId()

      this.setState({
        connections,
        activeConnectionId,
        isInitialized: true,
        isLoading: false,
      })

      // Auto-connect to active connection
      if (activeConnectionId) {
        const activeConnection = connections.find((c) => c.id === activeConnectionId)
        if (activeConnection) {
          await this.connect(activeConnectionId)
        }
      }

      console.log('[ConnectionManager] Initialized with', connections.length, 'connections')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize'
      this.setState({
        isLoading: false,
        error: message,
      })
      console.error('[ConnectionManager] Initialization failed:', error)
    }
  }

  /**
   * Get current state
   */
  getState(): ConnectionManagerState {
    return { ...this.state }
  }

  /**
   * Get all connections
   */
  getConnections(): DatabaseConnection[] {
    return [...this.state.connections]
  }

  /**
   * Get active connection
   */
  getActiveConnection(): DatabaseConnection | null {
    if (!this.state.activeConnectionId) return null
    return this.state.connections.find((c) => c.id === this.state.activeConnectionId) || null
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): DatabaseConnection | null {
    return this.state.connections.find((c) => c.id === id) || null
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ConnectionManagerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Subscribe to status changes for specific connections
   */
  onStatusChange(listener: StatusChangeListener): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setState(partial: Partial<ConnectionManagerState>) {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((listener) => listener(this.state))
  }

  private updateConnectionStatus(connectionId: string, status: ConnectionStatus, error?: string) {
    const connections = this.state.connections.map((c) =>
      c.id === connectionId
        ? { ...c, status, lastError: error, updatedAt: new Date().toISOString() }
        : c
    )
    this.setState({ connections })
    this.statusListeners.forEach((listener) => listener(connectionId, status))
    saveConnectionsToStorage(connections)
  }

  // ==========================================================================
  // CONNECTION CRUD
  // ==========================================================================

  /**
   * Add a new connection
   */
  async addConnection(connection: DatabaseConnection, credentials?: { password?: string; pat?: string }): Promise<void> {
    // Store credentials securely
    if (credentials?.password && connection.type === 'postgres') {
      await storeCredential(connection.id, 'password', credentials.password)
      ;(connection as PostgresConnection).hasPassword = true
    }
    if (credentials?.pat && connection.type === 'github') {
      await storeCredential(connection.id, 'pat', credentials.pat)
      ;(connection as GitHubConnection).hasToken = true
    }

    const connections = [...this.state.connections, connection]
    this.setState({ connections })
    await saveConnectionsToStorage(connections)

    console.log('[ConnectionManager] Added connection:', connection.name)
  }

  /**
   * Update an existing connection
   */
  async updateConnection(
    id: string,
    updates: Partial<DatabaseConnection>,
    credentials?: { password?: string; pat?: string }
  ): Promise<void> {
    const connection = this.state.connections.find((c) => c.id === id)
    if (!connection) {
      throw new Error(`Connection not found: ${id}`)
    }

    // Update credentials if provided
    if (credentials?.password && connection.type === 'postgres') {
      await storeCredential(id, 'password', credentials.password)
      ;(updates as Partial<PostgresConnection>).hasPassword = true
    }
    if (credentials?.pat && connection.type === 'github') {
      await storeCredential(id, 'pat', credentials.pat)
      ;(updates as Partial<GitHubConnection>).hasToken = true
    }

    const connections = this.state.connections.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    ) as DatabaseConnection[]
    this.setState({ connections })
    await saveConnectionsToStorage(connections as DatabaseConnection[])

    console.log('[ConnectionManager] Updated connection:', id)
  }

  /**
   * Remove a connection
   */
  async removeConnection(id: string): Promise<void> {
    const connection = this.state.connections.find((c) => c.id === id)
    if (!connection) return

    // Disconnect if active
    if (this.state.activeConnectionId === id) {
      await this.disconnect()
    }

    // Remove credentials
    if (connection.type === 'postgres') {
      await deleteCredential(id, 'password')
    }
    if (connection.type === 'github') {
      await deleteCredential(id, 'pat')
    }

    const connections = this.state.connections.filter((c) => c.id !== id)
    this.setState({ connections })
    await saveConnectionsToStorage(connections)

    console.log('[ConnectionManager] Removed connection:', id)
  }

  // ==========================================================================
  // CONNECTION LIFECYCLE
  // ==========================================================================

  /**
   * Connect to a specific connection
   */
  async connect(connectionId: string): Promise<boolean> {
    const connection = this.state.connections.find((c) => c.id === connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    // Disconnect from current connection first
    if (this.state.activeConnectionId && this.state.activeConnectionId !== connectionId) {
      await this.disconnect()
    }

    this.updateConnectionStatus(connectionId, 'connecting')

    try {
      let success = false

      switch (connection.type) {
        case 'local':
          success = await this.connectLocal(connection)
          break
        case 'github':
          success = await this.connectGitHub(connection)
          break
        case 'postgres':
          success = await this.connectPostgres(connection)
          break
      }

      if (success) {
        // Deactivate other connections
        const connections = this.state.connections.map((c) => ({
          ...c,
          isActive: c.id === connectionId,
          lastConnected: c.id === connectionId ? new Date().toISOString() : c.lastConnected,
        }))

        this.setState({
          connections,
          activeConnectionId: connectionId,
        })

        await saveConnectionsToStorage(connections)
        await saveActiveConnectionId(connectionId)

        this.updateConnectionStatus(connectionId, 'connected')
        console.log('[ConnectionManager] Connected to:', connection.name)
      }

      return success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      this.updateConnectionStatus(connectionId, 'error', message)
      console.error('[ConnectionManager] Connection failed:', error)
      return false
    }
  }

  private async connectLocal(connection: LocalConnection): Promise<boolean> {
    // Local connections are handled by SQLiteContentStore
    // Just verify the vault is accessible
    if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
      const vaultPath = connection.vaultPath
      const exists = await (window as any).electronAPI.fs.exists(vaultPath)
      return exists
    }
    // In browser, check IndexedDB
    return true
  }

  private async connectGitHub(connection: GitHubConnection): Promise<boolean> {
    // GitHub connections require PAT for private repos
    if (connection.hasToken) {
      const pat = await getCredential(connection.id, 'pat')
      if (!pat) {
        throw new Error('GitHub token not found')
      }
      // Store for GitHubContentSource to use
      this.githubClient = { owner: connection.owner, repo: connection.repo, pat }
    }
    return true
  }

  private async connectPostgres(connection: PostgresConnection): Promise<boolean> {
    const password = await getCredential(connection.id, 'password')

    this.postgresAdapter = createPostgresAdapter({
      connection,
      password: password || undefined,
      autoInitSchema: true,
      debug: true,
    })

    return await this.postgresAdapter.connect()
  }

  /**
   * Disconnect from current connection
   */
  async disconnect(): Promise<void> {
    if (!this.state.activeConnectionId) return

    const connectionId = this.state.activeConnectionId

    try {
      // Cleanup adapters
      if (this.postgresAdapter) {
        await this.postgresAdapter.disconnect()
        this.postgresAdapter = null
      }
      this.localAdapter = null
      this.githubClient = null

      this.updateConnectionStatus(connectionId, 'disconnected')

      const connections = this.state.connections.map((c) =>
        c.id === connectionId ? { ...c, isActive: false } : c
      )

      this.setState({
        connections,
        activeConnectionId: null,
      })

      await saveConnectionsToStorage(connections)
      await saveActiveConnectionId(null)

      console.log('[ConnectionManager] Disconnected')
    } catch (error) {
      console.error('[ConnectionManager] Disconnect error:', error)
    }
  }

  /**
   * Test a connection without activating it
   */
  async testConnection(connectionId: string): Promise<ConnectionTestResult> {
    const connection = this.state.connections.find((c) => c.id === connectionId)
    if (!connection) {
      return { success: false, message: 'Connection not found' }
    }

    const startTime = Date.now()

    try {
      switch (connection.type) {
        case 'local': {
          if (isElectron() && typeof window !== 'undefined' && (window as any).electronAPI) {
            const exists = await (window as any).electronAPI.fs.exists(connection.vaultPath)
            return {
              success: exists,
              message: exists ? 'Vault accessible' : 'Vault not found',
              latencyMs: Date.now() - startTime,
              details: { vaultPath: connection.vaultPath },
            }
          }
          return {
            success: true,
            message: 'IndexedDB available',
            latencyMs: Date.now() - startTime,
          }
        }

        case 'github': {
          const pat = connection.hasToken ? await getCredential(connection.id, 'pat') : null
          const headers: HeadersInit = pat ? { Authorization: `token ${pat}` } : {}
          const response = await fetch(
            `https://api.github.com/repos/${connection.owner}/${connection.repo}`,
            { headers }
          )

          if (response.ok) {
            const data = await response.json()
            return {
              success: true,
              message: 'Repository accessible',
              latencyMs: Date.now() - startTime,
              details: {
                name: data.full_name,
                private: data.private,
                defaultBranch: data.default_branch,
              },
            }
          } else {
            return {
              success: false,
              message: `GitHub API error: ${response.status}`,
              latencyMs: Date.now() - startTime,
            }
          }
        }

        case 'postgres': {
          const password = await getCredential(connection.id, 'password')
          const adapter = createPostgresAdapter({
            connection,
            password: password || undefined,
          })
          const result = await adapter.testConnection()
          return result
        }

        default:
          return { success: false, message: 'Unknown connection type' }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed'
      return {
        success: false,
        message,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  // ==========================================================================
  // SYNC STATUS
  // ==========================================================================

  /**
   * Get sync status for a connection
   */
  getSyncStatus(connectionId: string): SyncStatus | null {
    return this.syncStatus.get(connectionId) || null
  }

  /**
   * Update sync status
   */
  updateSyncStatus(connectionId: string, status: Partial<SyncStatus>): void {
    const current = this.syncStatus.get(connectionId) || {
      connectionId,
      isSyncing: false,
      pendingChanges: 0,
      conflictCount: 0,
    }
    this.syncStatus.set(connectionId, { ...current, ...status })
  }

  /**
   * Get registered devices
   */
  getDevices(): SyncDevice[] {
    return [...this.devices]
  }

  /**
   * Register current device
   */
  async registerDevice(name: string): Promise<SyncDevice> {
    const device: SyncDevice = {
      id: `device-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      type: isElectron() ? 'electron' : 'web',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      lastSeen: new Date().toISOString(),
      isOnline: true,
    }
    this.devices.push(device)
    return device
  }

  // ==========================================================================
  // ADAPTERS
  // ==========================================================================

  /**
   * Get the active storage adapter
   */
  getActiveAdapter(): StorageAdapter | null {
    if (this.postgresAdapter?.adapter) {
      return this.postgresAdapter.adapter
    }
    if (this.localAdapter) {
      return this.localAdapter
    }
    return null
  }

  /**
   * Get Postgres adapter (if connected)
   */
  getPostgresAdapter(): PostgresAdapter | null {
    return this.postgresAdapter
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: ConnectionManager | null = null

/**
 * Get the singleton connection manager instance
 */
export function getConnectionManager(): ConnectionManager {
  if (!instance) {
    instance = new ConnectionManager()
  }
  return instance
}

/**
 * Initialize the connection manager (call once at app startup)
 */
export async function initConnectionManager(): Promise<ConnectionManager> {
  const manager = getConnectionManager()
  await manager.initialize()
  return manager
}

// Re-export for convenience
export { ConnectionManager }
export type { ConnectionManagerListener, StatusChangeListener }

