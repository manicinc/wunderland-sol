/**
 * Heatmap Calendar Component
 * @module components/quarry/analytics/charts/HeatmapCalendar
 *
 * GitHub-style contribution calendar for visualizing activity over time.
 * Supports customizable colors, tooltips, and multiple data sources.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, subDays, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { CHART_COLORS } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

export interface HeatmapDataPoint {
  date: string // ISO date string YYYY-MM-DD
  value: number
  label?: string // Custom tooltip label
}

export interface HeatmapCalendarProps {
  /** Data points with date and value */
  data: HeatmapDataPoint[]
  /** Number of weeks to show (default: 52) */
  weeks?: number
  /** Color scheme for the heatmap */
  colorScheme?: 'emerald' | 'cyan' | 'violet' | 'amber' | 'blue'
  /** Whether to use dark theme colors */
  isDark?: boolean
  /** Cell size in pixels (default: 12) */
  cellSize?: number
  /** Gap between cells (default: 2) */
  cellGap?: number
  /** Show day labels (Mon, Wed, Fri) */
  showDayLabels?: boolean
  /** Show month labels */
  showMonthLabels?: boolean
  /** Custom tooltip formatter */
  tooltipFormatter?: (point: HeatmapDataPoint) => string
  /** Callback when a cell is clicked */
  onCellClick?: (point: HeatmapDataPoint) => void
  /** Additional class names */
  className?: string
}

interface TooltipData {
  x: number
  y: number
  point: HeatmapDataPoint
}

// ============================================================================
// COLOR SCALES
// ============================================================================

