/**
 * Timeline Utilities Tests
 * @module tests/unit/planner/timelineUtils
 *
 * Tests for timeline positioning, overlap detection,
 * icon/color mapping, and conversion helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTimelinePosition,
  getTimelineHeight,
  detectOverlaps,
  getOverlapIndex,
  getCategoryIcon,
  getCategoryColor,
  taskToTimelineItem,
  eventToTimelineItem,
  prepareTimelineItems,
  formatTime,
  formatTimeRange,
  formatDurationCompact,
  CATEGORY_ICONS,
  PRIORITY_COLORS,
  EVENT_COLORS,
  DEFAULT_STREAMLINED_CONFIG,
  type TimelineItem,
} from '@/lib/planner/timelineUtils'
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

const createMockTimelineItem = (overrides: Partial<TimelineItem> = {}): TimelineItem => ({
  id: 'item-1',
  type: 'task',
  title: 'Test Item',
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T10:00:00'),
  duration: 60,
  completed: false,
  color: '#3b82f6',
  icon: 'CheckSquare',
  source: createMockTask(),
  ...overrides,
})

// ============================================================================
// POSITIONING FUNCTIONS
// ============================================================================

describe('getTimelinePosition', () => {
  it('should return 0% for time at day start', () => {
    const time = new Date('2024-01-15T06:00:00')
    expect(getTimelinePosition(time, 6, 22)).toBe(0)
  })

  it('should return 100% for time at day end', () => {
    const time = new Date('2024-01-15T22:00:00')
    expect(getTimelinePosition(time, 6, 22)).toBe(100)
  })

  it('should return 50% for time at midpoint', () => {
    // 6 AM to 10 PM = 16 hours, midpoint = 2 PM
    const time = new Date('2024-01-15T14:00:00')
    expect(getTimelinePosition(time, 6, 22)).toBe(50)
  })

  it('should calculate correct position for 9:30 AM', () => {
    // 6 AM to 10 PM = 16 hours = 960 minutes
    // 9:30 AM = 3.5 hours from 6 AM = 210 minutes
    // 210 / 960 = 21.875%
    const time = new Date('2024-01-15T09:30:00')
    expect(getTimelinePosition(time, 6, 22)).toBeCloseTo(21.875)
  })

  it('should clamp time before day start to 0%', () => {
    const time = new Date('2024-01-15T05:00:00')
    expect(getTimelinePosition(time, 6, 22)).toBe(0)
  })

  it('should clamp time after day end to 100%', () => {
    const time = new Date('2024-01-15T23:30:00')
    expect(getTimelinePosition(time, 6, 22)).toBe(100)
  })

  it('should work with custom day boundaries', () => {
    // 9 AM to 5 PM = 8 hours
    const time = new Date('2024-01-15T13:00:00') // 1 PM = 4 hours in
    expect(getTimelinePosition(time, 9, 17)).toBe(50)
  })
})

describe('getTimelineHeight', () => {
  it('should calculate correct height for 1 hour event', () => {
    // 6 AM to 10 PM = 16 hours = 960 minutes
    // 60 minutes = 60/960 = 6.25%
    expect(getTimelineHeight(60, 6, 22)).toBeCloseTo(6.25)
  })

  it('should calculate correct height for 30 minute event', () => {
    expect(getTimelineHeight(30, 6, 22)).toBeCloseTo(3.125)
  })

  it('should calculate correct height for 2 hour event', () => {
    expect(getTimelineHeight(120, 6, 22)).toBeCloseTo(12.5)
  })

  it('should work with custom day boundaries', () => {
    // 9 AM to 5 PM = 8 hours = 480 minutes
    // 60 minutes = 60/480 = 12.5%
    expect(getTimelineHeight(60, 9, 17)).toBeCloseTo(12.5)
  })
})

// ============================================================================
// OVERLAP DETECTION
// ============================================================================

describe('detectOverlaps', () => {
  it('should return empty map for no overlaps', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({
        id: 'item-1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
      }),
      createMockTimelineItem({
        id: 'item-2',
        startTime: new Date('2024-01-15T11:00:00'),
        endTime: new Date('2024-01-15T12:00:00'),
      }),
    ]

    const overlaps = detectOverlaps(items)
    expect(overlaps.size).toBe(0)
  })

  it('should detect overlapping items', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({
        id: 'item-1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:30:00'),
      }),
      createMockTimelineItem({
        id: 'item-2',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
      }),
    ]

    const overlaps = detectOverlaps(items)
    expect(overlaps.size).toBe(2)
    expect(overlaps.get('item-1')).toContain('item-2')
    expect(overlaps.get('item-2')).toContain('item-1')
  })

  it('should detect multiple overlaps', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({
        id: 'item-1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
      }),
      createMockTimelineItem({
        id: 'item-2',
        startTime: new Date('2024-01-15T09:30:00'),
        endTime: new Date('2024-01-15T10:30:00'),
      }),
      createMockTimelineItem({
        id: 'item-3',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:30:00'),
      }),
    ]

    const overlaps = detectOverlaps(items)
    expect(overlaps.get('item-1')?.length).toBe(2) // overlaps with 2 and 3
    expect(overlaps.get('item-2')?.length).toBe(2) // overlaps with 1 and 3
    expect(overlaps.get('item-3')?.length).toBe(2) // overlaps with 1 and 2
  })

  it('should not detect adjacent events as overlapping', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({
        id: 'item-1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
      }),
      createMockTimelineItem({
        id: 'item-2',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
      }),
    ]

    const overlaps = detectOverlaps(items)
    expect(overlaps.size).toBe(0)
  })
})

describe('getOverlapIndex', () => {
  it('should return 0 for non-overlapping item', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({ id: 'item-1' }),
    ]
    const overlaps = new Map<string, string[]>()

    expect(getOverlapIndex('item-1', overlaps, items)).toBe(0)
  })

  it('should return correct index for overlapping items', () => {
    const items: TimelineItem[] = [
      createMockTimelineItem({
        id: 'item-1',
        startTime: new Date('2024-01-15T09:00:00'),
      }),
      createMockTimelineItem({
        id: 'item-2',
        startTime: new Date('2024-01-15T09:30:00'),
      }),
    ]
    const overlaps = new Map([
      ['item-1', ['item-2']],
      ['item-2', ['item-1']],
    ])

    expect(getOverlapIndex('item-1', overlaps, items)).toBe(0) // First by start time
    expect(getOverlapIndex('item-2', overlaps, items)).toBe(1) // Second by start time
  })
})

// ============================================================================
// ICON & COLOR MAPPING
// ============================================================================

describe('getCategoryIcon', () => {
  it('should return icon for explicit category', () => {
    const item = createMockTimelineItem({ category: 'meeting' })
    expect(getCategoryIcon(item)).toBe('Users')
  })

  it('should return icon from tag', () => {
    const item = createMockTimelineItem({ tags: ['workout'] })
    expect(getCategoryIcon(item)).toBe('Dumbbell')
  })

  it('should detect icon from title keywords', () => {
    const item = createMockTimelineItem({ title: 'Morning yoga session' })
    expect(getCategoryIcon(item)).toBe('Heart')
  })

  it('should detect coffee from title', () => {
    const item = createMockTimelineItem({ title: 'Coffee break' })
    expect(getCategoryIcon(item)).toBe('Coffee')
  })

  it('should detect meeting from title', () => {
    const item = createMockTimelineItem({ title: 'Team meeting' })
    expect(getCategoryIcon(item)).toBe('Users')
  })

  it('should return default task icon', () => {
    const item = createMockTimelineItem({ type: 'task', title: 'Random task' })
    expect(getCategoryIcon(item)).toBe('CheckSquare')
  })

  it('should return default event icon', () => {
    const item = createMockTimelineItem({ type: 'event', title: 'Random event' })
    expect(getCategoryIcon(item)).toBe('CalendarDays')
  })
})

describe('getCategoryColor', () => {
  it('should use supertag color if provided', () => {
    const item = createMockTimelineItem()
    expect(getCategoryColor(item, '#ff0000')).toBe('#ff0000')
  })

  it('should use item color if set', () => {
    const item = createMockTimelineItem({ color: '#00ff00' })
    expect(getCategoryColor(item)).toBe('#00ff00')
  })

  it('should use priority color for tasks', () => {
    const item = createMockTimelineItem({
      type: 'task',
      priority: 'urgent',
      color: '',
    })
    expect(getCategoryColor(item)).toBe(PRIORITY_COLORS.urgent)
  })

  it('should generate consistent color from title', () => {
    const item1 = createMockTimelineItem({ title: 'Test Event', color: '' })
    const item2 = createMockTimelineItem({ title: 'Test Event', color: '' })
    expect(getCategoryColor(item1)).toBe(getCategoryColor(item2))
  })
})

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

describe('taskToTimelineItem', () => {
  it('should convert task with date and time', () => {
    const task = createMockTask({
      dueDate: '2024-01-15',
      dueTime: '09:30',
      duration: 60,
    })

    const item = taskToTimelineItem(task)
    expect(item).not.toBeNull()
    expect(item?.type).toBe('task')
    expect(item?.duration).toBe(60)
  })

  it('should return null for task without time', () => {
    const task = createMockTask({ dueTime: undefined })
    expect(taskToTimelineItem(task)).toBeNull()
  })

  it('should return null for task without date', () => {
    const task = createMockTask({ dueDate: undefined })
    expect(taskToTimelineItem(task)).toBeNull()
  })

  it('should use default duration if not specified', () => {
    const task = createMockTask({ duration: undefined })
    const item = taskToTimelineItem(task)
    expect(item?.duration).toBe(30) // Default 30 minutes
  })

  it('should set completed based on status', () => {
    const completedTask = createMockTask({ status: 'completed' })
    const pendingTask = createMockTask({ status: 'pending' })

    expect(taskToTimelineItem(completedTask)?.completed).toBe(true)
    expect(taskToTimelineItem(pendingTask)?.completed).toBe(false)
  })
})

describe('eventToTimelineItem', () => {
  it('should convert event correctly', () => {
    const event = createMockEvent({
      startDatetime: '2024-01-15T10:00:00.000Z',
      endDatetime: '2024-01-15T11:30:00.000Z',
    })

    const item = eventToTimelineItem(event)
    expect(item).not.toBeNull()
    expect(item?.type).toBe('event')
    expect(item?.duration).toBe(90) // 1.5 hours
  })

  it('should return null for all-day events', () => {
    const event = createMockEvent({ allDay: true })
    expect(eventToTimelineItem(event)).toBeNull()
  })

  it('should include location if present', () => {
    const event = createMockEvent({ location: 'Conference Room A' })
    const item = eventToTimelineItem(event)
    expect(item?.location).toBe('Conference Room A')
  })

  it('should include attendee count if present', () => {
    const event = createMockEvent({
      attendees: [
        { email: 'a@test.com', responseStatus: 'accepted' },
        { email: 'b@test.com', responseStatus: 'pending' },
      ],
    })
    const item = eventToTimelineItem(event)
    expect(item?.attendeesCount).toBe(2)
  })
})

describe('prepareTimelineItems', () => {
  it('should combine tasks and events for a date', () => {
    const tasks = [
      createMockTask({
        id: 'task-1',
        dueDate: '2024-01-15',
        dueTime: '09:00',
      }),
    ]
    const events = [
      createMockEvent({
        id: 'event-1',
        startDatetime: '2024-01-15T14:00:00.000Z',
        endDatetime: '2024-01-15T15:00:00.000Z',
      }),
    ]
    const date = new Date('2024-01-15')

    const items = prepareTimelineItems(tasks, events, date)
    expect(items.length).toBe(2)
  })

  it('should filter out items from other dates', () => {
    const tasks = [
      createMockTask({ dueDate: '2024-01-15', dueTime: '09:00' }),
      createMockTask({ id: 'task-2', dueDate: '2024-01-16', dueTime: '10:00' }),
    ]
    const date = new Date('2024-01-15')

    const items = prepareTimelineItems(tasks, [], date)
    expect(items.length).toBe(1)
  })

  it('should sort items by start time', () => {
    const tasks = [
      createMockTask({ id: 'task-1', dueDate: '2024-01-15', dueTime: '14:00' }),
      createMockTask({ id: 'task-2', dueDate: '2024-01-15', dueTime: '09:00' }),
    ]
    const date = new Date('2024-01-15')

    const items = prepareTimelineItems(tasks, [], date)
    expect(items[0].id).toBe('task-2') // 9 AM comes first
    expect(items[1].id).toBe('task-1') // 2 PM comes second
  })

  it('should add overlap info when enabled', () => {
    const tasks = [
      createMockTask({ id: 'task-1', dueDate: '2024-01-15', dueTime: '09:00', duration: 90 }),
      createMockTask({ id: 'task-2', dueDate: '2024-01-15', dueTime: '09:30', duration: 60 }),
    ]
    const date = new Date('2024-01-15')

    const items = prepareTimelineItems(tasks, [], date, true)
    expect(items[0].overlaps).toContain('task-2')
    expect(items[1].overlaps).toContain('task-1')
  })

  it('should not add overlap info when disabled', () => {
    const tasks = [
      createMockTask({ id: 'task-1', dueDate: '2024-01-15', dueTime: '09:00', duration: 90 }),
      createMockTask({ id: 'task-2', dueDate: '2024-01-15', dueTime: '09:30', duration: 60 }),
    ]
    const date = new Date('2024-01-15')

    const items = prepareTimelineItems(tasks, [], date, false)
    expect(items[0].overlaps).toBeUndefined()
    expect(items[1].overlaps).toBeUndefined()
  })
})

// ============================================================================
// TIME FORMATTING
// ============================================================================

describe('formatTime', () => {
  it('should format morning time correctly', () => {
    const time = new Date('2024-01-15T09:30:00')
    expect(formatTime(time)).toMatch(/9:30\s*AM/i)
  })

  it('should format afternoon time correctly', () => {
    const time = new Date('2024-01-15T14:00:00')
    expect(formatTime(time)).toMatch(/2:00\s*PM/i)
  })

  it('should format noon correctly', () => {
    const time = new Date('2024-01-15T12:00:00')
    expect(formatTime(time)).toMatch(/12:00\s*PM/i)
  })

  it('should format midnight correctly', () => {
    const time = new Date('2024-01-15T00:00:00')
    expect(formatTime(time)).toMatch(/12:00\s*AM/i)
  })
})

describe('formatTimeRange', () => {
  it('should format same-period range correctly', () => {
    const start = new Date('2024-01-15T09:00:00')
    const end = new Date('2024-01-15T10:30:00')
    const result = formatTimeRange(start, end)
    // Should have AM/PM only once or format appropriately
    expect(result).toContain('9:00')
    expect(result).toContain('10:30')
  })

  it('should format cross-period range correctly', () => {
    const start = new Date('2024-01-15T11:00:00')
    const end = new Date('2024-01-15T13:00:00')
    const result = formatTimeRange(start, end)
    expect(result).toMatch(/AM/i)
    expect(result).toMatch(/PM/i)
  })
})

describe('formatDurationCompact', () => {
  it('should format minutes correctly', () => {
    expect(formatDurationCompact(30)).toBe('30 min')
    expect(formatDurationCompact(45)).toBe('45 min')
  })

  it('should format hours correctly', () => {
    expect(formatDurationCompact(60)).toBe('1h')
    expect(formatDurationCompact(120)).toBe('2h')
  })

  it('should format hours and minutes correctly', () => {
    expect(formatDurationCompact(90)).toBe('1h 30m')
    expect(formatDurationCompact(150)).toBe('2h 30m')
  })
})

// ============================================================================
// CONSTANTS
// ============================================================================

describe('CATEGORY_ICONS', () => {
  it('should have all common categories', () => {
    expect(CATEGORY_ICONS.meeting).toBe('Users')
    expect(CATEGORY_ICONS.workout).toBe('Dumbbell')
    expect(CATEGORY_ICONS.coffee).toBe('Coffee')
    expect(CATEGORY_ICONS.email).toBe('Mail')
    expect(CATEGORY_ICONS.code).toBe('Code')
  })

  it('should have default icon', () => {
    expect(CATEGORY_ICONS.default).toBe('Circle')
  })
})

describe('PRIORITY_COLORS', () => {
  it('should have all priority levels', () => {
    expect(PRIORITY_COLORS.low).toBeDefined()
    expect(PRIORITY_COLORS.medium).toBeDefined()
    expect(PRIORITY_COLORS.high).toBeDefined()
    expect(PRIORITY_COLORS.urgent).toBeDefined()
  })

  it('should be valid hex colors', () => {
    Object.values(PRIORITY_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

describe('DEFAULT_STREAMLINED_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_STREAMLINED_CONFIG.dayStartHour).toBe(6)
    expect(DEFAULT_STREAMLINED_CONFIG.dayEndHour).toBe(22)
    expect(DEFAULT_STREAMLINED_CONFIG.endOfWorkHour).toBe(18)
    expect(DEFAULT_STREAMLINED_CONFIG.enableOverlapDetection).toBe(true)
    expect(DEFAULT_STREAMLINED_CONFIG.cardStyle).toBe('detailed')
  })
})
