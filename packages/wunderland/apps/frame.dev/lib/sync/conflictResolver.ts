/**
 * Conflict Resolver - Handle sync conflicts
 * @module lib/sync/conflictResolver
 *
 * Strategies for resolving conflicts when local and server state diverge.
 */

import {
  type SyncOperation,
  type ConflictStrategy,
  type ConflictData,
  type ResolutionResult,
} from './types'

/**
 * Deep merge two objects, preferring values from 'preferred'
 */
function deepMerge(base: Record<string, unknown>, preferred: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base }

  for (const key of Object.keys(preferred)) {
    const baseVal = base[key]
    const prefVal = preferred[key]

    if (
      prefVal !== null &&
      typeof prefVal === 'object' &&
      !Array.isArray(prefVal) &&
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        prefVal as Record<string, unknown>
      )
    } else if (prefVal !== undefined) {
      result[key] = prefVal
    }
  }

  return result
}

/**
 * Get timestamp from state if available
 */
function getTimestamp(state: unknown): number {
  if (!state || typeof state !== 'object') return 0
  const obj = state as Record<string, unknown>

  if (typeof obj.updatedAt === 'string') {
    return new Date(obj.updatedAt).getTime()
  }
  if (typeof obj.modifiedAt === 'string') {
    return new Date(obj.modifiedAt).getTime()
  }
  if (typeof obj.timestamp === 'string') {
    return new Date(obj.timestamp).getTime()
  }
  if (typeof obj.timestamp === 'number') {
    return obj.timestamp
  }
  return 0
}

/**
 * Detect which fields have conflicts between two states
 */
export function detectConflictFields(
  localState: unknown,
  serverState: unknown
): string[] {
  if (!localState || !serverState) return []
  if (typeof localState !== 'object' || typeof serverState !== 'object') return []

  const local = localState as Record<string, unknown>
  const server = serverState as Record<string, unknown>
  const conflicts: string[] = []

  // Check all keys in both objects
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)])

  for (const key of allKeys) {
    // Skip metadata fields
    if (['id', 'createdAt', 'updatedAt', 'modifiedAt', 'version'].includes(key)) {
      continue
    }

    const localVal = JSON.stringify(local[key])
    const serverVal = JSON.stringify(server[key])

    if (localVal !== serverVal) {
      conflicts.push(key)
    }
  }

  return conflicts
}

/**
 * Check if a conflict can be auto-resolved
 */
export function canAutoResolve(conflictData: ConflictData): boolean {
  // No conflicts = auto-resolvable
  if (conflictData.conflictFields.length === 0) return true

  // If marked as auto-resolvable
  if (conflictData.autoResolvable) return true

  // Only metadata conflicts
  const nonMetadataConflicts = conflictData.conflictFields.filter(
    (f) => !['updatedAt', 'modifiedAt', 'version', 'syncedAt'].includes(f)
  )

  return nonMetadataConflicts.length === 0
}

/**
 * Resolve a conflict using the specified strategy
 */
export function resolveConflict(
  operation: SyncOperation,
  strategy: ConflictStrategy
): ResolutionResult {
  const { conflictData } = operation

  if (!conflictData) {
    return {
      resolved: false,
      strategy,
      requiresManualReview: true,
    }
  }

  const { localState, serverState, conflictFields } = conflictData

  switch (strategy) {
    case 'local-wins':
      return {
        resolved: true,
        strategy,
        mergedState: localState,
        requiresManualReview: false,
      }

    case 'server-wins':
      return {
        resolved: true,
        strategy,
        mergedState: serverState,
        requiresManualReview: false,
      }

    case 'newest-wins': {
      const localTime = getTimestamp(localState)
      const serverTime = getTimestamp(serverState)

      if (localTime > serverTime) {
        return {
          resolved: true,
          strategy,
          mergedState: localState,
          requiresManualReview: false,
        }
      } else {
        return {
          resolved: true,
          strategy,
          mergedState: serverState,
          requiresManualReview: false,
        }
      }
    }

    case 'merge': {
      // Attempt automatic merge
      if (
        typeof localState === 'object' &&
        typeof serverState === 'object' &&
        localState !== null &&
        serverState !== null
      ) {
        const local = localState as Record<string, unknown>
        const server = serverState as Record<string, unknown>

        // Start with server state as base
        const merged = { ...server }

        // Apply local changes for non-conflicting fields
        for (const key of Object.keys(local)) {
          if (!conflictFields.includes(key)) {
            merged[key] = local[key]
          }
        }

        // For conflicting fields, use newest timestamp
        const localTime = getTimestamp(localState)
        const serverTime = getTimestamp(serverState)

        for (const field of conflictFields) {
          if (localTime > serverTime) {
            merged[field] = local[field]
          }
          // Otherwise keep server value (already in merged)
        }

        // Update timestamp
        merged.updatedAt = new Date().toISOString()
        merged.mergedAt = new Date().toISOString()

        return {
          resolved: true,
          strategy,
          mergedState: merged,
          requiresManualReview: conflictFields.length > 0,
        }
      }

      // Can't merge non-objects
      return {
        resolved: false,
        strategy,
        requiresManualReview: true,
      }
    }

    case 'manual':
    default:
      return {
        resolved: false,
        strategy,
        requiresManualReview: true,
      }
  }
}

