/**
 * Embeddable Views System
 * @module lib/views/embeddableViews
 *
 * @description
 * Embark-inspired embeddable views that can be rendered within strand documents.
 * Views can visualize mentions, structured data, and formula results.
 *
 * View types:
 * - Map: Visualize places and routes
 * - Calendar: Visualize dates and events
 * - Table: Structured data tables with computed fields
 * - Chart: Simple visualizations of numeric data
 */

import type { MentionableEntity } from '@/lib/mentions/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Base interface for all embeddable views
 */
export interface EmbeddableViewConfig {
  /** Unique view ID */
  id: string
  /** View type */
  type: EmbeddableViewType
  /** View title (optional) */
  title?: string
  /** Source scope - which part of document to read data from */
  scope: ViewScope
  /** Filter criteria */
  filter?: ViewFilter
  /** View-specific settings */
  settings: ViewSettings
  /** Position in document (line number or block ID) */
  position?: {
    line?: number
    blockId?: string
    inline?: boolean
  }
  /** Size constraints */
  size?: {
    width?: number | string
    height?: number | string
    minHeight?: number
    maxHeight?: number
  }
}

/**
 * Available embeddable view types
 */
export type EmbeddableViewType = 'map' | 'calendar' | 'table' | 'chart' | 'list'

/**
 * Data scope for the view
 */
export interface ViewScope {
  /** Scope type */
  type: 'document' | 'subtree' | 'block' | 'selection' | 'query'
  /** For subtree/block scope: the root path or block ID */
  root?: string
  /** For query scope: the query expression */
  query?: string
  /** Include children of matched items */
  includeChildren?: boolean
  /** Depth limit for subtree scope */
  depth?: number
}

/**
 * Filter criteria for view data
 */
export interface ViewFilter {
  /** Filter by mention types */
  mentionTypes?: string[]
  /** Filter by supertag */
  supertags?: string[]
  /** Filter by date range */
  dateRange?: {
    start?: string // ISO date
    end?: string   // ISO date
  }
  /** Custom filter expression */
  expression?: string
}

/**
 * Union type for view-specific settings
 */
export type ViewSettings = MapViewSettings | CalendarViewSettings | TableViewSettings | ChartViewSettings | ListViewSettings

/**
 * Map view settings
 */
export interface MapViewSettings {
  type: 'map'
  /** Initial map center */
  center?: { lat: number; lng: number }
  /** Initial zoom level */
  zoom?: number
  /** Map style */
  style?: 'street' | 'satellite' | 'terrain' | 'dark'
  /** Show route between places */
  showRoutes?: boolean
  /** Route mode */
  routeMode?: 'drive' | 'walk' | 'transit'
  /** Cluster nearby markers */
  clusterMarkers?: boolean
  /** Show marker labels */
  showLabels?: boolean
  /** Custom marker colors by type */
  markerColors?: Record<string, string>
  /** GPX track data (for hiking/cycling routes) */
  gpxTracks?: GpxTrack[]
  /** Show GPX track elevation profile */
  showElevation?: boolean
  /** Track line style */
  trackStyle?: 'solid' | 'dashed' | 'dotted'
  /** Track line width */
  trackWidth?: number
}

/**
 * GPX Track data structure
 */
export interface GpxTrack {
  /** Track name */
  name: string
  /** Track type (hiking, cycling, etc.) */
  type?: 'hiking' | 'cycling' | 'running' | 'driving' | 'other'
  /** Track color */
  color?: string
  /** Track points */
  points: GpxPoint[]
  /** Track waypoints (named locations) */
  waypoints?: GpxWaypoint[]
  /** Total distance in meters */
  distance?: number
  /** Total elevation gain in meters */
  elevationGain?: number
  /** Total duration in seconds */
  duration?: number
}

/**
 * GPX Track point
 */
export interface GpxPoint {
  lat: number
  lng: number
  ele?: number
  time?: string
}

/**
 * GPX Waypoint (named location on track)
 */
export interface GpxWaypoint {
  name: string
  lat: number
  lng: number
  ele?: number
  sym?: string
  type?: string
}

/**
 * Calendar view settings
 */
export interface CalendarViewSettings {
  type: 'calendar'
  /** Calendar mode */
  mode: 'month' | 'week' | 'day' | 'agenda'
  /** Initial date */
  initialDate?: string
  /** Show time slots */
  showTimeSlots?: boolean
  /** Slot duration in minutes */
  slotDuration?: number
  /** Working hours start */
  workingHoursStart?: number
  /** Working hours end */
  workingHoursEnd?: number
  /** Event colors by category */
  eventColors?: Record<string, string>
  /** Show weather overlays */
  showWeather?: boolean
}

