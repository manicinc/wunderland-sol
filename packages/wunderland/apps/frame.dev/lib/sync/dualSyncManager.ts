/**
 * Dual Sync Manager
 * @module lib/sync/dualSyncManager
 *
 * Orchestrates synchronization between:
 * - SQLite sync (via sql-storage-adapter) for private/local data
 * - Git/GitHub workflow for public contributions
 *
 * Key concepts:
 * - Private strands: Sync via WebSocket/HTTP using sql-storage-adapter's cross-platform sync
 * - Public strands: Published via existing Git/GitHub PR workflow
 * - `isPublic` flag in frontmatter determines sync routing
 *
 * @see ARCHITECTURE.md in sql-storage-adapter for sync protocol details
 * @see docs/PUBLISHING_GUIDE.md for Git workflow details
 */

import type { SyncEventListener, SyncEvent, SyncOperationType } from './types'
import { getSyncQueue } from './syncQueue'
import type { LocalStrand } from '../storage/localCodex'
import { getStrandByPath, listStrands, saveStrand } from '../storage/localCodex'
import { getEffectiveSyncUrl, getEffectiveApiUrl, isUsingCustomServer } from '../config/syncConfig'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Sync mode determines which sync backend to use
 */
export type SyncMode = 'local' | 'sqlite-sync' | 'git-publish' | 'dual'

/**
 * Visibility of a strand determines sync routing
 */
export type StrandVisibility = 'private' | 'public' | 'draft'

/**
 * Sync target configuration
 */
export interface SyncTarget {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Sync mode */
  mode: SyncMode
  /** Whether this target is enabled */
  enabled: boolean
  /** Configuration for this target */
  config?: SyncTargetConfig
}

/**
 * Configuration for sync targets
 */
export interface SyncTargetConfig {
  // SQLite sync configuration
  sqliteSync?: {
    endpoint?: string
    authToken?: string
    tables?: string[]
    conflictStrategy?: 'last-write-wins' | 'local-wins' | 'remote-wins' | 'merge' | 'manual'
  }
  // Git publish configuration
  gitPublish?: {
    owner?: string
    repo?: string
    branch?: string
    basePath?: string
    createPR?: boolean
  }
}

/**
 * Result of determining sync route for a strand
 */
export interface SyncRouteResult {
  /** Strand path */
  path: string
  /** Visibility status */
  visibility: StrandVisibility
  /** Recommended sync mode */
  mode: SyncMode
  /** Target ID to sync to */
  targetId: string
  /** Reason for this routing decision */
  reason: string
}

/**
 * Sync operation queued for execution
 */
export interface DualSyncOperation {
  id: string
  strandPath: string
  operation: SyncOperationType
  mode: SyncMode
  targetId: string
  payload: unknown
  createdAt: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  error?: string
}

/**
 * Overall sync status
 */
export interface DualSyncStatus {
  /** Current sync mode */
  mode: SyncMode
  /** Is sync connected/ready */
  connected: boolean
  /** Last sync timestamp */
  lastSyncAt?: string
  /** Pending operations count */
  pendingCount: number
  /** SQLite sync status */
  sqliteSyncStatus?: {
    connected: boolean
    deviceCount: number
    lastPush?: string
    lastPull?: string
  }
  /** Git publish status */
  gitPublishStatus?: {
    configured: boolean
    pendingPRs: number
    lastPublish?: string
  }
}

/**
 * Dual sync manager configuration
 */
export interface DualSyncManagerConfig {
  /** Default sync mode when not determined by content */
  defaultMode: SyncMode
  /** Sync targets */
  targets: SyncTarget[]
  /** Auto-sync interval in milliseconds (0 = disabled) */
  autoSyncInterval: number
  /** Event listeners */
  listeners?: SyncEventListener[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   FRONTMATTER PARSING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract visibility from strand frontmatter
 */
export function extractVisibility(content: string): StrandVisibility {
  // Simple YAML frontmatter extraction
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return 'private' // Default to private

  const frontmatter = frontmatterMatch[1]

  // Check for explicit isPublic field
  const isPublicMatch = frontmatter.match(/^isPublic:\s*(true|false)$/m)
  if (isPublicMatch) {
    return isPublicMatch[1] === 'true' ? 'public' : 'private'
  }

  // Check for visibility field
  const visibilityMatch = frontmatter.match(/^visibility:\s*(public|private|draft)$/m)
  if (visibilityMatch) {
    return visibilityMatch[1] as StrandVisibility
  }

  // Check for status = draft
  const statusMatch = frontmatter.match(/^status:\s*draft$/m)
  if (statusMatch) {
    return 'draft'
  }

  // Default to private (secure by default)
  return 'private'
}

/**
 * Update visibility in strand content
 */
export function updateVisibility(content: string, visibility: StrandVisibility): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)

