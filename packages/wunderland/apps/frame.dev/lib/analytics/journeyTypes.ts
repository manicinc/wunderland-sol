/**
 * Journey Timeline Types
 * 
 * Types for the branching journey timeline feature that tracks personal growth
 * across strands, habits, rituals, and custom life events.
 * 
 * @module lib/analytics/journeyTypes
 */

// ============================================================================
// BRANCH TYPES
// ============================================================================

/**
 * Pre-defined branch colors matching the journey timeline aesthetic
 */
export const BRANCH_COLORS = {
  coral: { name: 'Coral', hex: '#f97066', light: '#fef3f2', dark: '#7f1d1d' },
  orange: { name: 'Orange', hex: '#fb923c', light: '#fff7ed', dark: '#7c2d12' },
  amber: { name: 'Amber', hex: '#fbbf24', light: '#fffbeb', dark: '#78350f' },
  teal: { name: 'Teal', hex: '#2dd4bf', light: '#f0fdfa', dark: '#134e4a' },
  cyan: { name: 'Cyan', hex: '#22d3ee', light: '#ecfeff', dark: '#164e63' },
  blue: { name: 'Blue', hex: '#60a5fa', light: '#eff6ff', dark: '#1e3a8a' },
  indigo: { name: 'Indigo', hex: '#818cf8', light: '#eef2ff', dark: '#312e81' },
  purple: { name: 'Purple', hex: '#a78bfa', light: '#f5f3ff', dark: '#4c1d95' },
  pink: { name: 'Pink', hex: '#f472b6', light: '#fdf2f8', dark: '#831843' },
  emerald: { name: 'Emerald', hex: '#34d399', light: '#ecfdf5', dark: '#064e3b' },
} as const

export type BranchColorKey = keyof typeof BRANCH_COLORS

/**
 * Branch icon options
 */
export type BranchIcon =
  | 'folder'
  | 'book'
  | 'graduation'
  | 'briefcase'
  | 'heart'
  | 'star'
  | 'flag'
  | 'target'
  | 'lightbulb'
  | 'code'
  | 'music'
  | 'camera'
  | 'plane'
  | 'home'
  | 'users'

/**
 * A branch/theme in the journey timeline
 * Branches can be nested to create hierarchies (e.g., "High School" > "10th Grade")
 */
export interface JourneyBranch {
  id: string
  name: string
  color: BranchColorKey
  icon: BranchIcon
  parentId: string | null // null = root branch
  description?: string
  createdAt: string // ISO date
  updatedAt: string // ISO date
  sortOrder: number // For manual ordering
  isCollapsed: boolean // UI state
}

/**
 * Branch with computed metadata
 */
export interface JourneyBranchWithMeta extends JourneyBranch {
  entryCount: number
  childBranches: JourneyBranchWithMeta[]
  dateRange: { start: string; end: string } | null
}

// ============================================================================
// ENTRY TYPES
// ============================================================================

/**
 * Source type for journey entries
 */
export type EntrySourceType = 'strand' | 'habit' | 'ritual' | 'custom'

/**
 * A single entry in the journey timeline
 */
export interface JourneyEntry {
  id: string
  branchId: string
  sectionId: string | null // Optional grouping within a branch (e.g., "Practicing")
  title: string
  content: string // Markdown content
  date: string // ISO date (YYYY-MM-DD)
  sourceType: EntrySourceType
  sourcePath: string | null // Path to strand or habit ID if linked
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
  sortOrder: number // For manual ordering within section
}

/**
 * Entry with computed display data
 */
export interface JourneyEntryWithMeta extends JourneyEntry {
  snippet: string // First ~100 chars of content
  branchName: string
  branchColor: BranchColorKey
  sectionName: string | null
}

/**
 * A section within a branch (optional grouping layer)
 */
export interface JourneySection {
  id: string
  branchId: string
  name: string
  dateRange: string | null // e.g., "2025" or "Jan 2025 - Mar 2025"
  sortOrder: number
  isCollapsed: boolean
}

export interface JourneySectionWithMeta extends JourneySection {
  entryCount: number
  entries: JourneyEntryWithMeta[]
}

// ============================================================================
// PERIOD TYPES (for left panel grouping)
// ============================================================================

/**
 * Period granularity for the chronological view
 */
export type PeriodGranularity = 'year' | 'quarter' | 'month' | 'week'

/**
 * A time period grouping for the left panel
 */
export interface JourneyPeriod {
  id: string // e.g., "2025", "2025-Q1", "2025-01"
  label: string // Display label, e.g., "2025", "Q1 2025", "January 2025"
  granularity: PeriodGranularity
  startDate: string // ISO date
  endDate: string // ISO date
  entryCount: number
  isCollapsed: boolean
}

/**
 * Period with nested entries
 */
export interface JourneyPeriodWithEntries extends JourneyPeriod {
  entries: JourneyEntryWithMeta[]
  childPeriods?: JourneyPeriodWithEntries[] // For hierarchical periods (year > month)
}

// ============================================================================
// VIEW STATE
// ============================================================================

/**
 * State for the journey view
 */
export interface JourneyViewState {
  selectedEntryId: string | null
  selectedBranchId: string | null
  expandedBranchIds: Set<string>
  expandedPeriodIds: Set<string>
  expandedSectionIds: Set<string>
  filterBranchIds: string[] // Empty = show all
  dateRange: { start: string; end: string } | null
  searchQuery: string
}

/**
 * Default view state
 */
export const DEFAULT_JOURNEY_VIEW_STATE: JourneyViewState = {
  selectedEntryId: null,
  selectedBranchId: null,
  expandedBranchIds: new Set(),
  expandedPeriodIds: new Set(),
  expandedSectionIds: new Set(),
  filterBranchIds: [],
  dateRange: null,
  searchQuery: '',
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Configuration for syncing strands to journey entries
 */
export interface StrandSyncConfig {
  enabled: boolean
  tagToBranchMapping: Record<string, string> // tag -> branchId
  defaultBranchId: string | null
  excludeTags: string[]
}

/**
 * Configuration for syncing habits/rituals to journey entries
 */
export interface HabitSyncConfig {
  enabled: boolean
  includeHabits: boolean
  includeRituals: boolean
  ritualBranchId: string | null
  habitBranchId: string | null
}

/**
 * Overall sync settings
 */
export interface JourneySyncSettings {
  strand: StrandSyncConfig
  habit: HabitSyncConfig
  lastSyncAt: string | null
}

export const DEFAULT_SYNC_SETTINGS: JourneySyncSettings = {
  strand: {
    enabled: true,
    tagToBranchMapping: {},
    defaultBranchId: null,
    excludeTags: [],
  },
  habit: {
    enabled: true,
    includeHabits: false,
    includeRituals: true,
    ritualBranchId: null,
    habitBranchId: null,
  },
  lastSyncAt: null,
}

// ============================================================================
// EDITOR TYPES
// ============================================================================

/**
 * Form data for creating/editing an entry
 */
export interface JourneyEntryFormData {
  branchId: string
  sectionId: string | null
  title: string
  content: string
  date: string
}

/**
 * Form data for creating/editing a branch
 */
export interface JourneyBranchFormData {
  name: string
  color: BranchColorKey
  icon: BranchIcon
  parentId: string | null
  description?: string
}

/**
 * Form data for creating/editing a section
 */
export interface JourneySectionFormData {
  branchId: string
  name: string
  dateRange: string | null
}