/**
 * Table view settings
 */
export interface TableViewSettings {
  type: 'table'
  /** Column definitions */
  columns: TableColumnConfig[]
  /** Sort by column */
  sortBy?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Group by column */
  groupBy?: string
  /** Show row numbers */
  showRowNumbers?: boolean
  /** Compact mode */
  compact?: boolean
  /** Editable */
  editable?: boolean
}

/**
 * Table column configuration
 */
export interface TableColumnConfig {
  /** Column ID */
  id: string
  /** Display label */
  label: string
  /** Field path (supports dot notation) */
  field: string
  /** Column width */
  width?: number | string
  /** Alignment */
  align?: 'left' | 'center' | 'right'
  /** Format type */
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean'
  /** Formula to compute value */
  formula?: string
  /** Sortable */
  sortable?: boolean
}

/**
 * Chart view settings
 */
export interface ChartViewSettings {
  type: 'chart'
  /** Chart type */
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area'
  /** X-axis field */
  xField?: string
  /** Y-axis field */
  yField?: string
  /** Group/series field */
  groupField?: string
  /** Aggregation function */
  aggregate?: 'sum' | 'average' | 'count' | 'min' | 'max'
  /** Show legend */
  showLegend?: boolean
  /** Show data labels */
  showLabels?: boolean
  /** Chart colors */
  colors?: string[]
}

/**
 * List view settings
 */
export interface ListViewSettings {
  type: 'list'
  /** List style */
  style: 'bullet' | 'numbered' | 'checklist' | 'cards'
  /** Display fields */
  displayFields?: string[]
  /** Group by field */
  groupBy?: string
  /** Sort by field */
  sortBy?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Show icons */
  showIcons?: boolean
  /** Compact mode */
  compact?: boolean
}

/**
 * Data item for views
 */
export interface ViewDataItem {
  /** Unique ID */
  id: string
  /** Source (mention, block, etc.) */
  source: {
    type: 'mention' | 'block' | 'supertag' | 'formula'
    id: string
    path?: string
  }
  /** Entity data */
  entity: MentionableEntity | Record<string, unknown>
  /** Computed fields */
  computed?: Record<string, unknown>
}

/**
 * Parsed view data ready for rendering
 */
export interface ViewData {
  /** Items to display */
  items: ViewDataItem[]
  /** Aggregated values */
  aggregates?: Record<string, unknown>
  /** Grouping structure */
  groups?: Array<{
    key: string
    label: string
    items: ViewDataItem[]
    aggregates?: Record<string, unknown>
  }>
}

// ============================================================================
// VIEW PARSING
// ============================================================================

/**
 * Parse a view declaration from markdown
 *
 * View syntax in markdown:
 * ```view:map
 * title: My Trip Locations
 * scope: subtree
 * filter: mentionTypes=place
 * zoom: 12
 * showRoutes: true
 * ```
 */
export function parseViewDeclaration(content: string): EmbeddableViewConfig | null {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return null

  const config: Partial<EmbeddableViewConfig> = {
    id: `view-${Date.now()}`,
    settings: {} as ViewSettings,
    scope: { type: 'document' },
  }

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    if (!key || valueParts.length === 0) continue

    const value = valueParts.join(':').trim()

    switch (key.trim().toLowerCase()) {
      case 'type':
        config.type = value as EmbeddableViewType
        break
      case 'title':
        config.title = value
        break
      case 'scope':
        config.scope = { type: value as ViewScope['type'] }
        break
      case 'filter':
        config.filter = parseFilterString(value)
        break
      default:
        // Add to settings
        ;(config.settings as unknown as Record<string, unknown>)[key.trim()] = parseValue(value)
    }
  }

  // Ensure type is in settings
  if (config.type && config.settings) {
    (config.settings as unknown as Record<string, unknown>).type = config.type
  }

  if (!config.type) return null

  return config as EmbeddableViewConfig
}

/**
 * Parse filter string into ViewFilter
 */
function parseFilterString(filterStr: string): ViewFilter {
  const filter: ViewFilter = {}
  const parts = filterStr.split(',').map(s => s.trim())

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (!key || !value) continue

    switch (key.trim()) {
      case 'mentionTypes':
        filter.mentionTypes = value.split('|')
        break
      case 'supertags':
        filter.supertags = value.split('|')
        break
      case 'dateStart':
        filter.dateRange = { ...filter.dateRange, start: value }
        break
      case 'dateEnd':
        filter.dateRange = { ...filter.dateRange, end: value }
        break
      case 'expression':
        filter.expression = value
        break
    }
  }

  return filter
}

