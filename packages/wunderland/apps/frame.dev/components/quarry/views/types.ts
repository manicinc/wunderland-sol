/**
 * Type definitions for Strand Database Views
 * Table, Board, Gallery, and Timeline views for browsing strands
 * @module components/quarry/views/types
 */

import type { LucideIcon } from 'lucide-react'
import type { StrandMetadata, KnowledgeTreeNode } from '../types'

/**
 * Available view modes for strand browsing
 */
export type StrandViewMode = 'table' | 'board' | 'gallery' | 'timeline'

/**
 * Board view grouping options
 */
export type BoardGroupBy = 'status' | 'difficulty' | 'subject' | 'topic' | 'weave'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Table column definition
 */
export interface TableColumn {
  /** Unique column identifier */
  id: string
  /** Display label */
  label: string
  /** Field to extract from strand data */
  field: keyof StrandMetadata | 'path' | 'weave' | 'loom' | 'lastModified'
  /** Whether column is sortable */
  sortable: boolean
  /** Column width (px or flex) */
  width?: number | string
  /** Minimum width */
  minWidth?: number
  /** Whether column is visible by default */
  defaultVisible?: boolean
  /** Custom render function */
  render?: (strand: StrandWithPath) => React.ReactNode
}

/**
 * Strand data with path context
 */
export interface StrandWithPath {
  /** Full path from repo root */
  path: string
  /** Display title */
  title: string
  /** Parent weave name */
  weave?: string
  /** Parent loom name */
  loom?: string
  /** Parsed metadata */
  metadata: StrandMetadata
  /** Last modification date (ISO string) */
  lastModified?: string
  /** Content preview/summary */
  summary?: string
  /** Word count */
  wordCount?: number
  /** Thumbnail image URL */
  thumbnail?: string
  /** Cover image URL */
  coverImage?: string
}

/**
 * Timeline grouping period
 */
export type TimelinePeriod = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'older'

/**
 * Timeline group containing strands
 */
export interface TimelineGroup {
  /** Display label */
  label: string
  /** Group type */
  period: TimelinePeriod
  /** Strands in this group */
  strands: StrandWithPath[]
  /** Whether group is collapsed */
  isCollapsed?: boolean
}

/**
 * Board column definition
 */
export interface BoardColumn {
  /** Unique column identifier */
  id: string
  /** Display label */
  label: string
  /** Column color */
  color?: string
  /** Icon */
  icon?: LucideIcon
  /** Strands in this column */
  strands: StrandWithPath[]
  /** Whether column is collapsed */
  isCollapsed?: boolean
}

/**
 * View preferences persisted to database
 */
export interface StrandViewPreferences {
  /** Default view mode */
  defaultView: StrandViewMode
  /** Table view settings */
  table: {
    /** Visible column IDs in order */
    columns: string[]
    /** Sort by field */
    sortBy: string
    /** Sort direction */
    sortDirection: SortDirection
  }
  /** Board view settings */
  board: {
    /** Group by field */
    groupBy: BoardGroupBy
    /** Collapsed column IDs */
    collapsedColumns: string[]
  }
  /** Gallery view settings */
  gallery: {
    /** Layout mode */
    layout: 'grid' | 'masonry'
    /** Columns count */
    columns: number
  }
  /** Timeline view settings */
  timeline: {
    /** Collapsed period groups */
    collapsedGroups: TimelinePeriod[]
  }
}

/**
 * Common props for all view components
 */
export interface ViewProps {
  /** Strands to display */
  strands: StrandWithPath[]
  /** Current theme */
  theme: string
  /** Loading state */
  isLoading?: boolean
  /** Navigate to strand */
  onNavigate: (path: string) => void
  /** Edit strand metadata */
  onEdit?: (strand: StrandWithPath) => void
  /** Delete strand */
  onDelete?: (strand: StrandWithPath) => void
  /** Preferences changed */
  onPreferencesChange?: (prefs: Partial<StrandViewPreferences>) => void
}

