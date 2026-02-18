/**
 * Embeddable View Container
 * @module components/quarry/views/embeddable/EmbeddableView
 *
 * @description
 * Container component that renders the appropriate view type
 * based on configuration. Handles loading states, errors, and
 * view-specific rendering.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  type EmbeddableViewConfig,
  type ViewData,
  extractViewData,
} from '@/lib/views'
import type { MentionableEntity } from '@/lib/mentions/types'
import { MapView } from './MapView'
import { CalendarView } from './CalendarView'
import { EmbeddedTableView } from './EmbeddedTableView'
import { ListView } from './ListView'
import { ChartView } from './ChartView'
import {
  Map,
  Calendar,
  Table,
  BarChart,
  List,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Settings,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmbeddableViewProps {
  /** View configuration */
  config: EmbeddableViewConfig
  /** Mentions data source */
  mentions: MentionableEntity[]
  /** Additional data items */
  data?: Record<string, unknown>[]
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
  /** Inline mode (smaller, no chrome) */
  inline?: boolean
  /** Edit mode enabled */
  editable?: boolean
  /** Close handler */
  onClose?: () => void
  /** Config change handler */
  onConfigChange?: (config: EmbeddableViewConfig) => void
  /** Item click handler */
  onItemClick?: (item: ViewData['items'][0]) => void
  /** Custom class name */
  className?: string
}

const VIEW_ICONS = {
  map: Map,
  calendar: Calendar,
  table: Table,
  chart: BarChart,
  list: List,
}

const EmbeddableView: React.FC<EmbeddableViewProps> = ({
  config,
  mentions,
  data,
  isLoading = false,
  error,
  inline = false,
  editable = false,
  onClose,
  onConfigChange,
  onItemClick,
  className,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)

  // Extract and transform data for the view
  const viewData = useMemo(() => {
    return extractViewData(mentions, config)
  }, [mentions, config])

  // Get appropriate icon
  const IconComponent = VIEW_ICONS[config.type] || List

  // Render error state
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700',
          'dark:border-red-800 dark:bg-red-950/50 dark:text-red-400',
          className
        )}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  // Render loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-8 rounded-lg border',
          'border-gray-200 dark:border-gray-800',
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Render the appropriate view component
  const renderViewContent = () => {
    switch (config.type) {
      case 'map':
        return (
          <MapView
            config={config}
            data={viewData}
            onItemClick={onItemClick}
          />
        )
      case 'calendar':
        return (
          <CalendarView
            config={config}
            data={viewData}
            onItemClick={onItemClick}
          />
        )
      case 'table':
        return (
          <EmbeddedTableView
            config={config}
            data={viewData}
            editable={editable}
            onItemClick={onItemClick}
          />
        )
      case 'chart':
        return (
          <ChartView
            config={config}
            data={viewData}
          />
        )
      case 'list':
        return (
          <ListView
            config={config}
            data={viewData}
            onItemClick={onItemClick}
          />
        )
      default:
        return (
          <div className="flex items-center justify-center p-8 text-gray-500">
            Unsupported view type: {config.type}
          </div>
        )
    }
  }

  // Inline mode - minimal chrome
  if (inline) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden',
          config.size?.height && `h-[${config.size.height}]`,
          className
        )}
        style={{
          minHeight: config.size?.minHeight,
          maxHeight: config.size?.maxHeight,
        }}
      >
        {renderViewContent()}
      </div>
    )
  }

  // Full mode with chrome
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden',
        'bg-white dark:bg-gray-900',
        isExpanded && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {config.title || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} View`}
          </span>
          <span className="text-xs text-gray-400">
            {viewData.items.length} items
          </span>
        </div>

        <div className="flex items-center gap-1">
          {editable && onConfigChange && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="relative"
        style={{
          height: isExpanded
            ? 'calc(100vh - 8rem)'
            : config.size?.height || '300px',
          minHeight: config.size?.minHeight,
          maxHeight: isExpanded ? undefined : config.size?.maxHeight,
        }}
      >
        {renderViewContent()}
      </div>
    </div>
  )
}

export { EmbeddableView }
export type { EmbeddableViewProps }




