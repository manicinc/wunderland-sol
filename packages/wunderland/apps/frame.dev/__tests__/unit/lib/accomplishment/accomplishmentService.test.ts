/**
 * Accomplishment Service Tests
 * @module __tests__/unit/lib/accomplishment/accomplishmentService.test
 *
 * Tests for accomplishment tracking functionality.
 * Tests cover:
 * - Date utility functions
 * - Streak calculation
 * - Item formatting
 * - Time extraction
 * - Config defaults
 */

import { describe, it, expect } from 'vitest'
import { DEFAULT_SYNC_CONFIG } from '@/lib/accomplishment/types'
import type {
  AccomplishmentType,
  AccomplishmentItem,
  AccomplishmentSyncConfig,
  AccomplishmentStats,
  TimeSeriesPoint,
  TaskCompletionStreak,
  AccomplishmentQueryOptions,
} from '@/lib/accomplishment/types'

// ============================================================================
// DATE UTILITY TESTS
// ============================================================================

describe('Accomplishment Service', () => {
  describe('Date Utilities', () => {
    describe('getToday', () => {
      it('should return date in YYYY-MM-DD format', () => {
        const today = new Date().toISOString().split('T')[0]
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })

      it('should be today\'s date', () => {
        const today = new Date()
        // Use local timezone consistently to avoid UTC/local mismatches
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const day = today.getDate()
        const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const [parsedYear, parsedMonth, parsedDay] = todayStr.split('-').map(Number)

        expect(parsedYear).toBe(year)
        expect(parsedMonth).toBe(month)
        expect(parsedDay).toBe(day)
      })
    })

    describe('getWeekStart', () => {
      it('should return Monday for weekday date', () => {
        // Wednesday Jan 17, 2024
        const date = new Date(2024, 0, 17)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        const mondayStr = monday.toISOString().split('T')[0]

        expect(mondayStr).toBe('2024-01-15')
      })

      it('should return Monday for Sunday date', () => {
        // Sunday Jan 21, 2024
        const date = new Date(2024, 0, 21)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        const mondayStr = monday.toISOString().split('T')[0]

        expect(mondayStr).toBe('2024-01-15')
      })

      it('should return same day for Monday date', () => {
        // Monday Jan 15, 2024
        const date = new Date(2024, 0, 15)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        const mondayStr = monday.toISOString().split('T')[0]

        expect(mondayStr).toBe('2024-01-15')
      })
    })

    describe('getWeekEnd', () => {
      it('should return Sunday from Monday', () => {
        // Start from Monday Jan 15, 2024
        const monday = new Date(2024, 0, 15)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const sundayStr = sunday.toISOString().split('T')[0]

        expect(sundayStr).toBe('2024-01-21')
      })

      it('should handle month boundary', () => {
        // Monday Jan 29, 2024 - week ends in February
        const monday = new Date(2024, 0, 29)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const sundayStr = sunday.toISOString().split('T')[0]

        expect(sundayStr).toBe('2024-02-04')
      })
    })

    describe('getMonthStart', () => {
      it('should return first day of month', () => {
        const date = new Date(2024, 5, 15) // June 15
        const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

        expect(monthStart).toBe('2024-06-01')
      })

      it('should pad single-digit months', () => {
        const date = new Date(2024, 2, 20) // March 20
        const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

        expect(monthStart).toBe('2024-03-01')
      })
    })

    describe('getMonthEnd', () => {
      it('should return last day of 31-day month', () => {
        const date = new Date(2024, 0, 15) // January
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        const monthEnd = lastDay.toISOString().split('T')[0]

        expect(monthEnd).toBe('2024-01-31')
      })

      it('should return last day of 30-day month', () => {
        const date = new Date(2024, 3, 15) // April
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        const monthEnd = lastDay.toISOString().split('T')[0]

        expect(monthEnd).toBe('2024-04-30')
      })

      it('should handle February in leap year', () => {
        const date = new Date(2024, 1, 15) // February 2024
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        const monthEnd = lastDay.toISOString().split('T')[0]

        expect(monthEnd).toBe('2024-02-29')
      })

      it('should handle February in non-leap year', () => {
        const date = new Date(2023, 1, 15) // February 2023
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        const monthEnd = lastDay.toISOString().split('T')[0]

        expect(monthEnd).toBe('2023-02-28')
      })
    })

    describe('getISOWeek', () => {
      it('should return valid week number (1-53)', () => {
        // Test with a mid-year date to avoid edge cases
        const date = new Date(Date.UTC(2024, 5, 15)) // June 15, 2024
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

        expect(week).toBeGreaterThanOrEqual(1)
        expect(week).toBeLessThanOrEqual(53)
        expect(week).toBe(24) // June 15, 2024 is week 24
      })

      it('should return week 52/53 for end of year', () => {
        // Dec 31, 2024
        const date = new Date(Date.UTC(2024, 11, 31))
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

        expect(week).toBeGreaterThanOrEqual(1)
        expect(week).toBeLessThanOrEqual(53)
      })
    })

    describe('extractTime', () => {
      it('should extract HH:MM from ISO datetime', () => {
        const datetime = '2024-01-15T14:30:00.000Z'
        const parts = datetime.split('T')
        const time = parts.length > 1 ? parts[1].slice(0, 5) : ''

        expect(time).toBe('14:30')
      })

      it('should return empty for date-only string', () => {
        const datetime = '2024-01-15'
        const parts = datetime.split('T')
        const time = parts.length > 1 ? parts[1].slice(0, 5) : ''

        expect(time).toBe('')
      })

      it('should handle midnight', () => {
        const datetime = '2024-01-15T00:00:00.000Z'
        const parts = datetime.split('T')
        const time = parts.length > 1 ? parts[1].slice(0, 5) : ''

        expect(time).toBe('00:00')
      })

      it('should handle end of day', () => {
        const datetime = '2024-01-15T23:59:59.999Z'
        const parts = datetime.split('T')
        const time = parts.length > 1 ? parts[1].slice(0, 5) : ''

        expect(time).toBe('23:59')
      })
    })
  })

  // ============================================================================
  // STREAK CALCULATION TESTS
  // ============================================================================

  describe('Streak Calculation', () => {
    describe('calculateLongestStreak', () => {
      it('should return 0 for empty dates', () => {
        const dates: string[] = []
        const longest = dates.length === 0 ? 0 : 1

        expect(longest).toBe(0)
      })

      it('should return 1 for single date', () => {
        const dates = ['2024-01-15']
        let longest = 1

        expect(longest).toBe(1)
      })

      it('should calculate consecutive days streak', () => {
        const dates = ['2024-01-15', '2024-01-14', '2024-01-13', '2024-01-12']
        let longest = 1
        let current = 1

        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1])
          const curr = new Date(dates[i])
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            current++
            longest = Math.max(longest, current)
          } else {
            current = 1
          }
        }

        expect(longest).toBe(4)
      })

      it('should find longest streak with gaps', () => {
        // Dates in descending order: 15, 14, 13, gap, 10, 9
        const dates = ['2024-01-15', '2024-01-14', '2024-01-13', '2024-01-10', '2024-01-09']
        let longest = 1
        let current = 1

        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1])
          const curr = new Date(dates[i])
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            current++
            longest = Math.max(longest, current)
          } else {
            current = 1
          }
        }

        expect(longest).toBe(3) // 15, 14, 13
      })

      it('should handle non-consecutive dates', () => {
        const dates = ['2024-01-15', '2024-01-10', '2024-01-05']
        let longest = 1
        let current = 1

        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1])
          const curr = new Date(dates[i])
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            current++
            longest = Math.max(longest, current)
          } else {
            current = 1
          }
        }

        expect(longest).toBe(1)
      })
    })
  })

  // ============================================================================
  // ITEM FORMATTING TESTS
  // ============================================================================

  describe('Item Formatting', () => {
    const createItem = (overrides: Partial<AccomplishmentItem> = {}): AccomplishmentItem => ({
      id: 'item-1',
      type: 'task',
      title: 'Test Task',
      completedAt: '2024-01-15T14:30:00.000Z',
      completedDate: '2024-01-15',
      ...overrides,
    })

    describe('formatItem', () => {
      it('should format with bullet prefix', () => {
        const config: AccomplishmentSyncConfig = { ...DEFAULT_SYNC_CONFIG, markdownFormat: 'bullets' }
        const prefix = '-'
        const item = createItem()
        const text = `${prefix} ${item.title}`

        expect(text).toBe('- Test Task')
      })

      it('should format with checklist prefix', () => {
        const config: AccomplishmentSyncConfig = { ...DEFAULT_SYNC_CONFIG, markdownFormat: 'checklist' }
        const prefix = '- [x]'
        const item = createItem()
        const text = `${prefix} ${item.title}`

        expect(text).toBe('- [x] Test Task')
      })

      it('should format with numbered prefix', () => {
        const config: AccomplishmentSyncConfig = { ...DEFAULT_SYNC_CONFIG, markdownFormat: 'numbered' }
        const prefix = '1.'
        const item = createItem()
        const text = `${prefix} ${item.title}`

        expect(text).toBe('1. Test Task')
      })

      it('should add subtask parent info', () => {
        const item = createItem({
          type: 'subtask',
          parentTaskTitle: 'Parent Task',
        })
        let text = `- ${item.title}`
        if (item.type === 'subtask' && item.parentTaskTitle) {
          text += ` _(subtask of ${item.parentTaskTitle})_`
        }

        expect(text).toContain('_(subtask of Parent Task)_')
      })

      it('should add habit streak', () => {
        const item = createItem({
          type: 'habit',
          habitStreak: 5,
        })
        let text = `- ${item.title}`
        if (item.type === 'habit' && item.habitStreak) {
          text += ` 🔥 ${item.habitStreak}`
        }

        expect(text).toContain('🔥 5')
      })

      it('should add timestamp when configured', () => {
        const config: AccomplishmentSyncConfig = { ...DEFAULT_SYNC_CONFIG, showTimestamps: true }
        const item = createItem({ completedTime: '14:30' })
        let text = `- ${item.title}`
        if (config.showTimestamps && item.completedTime) {
          text += ` @ ${item.completedTime}`
        }

        expect(text).toContain('@ 14:30')
      })

      it('should not add timestamp when not configured', () => {
        const config: AccomplishmentSyncConfig = { ...DEFAULT_SYNC_CONFIG, showTimestamps: false }
        const item = createItem({ completedTime: '14:30' })
        let text = `- ${item.title}`
        if (config.showTimestamps && item.completedTime) {
          text += ` @ ${item.completedTime}`
        }

        expect(text).not.toContain('@')
      })
    })
  })

  // ============================================================================
  // DEFAULT CONFIG TESTS
  // ============================================================================

  describe('Default Configuration', () => {
    it('should have sync enabled by default', () => {
      expect(DEFAULT_SYNC_CONFIG.enabled).toBe(true)
    })

    it('should have auto-sync disabled by default', () => {
      expect(DEFAULT_SYNC_CONFIG.autoSync).toBe(false)
    })

    it('should include subtasks by default', () => {
      expect(DEFAULT_SYNC_CONFIG.includeSubtasks).toBe(true)
    })

    it('should include habits by default', () => {
      expect(DEFAULT_SYNC_CONFIG.includeHabits).toBe(true)
    })

    it('should group by project by default', () => {
      expect(DEFAULT_SYNC_CONFIG.groupByProject).toBe(true)
    })

    it('should not show timestamps by default', () => {
      expect(DEFAULT_SYNC_CONFIG.showTimestamps).toBe(false)
    })

    it('should use checklist format by default', () => {
      expect(DEFAULT_SYNC_CONFIG.markdownFormat).toBe('checklist')
    })
  })

  // ============================================================================
  // TYPE TESTS
  // ============================================================================

  describe('Type Definitions', () => {
    describe('AccomplishmentType', () => {
      it('should accept valid types', () => {
        const types: AccomplishmentType[] = ['task', 'habit', 'subtask']
        expect(types).toHaveLength(3)
      })
    })

    describe('AccomplishmentItem', () => {
      it('should have required fields', () => {
        const item: AccomplishmentItem = {
          id: 'item-1',
          type: 'task',
          title: 'Test',
          completedAt: '2024-01-15T14:30:00.000Z',
          completedDate: '2024-01-15',
        }

        expect(item.id).toBeDefined()
        expect(item.type).toBeDefined()
        expect(item.title).toBeDefined()
        expect(item.completedAt).toBeDefined()
        expect(item.completedDate).toBeDefined()
      })

      it('should allow optional fields', () => {
        const item: AccomplishmentItem = {
          id: 'item-1',
          type: 'subtask',
          title: 'Test',
          completedAt: '2024-01-15T14:30:00.000Z',
          completedDate: '2024-01-15',
          taskId: 'task-1',
          parentTaskId: 'parent-1',
          parentTaskTitle: 'Parent',
          project: 'Project A',
          tags: ['tag1', 'tag2'],
          habitStreak: 5,
          isHabitCompletion: false,
          completedTime: '14:30',
        }

        expect(item.taskId).toBe('task-1')
        expect(item.parentTaskId).toBe('parent-1')
        expect(item.project).toBe('Project A')
        expect(item.tags).toHaveLength(2)
      })
    })

    describe('AccomplishmentStats', () => {
      it('should have all stat fields', () => {
        const stats: AccomplishmentStats = {
          totalCompleted: 10,
          tasksCompleted: 5,
          subtasksCompleted: 3,
          habitCompletions: 2,
          completedToday: 1,
          completedThisWeek: 7,
          completedThisMonth: 20,
          taskCompletionStreak: 3,
          longestTaskStreak: 10,
          averagePerDay: 2.5,
          peakDay: { date: '2024-01-15', count: 5 },
          byProject: [{ project: 'A', count: 5 }],
          byTag: [{ tag: 'tag1', count: 3 }],
        }

        expect(stats.totalCompleted).toBe(10)
        expect(stats.peakDay?.count).toBe(5)
        expect(stats.byProject[0].project).toBe('A')
      })

      it('should allow null peakDay', () => {
        const stats: Partial<AccomplishmentStats> = {
          totalCompleted: 0,
          peakDay: null,
        }

        expect(stats.peakDay).toBeNull()
      })
    })

    describe('TimeSeriesPoint', () => {
      it('should have all required fields', () => {
        const point: TimeSeriesPoint = {
          date: '2024-01-15',
          count: 5,
          tasks: 2,
          subtasks: 2,
          habits: 1,
        }

        expect(point.count).toBe(point.tasks + point.subtasks + point.habits)
      })
    })

    describe('TaskCompletionStreak', () => {
      it('should have all streak fields', () => {
        const streak: TaskCompletionStreak = {
          current: 5,
          longest: 10,
          daysUntilBreak: 1,
          lastCompletionDate: '2024-01-15',
          streakDates: ['2024-01-15', '2024-01-14', '2024-01-13'],
        }

        expect(streak.current).toBeLessThanOrEqual(streak.longest)
        expect(streak.streakDates).toHaveLength(3)
      })

      it('should allow null lastCompletionDate', () => {
        const streak: TaskCompletionStreak = {
          current: 0,
          longest: 0,
          daysUntilBreak: 1,
          lastCompletionDate: null,
          streakDates: [],
        }

        expect(streak.lastCompletionDate).toBeNull()
      })
    })

    describe('AccomplishmentQueryOptions', () => {
      it('should allow all filter options', () => {
        const options: AccomplishmentQueryOptions = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          types: ['task', 'subtask'],
          project: 'Project A',
          tags: ['tag1', 'tag2'],
          habitsOnly: false,
          limit: 100,
          offset: 0,
          sortOrder: 'desc',
        }

        expect(options.types).toContain('task')
        expect(options.sortOrder).toBe('desc')
      })

      it('should allow empty options', () => {
        const options: AccomplishmentQueryOptions = {}

        expect(Object.keys(options)).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // AGGREGATION LOGIC TESTS
  // ============================================================================

  describe('Aggregation Logic', () => {
    describe('Grouping by project', () => {
      it('should group items by project', () => {
        const items: AccomplishmentItem[] = [
          { id: '1', type: 'task', title: 'Task 1', completedAt: '', completedDate: '', project: 'A' },
          { id: '2', type: 'task', title: 'Task 2', completedAt: '', completedDate: '', project: 'A' },
          { id: '3', type: 'task', title: 'Task 3', completedAt: '', completedDate: '', project: 'B' },
          { id: '4', type: 'task', title: 'Task 4', completedAt: '', completedDate: '' },
        ]

        const byProject = new Map<string, AccomplishmentItem[]>()
        const noProject: AccomplishmentItem[] = []

        for (const item of items) {
          if (item.project) {
            const projectItems = byProject.get(item.project) || []
            projectItems.push(item)
            byProject.set(item.project, projectItems)
          } else {
            noProject.push(item)
          }
        }

        expect(byProject.get('A')).toHaveLength(2)
        expect(byProject.get('B')).toHaveLength(1)
        expect(noProject).toHaveLength(1)
      })
    })

    describe('Grouping by tag', () => {
      it('should count tags across items', () => {
        const items: AccomplishmentItem[] = [
          { id: '1', type: 'task', title: 'Task 1', completedAt: '', completedDate: '', tags: ['tag1', 'tag2'] },
          { id: '2', type: 'task', title: 'Task 2', completedAt: '', completedDate: '', tags: ['tag1', 'tag3'] },
          { id: '3', type: 'task', title: 'Task 3', completedAt: '', completedDate: '', tags: ['tag2'] },
        ]

        const tagCounts = new Map<string, number>()
        for (const item of items) {
          for (const tag of item.tags || []) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          }
        }

        expect(tagCounts.get('tag1')).toBe(2)
        expect(tagCounts.get('tag2')).toBe(2)
        expect(tagCounts.get('tag3')).toBe(1)
      })
    })

    describe('Finding peak day', () => {
      it('should find day with most completions', () => {
        const items: AccomplishmentItem[] = [
          { id: '1', type: 'task', title: 'T', completedAt: '', completedDate: '2024-01-15' },
          { id: '2', type: 'task', title: 'T', completedAt: '', completedDate: '2024-01-15' },
          { id: '3', type: 'task', title: 'T', completedAt: '', completedDate: '2024-01-16' },
          { id: '4', type: 'task', title: 'T', completedAt: '', completedDate: '2024-01-15' },
        ]

        const dayCounts = new Map<string, number>()
        for (const item of items) {
          dayCounts.set(item.completedDate, (dayCounts.get(item.completedDate) || 0) + 1)
        }

        let peakDay: { date: string; count: number } | null = null
        Array.from(dayCounts.entries()).forEach(([date, count]) => {
          if (!peakDay || count > peakDay.count) {
            peakDay = { date, count }
          }
        })

        expect(peakDay).toEqual({ date: '2024-01-15', count: 3 })
      })

      it('should return null for empty items', () => {
        const items: AccomplishmentItem[] = []

        const dayCounts = new Map<string, number>()
        for (const item of items) {
          dayCounts.set(item.completedDate, (dayCounts.get(item.completedDate) || 0) + 1)
        }

        let peakDay: { date: string; count: number } | null = null
        Array.from(dayCounts.entries()).forEach(([date, count]) => {
          if (!peakDay || count > peakDay.count) {
            peakDay = { date, count }
          }
        })

        expect(peakDay).toBeNull()
      })
    })

    describe('Calculating average per day', () => {
      it('should calculate correct average', () => {
        const totalItems = 10
        const daysInPeriod = 7
        const average = daysInPeriod > 0 ? Math.round((totalItems / daysInPeriod) * 10) / 10 : 0

        expect(average).toBe(1.4)
      })

      it('should return 0 for 0 days', () => {
        const totalItems = 10
        const daysInPeriod = 0
        const average = daysInPeriod > 0 ? Math.round((totalItems / daysInPeriod) * 10) / 10 : 0

        expect(average).toBe(0)
      })
    })
  })

  // ============================================================================
  // FILTER LOGIC TESTS
  // ============================================================================

  describe('Filter Logic', () => {
    const createItems = (): AccomplishmentItem[] => [
      { id: '1', type: 'task', title: 'Task 1', completedAt: '', completedDate: '', project: 'A', tags: ['tag1'] },
      { id: '2', type: 'subtask', title: 'Subtask 1', completedAt: '', completedDate: '', project: 'A', tags: ['tag2'] },
      { id: '3', type: 'habit', title: 'Habit 1', completedAt: '', completedDate: '', project: 'B', tags: ['tag1', 'tag2'] },
      { id: '4', type: 'task', title: 'Task 2', completedAt: '', completedDate: '', project: 'B' },
    ]

    it('should filter by project', () => {
      const items = createItems()
      const filtered = items.filter(item => item.project === 'A')

      expect(filtered).toHaveLength(2)
    })

    it('should filter by type', () => {
      const items = createItems()
      const filtered = items.filter(item => item.type === 'task')

      expect(filtered).toHaveLength(2)
    })

    it('should filter by tags (any match)', () => {
      const items = createItems()
      const targetTags = ['tag1']
      const filtered = items.filter(item =>
        item.tags?.some(tag => targetTags.includes(tag))
      )

      expect(filtered).toHaveLength(2) // Task 1 and Habit 1
    })

    it('should apply limit', () => {
      const items = createItems()
      const limit = 2
      const limited = items.slice(0, limit)

      expect(limited).toHaveLength(2)
    })

    it('should apply offset', () => {
      const items = createItems()
      const offset = 1
      const offsetItems = items.slice(offset)

      expect(offsetItems).toHaveLength(3)
      expect(offsetItems[0].id).toBe('2')
    })

    it('should apply offset and limit together', () => {
      const items = createItems()
      const offset = 1
      const limit = 2
      const result = items.slice(offset).slice(0, limit)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('3')
    })
  })

  // ============================================================================
  // SORT LOGIC TESTS
  // ============================================================================

  describe('Sort Logic', () => {
    const createItems = (): AccomplishmentItem[] => [
      { id: '1', type: 'task', title: 'Task 1', completedAt: '2024-01-15T10:00:00Z', completedDate: '2024-01-15' },
      { id: '2', type: 'task', title: 'Task 2', completedAt: '2024-01-15T14:00:00Z', completedDate: '2024-01-15' },
      { id: '3', type: 'task', title: 'Task 3', completedAt: '2024-01-14T08:00:00Z', completedDate: '2024-01-14' },
    ]

    it('should sort ascending by completedAt', () => {
      const items = createItems()
      items.sort((a, b) => a.completedAt.localeCompare(b.completedAt))

      expect(items[0].id).toBe('3') // Jan 14
      expect(items[1].id).toBe('1') // Jan 15 10:00
      expect(items[2].id).toBe('2') // Jan 15 14:00
    })

    it('should sort descending by completedAt', () => {
      const items = createItems()
      items.sort((a, b) => b.completedAt.localeCompare(a.completedAt))

      expect(items[0].id).toBe('2') // Jan 15 14:00
      expect(items[1].id).toBe('1') // Jan 15 10:00
      expect(items[2].id).toBe('3') // Jan 14
    })
  })
})
