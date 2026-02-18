/**
 * Progress Aggregator
 * @module lib/import-export/utils/progressAggregator
 *
 * Aggregates progress from multiple concurrent operations into a single progress value.
 * Useful for batch imports/exports where multiple files are processed in parallel.
 */

import type { ProgressCallback } from '../core/types'

// ============================================================================
// PROGRESS AGGREGATOR
// ============================================================================

export interface ProgressItem {
  id: string
  current: number
  total: number
  weight?: number
  message?: string
}

export class ProgressAggregator {
  /**
   * Progress items being tracked
   */
  private items = new Map<string, ProgressItem>()

  /**
   * Total weight (for weighted progress calculation)
   */
  private totalWeight = 0

  /**
   * Progress callback
   */
  private callback?: ProgressCallback

  /**
   * Debounce timer
   */
  private debounceTimer: NodeJS.Timeout | null = null

  /**
   * Debounce delay (ms)
   */
  private debounceDelay: number

  /**
   * Create a new progress aggregator
   */
  constructor(callback?: ProgressCallback, debounceDelay: number = 100) {
    this.callback = callback
    this.debounceDelay = debounceDelay
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Add or update a progress item
   */
  setProgress(
    id: string,
    current: number,
    total: number,
    message?: string,
    weight: number = 1
  ): void {
    const existing = this.items.get(id)

    if (existing) {
      // Update existing item
      this.totalWeight -= existing.weight || 1
      existing.current = current
      existing.total = total
      existing.message = message
      existing.weight = weight
      this.totalWeight += weight
    } else {
      // Add new item
      this.items.set(id, {
        id,
        current,
        total,
        message,
        weight,
      })
      this.totalWeight += weight
    }

    this.emitProgress()
  }

  /**
   * Mark an item as complete
   */
  complete(id: string): void {
    const item = this.items.get(id)
    if (item) {
      item.current = item.total
      this.emitProgress()
    }
  }

  /**
   * Remove an item
   */
  remove(id: string): void {
    const item = this.items.get(id)
    if (item) {
      this.totalWeight -= item.weight || 1
      this.items.delete(id)
      this.emitProgress()
    }
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear()
    this.totalWeight = 0
    this.emitProgress()
  }

  // ==========================================================================
  // PROGRESS CALCULATION
  // ==========================================================================

  /**
   * Calculate overall progress (weighted average)
   */
  getProgress(): {
    current: number
    total: number
    percent: number
    message: string
  } {
    if (this.items.size === 0) {
      return {
        current: 0,
        total: 100,
        percent: 0,
        message: 'Ready',
      }
    }

    let weightedSum = 0
    const messages: string[] = []

    for (const item of this.items.values()) {
      const itemPercent = item.total > 0 ? (item.current / item.total) * 100 : 0
      const weight = item.weight || 1
      weightedSum += itemPercent * weight

      if (item.message) {
        messages.push(item.message)
      }
    }

    const overallPercent = this.totalWeight > 0 ? weightedSum / this.totalWeight : 0

    return {
      current: Math.round(overallPercent),
      total: 100,
      percent: overallPercent,
      message: messages.join(', ') || 'Processing...',
    }
  }

  /**
   * Get details for all items
   */
  getItems(): ProgressItem[] {
    return Array.from(this.items.values())
  }

  /**
   * Get count of items
   */
  getItemCount(): number {
    return this.items.size
  }

  /**
   * Get completed item count
   */
  getCompletedCount(): number {
    let count = 0
    for (const item of this.items.values()) {
      if (item.current >= item.total) {
        count++
      }
    }
    return count
  }

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  /**
   * Set progress callback
   */
  setCallback(callback: ProgressCallback): void {
    this.callback = callback
  }

  /**
   * Emit progress update (debounced)
   */
  private emitProgress(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      const progress = this.getProgress()
      this.callback?.(
        progress.current,
        progress.total,
        progress.message
      )
      this.debounceTimer = null
    }, this.debounceDelay)
  }

  /**
   * Force immediate progress emission (skip debounce)
   */
  emitImmediately(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    const progress = this.getProgress()
    this.callback?.(
      progress.current,
      progress.total,
      progress.message
    )
  }

  // ==========================================================================
  // FACTORY METHODS
  // ==========================================================================

  /**
   * Create a progress callback for a specific item
   */
  createItemCallback(
    id: string,
    weight: number = 1
  ): ProgressCallback {
    return (current: number, total: number, message?: string) => {
      this.setProgress(id, current, total, message, weight)
    }
  }

  /**
   * Create progress callbacks for multiple items
   */
  createItemCallbacks(
    itemIds: string[],
    weights?: number[]
  ): Map<string, ProgressCallback> {
    const callbacks = new Map<string, ProgressCallback>()

    for (let i = 0; i < itemIds.length; i++) {
      const id = itemIds[i]
      const weight = weights?.[i] || 1
      callbacks.set(id, this.createItemCallback(id, weight))
    }

    return callbacks
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a progress aggregator for batch operations
 */
export function createBatchProgressAggregator(
  itemCount: number,
  callback: ProgressCallback
): {
  aggregator: ProgressAggregator
  itemCallbacks: ProgressCallback[]
} {
  const aggregator = new ProgressAggregator(callback)

  const itemCallbacks = Array.from({ length: itemCount }, (_, i) =>
    aggregator.createItemCallback(`item-${i}`)
  )

  return {
    aggregator,
    itemCallbacks,
  }
}

/**
 * Create a two-phase progress aggregator (e.g., download + process)
 */
export function createPhaseProgressAggregator(
  callback: ProgressCallback,
  phaseWeights: number[] = [1, 1]
): {
  aggregator: ProgressAggregator
  phaseCallbacks: ProgressCallback[]
} {
  const aggregator = new ProgressAggregator(callback)

  const phaseCallbacks = phaseWeights.map((weight, i) =>
    aggregator.createItemCallback(`phase-${i}`, weight)
  )

  return {
    aggregator,
    phaseCallbacks,
  }
}
