/**
 * Journey Store Tests
 * 
 * Unit tests for the journey timeline SQLite store operations.
 * Tests branch, section, and entry CRUD operations.
 * 
 * @module __tests__/unit/lib/analytics/journeyStore.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StorageAdapter } from '@framers/sql-storage-adapter'

// Mock the database module
const mockDb = {
  exec: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  all: vi.fn().mockResolvedValue([]),
}

vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn().mockResolvedValue(mockDb),
}))

// Import after mocking
import {
  createBranch,
  updateBranch,
  deleteBranch,
  getBranch,
  getAllBranches,
  getBranchesWithMeta,
  createSection,
  getSectionsForBranch,
  deleteSection,
  createEntry,
  updateEntry,
  deleteEntry,
  getEntry,
  getAllEntries,
  getEntriesByPeriod,
  getSyncSettings,
  updateSyncSettings,
} from '@/lib/analytics/journeyStore'
import type { JourneyBranchFormData, JourneyEntryFormData, JourneySectionFormData } from '@/lib/analytics/journeyTypes'

describe('Journey Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockDb.all.mockResolvedValue([])
    mockDb.run.mockResolvedValue(undefined)
    mockDb.exec.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Branch Operations', () => {
    const mockBranchFormData: JourneyBranchFormData = {
      name: 'School',
      color: 'coral',
      icon: 'graduation',
      parentId: null,
      description: 'Educational journey',
    }

    it('should create a new branch with correct properties', async () => {
      mockDb.all.mockResolvedValueOnce([{ next_order: 0 }])

      const branch = await createBranch(mockBranchFormData)

      expect(branch).toBeDefined()
      expect(branch?.name).toBe('School')
      expect(branch?.color).toBe('coral')
      expect(branch?.icon).toBe('graduation')
      expect(branch?.parentId).toBeNull()
      expect(branch?.description).toBe('Educational journey')
      expect(branch?.isCollapsed).toBe(false)
      expect(branch?.sortOrder).toBe(0)
      expect(mockDb.run).toHaveBeenCalled()
    })

    it('should update branch properties', async () => {
      const branchId = 'test-branch-id'

      await updateBranch(branchId, { name: 'Updated School', color: 'teal' })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['Updated School', 'teal'])
      )
    })

    it('should delete a branch', async () => {
      const branchId = 'test-branch-id'

      const result = await deleteBranch(branchId)

      expect(result).toBe(true)
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        [branchId]
      )
    })

    it('should get a single branch by ID', async () => {
      const mockBranchRow = {
        id: 'branch-1',
        name: 'Work',
        color: 'teal',
        icon: 'briefcase',
        parent_id: null,
        description: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        sort_order: 0,
        is_collapsed: 0,
      }
      mockDb.all.mockResolvedValueOnce([mockBranchRow])

      const branch = await getBranch('branch-1')

      expect(branch).toBeDefined()
      expect(branch?.id).toBe('branch-1')
      expect(branch?.name).toBe('Work')
      expect(branch?.isCollapsed).toBe(false)
    })

    it('should return null for non-existent branch', async () => {
      mockDb.all.mockResolvedValueOnce([])

      const branch = await getBranch('non-existent')

      expect(branch).toBeNull()
    })

    it('should get all branches sorted by order', async () => {
      const mockBranches = [
        { id: 'b1', name: 'First', color: 'coral', icon: 'folder', parent_id: null, description: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, is_collapsed: 0 },
        { id: 'b2', name: 'Second', color: 'teal', icon: 'folder', parent_id: null, description: null, created_at: '2024-01-02', updated_at: '2024-01-02', sort_order: 1, is_collapsed: 0 },
      ]
      mockDb.all.mockResolvedValueOnce(mockBranches)

      const branches = await getAllBranches()

      expect(branches).toHaveLength(2)
      expect(branches[0].name).toBe('First')
      expect(branches[1].name).toBe('Second')
    })

    it('should build branch tree with metadata', async () => {
      const mockBranches = [
        { id: 'parent', name: 'Parent', color: 'coral', icon: 'folder', parent_id: null, description: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, is_collapsed: 0 },
        { id: 'child', name: 'Child', color: 'teal', icon: 'folder', parent_id: 'parent', description: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, is_collapsed: 0 },
      ]
      const mockEntryCounts = [
        { branch_id: 'parent', count: 5, min_date: '2024-01-01', max_date: '2024-06-01' },
        { branch_id: 'child', count: 3, min_date: '2024-02-01', max_date: '2024-05-01' },
      ]

      mockDb.all
        .mockResolvedValueOnce(mockBranches)
        .mockResolvedValueOnce(mockEntryCounts)

      const branchTree = await getBranchesWithMeta()

      expect(branchTree).toHaveLength(1) // Only root branches
      expect(branchTree[0].name).toBe('Parent')
      expect(branchTree[0].entryCount).toBe(5)
      expect(branchTree[0].childBranches).toHaveLength(1)
      expect(branchTree[0].childBranches[0].name).toBe('Child')
    })
  })

  describe('Section Operations', () => {
    const mockSectionFormData: JourneySectionFormData = {
      branchId: 'branch-1',
      name: 'Q1 2024',
      dateRange: 'Jan - Mar 2024',
    }

    it('should create a new section', async () => {
      mockDb.all.mockResolvedValueOnce([{ next_order: 0 }])

      const section = await createSection(mockSectionFormData)

      expect(section).toBeDefined()
      expect(section?.name).toBe('Q1 2024')
      expect(section?.branchId).toBe('branch-1')
      expect(section?.dateRange).toBe('Jan - Mar 2024')
    })

    it('should get sections for a branch with entry counts', async () => {
      const mockSections = [
        { id: 's1', branch_id: 'b1', name: 'Section 1', date_range: '2024', sort_order: 0, is_collapsed: 0, entry_count: 3 },
      ]
      const mockEntries = [
        { id: 'e1', branch_id: 'b1', section_id: 's1', title: 'Entry 1', content: 'Test', date: '2024-01-01', source_type: 'custom', source_path: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, branch_name: 'Branch', branch_color: 'coral', section_name: 'Section 1' },
      ]

      mockDb.all
        .mockResolvedValueOnce(mockSections)
        .mockResolvedValueOnce(mockEntries)

      const sections = await getSectionsForBranch('b1')

      expect(sections).toHaveLength(1)
      expect(sections[0].name).toBe('Section 1')
      expect(sections[0].entryCount).toBe(3)
      expect(sections[0].entries).toHaveLength(1)
    })

    it('should delete a section', async () => {
      const result = await deleteSection('section-1')

      expect(result).toBe(true)
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        ['section-1']
      )
    })
  })

  describe('Entry Operations', () => {
    const mockEntryFormData: JourneyEntryFormData = {
      branchId: 'branch-1',
      sectionId: 'section-1',
      title: 'My First Day',
      content: 'Started learning about...',
      date: '2024-01-15',
    }

    it('should create a new entry', async () => {
      mockDb.all.mockResolvedValueOnce([{ next_order: 0 }])

      const entry = await createEntry(mockEntryFormData)

      expect(entry).toBeDefined()
      expect(entry?.title).toBe('My First Day')
      expect(entry?.content).toBe('Started learning about...')
      expect(entry?.sourceType).toBe('custom')
      expect(entry?.sourcePath).toBeNull()
    })

    it('should create entry with source type and path', async () => {
      mockDb.all.mockResolvedValueOnce([{ next_order: 0 }])

      const entry = await createEntry(mockEntryFormData, 'strand', '/path/to/strand.md')

      expect(entry?.sourceType).toBe('strand')
      expect(entry?.sourcePath).toBe('/path/to/strand.md')
    })

    it('should update entry properties', async () => {
      await updateEntry('entry-1', { title: 'Updated Title', content: 'New content' })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['Updated Title', 'New content'])
      )
    })

    it('should delete an entry', async () => {
      const result = await deleteEntry('entry-1')

      expect(result).toBe(true)
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        ['entry-1']
      )
    })

    it('should get entry with metadata', async () => {
      const mockEntry = {
        id: 'e1',
        branch_id: 'b1',
        section_id: 's1',
        title: 'Test Entry',
        content: 'Content here...',
        date: '2024-01-15',
        source_type: 'custom',
        source_path: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        sort_order: 0,
        branch_name: 'School',
        branch_color: 'coral',
        section_name: 'Q1',
      }
      mockDb.all.mockResolvedValueOnce([mockEntry])

      const entry = await getEntry('e1')

      expect(entry).toBeDefined()
      expect(entry?.title).toBe('Test Entry')
      expect(entry?.branchName).toBe('School')
      expect(entry?.branchColor).toBe('coral')
      expect(entry?.sectionName).toBe('Q1')
      expect(entry?.snippet).toBe('Content here...')
    })

    it('should get all entries with filters', async () => {
      const mockEntries = [
        { id: 'e1', branch_id: 'b1', section_id: null, title: 'Entry 1', content: 'Test', date: '2024-01-01', source_type: 'custom', source_path: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, branch_name: 'Branch', branch_color: 'coral', section_name: null },
        { id: 'e2', branch_id: 'b1', section_id: null, title: 'Entry 2', content: 'Test 2', date: '2024-02-01', source_type: 'custom', source_path: null, created_at: '2024-02-01', updated_at: '2024-02-01', sort_order: 1, branch_name: 'Branch', branch_color: 'coral', section_name: null },
      ]
      mockDb.all.mockResolvedValueOnce(mockEntries)

      const entries = await getAllEntries({
        branchIds: ['b1'],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      })

      expect(entries).toHaveLength(2)
      expect(entries[0].title).toBe('Entry 1')
    })

    it('should filter entries by search query', async () => {
      const mockEntries = [
        { id: 'e1', branch_id: 'b1', section_id: null, title: 'Learning JavaScript', content: 'Started with basics', date: '2024-01-01', source_type: 'custom', source_path: null, created_at: '2024-01-01', updated_at: '2024-01-01', sort_order: 0, branch_name: 'Branch', branch_color: 'coral', section_name: null },
      ]
      mockDb.all.mockResolvedValueOnce(mockEntries)

      const entries = await getAllEntries({ searchQuery: 'JavaScript' })

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining(['%JavaScript%', '%JavaScript%'])
      )
    })
  })

  describe('Period Operations', () => {
    it('should group entries by year', async () => {
      const mockEntries = [
        { id: 'e1', branch_id: 'b1', section_id: null, title: 'Jan Entry', content: '', date: '2024-01-15', source_type: 'custom', source_path: null, created_at: '2024-01-15', updated_at: '2024-01-15', sort_order: 0, branch_name: 'Branch', branch_color: 'coral', section_name: null },
        { id: 'e2', branch_id: 'b1', section_id: null, title: 'Dec Entry', content: '', date: '2024-12-15', source_type: 'custom', source_path: null, created_at: '2024-12-15', updated_at: '2024-12-15', sort_order: 1, branch_name: 'Branch', branch_color: 'coral', section_name: null },
        { id: 'e3', branch_id: 'b1', section_id: null, title: '2023 Entry', content: '', date: '2023-06-15', source_type: 'custom', source_path: null, created_at: '2023-06-15', updated_at: '2023-06-15', sort_order: 0, branch_name: 'Branch', branch_color: 'coral', section_name: null },
      ]
      mockDb.all.mockResolvedValueOnce(mockEntries)

      const periods = await getEntriesByPeriod('year')

      expect(periods).toHaveLength(2)
      expect(periods[0].label).toBe('2024') // Most recent first
      expect(periods[0].entryCount).toBe(2)
      expect(periods[1].label).toBe('2023')
      expect(periods[1].entryCount).toBe(1)
    })

    it('should return empty array when no entries', async () => {
      mockDb.all.mockResolvedValueOnce([])

      const periods = await getEntriesByPeriod('month')

      expect(periods).toHaveLength(0)
    })
  })

  describe('Sync Settings', () => {
    it('should return default settings when none stored', async () => {
      mockDb.all.mockResolvedValueOnce([])

      const settings = await getSyncSettings()

      expect(settings.strand.enabled).toBe(true)
      expect(settings.habit.enabled).toBe(true)
      expect(settings.lastSyncAt).toBeNull()
    })

    it('should merge stored settings with defaults', async () => {
      const storedSettings = {
        value: JSON.stringify({
          strand: { enabled: false },
          lastSyncAt: '2024-01-01T00:00:00Z',
        }),
      }
      mockDb.all.mockResolvedValueOnce([storedSettings])

      const settings = await getSyncSettings()

      expect(settings.strand.enabled).toBe(false)
      expect(settings.habit.enabled).toBe(true) // Default
      expect(settings.lastSyncAt).toBe('2024-01-01T00:00:00Z')
    })

    it('should update sync settings', async () => {
      mockDb.all.mockResolvedValueOnce([])

      await updateSyncSettings({ lastSyncAt: '2024-06-01T00:00:00Z' })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        expect.arrayContaining([expect.stringContaining('lastSyncAt')])
      )
    })
  })
})



