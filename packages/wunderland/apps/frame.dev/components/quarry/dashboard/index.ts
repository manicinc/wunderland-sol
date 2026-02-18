/**
 * Dashboard Components
 *
 * Customizable widget-based dashboard for Quarry.
 * @module components/quarry/dashboard
 */

// Types
export * from './types'

// Main Components
export { default as Dashboard } from './Dashboard'
export { DashboardGrid } from './DashboardGrid'
export { DashboardSidebar } from './DashboardSidebar'

// Widgets
export { WidgetWrapper } from './widgets/WidgetWrapper'
export { TaskSummaryWidget } from './widgets/TaskSummaryWidget'
export { MiniCalendarWidget } from './widgets/MiniCalendarWidget'
export { RecentStrandsWidget } from './widgets/RecentStrandsWidget'
export { WritingStatsWidget } from './widgets/WritingStatsWidget'
export { LearningProgressWidget } from './widgets/LearningProgressWidget'
export { QuickCaptureWidget } from './widgets/QuickCaptureWidget'
export { BookmarksWidget } from './widgets/BookmarksWidget'
export { WIDGET_REGISTRY, getWidget, getAllWidgets } from './widgets'

// Hooks
export { useDashboardConfig } from './hooks/useDashboardConfig'
