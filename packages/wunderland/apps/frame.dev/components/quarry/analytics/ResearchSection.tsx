/**
 * Research Section Component
 * @module components/quarry/analytics/ResearchSection
 *
 * Displays research analytics including search activity, topic trends,
 * source distribution, and session metrics.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  BookOpen,
  Globe,
  GraduationCap,
  TrendingUp,
  Bookmark,
  Clock,
  Loader2,
  AlertTriangle,
  Target,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import { AreaChart } from './charts/AreaChart'
import { BarChart } from './charts/BarChart'
import {
  getResearchAnalytics,
  generateTopicCloud,
  analyzeKnowledgeGaps,
  type ResearchAnalyticsData,
  type KnowledgeGapsData,
  type KnowledgeGap,
} from '@/lib/analytics/researchAnalyticsService'

// ============================================================================
// TYPES
// ============================================================================

interface ResearchSectionProps {
  isDark: boolean
  daysBack?: number
}

// ============================================================================
// TOPIC CLOUD COMPONENT
// ============================================================================

function TopicCloud({
  topics,
  isDark,
}: {
  topics: Array<{ text: string; value: number }>
  isDark: boolean
}) {
  if (topics.length === 0) {
    return <EmptyState message="No search topics yet" isDark={isDark} />
  }

  const maxValue = Math.max(...topics.map((t) => t.value))
  const minValue = Math.min(...topics.map((t) => t.value))
  const range = maxValue - minValue || 1

  // Calculate font size based on value
  const getFontSize = (value: number) => {
    const normalized = (value - minValue) / range
    return 0.75 + normalized * 1.25 // 0.75rem to 2rem
  }

  // Color based on value
  const getColor = (value: number, isDark: boolean) => {
    const normalized = (value - minValue) / range
    if (normalized > 0.66) {
      return isDark ? 'text-violet-400' : 'text-violet-600'
    } else if (normalized > 0.33) {
      return isDark ? 'text-cyan-400' : 'text-cyan-600'
    }
    return isDark ? 'text-zinc-400' : 'text-zinc-500'
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center py-4">
      {topics.slice(0, 30).map((topic, i) => (
        <motion.span
          key={topic.text}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02 }}
          className={`
            px-2 py-1 rounded-lg cursor-default transition-colors
            hover:bg-violet-100 dark:hover:bg-violet-900/30
            ${getColor(topic.value, isDark)}
          `}
          style={{ fontSize: `${getFontSize(topic.value)}rem` }}
          title={`${topic.text}: ${topic.value} searches`}
        >
          {topic.text}
        </motion.span>
      ))}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResearchSection({ isDark, daysBack = 30 }: ResearchSectionProps) {
  const [data, setData] = useState<ResearchAnalyticsData | null>(null)
  const [topicCloud, setTopicCloud] = useState<Array<{ text: string; value: number }>>([])
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGapsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [analyticsData, topics, gaps] = await Promise.all([
          getResearchAnalytics(daysBack),
          generateTopicCloud(30),
          analyzeKnowledgeGaps(daysBack * 3), // Look back 3x for gaps
        ])
        setData(analyticsData)
        setTopicCloud(topics)
        setKnowledgeGaps(gaps)
      } catch (error) {
        console.error('[ResearchSection] Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [daysBack])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className={`w-10 h-10 mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
          No research data available yet.
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Start researching to see your analytics.
        </p>
      </div>
    )
  }

  // Prepare chart data
  const searchesOverTimeData = data.searches.searchesOverTime.map((d) => ({
    date: d.date,
    count: d.count,
  }))

  const sourceDistributionData = data.sources.sourceTypeDistribution.map((s) => ({
    label: s.type,
    value: s.count,
    color: s.type === 'Academic' ? '#8b5cf6' : '#06b6d4', // violet/cyan
  }))

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSimple
          label="Total Sessions"
          value={data.sessions.totalSessions}
          icon={<Search className="w-5 h-5" />}
          color="violet"
          isDark={isDark}
        />
        <StatCardSimple
          label="This Period"
          value={data.sessions.periodSessions}
          icon={<TrendingUp className="w-5 h-5" />}
          color="cyan"
          isDark={isDark}
        />
        <StatCardSimple
          label="Saved Results"
          value={data.sessions.totalSavedResults}
          icon={<Bookmark className="w-5 h-5" />}
          color="emerald"
          isDark={isDark}
        />
        <StatCardSimple
          label="Avg per Session"
          value={data.searches.avgSavedPerSession}
          icon={<BookOpen className="w-5 h-5" />}
          color="amber"
          isDark={isDark}
        />
      </div>

      {/* Knowledge Gaps */}
      {knowledgeGaps && (
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className={`w-5 h-5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Knowledge Gaps
            </h3>
            {knowledgeGaps.summary.highPriority > 0 && (
              <span className={`
                text-xs px-2 py-0.5 rounded-full font-medium
                ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}
              `}>
                {knowledgeGaps.summary.highPriority} high priority
              </span>
            )}
          </div>
          <KnowledgeGapsPanel gaps={knowledgeGaps} isDark={isDark} />
        </div>
      )}

      {/* Search Activity Chart */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <div className="flex items-center gap-2 mb-4">
          <Search className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Search Activity
          </h3>
        </div>
        {searchesOverTimeData.length > 0 && searchesOverTimeData.some((d) => d.count > 0) ? (
          <AreaChart
            data={searchesOverTimeData}
            colorScheme="secondary"
            isDark={isDark}
            height={250}
          />
        ) : (
          <EmptyState message="No search activity in this period" isDark={isDark} />
        )}
      </div>

      {/* Topic Cloud & Source Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Topic Cloud */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Topic Cloud
            </h3>
          </div>
          <TopicCloud topics={topicCloud} isDark={isDark} />
        </div>

        {/* Source Distribution */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Source Distribution
            </h3>
          </div>
          {sourceDistributionData.length > 0 && sourceDistributionData.some((d) => d.value > 0) ? (
            <BarChart
              data={sourceDistributionData}
              horizontal
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No saved results yet" isDark={isDark} />
          )}

          {/* Percentages */}
          {data.sources.sourceTypeDistribution.some((s) => s.count > 0) && (
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              {data.sources.sourceTypeDistribution.map((s) => (
                <div key={s.type} className="text-center">
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {s.percentage}%
                  </p>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {s.type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Domains & Query Terms */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Domains */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Domains
            </h3>
          </div>
          {data.sources.topDomains.length > 0 ? (
            <div className="space-y-2">
              {data.sources.topDomains.slice(0, 8).map((domain) => (
                <div key={domain.domain} className="flex items-center justify-between">
                  <span
                    className={`text-sm truncate flex-1 mr-2 ${
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {domain.domain}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {domain.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No domains saved yet" isDark={isDark} />
          )}
        </div>

        {/* Top Query Terms */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Search className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Query Terms
            </h3>
          </div>
          {data.topics.topQueryTerms.length > 0 ? (
            <div className="space-y-2">
              {data.topics.topQueryTerms.slice(0, 8).map((term) => (
                <div key={term.term} className="flex items-center justify-between">
                  <span
                    className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}
                  >
                    {term.term}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {term.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No search terms yet" isDark={isDark} />
          )}
        </div>
      </div>

      {/* Query Length & Recent Topics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Query Length Distribution */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Query Length Distribution
          </h3>
          {data.topics.queryLengthDistribution.some((q) => q.count > 0) ? (
            <BarChart
              data={data.topics.queryLengthDistribution.map((q) => ({
                label: q.length,
                value: q.count,
              }))}
              horizontal
              colorScheme="mixed"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No query data" isDark={isDark} />
          )}
        </div>

        {/* Recent Topics */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Recent Searches
          </h3>
          {data.topics.recentTopics.length > 0 ? (
            <div className="space-y-2">
              {data.topics.recentTopics.map((topic, i) => (
                <div
                  key={`${topic}-${i}`}
                  className={`
                    text-sm px-3 py-2 rounded-lg truncate
                    ${isDark ? 'bg-zinc-700/50 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
                  `}
                  title={topic}
                >
                  {topic}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recent searches" isDark={isDark} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// KNOWLEDGE GAPS COMPONENT
// ============================================================================

function KnowledgeGapsPanel({
  gaps,
  isDark,
}: {
  gaps: KnowledgeGapsData
  isDark: boolean
}) {
  if (gaps.gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Target className={`w-8 h-8 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          No knowledge gaps detected!
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Your research is thorough and well-organized.
        </p>
      </div>
    )
  }

  const getSeverityColor = (severity: KnowledgeGap['severity']) => {
    switch (severity) {
      case 'high':
        return isDark ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50'
      case 'medium':
        return isDark ? 'text-amber-400 bg-amber-900/20' : 'text-amber-600 bg-amber-50'
      case 'low':
        return isDark ? 'text-zinc-400 bg-zinc-700/50' : 'text-zinc-500 bg-zinc-100'
    }
  }

  const getReasonLabel = (reason: KnowledgeGap['reason']) => {
    switch (reason) {
      case 'no_saves':
        return 'No saves'
      case 'low_engagement':
        return 'Low engagement'
      case 'incomplete_session':
        return 'Incomplete'
      case 'abandoned':
        return 'Abandoned'
    }
  }

  const formatTimeSince = (timestamp?: number) => {
    if (!timestamp) return ''
    const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-100'}`}>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {gaps.summary.totalGaps}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Total Gaps</p>
        </div>
        <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <p className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {gaps.summary.highPriority}
          </p>
          <p className={`text-xs ${isDark ? 'text-red-400/70' : 'text-red-500'}`}>High Priority</p>
        </div>
        <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
          <p className={`text-xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {gaps.summary.topicsWithNoSaves}
          </p>
          <p className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-500'}`}>No Saves</p>
        </div>
      </div>

      {/* Gap List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {gaps.gaps.map((gap, index) => (
          <motion.div
            key={`${gap.topic}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              p-3 rounded-lg border
              ${isDark ? 'bg-zinc-700/30 border-zinc-600/50' : 'bg-white border-zinc-200'}
            `}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getSeverityColor(gap.severity).split(' ')[0]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}
                    title={gap.topic}
                  >
                    {gap.topic}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getSeverityColor(gap.severity)}`}
                  >
                    {getReasonLabel(gap.reason)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                    {gap.searchCount} searches
                  </span>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>•</span>
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                    {gap.saveCount} saves
                  </span>
                  {gap.lastSearched && (
                    <>
                      <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>•</span>
                      <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                        {formatTimeSince(gap.lastSearched)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-start gap-1.5 mt-2">
                  <Lightbulb className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <p className={`text-xs ${isDark ? 'text-cyan-300/80' : 'text-cyan-700'}`}>
                    {gap.suggestion}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// SIMPLE STAT CARD (inline for this section)
// ============================================================================

function StatCardSimple({
  label,
  value,
  icon,
  color,
  isDark,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: 'emerald' | 'cyan' | 'violet' | 'amber'
  isDark: boolean
}) {
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

  const colors = colorClasses[color]

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
        <div className={`p-2.5 rounded-lg ${colors.bg}`}>
          <div className={colors.text}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default ResearchSection
