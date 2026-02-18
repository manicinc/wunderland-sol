/**
 * Bar Chart Component
 * @module components/quarry/analytics/charts/BarChart
 *
 * CSS/Framer Motion-based bar chart with smooth animations.
 * Supports horizontal and vertical orientations.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CHART_COLORS } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

interface BarData {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarData[]
  horizontal?: boolean
  showLabels?: boolean
  showValues?: boolean
  maxBars?: number
  height?: number
  barHeight?: number
  colorScheme?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'mixed'
  isDark?: boolean
  animate?: boolean
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BarChart({
  data,
  horizontal = false,
  showLabels = true,
  showValues = true,
  maxBars = 10,
  height = 200,
  barHeight = 28,
  colorScheme = 'primary',
  isDark = false,
  animate = true,
  className = '',
}: BarChartProps) {
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light
  const displayData = data.slice(0, maxBars)
  const maxValue = Math.max(...displayData.map((d) => d.value), 1)

  // Color palette for mixed scheme
  const mixedColors = [
    colors.primary,
    colors.secondary,
    colors.tertiary,
    colors.quaternary,
    colors.quinary,
    colors.senary,
  ]

  const getBarColor = (index: number, customColor?: string) => {
    if (customColor) return customColor
    if (colorScheme === 'mixed') {
      return mixedColors[index % mixedColors.length]
    }
    return colors[colorScheme]
  }

  // Horizontal bar chart
  if (horizontal) {
    return (
      <div className={`space-y-2 ${className}`}>
        {displayData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100
          const barColor = getBarColor(index, item.color)

          return (
            <div key={item.label} className="group">
              {showLabels && (
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-sm truncate max-w-[60%] ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  {showValues && (
                    <span
                      className={`text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`w-full rounded-full overflow-hidden ${
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                }`}
                style={{ height: barHeight / 3 }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                  initial={animate ? { width: 0 } : false}
                  animate={{ width: `${Math.max(percentage, 2)}%` }}
                  transition={{
                    duration: 0.6,
                    delay: animate ? index * 0.05 : 0,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Vertical bar chart
  return (
    <div className={`flex items-end justify-between gap-1 ${className}`} style={{ height }}>
      {displayData.map((item, index) => {
        const percentage = (item.value / maxValue) * 100
        const barColor = getBarColor(index, item.color)

        return (
          <div
            key={item.label}
            className="flex-1 flex flex-col items-center group min-w-0"
          >
            {/* Value label on hover */}
            {showValues && (
              <motion.div
                className={`text-xs font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
                initial={false}
              >
                {item.value.toLocaleString()}
              </motion.div>
            )}

            {/* Bar */}
            <div
              className="w-full flex items-end justify-center"
              style={{ height: height - (showLabels ? 24 : 0) - (showValues ? 16 : 0) }}
            >
              <motion.div
                className="w-full max-w-[32px] rounded-t-md cursor-pointer transition-opacity hover:opacity-80"
                style={{ backgroundColor: barColor }}
                initial={animate ? { height: 0 } : false}
                animate={{ height: `${Math.max(percentage, 3)}%` }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                  delay: animate ? index * 0.03 : 0,
                }}
              />
            </div>

            {/* Label */}
            {showLabels && (
              <span
                className={`text-[10px] mt-1.5 truncate w-full text-center ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// MINI BAR CHART (for dashboard widgets)
// ============================================================================

interface MiniBarChartProps {
  data: { date: string; count: number }[]
  colorScheme?: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  isDark?: boolean
  height?: number
  className?: string
}

export function MiniBarChart({
  data,
  colorScheme = 'primary',
  isDark = false,
  height = 48,
  className = '',
}: MiniBarChartProps) {
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light
  const barColor = colors[colorScheme]
  const maxValue = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className={`flex items-end gap-0.5 ${className}`} style={{ height }}>
      {data.map((item, index) => {
        const percentage = (item.count / maxValue) * 100
        const isToday = index === data.length - 1

        return (
          <motion.div
            key={item.date}
            className="flex-1 rounded-t-sm"
            style={{
              backgroundColor: isToday ? barColor : isDark ? '#3F3F46' : '#E5E7EB',
              opacity: isToday ? 1 : 0.6,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(percentage, 4)}%` }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 15,
              delay: index * 0.02,
            }}
          />
        )
      })}
    </div>
  )
}

export default BarChart
