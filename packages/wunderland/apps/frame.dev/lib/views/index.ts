/**
 * Embeddable Views Module
 * @module lib/views
 *
 * @description
 * Embark-inspired embeddable views for strand documents.
 * Supports map, calendar, table, chart, and list views.
 */

export {
  // Types
  type EmbeddableViewConfig,
  type EmbeddableViewType,
  type ViewScope,
  type ViewFilter,
  type ViewSettings,
  type MapViewSettings,
  type CalendarViewSettings,
  type TableViewSettings,
  type ChartViewSettings,
  type ListViewSettings,
  type TableColumnConfig,
  type ViewDataItem,
  type ViewData,
  type ViewTypeMetadata,
  type GpxTrack,
  type GpxPoint,
  type GpxWaypoint,

  // Functions
  parseViewDeclaration,
  extractViewData,
  getDefaultViewSettings,
  createViewConfig,
  getViewTypeMetadata,
  viewSupportsmentionType,

  // Data extraction utilities
  extractPlaceData,
  extractEventData,
  extractListData,
  type ViewableData,

  // Registry
  VIEW_TYPE_REGISTRY,
} from './embeddableViews'

// GPX/KML Parser
export {
  // Types
  type GpxParseResult,
  type GpxTrackSegment,

  // Parsing functions
  parseGpx,
  parseKml,
  parseGeoFile,
  loadGeoFile,

  // Utility functions
  getAllTracks,
  getAllWaypoints,
  formatTrackStats,
} from './gpxParser'

