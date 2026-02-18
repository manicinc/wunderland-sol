/**
 * EmbeddableViewWrapper Component
 *
 * Wrapper component that renders the appropriate embeddable view
 * based on the view type. Used for inline views in markdown content.
 *
 * @module components/quarry/views/embeddable/EmbeddableViewWrapper
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Loader2, Map, Calendar, Table, BarChart3, List, RefreshCw, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  EmbeddableViewConfig,
  ViewData,
  ViewDataItem,
  MapViewSettings,
  CalendarViewSettings,
  TableViewSettings,
  ChartViewSettings,
  ListViewSettings,
} from '@/lib/views'

// Dynamic imports for view components to avoid SSR issues
const MapView = dynamic(() => import('./MapView').then(mod => mod.MapView), {
  ssr: false,
  loading: () => <ViewLoadingState label="Loading map..." />,
})

const CalendarView = dynamic(() => import('./CalendarView').then(mod => mod.CalendarView), {
  ssr: false,
  loading: () => <ViewLoadingState label="Loading calendar..." />,
})

const EmbeddedTableView = dynamic(() => import('./EmbeddedTableView').then(mod => mod.EmbeddedTableView), {
  ssr: false,
  loading: () => <ViewLoadingState label="Loading table..." />,
})

const ChartView = dynamic(() => import('./ChartView').then(mod => mod.ChartView), {
  ssr: false,
  loading: () => <ViewLoadingState label="Loading chart..." />,
})

const ListView = dynamic(() => import('./ListView').then(mod => mod.ListView), {
  ssr: false,
  loading: () => <ViewLoadingState label="Loading list..." />,
})

// Loading state component
function ViewLoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  )
}

// Error state component
function ViewErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertCircle className="w-8 h-8 text-red-500" />
      <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  )
}

// View type icons
const VIEW_ICONS: Record<string, React.ElementType> = {
  map: Map,
  calendar: Calendar,
  table: Table,
  chart: BarChart3,
  list: List,
}

const VIEW_LABELS: Record<string, string> = {
  map: 'Map View',
  calendar: 'Calendar View',
  table: 'Table View',
  chart: 'Chart View',
  list: 'List View',
}

/**
 * Get default settings for a view type
 */
function getDefaultSettings(viewType: string, config: Record<string, unknown>): MapViewSettings | CalendarViewSettings | TableViewSettings | ChartViewSettings | ListViewSettings {
  switch (viewType) {
    case 'map':
      return {
        type: 'map',
        zoom: (config.zoom as number) || 10,
        showMarkers: true,
        showPopups: true,
        markerColor: '#3b82f6',
      } as MapViewSettings
    case 'calendar':
      return {
        type: 'calendar',
        mode: 'month',
        showTimeSlots: false,
      } as CalendarViewSettings
    case 'table':
      return {
        type: 'table',
        columns: [
          { id: 'label', label: 'Name', field: 'label' },
          { id: 'status', label: 'Status', field: 'status' },
          { id: 'value', label: 'Value', field: 'value' },
        ],
        showRowNumbers: true,
        compact: false,
      } as TableViewSettings
    case 'chart':
      return {
        type: 'chart',
        chartType: (config.chartType as 'bar' | 'line' | 'pie') || 'bar',
        xField: 'label',
        yField: 'value',
        showLegend: true,
        showLabels: true,
      } as ChartViewSettings
    case 'list':
    default:
      return {
        type: 'list',
        style: 'bullet',
        showIcons: true,
        compact: false,
      } as ListViewSettings
  }
}

interface EmbeddableViewWrapperProps {
  viewType: 'map' | 'calendar' | 'table' | 'chart' | 'list'
  config: Record<string, unknown>
  strandPath: string
  theme?: string
  className?: string
}