/**
 * Parse a value string into appropriate type
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false

  // Number
  const num = parseFloat(value)
  if (!isNaN(num) && String(num) === value) return num

  // Array (comma-separated)
  if (value.includes(',') && !value.includes(':')) {
    return value.split(',').map(s => parseValue(s.trim()))
  }

  // Object (simple key:value pairs)
  if (value.includes(':') && value.includes(',')) {
    const obj: Record<string, unknown> = {}
    const pairs = value.split(',')
    for (const pair of pairs) {
      const [k, v] = pair.split(':')
      if (k && v) obj[k.trim()] = parseValue(v.trim())
    }
    return obj
  }

  // String
  return value
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

/**
 * Extract view data from mentions based on config
 */
export function extractViewData(
  mentions: MentionableEntity[],
  config: EmbeddableViewConfig
): ViewData {
  let items: ViewDataItem[] = mentions.map(mention => ({
    id: mention.id,
    source: {
      type: 'mention',
      id: mention.id,
      path: mention.sourceStrandPath,
    },
    entity: mention,
  }))

  // Apply filters
  if (config.filter) {
    if (config.filter.mentionTypes && config.filter.mentionTypes.length > 0) {
      items = items.filter(item => {
        const entity = item.entity as MentionableEntity
        return config.filter!.mentionTypes!.includes(entity.type)
      })
    }

    if (config.filter.dateRange) {
      const { start, end } = config.filter.dateRange
      items = items.filter(item => {
        const entity = item.entity as MentionableEntity
        if (entity.type !== 'date' && entity.type !== 'event') return true
        const props = entity.properties as { date?: string; start?: string }
        const date = props.date || props.start
        if (!date) return true
        if (start && date < start) return false
        if (end && date > end) return false
        return true
      })
    }
  }

  // Build result
  const result: ViewData = { items }

  // Grouping
  const settings = config.settings
  let groupBy: string | undefined

  if ('groupBy' in settings && settings.groupBy) {
    groupBy = settings.groupBy
  }

  if (groupBy) {
    const groups = new Map<string, ViewDataItem[]>()

    for (const item of items) {
      const entity = item.entity as Record<string, unknown>
      const props = (entity.properties ?? {}) as Record<string, unknown>
      const value = String(entity[groupBy] ?? props[groupBy] ?? 'Other')

      if (!groups.has(value)) {
        groups.set(value, [])
      }
      groups.get(value)!.push(item)
    }

    result.groups = Array.from(groups.entries()).map(([key, groupItems]) => ({
      key,
      label: key,
      items: groupItems,
    }))
  }

  return result
}

// ============================================================================
// VIEW DEFAULTS
// ============================================================================

/**
 * Get default settings for a view type
 */
export function getDefaultViewSettings(type: EmbeddableViewType): ViewSettings {
  switch (type) {
    case 'map':
      return {
        type: 'map',
        zoom: 12,
        style: 'street',
        showRoutes: false,
        clusterMarkers: true,
        showLabels: true,
      }
    case 'calendar':
      return {
        type: 'calendar',
        mode: 'month',
        showTimeSlots: true,
        slotDuration: 30,
        workingHoursStart: 9,
        workingHoursEnd: 17,
      }
    case 'table':
      return {
        type: 'table',
        columns: [],
        showRowNumbers: false,
        compact: false,
        editable: false,
      }
    case 'chart':
      return {
        type: 'chart',
        chartType: 'bar',
        aggregate: 'count',
        showLegend: true,
        showLabels: true,
      }
    case 'list':
      return {
        type: 'list',
        style: 'bullet',
        showIcons: true,
        compact: false,
      }
  }
}

/**
 * Create a new view config with defaults
 */
export function createViewConfig(
  type: EmbeddableViewType,
  overrides?: Partial<EmbeddableViewConfig>
): EmbeddableViewConfig {
  return {
    id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    scope: { type: 'document' },
    settings: getDefaultViewSettings(type),
    ...overrides,
  }
}

// ============================================================================
// VIEW REGISTRY
// ============================================================================

/**
 * Registered view type metadata
 */
export interface ViewTypeMetadata {
  type: EmbeddableViewType
  label: string
  description: string
  icon: string
  supportedMentionTypes: string[]
  requiredFields?: string[]
}