/**
 * Table view specific props
 */
export interface TableViewProps extends ViewProps {
  /** Column definitions */
  columns: TableColumn[]
  /** Current sort field */
  sortBy: string
  /** Sort direction */
  sortDirection: SortDirection
  /** Sort change handler */
  onSort: (columnId: string) => void
  /** Column visibility change */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void
  /** Column reorder */
  onColumnReorder?: (columnIds: string[]) => void
}

/**
 * Board view specific props
 */
export interface BoardViewProps extends ViewProps {
  /** Group by field */
  groupBy: BoardGroupBy
  /** Group by change handler */
  onGroupByChange: (groupBy: BoardGroupBy) => void
  /** Strand moved between columns */
  onStrandMove?: (strandPath: string, newValue: string) => void
  /** Column collapsed/expanded */
  onColumnToggle?: (columnId: string) => void
}

/**
 * Gallery view specific props
 */
export interface GalleryViewProps extends ViewProps {
  /** Layout mode */
  layout: 'grid' | 'masonry'
  /** Layout change handler */
  onLayoutChange: (layout: 'grid' | 'masonry') => void
  /** Column count */
  columns: number
  /** Column count change handler */
  onColumnsChange: (columns: number) => void
}

/**
 * Timeline view specific props
 */
export interface TimelineViewProps extends ViewProps {
  /** Grouped strands */
  groups: TimelineGroup[]
  /** Group collapsed/expanded */
  onGroupToggle?: (period: TimelinePeriod) => void
}

/**
 * Default table columns
 */
export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'title', label: 'Title', field: 'title', sortable: true, minWidth: 200, defaultVisible: true },
  { id: 'weave', label: 'Weave', field: 'weave', sortable: true, minWidth: 100, defaultVisible: true },
  { id: 'loom', label: 'Loom', field: 'loom', sortable: true, minWidth: 100, defaultVisible: true },
  { id: 'difficulty', label: 'Difficulty', field: 'difficulty', sortable: true, width: 100, defaultVisible: true },
  { id: 'status', label: 'Status', field: 'publishing', sortable: true, width: 100, defaultVisible: true },
  { id: 'tags', label: 'Tags', field: 'tags', sortable: false, minWidth: 150, defaultVisible: true },
  { id: 'lastModified', label: 'Modified', field: 'lastModified', sortable: true, width: 120, defaultVisible: true },
]

/**
 * Default view preferences
 */
export const DEFAULT_VIEW_PREFERENCES: StrandViewPreferences = {
  defaultView: 'table',
  table: {
    columns: DEFAULT_TABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id),
    sortBy: 'title',
    sortDirection: 'asc',
  },
  board: {
    groupBy: 'status',
    collapsedColumns: [],
  },
  gallery: {
    layout: 'grid',
    columns: 3,
  },
  timeline: {
    collapsedGroups: [],
  },
}

/**
 * Board group configuration
 */
export const BOARD_GROUP_CONFIG: Record<BoardGroupBy, {
  label: string
  values: string[]
  getColor: (value: string) => string
}> = {
  status: {
    label: 'Status',
    values: ['draft', 'published', 'archived'],
    getColor: (v) => v === 'published' ? '#22c55e' : v === 'draft' ? '#f59e0b' : '#6b7280',
  },
  difficulty: {
    label: 'Difficulty',
    values: ['beginner', 'intermediate', 'advanced'],
    getColor: (v) => v === 'beginner' ? '#22c55e' : v === 'intermediate' ? '#f59e0b' : '#ef4444',
  },
  subject: {
    label: 'Subject',
    values: [], // Dynamic from data
    getColor: () => '#6366f1',
  },
  topic: {
    label: 'Topic',
    values: [], // Dynamic from data
    getColor: () => '#8b5cf6',
  },
  weave: {
    label: 'Weave',
    values: [], // Dynamic from data
    getColor: () => '#ec4899',
  },
}
