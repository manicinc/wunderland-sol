/**
 * Lifecycle Decay Chart
 * 
 * Stacked area chart showing strand distribution across lifecycle stages over time.
 * Fresh (green) → Active (amber) → Faded (gray)
 * 
 * @module components/quarry/ui/evolution/LifecycleDecayChart
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LifecycleTimeSeriesPoint } from '@/lib/analytics/lifecycleTypes'
import { format, parseISO } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

interface LifecycleDecayChartProps {
  data: LifecycleTimeSeriesPoint[]
  isDark: boolean
  height?: number
  showLegend?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  fresh: {
    fill: 'rgb(16, 185, 129)',  // emerald-500
    fillOpacity: 0.6,
  },
  active: {
    fill: 'rgb(245, 158, 11)', // amber-500
    fillOpacity: 0.6,
  },
  faded: {
    fill: 'rgb(113, 113, 122)', // zinc-500
    fillOpacity: 0.4,
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LifecycleDecayChart({
  data,
  isDark,
  height = 200,
  showLegend = true,
}: LifecycleDecayChartProps) {
  // Calculate chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = 600
  const chartHeight = height
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Calculate scales and paths
  const { paths, maxTotal, xTicks, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return { paths: null, maxTotal: 0, xTicks: [], yTicks: [] }
    }

    const maxTotal = Math.max(...data.map(d => d.total), 1)
    const xScale = (i: number) => (i / (data.length - 1)) * innerWidth
    const yScale = (v: number) => innerHeight - (v / maxTotal) * innerHeight

    // Create stacked paths
    const freshPath: string[] = []
    const activePath: string[] = []
    const fadedPath: string[] = []

    data.forEach((point, i) => {
      const x = xScale(i)
      
      // Stacked from bottom: faded, then active, then fresh
      const fadedY = yScale(point.faded)
      const activeY = yScale(point.faded + point.active)
      const freshY = yScale(point.total)
      const baseY = yScale(0)

      if (i === 0) {
        fadedPath.push(`M ${x} ${baseY} L ${x} ${fadedY}`)
        activePath.push(`M ${x} ${fadedY} L ${x} ${activeY}`)
        freshPath.push(`M ${x} ${activeY} L ${x} ${freshY}`)
      } else {
        fadedPath.push(`L ${x} ${fadedY}`)
        activePath.push(`L ${x} ${activeY}`)
        freshPath.push(`L ${x} ${freshY}`)
      }
    })

    // Close paths for fill
    const lastX = xScale(data.length - 1)
    const baseY = yScale(0)

    // Faded area (bottom)
    const fadedAreaPath = fadedPath.join(' ') + 
      ` L ${lastX} ${baseY} L ${xScale(0)} ${baseY} Z`

    // Active area (middle) - needs bottom boundary
    const activeBottomPath = [...data].reverse().map((point, i) => {
      const x = xScale(data.length - 1 - i)
      const y = yScale(point.faded)
      return i === 0 ? `L ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
    const activeAreaPath = activePath.join(' ') + activeBottomPath + ' Z'

    // Fresh area (top) - needs bottom boundary
    const freshBottomPath = [...data].reverse().map((point, i) => {
      const x = xScale(data.length - 1 - i)
      const y = yScale(point.faded + point.active)
      return i === 0 ? `L ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
    const freshAreaPath = freshPath.join(' ') + freshBottomPath + ' Z'

    // X-axis ticks (show ~5 dates)
    const xTickIndices = [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor(3 * data.length / 4), data.length - 1]
      .filter((v, i, a) => a.indexOf(v) === i && v < data.length)
    const xTicks = xTickIndices.map(i => ({
      x: xScale(i),
      label: format(parseISO(data[i].date), 'MMM d'),
    }))

    // Y-axis ticks
    const yTickCount = 4
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
      const value = Math.round((maxTotal / yTickCount) * i)
      return { y: yScale(value), label: value.toString() }
    })

    return {
      paths: { faded: fadedAreaPath, active: activeAreaPath, fresh: freshAreaPath },
      maxTotal,
      xTicks,
      yTicks,
    }
  }, [data, innerWidth, innerHeight])

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
        )}
        style={{ height }}
      >
        <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          No lifecycle data available
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-6 mb-4">
          {[
            { label: 'Fresh', color: 'bg-emerald-500' },
            { label: 'Active', color: 'bg-amber-500' },
            { label: 'Faded', color: 'bg-zinc-500' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-sm', color)} />
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height }}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1={0}
              y1={tick.y}
              x2={innerWidth}
              y2={tick.y}
              stroke={isDark ? '#3f3f46' : '#e4e4e7'}
              strokeDasharray="4"
            />
          ))}

          {/* Stacked areas */}
          {paths && (
            <>
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                d={paths.faded}
                fill={COLORS.faded.fill}
                fillOpacity={COLORS.faded.fillOpacity}
              />
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                d={paths.active}
                fill={COLORS.active.fill}
                fillOpacity={COLORS.active.fillOpacity}
              />
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                d={paths.fresh}
                fill={COLORS.fresh.fill}
                fillOpacity={COLORS.fresh.fillOpacity}
              />
            </>
          )}

          {/* X-axis */}
          <line
            x1={0}
            y1={innerHeight}
            x2={innerWidth}
            y2={innerHeight}
            stroke={isDark ? '#52525b' : '#d4d4d8'}
          />
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={innerHeight + 20}
              textAnchor="middle"
              className={cn('text-xs', isDark ? 'fill-zinc-500' : 'fill-zinc-400')}
            >
              {tick.label}
            </text>
          ))}

          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={innerHeight}
            stroke={isDark ? '#52525b' : '#d4d4d8'}
          />
          {yTicks.map((tick, i) => (
            <text
              key={i}
              x={-10}
              y={tick.y + 4}
              textAnchor="end"
              className={cn('text-xs', isDark ? 'fill-zinc-500' : 'fill-zinc-400')}
            >
              {tick.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default LifecycleDecayChart