/**
 * Registry of available view types
 */
export const VIEW_TYPE_REGISTRY: ViewTypeMetadata[] = [
  {
    type: 'map',
    label: 'Map View',
    description: 'Visualize places and routes on an interactive map',
    icon: 'Map',
    supportedMentionTypes: ['place', 'event'],
    requiredFields: ['latitude', 'longitude'],
  },
  {
    type: 'calendar',
    label: 'Calendar View',
    description: 'Display events and dates on a calendar',
    icon: 'Calendar',
    supportedMentionTypes: ['date', 'event'],
    requiredFields: ['date', 'start'],
  },
  {
    type: 'table',
    label: 'Table View',
    description: 'Structured data table with columns and sorting',
    icon: 'Table',
    supportedMentionTypes: ['*'],
  },
  {
    type: 'chart',
    label: 'Chart View',
    description: 'Visualize numeric data as charts',
    icon: 'BarChart',
    supportedMentionTypes: ['*'],
  },
  {
    type: 'list',
    label: 'List View',
    description: 'Simple list of items with grouping',
    icon: 'List',
    supportedMentionTypes: ['*'],
  },
]

/**
 * Get view type metadata
 */
export function getViewTypeMetadata(type: EmbeddableViewType): ViewTypeMetadata | undefined {
  return VIEW_TYPE_REGISTRY.find(v => v.type === type)
}

/**
 * Check if a view type supports a mention type
 */
export function viewSupportsmentionType(viewType: EmbeddableViewType, mentionType: string): boolean {
  const metadata = getViewTypeMetadata(viewType)
  if (!metadata) return false
  if (metadata.supportedMentionTypes.includes('*')) return true
  return metadata.supportedMentionTypes.includes(mentionType)
}

// ============================================================================
// DATA EXTRACTION UTILITIES
// ============================================================================

/**
 * Viewable data item - any item that can be displayed in a view
 */
export interface ViewableData {
  id: string
  type: string
  title?: string
  content?: string
  data?: Record<string, unknown>
}

/**
 * Extract place data from content for map views
 */
export function extractPlaceData(content: string): ViewableData[] {
  const places: ViewableData[] = []
  
  // Match location patterns: [[place:Name]] or [[@place:Name|lat,lng]]
  const placeRegex = /\[\[(?:@?place:|📍)\s*([^\]|]+)(?:\|([^,\]]+),\s*([^\]]+))?\]\]/gi
  let match
  
  while ((match = placeRegex.exec(content)) !== null) {
    places.push({
      id: `place-${places.length}`,
      type: 'place',
      title: match[1].trim(),
      data: match[2] && match[3] ? {
        latitude: parseFloat(match[2]),
        longitude: parseFloat(match[3]),
      } : undefined,
    })
  }
  
  return places
}

/**
 * Extract event data from content for calendar views
 */
export function extractEventData(content: string): ViewableData[] {
  const events: ViewableData[] = []
  
  // Match date patterns: [[date:YYYY-MM-DD]] or [[event:Name|date]]
  const dateRegex = /\[\[(?:@?date:|@?event:|📅)\s*([^\]|]+)(?:\|([^\]]+))?\]\]/gi
  let match
  
  while ((match = dateRegex.exec(content)) !== null) {
    const dateStr = match[2] || match[1]
    const date = new Date(dateStr)
    
    events.push({
      id: `event-${events.length}`,
      type: 'event',
      title: match[2] ? match[1].trim() : dateStr,
      data: {
        date: !isNaN(date.getTime()) ? date.toISOString() : dateStr,
      },
    })
  }
  
  return events
}

/**
 * Extract list data from content for table/list/chart views
 */
export function extractListData(content: string): ViewableData[] {
  const items: ViewableData[] = []
  
  // Match list items: - Item or * Item or 1. Item
  const listRegex = /^[\s]*(?:[-*•]|\d+\.)\s+(.+)$/gm
  let match
  
  while ((match = listRegex.exec(content)) !== null) {
    const itemText = match[1].trim()
    
    // Try to extract key-value pairs (Name: Value)
    const kvMatch = itemText.match(/^([^:]+):\s*(.+)$/)
    
    items.push({
      id: `item-${items.length}`,
      type: 'list-item',
      title: kvMatch ? kvMatch[1].trim() : itemText,
      content: kvMatch ? kvMatch[2].trim() : undefined,
      data: kvMatch ? { key: kvMatch[1].trim(), value: kvMatch[2].trim() } : {},
    })
  }
  
  return items
}

