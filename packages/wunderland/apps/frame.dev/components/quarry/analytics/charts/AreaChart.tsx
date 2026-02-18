/**
 * Area Chart Component
 * @module components/quarry/analytics/charts/AreaChart
 *
 * D3-based area chart for time-series visualization.
 * Features gradient fills, animated path drawing, and hover tooltips.
 */

'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { CHART_COLORS } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

interface DataPoint {
  date: string
  count: number
  cumulative?: number
}

interface AreaChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  showCumulative?: boolean
  colorScheme?: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  isDark?: boolean
  showGrid?: boolean
  showAxis?: boolean
  animate?: boolean
  className?: string
}

interface TooltipData {
  x: number
  y: number
  date: string
  count: number
  cumulative?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AreaChart({
  data,
  width = 600,
  height = 300,
  showCumulative = false,
  colorScheme = 'primary',
  isDark = false,
  showGrid = true,
  showAxis = true,
  animate = true,
  className = '',
}: AreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [dimensions, setDimensions] = useState({ width, height })

  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light
  const primaryColor = colors[colorScheme]

  // Responsive resize
  useEffect(() => {
    if (!svgRef.current?.parentElement) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width: newWidth } = entry.contentRect
        if (newWidth > 0) {
          setDimensions({ width: newWidth, height })
        }
      }
    })

    resizeObserver.observe(svgRef.current.parentElement)
    return () => resizeObserver.disconnect()
  }, [height])

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: showAxis ? 40 : 10, left: showAxis ? 50 : 10 }
    const innerWidth = dimensions.width - margin.left - margin.right
    const innerHeight = dimensions.height - margin.top - margin.bottom

    if (innerWidth <= 0 || innerHeight <= 0) return

    // Parse dates and get values
    const parseDate = d3.timeParse('%Y-%m-%d')
    const chartData = data
      .map((d) => ({
        date: parseDate(d.date) || new Date(d.date),
        count: d.count,
        cumulative: d.cumulative,
      }))
      .filter((d) => d.date instanceof Date && !isNaN(d.date.getTime()))

    if (chartData.length === 0) return

    const valueKey = showCumulative ? 'cumulative' : 'count'
    const values = chartData.map((d) => (showCumulative ? d.cumulative : d.count) || 0)

    // Scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(chartData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth])

    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(values) || 0) * 1.1])
      .nice()
      .range([innerHeight, 0])

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Add gradient definition
    const gradientId = `area-gradient-${colorScheme}-${isDark ? 'dark' : 'light'}`
    const defs = svg.append('defs')

    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', primaryColor)
      .attr('stop-opacity', 0.4)

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', primaryColor)
      .attr('stop-opacity', 0.05)

    // Grid lines
    if (showGrid) {
      // Y grid
      g.append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('stroke', colors.grid)
        .attr('stroke-opacity', 0.5)
        .attr('stroke-dasharray', '2,2')

      g.selectAll('.grid .domain').remove()
    }

    // Area generator
    const area = d3
      .area<(typeof chartData)[0]>()
      .x((d) => x(d.date))
      .y0(innerHeight)
      .y1((d) => y((showCumulative ? d.cumulative : d.count) || 0))
      .curve(d3.curveMonotoneX)

    // Line generator
    const line = d3
      .line<(typeof chartData)[0]>()
      .x((d) => x(d.date))
      .y((d) => y((showCumulative ? d.cumulative : d.count) || 0))
      .curve(d3.curveMonotoneX)

    // Draw area
    const areaPath = g
      .append('path')
      .datum(chartData)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area)

    // Draw line
    const linePath = g
      .append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', primaryColor)
      .attr('stroke-width', 2)
      .attr('d', line)

    // Animate paths
    if (animate) {
      const totalLength = linePath.node()?.getTotalLength() || 0

      linePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1000)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0)

      areaPath
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay(200)
        .attr('opacity', 1)
    }

    // Axes
    if (showAxis) {
      // X axis
      const xAxis = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(Math.min(chartData.length, 6))
            .tickFormat((d) => d3.timeFormat('%b %d')(d as Date))
        )

      xAxis.selectAll('text').attr('fill', colors.textMuted).attr('font-size', '11px')
      xAxis.selectAll('line').attr('stroke', colors.grid)
      xAxis.select('.domain').attr('stroke', colors.grid)

      // Y axis
      const yAxis = g.append('g').call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => d3.format('.0f')(d as number))
      )

      yAxis.selectAll('text').attr('fill', colors.textMuted).attr('font-size', '11px')
      yAxis.selectAll('line').attr('stroke', colors.grid)
      yAxis.select('.domain').attr('stroke', colors.grid)
    }

    // Hover overlay for tooltips
    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    // Hover line
    const hoverLine = g
      .append('line')
      .attr('stroke', colors.text)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('opacity', 0)

    // Hover dot
    const hoverDot = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', primaryColor)
      .attr('stroke', isDark ? '#18181B' : '#FFFFFF')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    // Bisector for finding closest point
    const bisect = d3.bisector<(typeof chartData)[0], Date>((d) => d.date).left

    overlay
      .on('mousemove', function (event) {
        const [mouseX] = d3.pointer(event)
        const x0 = x.invert(mouseX)
        const i = bisect(chartData, x0, 1)
        const d0 = chartData[i - 1]
        const d1 = chartData[i]

        if (!d0 && !d1) return

        const d =
          d1 && d0
            ? x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
              ? d1
              : d0
            : d0 || d1

        const xPos = x(d.date)
        const yPos = y((showCumulative ? d.cumulative : d.count) || 0)

        hoverLine.attr('x1', xPos).attr('x2', xPos).attr('opacity', 0.5)

        hoverDot.attr('cx', xPos).attr('cy', yPos).attr('opacity', 1)

        setTooltip({
          x: xPos + margin.left,
          y: yPos + margin.top,
          date: d3.timeFormat('%b %d, %Y')(d.date),
          count: d.count,
          cumulative: d.cumulative,
        })
      })
      .on('mouseleave', () => {
        hoverLine.attr('opacity', 0)
        hoverDot.attr('opacity', 0)
        setTooltip(null)
      })
  }, [data, dimensions, showCumulative, colorScheme, isDark, showGrid, showAxis, animate, colors, primaryColor])

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        style={{ overflow: 'visible' }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`
              absolute pointer-events-none z-10
              px-3 py-2 rounded-lg shadow-lg text-sm
              ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
            `}
            style={{
              left: Math.min(tooltip.x, dimensions.width - 120),
              top: tooltip.y - 60,
            }}
          >
            <div className={`font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {tooltip.date}
            </div>
            <div className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {showCumulative ? (
                <>Total: {tooltip.cumulative?.toLocaleString()}</>
              ) : (
                <>Count: {tooltip.count.toLocaleString()}</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AreaChart
