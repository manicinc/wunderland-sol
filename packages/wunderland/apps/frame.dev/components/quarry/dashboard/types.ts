/**
 * Dashboard Type Definitions
 *
 * Types for customizable dashboard with widgets.
 * @module components/quarry/dashboard/types
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Widget identifiers
 */
export type WidgetId =
  | 'task-summary'
  | 'mini-calendar'
  | 'recent-strands'
  | 'writing-stats'
  | 'learning-progress'
  | 'quick-capture'
  | 'quick-writer'
  | 'bookmarks'
  | 'planner'
  | 'research'
  | 'templates'
  | 'clock'
  | 'ambience'
  | 'enrichment-suggestions'

/**
 * Widget IDs that appear in the left/right sidebars.
 * These should be hidden from the main dashboard grid by default
 * to prevent duplication.
 */
export const SIDEBAR_WIDGET_IDS: WidgetId[] = [
  'clock',
  'ambience',
  'quick-capture',
  'bookmarks',
  'templates',
]

/**
 * Widget size in grid units (12-column grid)
 */
export interface WidgetSize {
  w: number
  h: number
}

/**
 * Widget definition
 */
export interface DashboardWidget {
  /** Unique widget identifier */
  id: WidgetId
  /** Display title */
  title: string
  /** Widget icon */
  icon: LucideIcon
  /** Default size in grid units */
  defaultSize: WidgetSize
  /** Minimum size */
  minSize: WidgetSize
  /** Widget component */
  component: React.ComponentType<WidgetProps>
}

/**
 * Widget position in layout
 */
export interface WidgetLayout {
  /** Widget ID */
  id: WidgetId
  /** X position (0-11) */
  x: number
  /** Y position */
  y: number
  /** Width in grid units */
  w: number
  /** Height in grid units */
  h: number
  /** Whether widget is visible */
  visible: boolean
}

/**
 * Custom preset for saving user layouts
 */
export interface CustomPreset {
  /** Unique preset ID */
  id: string
  /** User-defined name */
  name: string
  /** Widget layouts */
  layouts: WidgetLayout[]
  /** When preset was created */
  createdAt: string
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Widget layouts */
  layouts: WidgetLayout[]
  /** Show welcome sidebar */
  showWelcomeSidebar: boolean
  /** Replace homepage with dashboard */
  replaceHomepage: boolean
  /** Last updated timestamp */
  updatedAt: string
  /** User-saved custom presets */
  customPresets?: CustomPreset[]
}

/**
 * Props passed to each widget component
 */
export interface WidgetProps {
  /** Current theme */
  theme: string
  /** Widget size variant */
  size: 'small' | 'medium' | 'large'
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Whether in compact mode */
  compact?: boolean
}

/**
 * Props for display-only widgets that don't need navigation (like ClockWidget)
 */
export interface DisplayWidgetProps {
  /** Current theme */
  theme: string
  /** Widget size variant */
  size: 'small' | 'medium' | 'large'
  /** Whether in compact mode */
  compact?: boolean
}

/**
 * Widget wrapper props
 */
export interface WidgetWrapperProps {
  /** Widget definition */
  widget: DashboardWidget
  /** Layout info */
  layout: WidgetLayout
  /** Theme */
  theme: string
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Remove widget handler */
  onRemove?: (id: WidgetId) => void
  /** Resize widget handler */
  onResize?: (id: WidgetId, size: 'small' | 'medium' | 'large') => void
  /** Edit mode */
  isEditing?: boolean
  /** Drag handle props from dnd-kit */
  dragHandleProps?: Record<string, unknown>
}

/**
 * Writing stats data
 */
export interface WritingStats {
  /** Total words written */
  totalWords: number
  /** Total strands created */
  strandsCreated: number
  /** Current streak (days) */
  currentStreak: number
  /** Longest streak (days) */
  longestStreak: number
  /** Words per day for last 7 days */
  wordsThisWeek: number[]
  /** Last active date */
  lastActiveDate?: string
}

/**
 * Task summary data
 */
export interface TaskSummary {
  /** Overdue tasks */
  overdue: number
  /** Tasks due today */
  dueToday: number
  /** Upcoming tasks */
  upcoming: number
  /** Completed this week */
  completedThisWeek: number
}

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  layouts: [
    // Top row - Planner (full width since clock/ambience are in sidebar)
    { id: 'planner', x: 0, y: 0, w: 12, h: 4, visible: true },
    // Second row - stats and calendar
    { id: 'task-summary', x: 0, y: 4, w: 4, h: 2, visible: true },
    { id: 'mini-calendar', x: 4, y: 4, w: 4, h: 3, visible: true },
    { id: 'writing-stats', x: 8, y: 4, w: 4, h: 2, visible: true },
    // Third row
    { id: 'recent-strands', x: 0, y: 6, w: 6, h: 2, visible: true },
    { id: 'learning-progress', x: 6, y: 6, w: 6, h: 2, visible: true },
    // Hidden by default - these are in sidebars
    { id: 'clock', x: 0, y: 10, w: 4, h: 2, visible: false },
    { id: 'ambience', x: 4, y: 10, w: 4, h: 2, visible: false },
    { id: 'quick-capture', x: 0, y: 12, w: 4, h: 2, visible: false },
    { id: 'templates', x: 4, y: 12, w: 4, h: 2, visible: false },
    { id: 'bookmarks', x: 8, y: 12, w: 4, h: 2, visible: false },
    // Also hidden by default
    { id: 'research', x: 0, y: 10, w: 4, h: 2, visible: false },
    { id: 'quick-writer', x: 0, y: 14, w: 6, h: 4, visible: false },
    { id: 'enrichment-suggestions', x: 6, y: 14, w: 6, h: 4, visible: false },
  ],
  showWelcomeSidebar: true,
  replaceHomepage: false,
  updatedAt: new Date().toISOString(),
}