export function EmbeddableViewWrapper({
  viewType,
  config,
  strandPath,
  theme = 'light',
  className,
}: EmbeddableViewWrapperProps) {
  const [viewData, setViewData] = useState<ViewData>({ items: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const isDark = theme.includes('dark')
  const Icon = VIEW_ICONS[viewType] || List
  const label = VIEW_LABELS[viewType] || 'View'

  // Build view config from props
  const viewConfig: EmbeddableViewConfig = useMemo(() => {
    const baseConfig: EmbeddableViewConfig = {
      id: `view-${viewType}-${Date.now()}`,
      type: viewType,
      title: config.title as string || undefined,
      scope: {
        type: 'document',
        root: strandPath,
      },
      settings: getDefaultSettings(viewType, config),
    }
    return baseConfig
  }, [viewType, config, strandPath])

  // Extract data for the view based on type and config
  const extractViewData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const items: ViewDataItem[] = []

      // If data is provided directly in config, use it
      if (config.data && Array.isArray(config.data)) {
        (config.data as any[]).forEach((item, idx) => {
          items.push({
            id: item.id || `item-${idx}`,
            source: {
              type: 'block',
              id: `block-${idx}`,
              path: strandPath,
            },
            entity: {
              id: item.id || `entity-${idx}`,
              type: viewType === 'map' ? 'place' : viewType === 'calendar' ? 'date' : 'tag',
              label: item.label || item.title || item.name || `Item ${idx + 1}`,
              properties: item.properties || item,
            },
          })
        })
      } else {
        // Generate mock data for demonstration
        if (viewType === 'map') {
          items.push({
            id: 'mock-place-1',
            source: { type: 'mention', id: 'mention-1', path: strandPath },
            entity: {
              id: 'place-1',
              type: 'place',
              label: 'Example Location',
              properties: {
                latitude: typeof config.lat === 'number' ? config.lat : 50.7753,
                longitude: typeof config.lng === 'number' ? config.lng : 6.0839,
                address: 'A sample location for demonstration',
              },
            },
          })
        } else if (viewType === 'calendar') {
          const today = new Date()
          items.push({
            id: 'mock-event-1',
            source: { type: 'mention', id: 'mention-1', path: strandPath },
            entity: {
              id: 'event-1',
              type: 'date',
              label: 'Example Event',
              properties: {
                date: today.toISOString(),
                endDate: new Date(today.getTime() + 3600000).toISOString(),
                isRange: true,
              },
            },
          })
        } else if (viewType === 'table' || viewType === 'list') {
          items.push(
            { id: 'mock-1', source: { type: 'block', id: 'b1', path: strandPath }, entity: { id: 'e1', type: 'tag', label: 'Item 1', properties: { name: 'active', category: 'status' as const } } },
            { id: 'mock-2', source: { type: 'block', id: 'b2', path: strandPath }, entity: { id: 'e2', type: 'tag', label: 'Item 2', properties: { name: 'pending', category: 'status' as const } } },
            { id: 'mock-3', source: { type: 'block', id: 'b3', path: strandPath }, entity: { id: 'e3', type: 'tag', label: 'Item 3', properties: { name: 'complete', category: 'status' as const } } },
          )
        } else if (viewType === 'chart') {
          items.push(
            { id: 'mock-1', source: { type: 'block', id: 'b1', path: strandPath }, entity: { id: 'e1', type: 'tag', label: 'January', properties: { name: 'January', category: 'topic' as const } } },
            { id: 'mock-2', source: { type: 'block', id: 'b2', path: strandPath }, entity: { id: 'e2', type: 'tag', label: 'February', properties: { name: 'February', category: 'topic' as const } } },
            { id: 'mock-3', source: { type: 'block', id: 'b3', path: strandPath }, entity: { id: 'e3', type: 'tag', label: 'March', properties: { name: 'March', category: 'topic' as const } } },
            { id: 'mock-4', source: { type: 'block', id: 'b4', path: strandPath }, entity: { id: 'e4', type: 'tag', label: 'April', properties: { name: 'April', category: 'topic' as const } } },
          )
        }
      }

      setViewData({ items })
    } catch (err) {
      console.error('[EmbeddableViewWrapper] Error extracting data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load view data')
    } finally {
      setIsLoading(false)
    }
  }, [viewType, config, strandPath])

  useEffect(() => {
    extractViewData()
  }, [extractViewData])

  // Render the appropriate view component
  const renderView = () => {
    if (isLoading) {
      return <ViewLoadingState label={`Loading ${label.toLowerCase()}...`} />
    }

    if (error) {
      return <ViewErrorState error={error} onRetry={extractViewData} />
    }

    if (viewData.items.length === 0) {
      return (
        <div className={cn(
          'flex flex-col items-center justify-center gap-2 p-8 rounded-lg border',
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'
        )}>
          <Icon className="w-8 h-8 opacity-50" />
          <p className="text-sm">No data available for this view</p>
        </div>
      )
    }

    switch (viewType) {
      case 'map':
        return <MapView config={viewConfig} data={viewData} />
      case 'calendar':
        return <CalendarView config={viewConfig} data={viewData} />
      case 'table':
        return <EmbeddedTableView config={viewConfig} data={viewData} />
      case 'chart':
        return <ChartView config={viewConfig} data={viewData} />
      case 'list':
        return <ListView config={viewConfig} data={viewData} />
      default:
        return (
          <div className={cn(
            'p-4 rounded-lg border',
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          )}>
            <p className="text-sm text-zinc-500">Unknown view type: {viewType}</p>
          </div>
        )
    }
  }

  return (
    <div className={cn(
      'embeddable-view-wrapper rounded-lg border overflow-hidden',
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'w-4 h-4',
            viewType === 'map' ? 'text-green-500' :
            viewType === 'calendar' ? 'text-blue-500' :
            viewType === 'table' ? 'text-purple-500' :
            viewType === 'chart' ? 'text-amber-500' :
            'text-cyan-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-700'
          )}>
            {config.title as string || label}
          </span>
          {viewData.items.length > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
            )}>
              {viewData.items.length} items
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={extractViewData}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
            title="Refresh data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              showSettings
                ? isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
            title="View settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className={cn(
          'px-3 py-2 border-b text-xs',
          isDark ? 'bg-zinc-800/30 border-zinc-800 text-zinc-400' : 'bg-zinc-50/50 border-zinc-200 text-zinc-500'
        )}>
          <p className="italic">View settings coming soon. Configure via code block JSON.</p>
        </div>
      )}

      {/* View Content */}
      <div className="p-2">
        <Suspense fallback={<ViewLoadingState label={`Loading ${label.toLowerCase()}...`} />}>
          {renderView()}
        </Suspense>
      </div>
    </div>
  )
}

export default EmbeddableViewWrapper

