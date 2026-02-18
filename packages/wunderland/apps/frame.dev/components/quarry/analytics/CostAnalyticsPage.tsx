/**
 * Cost Analytics Page Component
 * @module components/quarry/analytics/CostAnalyticsPage
 *
 * Dashboard showing LLM API costs per-provider with daily/monthly totals.
 * All data is stored locally - nothing is sent to external servers.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Zap,
  Calendar,
  BarChart3,
  PieChart,
  Info,
} from 'lucide-react'
import {
  getCostSummary,
  getDailyCosts,
  getCurrentMonthProjection,
  getProviderBreakdown,
  formatCost,
  type CostSummary,
  type DailyCostEntry,
  type MonthlyProjection,
} from '@/lib/costs'
import { AreaChart } from './charts/AreaChart'
import { BarChart } from './charts/BarChart'

// ============================================================================
// TYPES
// ============================================================================

type CostTimeRange = 'week' | 'month' | 'quarter' | 'all'

interface ProviderData {
  cost: number
  percentage: number
  requests: number
  tokens: number
}

interface CostAnalyticsData {
  summary: CostSummary
  dailyCosts: DailyCostEntry[]
  projection: MonthlyProjection
  providerBreakdown: Record<string, ProviderData>
}

// ============================================================================
// TIME RANGE CONFIG
// ============================================================================

const TIME_RANGE_CONFIG: Record<CostTimeRange, { label: string; days: number }> = {
  week: { label: 'This Week', days: 7 },
  month: { label: 'This Month', days: 30 },
  quarter: { label: 'Quarter', days: 90 },
  all: { label: 'All Time', days: 365 },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CostAnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [timeRange, setTimeRange] = useState<CostTimeRange>('month')
  const [data, setData] = useState<CostAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Load data
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const rangeMap: Record<CostTimeRange, 'day' | 'week' | 'month'> = {
        week: 'week',
        month: 'month',
        quarter: 'month',
        all: 'month',
      }

      const [summary, dailyCosts, projection, providerBreakdown] = await Promise.all([
        getCostSummary(rangeMap[timeRange]),
        getDailyCosts(TIME_RANGE_CONFIG[timeRange].days),
        getCurrentMonthProjection(),
        getProviderBreakdown(),
      ])

      setData({
        summary,
        dailyCosts,
        projection,
        providerBreakdown,
      })
    } catch (error) {
      console.error('[CostAnalytics] Failed to load data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DollarSign className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
          No cost data available yet.
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Start using AI features to see your usage metrics.
        </p>
      </div>
    )
  }

  const hasData = data.summary.totalCost > 0 || data.dailyCosts.length > 0
  const providerList = Object.entries(data.providerBreakdown).map(([provider, stats]) => ({
    provider,
    ...stats,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            API Costs
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Track your LLM API usage and costs (all data stored locally)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            isDark={isDark}
          />
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`
              p-2 rounded-lg transition-colors
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
              }
              disabled:opacity-50
            `}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div
        className={`
          flex items-start gap-3 p-4 rounded-lg border
          ${isDark
            ? 'bg-blue-900/20 border-blue-800/50 text-blue-200'
            : 'bg-blue-50 border-blue-200 text-blue-800'
          }
        `}
      >
        <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <div className="text-sm">
          <p className="font-medium">Privacy First</p>
          <p className={`mt-0.5 ${isDark ? 'text-blue-300/80' : 'text-blue-700'}`}>
            All usage data is stored locally on your device. Nothing is sent to external servers.
            Costs are estimated based on token usage and current provider pricing.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CostStatCard
          label="Total Spent"
          value={formatCost(data.summary.totalCost)}
          icon="dollar"
          color="emerald"
          isDark={isDark}
        />
        <CostStatCard
          label="This Period"
          value={formatCost(data.summary.totalCost)}
          icon="trending"
          color="cyan"
          subtitle={`${data.summary.totalRequests.toLocaleString()} requests`}
          isDark={isDark}
        />
        <CostStatCard
          label="Month Projection"
          value={formatCost(data.projection.projectedMonthly)}
          icon="calendar"
          color="violet"
          subtitle={`${data.projection.daysRemaining} days left`}
          trend={data.projection.projectedMonthly > data.projection.currentSpend ? 'up' : 'down'}
          isDark={isDark}
        />
        <CostStatCard
          label="Total Tokens"
          value={formatTokenCount(data.summary.totalTokens)}
          icon="zap"
          color="amber"
          isDark={isDark}
        />
      </div>

      {/* Main Charts */}
      {hasData ? (
        <>
          {/* Daily Cost Trend */}
          <div
            className={`
              rounded-xl border p-6
              ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Daily Cost Trend
              </h3>
              <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {TIME_RANGE_CONFIG[timeRange].label}
              </div>
            </div>
            <AreaChart
              data={data.dailyCosts.map((d) => ({
                date: d.date,
                count: Math.round(d.cost * 100), // Scale for visibility
                cumulative: Math.round(d.cost * 100),
              }))}
              colorScheme="primary"
              isDark={isDark}
              height={280}
            />
            <div className={`mt-2 text-xs text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Cost values scaled for visibility (divide by 100 for USD)
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* By Provider */}
            <div
              className={`
                rounded-xl border p-6
                ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
              `}
            >
              <div className="flex items-center gap-2 mb-4">
                <PieChart className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Cost by Provider
                </h3>
              </div>
              {providerList.length > 0 ? (
                <BarChart
                  data={providerList.map((p) => ({
                    label: capitalizeProvider(p.provider),
                    value: Math.round(p.cost * 100), // Scale for bar chart
                  }))}
                  horizontal
                  colorScheme="mixed"
                  isDark={isDark}
                />
              ) : (
                <EmptyState message="No provider data" isDark={isDark} />
              )}
            </div>

            {/* Request Stats */}
            <div
              className={`
                rounded-xl border p-6
                ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
              `}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Usage Stats
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                    Total Requests
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {data.summary.totalRequests.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                    Total Tokens
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {formatTokenCount(data.summary.totalTokens)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                    Avg Cost/Request
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {data.summary.totalRequests > 0
                      ? formatCost(data.summary.totalCost / data.summary.totalRequests)
                      : '$0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                    Providers Used
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {providerList.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Details Table */}
          <div
            className={`
              rounded-xl border p-6
              ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
            `}
          >
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Provider Details
            </h3>
            {providerList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                      <th className={`text-left py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        Provider
                      </th>
                      <th className={`text-right py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        Requests
                      </th>
                      <th className={`text-right py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        Tokens
                      </th>
                      <th className={`text-right py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        Cost
                      </th>
                      <th className={`text-right py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerList.map((provider) => (
                      <tr
                        key={provider.provider}
                        className={`border-b ${
                          isDark ? 'border-zinc-700/50' : 'border-zinc-100'
                        } hover:${isDark ? 'bg-zinc-700/30' : 'bg-zinc-50'}`}
                      >
                        <td className={`py-3 px-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: getProviderColor(provider.provider, isDark),
                              }}
                            />
                            <span className="font-medium">
                              {capitalizeProvider(provider.provider)}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${
                          isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>
                          {provider.requests.toLocaleString()}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${
                          isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>
                          {formatTokenCount(provider.tokens)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono font-medium ${
                          isDark ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                          {formatCost(provider.cost)}
                        </td>
                        <td className={`py-3 px-2 text-right ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {provider.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No usage data yet" isDark={isDark} />
            )}
          </div>

          {/* Month Summary */}
          <div
            className={`
              rounded-xl border p-6
              ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
            `}
          >
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Monthly Projection
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatCost(data.projection.currentSpend)}
                </p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Spent So Far
                </p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${
                  isDark ? 'text-violet-400' : 'text-violet-600'
                }`}>
                  {formatCost(data.projection.projectedMonthly)}
                </p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Projected Total
                </p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatCost(data.projection.averageDailyCost)}
                </p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Daily Average
                </p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {data.projection.daysRemaining}
                </p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Days Remaining
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          message="No cost data yet. Use AI features to start tracking."
          isDark={isDark}
          large
        />
      )}
    </div>
  )
}

// ============================================================================
// TIME RANGE SELECTOR
// ============================================================================

function TimeRangeSelector({
  value,
  onChange,
  isDark,
}: {
  value: CostTimeRange
  onChange: (range: CostTimeRange) => void
  isDark: boolean
}) {
  const options: CostTimeRange[] = ['week', 'month', 'quarter', 'all']

  return (
    <div
      className={`
        inline-flex rounded-lg p-1
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
      `}
    >
      {options.map((option) => {
        const isSelected = value === option
        const config = TIME_RANGE_CONFIG[option]

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              relative px-3 py-1.5 text-sm font-medium rounded-md
              transition-colors duration-150
              ${
                isSelected
                  ? isDark
                    ? 'text-white'
                    : 'text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }
            `}
          >
            {isSelected && (
              <motion.div
                layoutId="cost-time-range-bg"
                className={`
                  absolute inset-0 rounded-md
                  ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
                `}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{config.label.replace('This ', '')}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// COST STAT CARD
// ============================================================================

interface CostStatCardProps {
  label: string
  value: string
  icon: 'dollar' | 'trending' | 'calendar' | 'zap'
  color: 'emerald' | 'cyan' | 'violet' | 'amber'
  subtitle?: string
  trend?: 'up' | 'down'
  isDark: boolean
}

function CostStatCard({
  label,
  value,
  icon,
  color,
  subtitle,
  trend,
  isDark,
}: CostStatCardProps) {
  const IconMap = {
    dollar: DollarSign,
    trending: TrendingUp,
    calendar: Calendar,
    zap: Zap,
  }

  const colorClasses = {
    emerald: {
      bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-100',
      text: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    cyan: {
      bg: isDark ? 'bg-cyan-900/30' : 'bg-cyan-100',
      text: isDark ? 'text-cyan-400' : 'text-cyan-600',
    },
    violet: {
      bg: isDark ? 'bg-violet-900/30' : 'bg-violet-100',
      text: isDark ? 'text-violet-400' : 'text-violet-600',
    },
    amber: {
      bg: isDark ? 'bg-amber-900/30' : 'bg-amber-100',
      text: isDark ? 'text-amber-400' : 'text-amber-600',
    },
  }

  const IconComponent = IconMap[icon]
  const classes = colorClasses[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-xl border p-4
        ${isDark ? 'bg-zinc-800/80 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${classes.bg}`}>
          <IconComponent className={`w-5 h-5 ${classes.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {value}
            </p>
            {trend && (
              <span className={`${
                trend === 'up'
                  ? isDark ? 'text-amber-400' : 'text-amber-600'
                  : isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
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

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({
  message,
  isDark,
  large = false,
}: {
  message: string
  isDark: boolean
  large?: boolean
}) {
  if (large) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center py-16 rounded-xl border
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <DollarSign className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>{message}</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-8">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toLocaleString()
}

function capitalizeProvider(provider: string): string {
  const mappings: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    mistral: 'Mistral AI',
    openrouter: 'OpenRouter',
    ollama: 'Ollama (Local)',
  }
  return mappings[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
}

function getProviderColor(provider: string, isDark: boolean): string {
  const colors: Record<string, { light: string; dark: string }> = {
    anthropic: { light: '#D97706', dark: '#F59E0B' },
    openai: { light: '#10B981', dark: '#34D399' },
    mistral: { light: '#8B5CF6', dark: '#A78BFA' },
    openrouter: { light: '#3B82F6', dark: '#60A5FA' },
    ollama: { light: '#6B7280', dark: '#9CA3AF' },
  }
  const color = colors[provider] || { light: '#6B7280', dark: '#9CA3AF' }
  return isDark ? color.dark : color.light
}

export default CostAnalyticsPage
