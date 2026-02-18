/**
 * EventBlock Utilities Tests
 * @module tests/unit/planner/eventBlock
 *
 * Tests for task and event position calculations in the time grid.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateTaskPosition,
  calculateEventPosition,
} from '@/components/quarry/ui/planner/EventBlock'
import type { Task, CalendarEvent } from '@/lib/planner/types'

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: '',
  taskType: 'standalone',
  status: 'pending',
  priority: 'medium',
  dueDate: '2024-01-15',
  dueTime: '09:30',
  duration: 60,
  tags: [],
  syncStatus: 'local',
  localVersion: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const createMockEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'event-1',
  title: 'Test Event',
  description: '',
  startDatetime: '2024-01-15T10:00:00.000Z',
  endDatetime: '2024-01-15T11:00:00.000Z',
  allDay: false,
  timezone: 'America/New_York',
  color: '#3b82f6',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  localVersion: 1,
  syncStatus: 'local',
  ...overrides,
})

// ============================================================================
// TASK POSITION CALCULATION
// ============================================================================

describe('calculateTaskPosition', () => {
  const startHour = 6 // 6 AM
  const slotHeight = 60 // 60px per hour

  it('should return null for task without dueTime', () => {
    const task = createMockTask({ dueTime: undefined })
    expect(calculateTaskPosition(task, startHour, slotHeight)).toBeNull()
  })

  it('should calculate correct top position for 9:30 AM task', () => {
    const task = createMockTask({ dueTime: '09:30' })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 9:30 AM = 9.5 hours, start at 6 AM
    // Offset = 3.5 hours = 210 minutes
    // Top = (210 / 60) * 60 = 210px
    expect(result?.top).toBe(210)
  })

  it('should calculate correct height for default 30 minute duration', () => {
    const task = createMockTask({ dueTime: '09:00', duration: undefined })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // Default duration is 30 minutes
    // Height = (30 / 60) * 60 = 30px
    expect(result?.height).toBe(30)
  })

  it('should calculate correct height for 60 minute duration', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 60 })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 60 minutes = 1 hour
    // Height = (60 / 60) * 60 = 60px
    expect(result?.height).toBe(60)
  })

  it('should calculate correct height for 90 minute duration', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 90 })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 90 minutes = 1.5 hours
    // Height = (90 / 60) * 60 = 90px
    expect(result?.height).toBe(90)
  })

  it('should calculate correct height for 2 hour duration', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 120 })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 120 minutes = 2 hours
    // Height = (120 / 60) * 60 = 120px
    expect(result?.height).toBe(120)
  })

  it('should calculate correct height for 15 minute duration', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 15 })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 15 minutes
    // Height = (15 / 60) * 60 = 15px, but minimum is 20px
    expect(result?.height).toBe(20)
  })

  it('should enforce minimum height of 20px for very short durations', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 5 })
    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 5 minutes would be 5px, but minimum is 20px
    expect(result?.height).toBe(20)
  })

  it('should work with different slot heights', () => {
    const task = createMockTask({ dueTime: '09:00', duration: 60 })
    const largerSlotHeight = 80 // 80px per hour

    const result = calculateTaskPosition(task, startHour, largerSlotHeight)

    // 60 minutes at 80px/hour = 80px
    expect(result?.height).toBe(80)
    // Top = 3 hours * 80px = 240px
    expect(result?.top).toBe(240)
  })

  it('should work with different start hours', () => {
    const task = createMockTask({ dueTime: '10:00', duration: 60 })
    const laterStartHour = 9 // 9 AM

    const result = calculateTaskPosition(task, laterStartHour, slotHeight)

    // 10:00 AM with 9 AM start = 1 hour offset = 60px
    expect(result?.top).toBe(60)
  })

  it('should handle midnight time correctly', () => {
    const task = createMockTask({ dueTime: '00:00', duration: 30 })
    const midnightStart = 0

    const result = calculateTaskPosition(task, midnightStart, slotHeight)

    expect(result?.top).toBe(0)
    expect(result?.height).toBe(30)
  })

  it('should handle end of day time correctly', () => {
    const task = createMockTask({ dueTime: '23:00', duration: 60 })

    const result = calculateTaskPosition(task, startHour, slotHeight)

    // 23:00 - 6:00 = 17 hours = 1020px
    expect(result?.top).toBe(1020)
  })
})

// ============================================================================
// EVENT POSITION CALCULATION
// ============================================================================

describe('calculateEventPosition', () => {
  const startHour = 6 // 6 AM
  const slotHeight = 60 // 60px per hour

  it('should calculate correct position for 10-11 AM event', () => {
    const event = createMockEvent({
      startDatetime: '2024-01-15T10:00:00',
      endDatetime: '2024-01-15T11:00:00',
    })

    const result = calculateEventPosition(event, startHour, slotHeight)

    // 10 AM - 6 AM = 4 hours = 240px top
    expect(result.top).toBe(240)
    // 1 hour duration = 60px height
    expect(result.height).toBe(60)
  })

  it('should calculate correct position for 30 minute event', () => {
    const event = createMockEvent({
      startDatetime: '2024-01-15T09:00:00',
      endDatetime: '2024-01-15T09:30:00',
    })

    const result = calculateEventPosition(event, startHour, slotHeight)

    // 9 AM - 6 AM = 3 hours = 180px top
    expect(result.top).toBe(180)
    // 30 minute duration = 30px height
    expect(result.height).toBe(30)
  })

  it('should enforce minimum height of 20px for short events', () => {
    const event = createMockEvent({
      startDatetime: '2024-01-15T09:00:00',
      endDatetime: '2024-01-15T09:10:00',
    })

    const result = calculateEventPosition(event, startHour, slotHeight)

    // 10 minutes would be 10px, but minimum is 20px
    expect(result.height).toBe(20)
  })

  it('should handle multi-hour events', () => {
    const event = createMockEvent({
      startDatetime: '2024-01-15T10:00:00',
      endDatetime: '2024-01-15T13:00:00',
    })

    const result = calculateEventPosition(event, startHour, slotHeight)

    // 3 hour duration = 180px
    expect(result.height).toBe(180)
  })
})