const COLOR_SCALES = {
  emerald: {
    light: ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'],
    dark: ['#052e16', '#14532d', '#166534', '#15803d', '#22c55e'],
  },
  cyan: {
    light: ['#ecfeff', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4'],
    dark: ['#083344', '#155e75', '#0e7490', '#0891b2', '#06b6d4'],
  },
  violet: {
    light: ['#f5f3ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6'],
    dark: ['#2e1065', '#4c1d95', '#5b21b6', '#6d28d9', '#8b5cf6'],
  },
  amber: {
    light: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b'],
    dark: ['#451a03', '#78350f', '#92400e', '#b45309', '#f59e0b'],
  },
  blue: {
    light: ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6'],
    dark: ['#172554', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6'],
  },
}

// ============================================================================
// HELPERS
// ============================================================================

function getIntensityLevel(value: number, maxValue: number): number {
  if (value === 0) return 0
  if (maxValue === 0) return 0
  const ratio = value / maxValue
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function generateWeeksGrid(weeks: number): Date[][] {
  const today = new Date()
  const grid: Date[][] = []
  
  // Start from the beginning of the week, `weeks` weeks ago
  let startDate = startOfWeek(subDays(today, (weeks - 1) * 7))
  
  for (let w = 0; w < weeks; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(addDays(startDate, w * 7 + d))
    }
    grid.push(week)
  }
  
  return grid
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HeatmapCalendar({
  data,
  weeks = 52,
  colorScheme = 'emerald',
  isDark = false,
  cellSize = 12,
  cellGap = 2,
  showDayLabels = true,
  showMonthLabels = true,
  tooltipFormatter,
  onCellClick,
  className = '',
}: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Build data lookup map
  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapDataPoint>()
    data.forEach(point => {
      map.set(point.date, point)
    })
    return map
  }, [data])

  // Calculate max value for intensity scaling
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 1)
  }, [data])

  // Generate weeks grid
  const weeksGrid = useMemo(() => generateWeeksGrid(weeks), [weeks])

  // Get color scale
  const colors = isDark ? COLOR_SCALES[colorScheme].dark : COLOR_SCALES[colorScheme].light
  const emptyColor = isDark ? '#27272a' : '#f4f4f5' // zinc-800 / zinc-100

  // Calculate dimensions
  const dayLabelWidth = showDayLabels ? 24 : 0
  const monthLabelHeight = showMonthLabels ? 16 : 0
  const gridWidth = weeks * (cellSize + cellGap) - cellGap
  const gridHeight = 7 * (cellSize + cellGap) - cellGap
  const totalWidth = gridWidth + dayLabelWidth
  const totalHeight = gridHeight + monthLabelHeight

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = []
    let lastMonth = -1
    
    weeksGrid.forEach((week, weekIndex) => {
      const firstDay = week[0]
      const month = firstDay.getMonth()
      
      if (month !== lastMonth) {
        labels.push({
          label: format(firstDay, 'MMM'),
          x: dayLabelWidth + weekIndex * (cellSize + cellGap),
        })
        lastMonth = month
      }
    })
    
    return labels
  }, [weeksGrid, cellSize, cellGap, dayLabelWidth])

  // Day labels
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  // Handle cell interactions
  const handleCellEnter = (
    e: React.MouseEvent<SVGRectElement>,
    date: Date,
    point: HeatmapDataPoint | undefined
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const container = e.currentTarget.closest('svg')?.getBoundingClientRect()
    
    if (!container) return

    setTooltip({
      x: rect.left - container.left + cellSize / 2,
      y: rect.top - container.top - 8,
      point: point || {
        date: format(date, 'yyyy-MM-dd'),
        value: 0,
      },
    })
  }

  const handleCellLeave = () => {
    setTooltip(null)
  }

  const handleCellClick = (point: HeatmapDataPoint | undefined, date: Date) => {
    if (onCellClick && point) {
      onCellClick(point)
    }
  }

  // Format tooltip
  const formatTooltip = (point: HeatmapDataPoint): string => {
    if (tooltipFormatter) return tooltipFormatter(point)
    const dateStr = format(parseISO(point.date), 'MMM d, yyyy')
    if (point.value === 0) return `No activity on ${dateStr}`
    return point.label || `${point.value} on ${dateStr}`
  }

  return (
    <div className={`relative overflow-x-auto overflow-y-hidden ${className}`}>
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="overflow-visible min-w-0"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Month labels */}
        {showMonthLabels && monthLabels.map((month, i) => (
          <text
            key={i}
            x={month.x}
            y={10}
            className={`text-[10px] ${isDark ? 'fill-zinc-500' : 'fill-zinc-400'}`}
          >
            {month.label}
          </text>
        ))}

        {/* Day labels */}
        {showDayLabels && dayLabels.map((label, i) => (
          <text
            key={i}
            x={0}
            y={monthLabelHeight + i * (cellSize + cellGap) + cellSize - 2}
            className={`text-[9px] ${isDark ? 'fill-zinc-500' : 'fill-zinc-400'}`}
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        <g transform={`translate(${dayLabelWidth}, ${monthLabelHeight})`}>
          {weeksGrid.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const point = dataMap.get(dateStr)
              const value = point?.value || 0
              const level = getIntensityLevel(value, maxValue)
              const color = value === 0 ? emptyColor : colors[level]
              const isFuture = date > new Date()

              if (isFuture) return null

              return (
                <motion.rect
                  key={dateStr}
                  x={weekIndex * (cellSize + cellGap)}
                  y={dayIndex * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={color}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: weekIndex * 0.01 }}
                  className={`
                    transition-colors cursor-pointer
                    ${onCellClick ? 'hover:opacity-80' : ''}
                  `}
                  onMouseEnter={(e) => handleCellEnter(e, date, point)}
                  onMouseLeave={handleCellLeave}
                  onClick={() => handleCellClick(point, date)}
                />
              )
            })
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            absolute z-50 px-2 py-1 rounded text-xs pointer-events-none
            whitespace-nowrap
            ${isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-white'}
          `}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {formatTooltip(tooltip.point)}
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 justify-end">
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Less
        </span>
        <div className="flex gap-0.5">
          <div
            className="rounded-sm"
            style={{ width: cellSize - 2, height: cellSize - 2, backgroundColor: emptyColor }}
          />
          {colors.map((color, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ width: cellSize - 2, height: cellSize - 2, backgroundColor: color }}
            />
          ))}
        </div>
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          More
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export function MiniHeatmapCalendar({
  data,
  weeks = 12,
  colorScheme = 'emerald',
  isDark = false,
  className = '',
}: Pick<HeatmapCalendarProps, 'data' | 'weeks' | 'colorScheme' | 'isDark' | 'className'>) {
  return (
    <HeatmapCalendar
      data={data}
      weeks={weeks}
      colorScheme={colorScheme}
      isDark={isDark}
      cellSize={8}
      cellGap={1}
      showDayLabels={false}
      showMonthLabels={false}
      className={className}
    />
  )
}

export default HeatmapCalendar