/**
 * Storage key for dashboard config
 */
export const DASHBOARD_CONFIG_KEY = 'codex-dashboard-config'

/**
 * Layout preset type
 */
export type LayoutPreset = 'default' | 'compact' | 'focus' | 'minimal'

/**
 * Layout preset configurations
 */
export const LAYOUT_PRESETS: Record<LayoutPreset, { name: string; description: string; layouts: WidgetLayout[] }> = {
  default: {
    name: 'Default',
    description: 'Balanced layout with all widgets',
    layouts: DEFAULT_DASHBOARD_CONFIG.layouts,
  },
  compact: {
    name: 'Compact',
    description: 'Dense layout with smaller widgets',
    layouts: [
      { id: 'clock', x: 0, y: 0, w: 3, h: 2, visible: true },
      { id: 'ambience', x: 3, y: 0, w: 3, h: 2, visible: true },
      { id: 'task-summary', x: 6, y: 0, w: 3, h: 2, visible: true },
      { id: 'writing-stats', x: 9, y: 0, w: 3, h: 2, visible: true },
      { id: 'mini-calendar', x: 0, y: 2, w: 4, h: 3, visible: true },
      { id: 'quick-capture', x: 4, y: 2, w: 4, h: 2, visible: true },
      { id: 'recent-strands', x: 8, y: 2, w: 4, h: 2, visible: true },
      { id: 'planner', x: 0, y: 5, w: 6, h: 3, visible: true },
      { id: 'learning-progress', x: 6, y: 5, w: 6, h: 3, visible: true },
      { id: 'bookmarks', x: 0, y: 8, w: 4, h: 2, visible: true },
      { id: 'templates', x: 4, y: 8, w: 4, h: 2, visible: true },
      { id: 'research', x: 8, y: 8, w: 4, h: 2, visible: false },
    ],
  },
  focus: {
    name: 'Focus Writer',
    description: 'Writing-focused with minimal distractions',
    layouts: [
      { id: 'quick-writer', x: 0, y: 0, w: 8, h: 5, visible: true },
      { id: 'clock', x: 8, y: 0, w: 4, h: 2, visible: true },
      { id: 'ambience', x: 8, y: 2, w: 4, h: 3, visible: true },
      { id: 'writing-stats', x: 0, y: 5, w: 6, h: 2, visible: true },
      { id: 'recent-strands', x: 6, y: 5, w: 6, h: 2, visible: true },
      { id: 'planner', x: 0, y: 7, w: 8, h: 3, visible: true },
      { id: 'quick-capture', x: 8, y: 7, w: 4, h: 3, visible: true },
      { id: 'task-summary', x: 0, y: 10, w: 4, h: 2, visible: false },
      { id: 'mini-calendar', x: 4, y: 10, w: 4, h: 2, visible: false },
      { id: 'learning-progress', x: 8, y: 10, w: 4, h: 2, visible: false },
      { id: 'templates', x: 0, y: 12, w: 4, h: 2, visible: false },
      { id: 'bookmarks', x: 4, y: 12, w: 4, h: 2, visible: false },
      { id: 'research', x: 8, y: 12, w: 4, h: 2, visible: false },
    ],
  },
  minimal: {
    name: 'Minimal',
    description: 'Essential widgets only',
    layouts: [
      { id: 'planner', x: 0, y: 0, w: 12, h: 4, visible: true },
      { id: 'quick-capture', x: 0, y: 4, w: 6, h: 2, visible: true },
      { id: 'recent-strands', x: 6, y: 4, w: 6, h: 2, visible: true },
      { id: 'clock', x: 0, y: 6, w: 4, h: 2, visible: false },
      { id: 'ambience', x: 4, y: 6, w: 4, h: 2, visible: false },
      { id: 'task-summary', x: 8, y: 6, w: 4, h: 2, visible: false },
      { id: 'mini-calendar', x: 0, y: 8, w: 4, h: 2, visible: false },
      { id: 'writing-stats', x: 4, y: 8, w: 4, h: 2, visible: false },
      { id: 'learning-progress', x: 8, y: 8, w: 4, h: 2, visible: false },
      { id: 'templates', x: 0, y: 10, w: 4, h: 2, visible: false },
      { id: 'bookmarks', x: 4, y: 10, w: 4, h: 2, visible: false },
      { id: 'research', x: 8, y: 10, w: 4, h: 2, visible: false },
    ],
  },
}