  if (!frontmatterMatch) {
    // No frontmatter, add it
    return `---\nvisibility: ${visibility}\n---\n\n${content}`
  }

  let frontmatter = frontmatterMatch[1]

  // Update or add visibility field
  if (frontmatter.match(/^visibility:\s*(public|private|draft)$/m)) {
    frontmatter = frontmatter.replace(
      /^visibility:\s*(public|private|draft)$/m,
      `visibility: ${visibility}`
    )
  } else if (frontmatter.match(/^isPublic:\s*(true|false)$/m)) {
    frontmatter = frontmatter.replace(
      /^isPublic:\s*(true|false)$/m,
      `isPublic: ${visibility === 'public'}`
    )
  } else {
    frontmatter = frontmatter.trim() + `\nvisibility: ${visibility}`
  }

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`)
}

/* ═══════════════════════════════════════════════════════════════════════════
   SYNC ROUTING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Determine sync route for a strand based on its visibility and configuration
 */
export function determineSyncRoute(
  strand: LocalStrand,
  config: DualSyncManagerConfig
): SyncRouteResult {
  const visibility = extractVisibility(strand.content)

  // Find appropriate target based on visibility
  let targetId = 'local'
  let mode: SyncMode = config.defaultMode
  let reason = 'Default routing'

  switch (visibility) {
    case 'public':
      // Public strands go to Git
      const gitTarget = config.targets.find(
        (t) => t.enabled && t.mode === 'git-publish'
      )
      if (gitTarget) {
        targetId = gitTarget.id
        mode = 'git-publish'
        reason = 'Public strand → Git publish workflow'
      } else {
        // Fallback to SQLite sync if Git not configured
        const sqliteTarget = config.targets.find(
          (t) => t.enabled && t.mode === 'sqlite-sync'
        )
        if (sqliteTarget) {
          targetId = sqliteTarget.id
          mode = 'sqlite-sync'
          reason = 'Public strand → SQLite sync (Git not configured)'
        }
      }
      break

    case 'private':
      // Private strands go to SQLite sync
      const privateTarget = config.targets.find(
        (t) => t.enabled && t.mode === 'sqlite-sync'
      )
      if (privateTarget) {
        targetId = privateTarget.id
        mode = 'sqlite-sync'
        reason = 'Private strand → SQLite cross-device sync'
      } else {
        mode = 'local'
        reason = 'Private strand → Local only (sync not configured)'
      }
      break

    case 'draft':
      // Drafts stay local only
      mode = 'local'
      reason = 'Draft strand → Local only (not synced)'
      break
  }

  return {
    path: strand.path,
    visibility,
    mode,
    targetId,
    reason,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DUAL SYNC MANAGER CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Dual Sync Manager - Orchestrates SQLite sync and Git publish
 */
export class DualSyncManager {
  private config: DualSyncManagerConfig
  private listeners: Set<SyncEventListener> = new Set()
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null
  private pendingOperations: Map<string, DualSyncOperation> = new Map()
  private initialized = false

  constructor(config: Partial<DualSyncManagerConfig> = {}) {
    this.config = {
      defaultMode: config.defaultMode || 'local',
      targets: config.targets || [
        {
          id: 'local',
          name: 'Local Storage',
          mode: 'local',
          enabled: true,
        },
      ],
      autoSyncInterval: config.autoSyncInterval || 0,
      listeners: config.listeners || [],
    }

    // Add initial listeners
    if (config.listeners) {
      for (const listener of config.listeners) {
        this.listeners.add(listener)
      }
    }
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Start auto-sync if configured
    if (this.config.autoSyncInterval > 0) {
      this.startAutoSync()
    }

    this.initialized = true
    this.emit({
      type: 'sync-started',
      timestamp: new Date().toISOString(),
      details: { message: 'Dual sync manager initialized' },
    })
  }

  /**
   * Shutdown the sync manager
   */
  async shutdown(): Promise<void> {
    this.stopAutoSync()
    this.listeners.clear()
    this.pendingOperations.clear()
    this.initialized = false
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<DualSyncStatus> {
    const syncQueue = await getSyncQueue()
    const stats = await syncQueue.getStats()

    return {
      mode: this.config.defaultMode,
      connected: this.initialized,
      lastSyncAt: undefined, // Would be tracked in actual implementation
      pendingCount: stats.pending + this.pendingOperations.size,
      sqliteSyncStatus: {
        connected: false, // Would be determined by actual SQLite sync
        deviceCount: 1,
      },
      gitPublishStatus: {
        configured: this.config.targets.some(
          (t) => t.enabled && t.mode === 'git-publish'
        ),
        pendingPRs: 0,
      },
    }
  }

  /**
   * Sync a single strand
   */
  async syncStrand(
    path: string,
    operation: SyncOperationType = 'update'
  ): Promise<DualSyncOperation> {
    const strand = await getStrandByPath(path)
    if (!strand) {
      throw new Error(`Strand not found: ${path}`)
    }

    const route = determineSyncRoute(strand, this.config)
    const opId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const op: DualSyncOperation = {
      id: opId,
      strandPath: path,
      operation,
      mode: route.mode,
      targetId: route.targetId,
      payload: strand,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    this.pendingOperations.set(opId, op)

    // Emit queued event
    this.emit({
      type: 'operation-queued',
      timestamp: new Date().toISOString(),
      details: { operation: op, route },
    })

    // Execute based on mode
    await this.executeOperation(op)

    return op
  }

  /**
   * Sync multiple strands
   */
  async syncBatch(paths: string[], operation: SyncOperationType = 'update'): Promise<DualSyncOperation[]> {
    const operations: DualSyncOperation[] = []

    for (const path of paths) {
      try {
        const op = await this.syncStrand(path, operation)
        operations.push(op)
      } catch (error) {
        console.error(`[DualSync] Failed to sync ${path}:`, error)
        // Continue with other strands
      }
    }

    return operations
  }

  /**
   * Sync all pending changes
   */
  async syncAll(): Promise<{ synced: number; failed: number }> {
    const strands = await listStrands()
    let synced = 0
    let failed = 0

    for (const strand of strands) {
      const route = determineSyncRoute(strand, this.config)

      // Skip local-only strands
      if (route.mode === 'local') continue

      try {
        await this.syncStrand(strand.path)
        synced++
      } catch {
        failed++
      }
    }

    return { synced, failed }
  }

  /**
   * Change visibility of a strand and re-route sync
   */
  async changeVisibility(
    path: string,
    visibility: StrandVisibility
  ): Promise<SyncRouteResult> {
    const strand = await getStrandByPath(path)
    if (!strand) {
      throw new Error(`Strand not found: ${path}`)
    }

    // Update visibility in content
    const updatedContent = updateVisibility(strand.content, visibility)

    // Save updated strand
    await saveStrand({
      ...strand,
      content: updatedContent,
    })

    // Get new routing
    const updatedStrand = await getStrandByPath(path)
    if (!updatedStrand) {
      throw new Error(`Failed to reload strand: ${path}`)
    }

    return determineSyncRoute(updatedStrand, this.config)
  }

  /**
   * Add a sync target
   */
  addTarget(target: SyncTarget): void {
    const existing = this.config.targets.findIndex((t) => t.id === target.id)
    if (existing >= 0) {
      this.config.targets[existing] = target
    } else {
      this.config.targets.push(target)
    }
  }

  /**
   * Remove a sync target
   */
  removeTarget(targetId: string): void {
    this.config.targets = this.config.targets.filter((t) => t.id !== targetId)
  }

  /**
   * Enable/disable a sync target
   */
  setTargetEnabled(targetId: string, enabled: boolean): void {
    const target = this.config.targets.find((t) => t.id === targetId)
    if (target) {
      target.enabled = enabled
    }
  }

  /**
   * Get configured targets
   */
  getTargets(): SyncTarget[] {
    return [...this.config.targets]
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRIVATE METHODS
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Execute a sync operation based on its mode
   */
  private async executeOperation(op: DualSyncOperation): Promise<void> {
    op.status = 'in-progress'
    this.emit({
      type: 'operation-started',
      timestamp: new Date().toISOString(),
      details: { operationId: op.id },
    })

    try {
      switch (op.mode) {
        case 'local':
          // Already saved locally, nothing more to do
          break

        case 'sqlite-sync':
          await this.executeSQLiteSync(op)
          break

        case 'git-publish':
          await this.executeGitPublish(op)
          break

        case 'dual':
          // Sync to both backends
          await this.executeSQLiteSync(op)
          await this.executeGitPublish(op)
          break
      }

      op.status = 'completed'
      this.pendingOperations.delete(op.id)

      this.emit({
        type: 'operation-completed',
        timestamp: new Date().toISOString(),
        details: { operationId: op.id },
      })
    } catch (error) {
      op.status = 'failed'
      op.error = error instanceof Error ? error.message : 'Unknown error'

      this.emit({
        type: 'operation-failed',
        timestamp: new Date().toISOString(),
        details: { operationId: op.id, error: op.error },
      })
    }
  }

  /**
   * Execute SQLite sync operation
   * This would use sql-storage-adapter's createCrossPlatformSync
   * Uses configurable sync URL from syncConfig
   */
  private async executeSQLiteSync(op: DualSyncOperation): Promise<void> {
    const target = this.config.targets.find((t) => t.id === op.targetId)
    if (!target?.config?.sqliteSync) {
      console.warn('[DualSync] SQLite sync not configured, skipping')
      return
    }

    // Get the effective sync endpoint (from settings or default)
    const syncEndpoint = await getEffectiveSyncUrl()
    const apiEndpoint = await getEffectiveApiUrl()
    const usingCustom = await isUsingCustomServer()

    // TODO: Implement actual sql-storage-adapter sync
    // This is a placeholder for the actual implementation
    //
    // import { createCrossPlatformSync } from '@framers/sql-storage-adapter/sync'
    //
    // const sync = await createCrossPlatformSync({
    //   localAdapter: db,
    //   endpoint: syncEndpoint,  // Uses configurable URL
    //   apiEndpoint: apiEndpoint,
    //   authToken: target.config.sqliteSync.authToken,
    //   tables: {
    //     strands: { priority: 'high', conflictStrategy: 'merge' },
    //   },
    // })
    //
    // await sync.sync()

    console.log('[DualSync] SQLite sync:', op.strandPath, {
      endpoint: syncEndpoint,
      customServer: usingCustom,
    })
  }

  /**
   * Execute Git publish operation
   * Uses existing batch publisher infrastructure
   */
  private async executeGitPublish(op: DualSyncOperation): Promise<void> {
    const target = this.config.targets.find((t) => t.id === op.targetId)
    if (!target?.config?.gitPublish) {
      console.warn('[DualSync] Git publish not configured, skipping')
      return
    }

    // Queue for batch publish using existing infrastructure
    const syncQueue = await getSyncQueue()
    await syncQueue.enqueue(
      op.operation,
      'strand',
      op.strandPath,
      op.payload,
      'normal'
    )

    console.log('[DualSync] Queued for Git publish:', op.strandPath)
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[DualSync] Listener error:', error)
      }
    }
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.autoSyncTimer) return

    this.autoSyncTimer = setInterval(async () => {
      try {
        await this.syncAll()
      } catch (error) {
        console.error('[DualSync] Auto-sync error:', error)
      }
    }, this.config.autoSyncInterval)
  }

  /**
   * Stop auto-sync timer
   */
  private stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON & FACTORY
═══════════════════════════════════════════════════════════════════════════ */

let dualSyncManager: DualSyncManager | null = null

/**
 * Get the dual sync manager singleton
 */
export function getDualSyncManager(): DualSyncManager {
  if (!dualSyncManager) {
    dualSyncManager = new DualSyncManager({
      defaultMode: 'local',
      targets: [
        {
          id: 'local',
          name: 'Local Storage',
          mode: 'local',
          enabled: true,
        },
        {
          id: 'sqlite-sync',
          name: 'SQLite Cross-Device Sync',
          mode: 'sqlite-sync',
          enabled: false, // Enable when sync server is configured
        },
        {
          id: 'git-publish',
          name: 'Git/GitHub Publish',
          mode: 'git-publish',
          enabled: true,
          config: {
            gitPublish: {
              createPR: true,
            },
          },
        },
      ],
    })
  }
  return dualSyncManager
}

/**
 * Initialize the dual sync manager with custom config
 */
export async function initializeDualSyncManager(
  config?: Partial<DualSyncManagerConfig>
): Promise<DualSyncManager> {
  if (dualSyncManager) {
    await dualSyncManager.shutdown()
  }

  dualSyncManager = new DualSyncManager(config)
  await dualSyncManager.initialize()

  return dualSyncManager
}

/**
 * Reset the dual sync manager (for testing)
 */
export async function resetDualSyncManager(): Promise<void> {
  if (dualSyncManager) {
    await dualSyncManager.shutdown()
    dualSyncManager = null
  }
}




