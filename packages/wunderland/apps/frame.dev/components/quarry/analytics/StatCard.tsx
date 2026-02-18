/**
 * Stat Card Component
 * @module components/quarry/analytics/StatCard
 *
 * Displays a single statistic with icon, value, label, and optional change indicator.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  TrendingUp,
  Tag,
  Clock,
  Activity,
  Users,
  Eye,
  BookOpen,
  Zap,
  BarChart3,
  Calendar,
  CheckCircle2,
  Layers,
  GitCommit,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type IconName =
  | 'file-text'
  | 'trending-up'
  | 'trendingUp'
  | 'tag'
  | 'clock'
  | 'activity'
  | 'users'
  | 'eye'
  | 'book-open'
  | 'zap'
  | 'bar-chart'
  | 'calendar'
  | 'check-circle'
  | 'layers'
  | 'gitCommit'
  | 'git-commit'

type ColorScheme = 'emerald' | 'cyan' | 'violet' | 'amber' | 'pink' | 'blue'

interface StatCardProps {
  label: string
  value: number | string
  icon: IconName
  color: ColorScheme
  change?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  isDark?: boolean
  className?: string
}

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<IconName, LucideIcon> = {
  'file-text': FileText,
  'trending-up': TrendingUp,
  'trendingUp': TrendingUp,
  'tag': Tag,
  'clock': Clock,
  'activity': Activity,
  'users': Users,
  'eye': Eye,
  'book-open': BookOpen,
  'zap': Zap,
  'bar-chart': BarChart3,
  'calendar': Calendar,
  'check-circle': CheckCircle2,
  'layers': Layers,
  'gitCommit': GitCommit,
  'git-commit': GitCommit,
}

const COLOR_CLASSES: Record<ColorScheme, { bg: string; text: string; darkBg: string; darkText: string }> = {
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    darkBg: 'bg-emerald-900/30',
    darkText: 'text-emerald-400',
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-600',
    darkBg: 'bg-cyan-900/30',
    darkText: 'text-cyan-400',
  },
  violet: {
    bg: 'bg-violet-100',
    text: 'text-violet-600',
    darkBg: 'bg-violet-900/30',
    darkText: 'text-violet-400',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    darkBg: 'bg-amber-900/30',
    darkText: 'text-amber-400',
  },
  pink: {
    bg: 'bg-pink-100',
    text: 'text-pink-600',
    darkBg: 'bg-pink-900/30',
    darkText: 'text-pink-400',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    darkBg: 'bg-blue-900/30',
    darkText: 'text-blue-400',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StatCard({
  label,
  value,
  icon,
  color,
  change,
  subtitle,
  isDark = false,
  className = '',
}: StatCardProps) {
  const IconComponent = ICON_MAP[icon]
  const colorClasses = COLOR_CLASSES[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-xl border p-4
        ${isDark
          ? 'bg-zinc-800/80 border-zinc-700/50'
          : 'bg-white border-zinc-200'
        }
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            p-2.5 rounded-lg
            ${isDark ? colorClasses.darkBg : colorClasses.bg}
          `}
        >
          <IconComponent
            className={`w-5 h-5 ${isDark ? colorClasses.darkText : colorClasses.text}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <motion.p
              className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.p>

            {/* Change indicator */}
            {change && (
              <span
                className={`text-sm font-medium ${
                  change.isPositive
                    ? isDark
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : isDark
                    ? 'text-red-400'
                    : 'text-red-600'
                }`}
              >
                {change.isPositive ? '+' : ''}
                {change.value}%
              </span>
            )}
          </div>

          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {label}
          </p>

          {subtitle && (
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default StatCard
