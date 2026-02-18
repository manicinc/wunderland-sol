/**
 * Embedded Chart View
 * @module components/quarry/views/embeddable/ChartView
 *
 * @description
 * Simple chart view for visualizing numeric data.
 * Uses CSS-based charts for simplicity; can be extended with Chart.js or D3.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { EmbeddableViewConfig, ViewData, ChartViewSettings } from '@/lib/views'
import { BarChart, PieChart } from 'lucide-react'

interface ChartViewProps {
  config: EmbeddableViewConfig
  data: ViewData
  className?: string
}

interface ChartDataPoint {
  label: string
  value: number
  color: string
  percentage?: number
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#84cc16', // lime
]

/**
 * Extract chart data points from view data
 */
function extractChartData(
  data: ViewData,
  settings: ChartViewSettings
): ChartDataPoint[] {
  const { xField, yField, aggregate, groupField } = settings

  // If grouping, aggregate by group
  if (groupField || !yField) {
    const groups = new Map<string, number>()

    for (const item of data.items) {
      const entity = item.entity as Record<string, unknown>
      const props = entity.properties as Record<string, unknown> | undefined
      const groupKey = String(
        groupField
          ? entity[groupField] ?? props?.[groupField] ?? 'Other'
          : entity.type ?? 'Item'
      )

      const currentValue = groups.get(groupKey) || 0
      let increment = 1

      if (yField) {
        const yValue = entity[yField] ?? props?.[yField]
        if (typeof yValue === 'number') {
          increment = yValue
        }
      }

      switch (aggregate) {
        case 'sum':
        case 'count':
          groups.set(groupKey, currentValue + increment)
          break
        case 'max':
          groups.set(groupKey, Math.max(currentValue, increment))
          break
        case 'min':
          groups.set(groupKey, Math.min(currentValue || increment, increment))
          break
        case 'average':
          // For average, we'd need to track counts separately
          groups.set(groupKey, currentValue + increment)
          break
        default:
          groups.set(groupKey, currentValue + increment)
      }
    }

    const total = Array.from(groups.values()).reduce((sum, v) => sum + v, 0)

    return Array.from(groups.entries()).map(([label, value], index) => ({
      label,
      value,
      color: settings.colors?.[index] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
  }

  // Direct x/y field extraction
  return data.items.map((item, index) => {
    const entity = item.entity as Record<string, unknown>
    const label = String(entity[xField!] ?? entity.label ?? `Item ${index + 1}`)
    const value = Number(entity[yField!] ?? 0)

    return {
      label,
      value,
      color: settings.colors?.[index] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }
  })
}

/**
 * Bar Chart Component
 */
const BarChartRenderer: React.FC<{
  data: ChartDataPoint[]
  showLabels: boolean
  horizontal?: boolean
}> = ({ data, showLabels, horizontal }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((point, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 truncate text-right">
              {point.label}
            </span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-300 flex items-center justify-end pr-2"
                style={{
                  width: `${(point.value / maxValue) * 100}%`,
                  backgroundColor: point.color,
                }}
              >
                {showLabels && (
                  <span className="text-xs text-white font-medium">
                    {point.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-end justify-around h-full gap-2 p-4">
      {data.map((point, index) => (
        <div
          key={index}
          className="flex flex-col items-center flex-1 max-w-[60px]"
        >
          <div className="flex-1 w-full flex items-end justify-center">
            <div
              className="w-full max-w-[40px] rounded-t transition-all duration-300"
              style={{
                height: `${(point.value / maxValue) * 100}%`,
                minHeight: '4px',
                backgroundColor: point.color,
              }}
            />
          </div>
          {showLabels && (
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
              {point.value.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-gray-500 truncate w-full text-center">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Pie/Donut Chart Component
 */
const PieChartRenderer: React.FC<{
  data: ChartDataPoint[]
  showLabels: boolean
  donut?: boolean
}> = ({ data, showLabels, donut }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  // Calculate segments
  let cumulativePercentage = 0
  const segments = data.map(point => {
    const percentage = total > 0 ? (point.value / total) * 100 : 0
    const start = cumulativePercentage
    cumulativePercentage += percentage
    return { ...point, percentage, start }
  })

  // Build conic-gradient
  const gradientStops = segments.map(s =>
    `${s.color} ${s.start}% ${s.start + s.percentage}%`
  ).join(', ')

  return (
    <div className="flex items-center justify-center h-full gap-6 p-4">
      <div
        className="relative rounded-full"
        style={{
          width: '140px',
          height: '140px',
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        {donut && (
          <div className="absolute inset-6 rounded-full bg-white dark:bg-gray-900" />
        )}
      </div>

      {showLabels && (
        <div className="space-y-1">
          {segments.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: point.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {point.label}
              </span>
              <span className="text-xs text-gray-400">
                ({point.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ChartView: React.FC<ChartViewProps> = ({
  config,
  data,
  className,
}) => {
  const settings = config.settings as ChartViewSettings

  const chartData = useMemo(() => extractChartData(data, settings), [data, settings])

  // Empty state - Enhanced
  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full min-h-[200px] p-6',
          'bg-gradient-to-br from-violet-50 to-fuchsia-50',
          'dark:from-violet-950/30 dark:to-fuchsia-950/30',
          'border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-xl',
          className
        )}
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-violet-500/10 blur-xl rounded-full" />
          <BarChart className="relative h-14 w-14 text-violet-400 dark:text-violet-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No data to chart
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
          This chart will visualize numeric data from your document
        </p>
        <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-600 dark:text-gray-300">💡 How to add data:</p>
          <ul className="space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-violet-500">🔢</span>
              <span>Include numeric values in your mentions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">📈</span>
              <span>Use formulas: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">=SUM(values)</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">#</span>
              <span>Apply supertags with number fields</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  const showLabels = settings.showLabels !== false

  switch (settings.chartType) {
    case 'bar':
      return (
        <div className={cn('h-full', className)}>
          <BarChartRenderer data={chartData} showLabels={showLabels} />
        </div>
      )

    case 'line':
    case 'area':
      // Simplified line chart as bar chart for now
      return (
        <div className={cn('h-full', className)}>
          <BarChartRenderer data={chartData} showLabels={showLabels} horizontal />
        </div>
      )

    case 'pie':
      return (
        <div className={cn('h-full', className)}>
          <PieChartRenderer data={chartData} showLabels={showLabels} />
        </div>
      )

    case 'donut':
      return (
        <div className={cn('h-full', className)}>
          <PieChartRenderer data={chartData} showLabels={showLabels} donut />
        </div>
      )

    default:
      return (
        <div className={cn('h-full', className)}>
          <BarChartRenderer data={chartData} showLabels={showLabels} />
        </div>
      )
  }
}

export { ChartView }
export type { ChartViewProps, ChartDataPoint }

