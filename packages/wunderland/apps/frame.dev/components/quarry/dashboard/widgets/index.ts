/**
 * Dashboard Widgets
 *
 * Central export for all dashboard widget components.
 * @module components/quarry/dashboard/widgets
 */

export { TaskSummaryWidget } from './TaskSummaryWidget'
export { MiniCalendarWidget } from './MiniCalendarWidget'
export { RecentStrandsWidget } from './RecentStrandsWidget'
export { WritingStatsWidget } from './WritingStatsWidget'
export { LearningProgressWidget } from './LearningProgressWidget'
export { QuickCaptureWidget } from './QuickCaptureWidget'
export { QuickWriterWidget } from './QuickWriterWidget'
export { BookmarksWidget } from './BookmarksWidget'
export { PlannerWidget } from './PlannerWidget'
export { ResearchWidget } from './ResearchWidget'
export { TemplatesWidget } from './TemplatesWidget'
export { ClockWidget } from './ClockWidget'
export { AmbienceWidget } from './AmbienceWidget'
export { EnrichmentSuggestionsWidget } from './EnrichmentSuggestionsWidget'
export { WidgetWrapper } from './WidgetWrapper'

import {
  CheckCircle2,
  Calendar,
  CalendarDays,
  Clock,
  PenLine,
  PenSquare,
  Brain,
  Plus,
  Bookmark,
  Globe,
  FileText,
  Music,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { TaskSummaryWidget } from './TaskSummaryWidget'
import { MiniCalendarWidget } from './MiniCalendarWidget'
import { RecentStrandsWidget } from './RecentStrandsWidget'
import { WritingStatsWidget } from './WritingStatsWidget'
import { LearningProgressWidget } from './LearningProgressWidget'
import { QuickCaptureWidget } from './QuickCaptureWidget'
import { QuickWriterWidget } from './QuickWriterWidget'
import { BookmarksWidget } from './BookmarksWidget'
import { PlannerWidget } from './PlannerWidget'
import { ResearchWidget } from './ResearchWidget'
import { TemplatesWidget } from './TemplatesWidget'
import { ClockWidget } from './ClockWidget'
import { AmbienceWidget } from './AmbienceWidget'
import { EnrichmentSuggestionsWidget } from './EnrichmentSuggestionsWidget'
import type { DashboardWidget, WidgetId } from '../types'

/**
 * Widget registry - all available widgets
 */
export const WIDGET_REGISTRY: Record<WidgetId, DashboardWidget> = {
  'task-summary': {
    id: 'task-summary',
    title: 'Tasks',
    icon: CheckCircle2,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    component: TaskSummaryWidget,
  },
  'mini-calendar': {
    id: 'mini-calendar',
    title: 'Calendar',
    icon: Calendar,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    component: MiniCalendarWidget,
  },
  'recent-strands': {
    id: 'recent-strands',
    title: 'Recent',
    icon: Clock,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    component: RecentStrandsWidget,
  },
  'writing-stats': {
    id: 'writing-stats',
    title: 'Writing',
    icon: PenLine,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    component: WritingStatsWidget,
  },
  'learning-progress': {
    id: 'learning-progress',
    title: 'Learning',
    icon: Brain,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    component: LearningProgressWidget,
  },
  'quick-capture': {
    id: 'quick-capture',
    title: 'Quick Capture',
    icon: Plus,
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    component: QuickCaptureWidget,
  },
  'bookmarks': {
    id: 'bookmarks',
    title: 'Bookmarks',
    icon: Bookmark,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    component: BookmarksWidget,
  },
  'planner': {
    id: 'planner',
    title: 'Planner',
    icon: CalendarDays,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    component: PlannerWidget,
  },
  'research': {
    id: 'research',
    title: 'Research',
    icon: Globe,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    component: ResearchWidget,
  },
  'templates': {
    id: 'templates',
    title: 'Templates',
    icon: FileText,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    component: TemplatesWidget,
  },
  'clock': {
    id: 'clock',
    title: 'Clock',
    icon: Clock,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    component: ClockWidget,
  },
  'ambience': {
    id: 'ambience',
    title: 'Ambience',
    icon: Music,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    component: AmbienceWidget,
  },
  'enrichment-suggestions': {
    id: 'enrichment-suggestions',
    title: 'Suggestions',
    icon: Sparkles,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    component: EnrichmentSuggestionsWidget,
  },
  'quick-writer': {
    id: 'quick-writer',
    title: 'Quick Writer',
    icon: PenSquare,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    component: QuickWriterWidget,
  },
}

/**
 * Get widget definition by ID
 */
export function getWidget(id: WidgetId): DashboardWidget | undefined {
  return WIDGET_REGISTRY[id]
}

/**
 * Get all widget definitions
 */
export function getAllWidgets(): DashboardWidget[] {
  return Object.values(WIDGET_REGISTRY)
}
