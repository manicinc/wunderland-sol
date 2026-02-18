/**
 * Strand Database Views
 *
 * Table, Board, Gallery, and Timeline views for browsing strands.
 * @module components/quarry/views
 */

// Types
export * from './types'

// Components
export { default as StrandViewsPanel } from './StrandViewsPanel'
export { StrandViewSwitcher } from './StrandViewSwitcher'

// Table View
export { default as TableView } from './table/TableView'
export { TableHeader } from './table/TableHeader'
export { TableRow } from './table/TableRow'

// Board View
export { default as BoardView } from './board/BoardView'
export { BoardColumn } from './board/BoardColumn'
export { BoardCard } from './board/BoardCard'

// Gallery View
export { default as GalleryView } from './gallery/GalleryView'
export { GalleryCard } from './gallery/GalleryCard'

// Timeline View
export { default as TimelineView } from './timeline/TimelineView'
export { TimelineGroup } from './timeline/TimelineGroup'
export { TimelineItem } from './timeline/TimelineItem'

// Hooks
export { useStrandViews } from './hooks/useStrandViews'
export { useTableSort } from './hooks/useTableSort'
export { useBoardGroups } from './hooks/useBoardGroups'
export { useTimelineGroups } from './hooks/useTimelineGroups'

// Embeddable Views (Embark-inspired)
export {
  EmbeddableView,
  MapView,
  CalendarView,
  EmbeddedTableView,
  ListView,
  ChartView,
  type EmbeddableViewProps,
  type MapViewProps,
  type MapMarker,
  type CalendarViewProps,
  type CalendarEvent,
  type EmbeddedTableViewProps,
  type ListViewProps,
  type ChartViewProps,
  type ChartDataPoint,
} from './embeddable'