/**
 * Get recommended resolution strategy based on conflict type
 */
export function getRecommendedStrategy(
  operation: SyncOperation
): ConflictStrategy {
  if (!operation.conflictData) return 'local-wins'

  const { conflictFields, localState, serverState } = operation.conflictData

  // No conflicts - just merge
  if (conflictFields.length === 0) return 'merge'

  // Only timestamp conflicts - use newest
  const nonTimestampConflicts = conflictFields.filter(
    (f) => !['updatedAt', 'modifiedAt', 'timestamp', 'syncedAt'].includes(f)
  )
  if (nonTimestampConflicts.length === 0) return 'newest-wins'

  // Content-related fields - try merge
  const contentFields = ['content', 'body', 'text', 'description', 'notes']
  const hasContentConflict = conflictFields.some((f) => contentFields.includes(f))
  if (hasContentConflict) return 'manual' // Content conflicts need manual review

  // Small number of conflicts - try merge
  if (conflictFields.length <= 2) return 'merge'

  // For creation operations, local wins
  if (operation.type === 'create') return 'local-wins'

  // For updates, try merge first
  if (operation.type === 'update') return 'merge'

  // Default to manual for safety
  return 'manual'
}

/**
 * Create a human-readable conflict summary
 */
export function getConflictSummary(operation: SyncOperation): string {
  if (!operation.conflictData) {
    return 'No conflict data available'
  }

  const { conflictFields } = operation.conflictData
  const fieldCount = conflictFields.length

  if (fieldCount === 0) {
    return 'No field conflicts detected'
  }

  if (fieldCount === 1) {
    return `Conflict in field: ${conflictFields[0]}`
  }

  if (fieldCount <= 3) {
    return `Conflicts in fields: ${conflictFields.join(', ')}`
  }

  return `${fieldCount} conflicting fields: ${conflictFields.slice(0, 3).join(', ')}...`
}

/**
 * Conflict resolver class for managing resolution workflows
 */
export class ConflictResolver {
  private defaultStrategy: ConflictStrategy = 'merge'

  /**
   * Set default resolution strategy
   */
  setDefaultStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy
  }

  /**
   * Resolve a conflict, optionally using a specific strategy
   */
  resolve(operation: SyncOperation, strategy?: ConflictStrategy): ResolutionResult {
    const selectedStrategy = strategy || getRecommendedStrategy(operation)
    return resolveConflict(operation, selectedStrategy)
  }

  /**
   * Batch resolve multiple conflicts
   */
  resolveAll(
    operations: SyncOperation[],
    strategy?: ConflictStrategy
  ): Map<string, ResolutionResult> {
    const results = new Map<string, ResolutionResult>()

    for (const operation of operations) {
      if (operation.status === 'conflict') {
        results.set(operation.id, this.resolve(operation, strategy))
      }
    }

    return results
  }

  /**
   * Get conflicts that require manual review
   */
  getManualReviewRequired(operations: SyncOperation[]): SyncOperation[] {
    return operations.filter((op) => {
      if (op.status !== 'conflict') return false
      const result = this.resolve(op)
      return result.requiresManualReview
    })
  }
}

// Singleton instance
let resolverInstance: ConflictResolver | null = null

/**
 * Get the singleton ConflictResolver instance
 */
export function getConflictResolver(): ConflictResolver {
  if (!resolverInstance) {
    resolverInstance = new ConflictResolver()
  }
  return resolverInstance
}
