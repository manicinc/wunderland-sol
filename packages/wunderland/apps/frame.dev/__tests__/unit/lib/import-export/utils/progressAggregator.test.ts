/**
 * Progress Aggregator Tests
 * @module __tests__/unit/lib/import-export/utils/progressAggregator.test
 *
 * Tests for progress aggregation utility for batch operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ProgressAggregator,
  createBatchProgressAggregator,
  createPhaseProgressAggregator,
  type ProgressItem,
} from '@/lib/import-export/utils/progressAggregator'

describe('ProgressAggregator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    it('creates aggregator without callback', () => {
      const aggregator = new ProgressAggregator()
      expect(aggregator).toBeDefined()
    })

    it('creates aggregator with callback', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback)
      expect(aggregator).toBeDefined()
    })

    it('creates aggregator with custom debounce delay', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 50)
      expect(aggregator).toBeDefined()
    })
  })

  // ============================================================================
  // setProgress
  // ============================================================================

  describe('setProgress', () => {
    it('adds new progress item', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10, 'Processing...')

      const items = aggregator.getItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('item-1')
      expect(items[0].current).toBe(5)
      expect(items[0].total).toBe(10)
    })

    it('updates existing progress item', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-1', 8, 10)

      const items = aggregator.getItems()
      expect(items).toHaveLength(1)
      expect(items[0].current).toBe(8)
    })

    it('sets default weight of 1', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)

      const items = aggregator.getItems()
      expect(items[0].weight).toBe(1)
    })

    it('accepts custom weight', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10, 'Message', 2)

      const items = aggregator.getItems()
      expect(items[0].weight).toBe(2)
    })

    it('triggers debounced callback', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 100)

      aggregator.setProgress('item-1', 5, 10)

      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('debounces multiple rapid updates', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 100)

      aggregator.setProgress('item-1', 1, 10)
      aggregator.setProgress('item-1', 2, 10)
      aggregator.setProgress('item-1', 3, 10)
      aggregator.setProgress('item-1', 4, 10)

      vi.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // complete
  // ============================================================================

  describe('complete', () => {
    it('marks item as complete', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.complete('item-1')

      const items = aggregator.getItems()
      expect(items[0].current).toBe(10)
    })

    it('handles non-existent item', () => {
      const aggregator = new ProgressAggregator()
      expect(() => aggregator.complete('non-existent')).not.toThrow()
    })

    it('triggers callback on completion', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 100)

      aggregator.setProgress('item-1', 5, 10)
      vi.advanceTimersByTime(100)

      aggregator.complete('item-1')
      vi.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================================================
  // remove
  // ============================================================================

  describe('remove', () => {
    it('removes item from tracking', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-2', 3, 10)

      aggregator.remove('item-1')

      const items = aggregator.getItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('item-2')
    })

    it('updates total weight when removing', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10, undefined, 2)
      aggregator.setProgress('item-2', 3, 10, undefined, 3)

      aggregator.remove('item-1')

      // Only item-2 with weight 3 remains
      const progress = aggregator.getProgress()
      expect(progress.percent).toBeCloseTo(30) // 3/10 = 30%
    })

    it('handles non-existent item', () => {
      const aggregator = new ProgressAggregator()
      expect(() => aggregator.remove('non-existent')).not.toThrow()
    })
  })

  // ============================================================================
  // clear
  // ============================================================================

  describe('clear', () => {
    it('removes all items', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-2', 3, 10)
      aggregator.setProgress('item-3', 8, 10)

      aggregator.clear()

      expect(aggregator.getItems()).toHaveLength(0)
    })

    it('resets total weight', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10, undefined, 5)

      aggregator.clear()

      expect(aggregator.getProgress().percent).toBe(0)
    })

    it('triggers callback', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 100)

      aggregator.setProgress('item-1', 5, 10)
      vi.advanceTimersByTime(100)

      aggregator.clear()
      vi.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================================================
  // getProgress
  // ============================================================================

  describe('getProgress', () => {
    it('returns zero progress for empty aggregator', () => {
      const aggregator = new ProgressAggregator()
      const progress = aggregator.getProgress()

      expect(progress.current).toBe(0)
      expect(progress.total).toBe(100)
      expect(progress.percent).toBe(0)
      expect(progress.message).toBe('Ready')
    })

    it('calculates simple progress', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 50, 100)

      const progress = aggregator.getProgress()

      expect(progress.percent).toBe(50)
    })

    it('calculates weighted average for multiple items', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 50, 100, undefined, 1) // 50%
      aggregator.setProgress('item-2', 100, 100, undefined, 1) // 100%

      const progress = aggregator.getProgress()

      expect(progress.percent).toBe(75) // (50 + 100) / 2
    })

    it('applies weights correctly', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 0, 100, undefined, 1) // 0% weight 1
      aggregator.setProgress('item-2', 100, 100, undefined, 3) // 100% weight 3

      const progress = aggregator.getProgress()

      // (0 * 1 + 100 * 3) / 4 = 75
      expect(progress.percent).toBe(75)
    })

    it('aggregates messages', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 50, 100, 'Parsing')
      aggregator.setProgress('item-2', 30, 100, 'Converting')

      const progress = aggregator.getProgress()

      expect(progress.message).toContain('Parsing')
      expect(progress.message).toContain('Converting')
    })

    it('returns Processing... when no messages', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 50, 100)

      const progress = aggregator.getProgress()

      expect(progress.message).toBe('Processing...')
    })

    it('handles zero total correctly', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 0, 0)

      const progress = aggregator.getProgress()

      expect(progress.percent).toBe(0)
    })
  })

  // ============================================================================
  // getItems
  // ============================================================================

  describe('getItems', () => {
    it('returns all items as array', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-2', 3, 10)

      const items = aggregator.getItems()

      expect(Array.isArray(items)).toBe(true)
      expect(items).toHaveLength(2)
    })

    it('returns items with all properties', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('test-id', 5, 10, 'Test message', 2)

      const items = aggregator.getItems()
      const item = items[0]

      expect(item.id).toBe('test-id')
      expect(item.current).toBe(5)
      expect(item.total).toBe(10)
      expect(item.message).toBe('Test message')
      expect(item.weight).toBe(2)
    })
  })

  // ============================================================================
  // getItemCount
  // ============================================================================

  describe('getItemCount', () => {
    it('returns 0 for empty aggregator', () => {
      const aggregator = new ProgressAggregator()
      expect(aggregator.getItemCount()).toBe(0)
    })

    it('returns correct count', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-2', 3, 10)
      aggregator.setProgress('item-3', 8, 10)

      expect(aggregator.getItemCount()).toBe(3)
    })
  })

  // ============================================================================
  // getCompletedCount
  // ============================================================================

  describe('getCompletedCount', () => {
    it('returns 0 when no items completed', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.setProgress('item-2', 3, 10)

      expect(aggregator.getCompletedCount()).toBe(0)
    })

    it('counts completed items', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 10, 10) // complete
      aggregator.setProgress('item-2', 10, 10) // complete
      aggregator.setProgress('item-3', 5, 10) // incomplete

      expect(aggregator.getCompletedCount()).toBe(2)
    })

    it('counts items marked complete via complete()', () => {
      const aggregator = new ProgressAggregator()
      aggregator.setProgress('item-1', 5, 10)
      aggregator.complete('item-1')

      expect(aggregator.getCompletedCount()).toBe(1)
    })
  })

  // ============================================================================
  // setCallback
  // ============================================================================

  describe('setCallback', () => {
    it('sets new callback', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const aggregator = new ProgressAggregator(callback1, 100)

      aggregator.setProgress('item-1', 5, 10)
      vi.advanceTimersByTime(100)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).not.toHaveBeenCalled()

      aggregator.setCallback(callback2)
      aggregator.setProgress('item-1', 8, 10)
      vi.advanceTimersByTime(100)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // emitImmediately
  // ============================================================================

  describe('emitImmediately', () => {
    it('emits progress without waiting for debounce', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 1000)

      aggregator.setProgress('item-1', 5, 10)
      aggregator.emitImmediately()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('cancels pending debounced emission', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 1000)

      aggregator.setProgress('item-1', 5, 10) // schedules debounced emit
      aggregator.emitImmediately() // immediate emit, cancels debounced

      vi.advanceTimersByTime(1000)

      // Should only have been called once (the immediate one)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('passes correct progress values to callback', () => {
      const callback = vi.fn()
      const aggregator = new ProgressAggregator(callback, 100)

      aggregator.setProgress('item-1', 50, 100, 'Half done')
      aggregator.emitImmediately()

      expect(callback).toHaveBeenCalledWith(50, 100, 'Half done')
    })
  })

  // ============================================================================
  // createItemCallback
  // ============================================================================

  describe('createItemCallback', () => {
    it('creates callback for specific item', () => {
      const aggregator = new ProgressAggregator()
      const callback = aggregator.createItemCallback('item-1')

      callback(5, 10, 'Processing')

      const items = aggregator.getItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('item-1')
      expect(items[0].current).toBe(5)
    })

    it('creates callback with custom weight', () => {
      const aggregator = new ProgressAggregator()
      const callback = aggregator.createItemCallback('item-1', 5)

      callback(5, 10)

      const items = aggregator.getItems()
      expect(items[0].weight).toBe(5)
    })

    it('callback updates progress on each call', () => {
      const aggregator = new ProgressAggregator()
      const callback = aggregator.createItemCallback('item-1')

      callback(1, 10)
      callback(5, 10)
      callback(10, 10)

      const items = aggregator.getItems()
      expect(items[0].current).toBe(10)
    })
  })

  // ============================================================================
  // createItemCallbacks
  // ============================================================================

  describe('createItemCallbacks', () => {
    it('creates callbacks for multiple items', () => {
      const aggregator = new ProgressAggregator()
      const callbacks = aggregator.createItemCallbacks(['a', 'b', 'c'])

      expect(callbacks.size).toBe(3)
      expect(callbacks.has('a')).toBe(true)
      expect(callbacks.has('b')).toBe(true)
      expect(callbacks.has('c')).toBe(true)
    })

    it('applies weights when provided', () => {
      const aggregator = new ProgressAggregator()
      const callbacks = aggregator.createItemCallbacks(
        ['a', 'b', 'c'],
        [1, 2, 3]
      )

      callbacks.get('a')!(50, 100)
      callbacks.get('b')!(50, 100)
      callbacks.get('c')!(50, 100)

      const items = aggregator.getItems()
      expect(items.find(i => i.id === 'a')?.weight).toBe(1)
      expect(items.find(i => i.id === 'b')?.weight).toBe(2)
      expect(items.find(i => i.id === 'c')?.weight).toBe(3)
    })

    it('uses default weight when weights not provided', () => {
      const aggregator = new ProgressAggregator()
      const callbacks = aggregator.createItemCallbacks(['a', 'b'])

      callbacks.get('a')!(50, 100)

      const items = aggregator.getItems()
      expect(items[0].weight).toBe(1)
    })
  })
})

// ============================================================================
// createBatchProgressAggregator
// ============================================================================

describe('createBatchProgressAggregator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates aggregator with item callbacks', () => {
    const callback = vi.fn()
    const { aggregator, itemCallbacks } = createBatchProgressAggregator(3, callback)

    expect(aggregator).toBeInstanceOf(ProgressAggregator)
    expect(itemCallbacks).toHaveLength(3)
  })

  it('creates unique callbacks per item', () => {
    const callback = vi.fn()
    const { aggregator, itemCallbacks } = createBatchProgressAggregator(2, callback)

    itemCallbacks[0](50, 100)
    itemCallbacks[1](75, 100)

    expect(aggregator.getItemCount()).toBe(2)
  })

  it('aggregates progress from all items', () => {
    const callback = vi.fn()
    const { aggregator, itemCallbacks } = createBatchProgressAggregator(2, callback)

    itemCallbacks[0](100, 100) // 100%
    itemCallbacks[1](50, 100) // 50%

    const progress = aggregator.getProgress()
    expect(progress.percent).toBe(75) // (100 + 50) / 2
  })

  it('triggers callback on progress updates', () => {
    const callback = vi.fn()
    const { itemCallbacks } = createBatchProgressAggregator(2, callback)

    itemCallbacks[0](50, 100)
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalled()
  })
})

// ============================================================================
// createPhaseProgressAggregator
// ============================================================================

describe('createPhaseProgressAggregator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates aggregator with phase callbacks', () => {
    const callback = vi.fn()
    const { aggregator, phaseCallbacks } = createPhaseProgressAggregator(callback)

    expect(aggregator).toBeInstanceOf(ProgressAggregator)
    expect(phaseCallbacks).toHaveLength(2) // default 2 phases
  })

  it('creates specified number of phases', () => {
    const callback = vi.fn()
    const { phaseCallbacks } = createPhaseProgressAggregator(callback, [1, 2, 3])

    expect(phaseCallbacks).toHaveLength(3)
  })

  it('applies phase weights', () => {
    const callback = vi.fn()
    const { aggregator, phaseCallbacks } = createPhaseProgressAggregator(
      callback,
      [1, 3] // phase 0 weight 1, phase 1 weight 3
    )

    phaseCallbacks[0](100, 100) // 100% weight 1
    phaseCallbacks[1](0, 100) // 0% weight 3

    const progress = aggregator.getProgress()
    // (100 * 1 + 0 * 3) / 4 = 25
    expect(progress.percent).toBe(25)
  })

  it('calculates correct progress for two-phase operation', () => {
    const callback = vi.fn()
    const { aggregator, phaseCallbacks } = createPhaseProgressAggregator(
      callback,
      [1, 1]
    )

    // Phase 1: Download complete
    phaseCallbacks[0](100, 100)

    // Phase 2: Process 50% done
    phaseCallbacks[1](50, 100)

    const progress = aggregator.getProgress()
    expect(progress.percent).toBe(75) // (100 + 50) / 2
  })
})

// ============================================================================
// ProgressItem type
// ============================================================================

describe('ProgressItem type', () => {
  it('accepts complete item', () => {
    const item: ProgressItem = {
      id: 'test-item',
      current: 50,
      total: 100,
      weight: 2,
      message: 'Processing...',
    }

    expect(item.id).toBe('test-item')
    expect(item.current).toBe(50)
    expect(item.total).toBe(100)
    expect(item.weight).toBe(2)
    expect(item.message).toBe('Processing...')
  })

  it('accepts minimal item', () => {
    const item: ProgressItem = {
      id: 'minimal',
      current: 0,
      total: 100,
    }

    expect(item.weight).toBeUndefined()
    expect(item.message).toBeUndefined()
  })
})
