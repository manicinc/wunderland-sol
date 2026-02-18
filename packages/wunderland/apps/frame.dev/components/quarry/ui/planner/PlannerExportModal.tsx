/**
 * Planner Export Modal
 * UI for exporting planner data with various options
 * @module quarry/ui/planner/PlannerExportModal
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Download,
  Calendar,
  FileJson,
  FileText,
  CalendarDays,
  ListTodo,
  Target,
  FolderKanban,
  Check,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  Cloud,
  HardDrive,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  exportPlannerData,
  downloadExport,
  getExportStats,
  type ExportFormat,
  type ExportOptions,
  type AutoSyncSettings,
} from '@/lib/planner/exportService'

// ============================================================================
// TYPES
// ============================================================================

interface PlannerExportModalProps {
  isOpen: boolean
  onClose: () => void
  theme?: 'light' | 'dark'
}

// ============================================================================
// FORMAT OPTIONS
// ============================================================================

const FORMAT_OPTIONS: {
  id: ExportFormat
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: 'json',
    label: 'JSON',
    description: 'Full structured data',
    icon: FileJson,
  },
  {
    id: 'ical',
    label: 'iCalendar',
    description: 'Import to calendar apps',
    icon: Calendar,
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Spreadsheet compatible',
    icon: FileText,
  },
]

const DATA_TYPE_OPTIONS: {
  id: 'task' | 'event' | 'goal' | 'project'
  label: string
  icon: React.ElementType
}[] = [
  { id: 'task', label: 'Tasks', icon: ListTodo },
  { id: 'event', label: 'Events', icon: CalendarDays },
  { id: 'goal', label: 'Goals', icon: Target },
  { id: 'project', label: 'Projects', icon: FolderKanban },
]

const QUICK_DATE_RANGES = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Year', days: 365 },
  { label: 'All Time', days: 0 },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlannerExportModal({
  isOpen,
  onClose,
  theme = 'dark',
}: PlannerExportModalProps) {
  const isDark = theme === 'dark'

  // State
  const [format, setFormat] = useState<ExportFormat>('json')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['task', 'event', 'goal', 'project'])
  )
  const [dateRangeDays, setDateRangeDays] = useState<number>(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    tasks: number
    events: number
    goals: number
    projects: number
    total: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Get API URL
  const apiUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/planner/export?format=${format}`
    : '/api/planner/export'

  // Calculate date range
  const getDateRange = () => {
    if (useCustomRange && customFrom && customTo) {
      return {
        from: new Date(customFrom),
        to: new Date(customTo),
      }
    }
    if (dateRangeDays === 0) return undefined
    return {
      from: new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000),
      to: new Date(),
    }
  }

  // Fetch stats when options change
  useEffect(() => {
    if (!isOpen) return

    const fetchStats = async () => {
      try {
        const result = await getExportStats({
          dateRange: getDateRange(),
          types: Array.from(selectedTypes) as any,
          includeArchived,
        })
        setStats(result)
      } catch (err) {
        console.error('[PlannerExportModal] Failed to fetch stats:', err)
      }
    }

    fetchStats()
  }, [isOpen, selectedTypes, dateRangeDays, customFrom, customTo, useCustomRange, includeArchived])

  // Toggle type selection
  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  // Handle export
  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const options: ExportOptions = {
        format,
        dateRange: getDateRange(),
        types: Array.from(selectedTypes) as any,
        includeArchived,
      }

      const data = await exportPlannerData(options)
      downloadExport(data, format)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  // Copy API URL
  const copyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(apiUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[PlannerExportModal] Failed to copy:', err)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto
                ${isDark ? 'bg-zinc-900' : 'bg-white'}
              `}
            >
              {/* Header */}
              <div
                className={`
                  p-6 border-b flex items-center justify-between
                  ${isDark ? 'border-zinc-800' : 'border-gray-200'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Export Planner Data
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      Download or sync your data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-500'}
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Format Selection */}
                <div>
                  <label className={`text-sm font-medium block mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Export Format
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {FORMAT_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      const isSelected = format === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setFormat(opt.id)}
                          className={`
                            p-3 rounded-xl border-2 transition-all text-left
                            ${
                              isSelected
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : isDark
                                  ? 'border-zinc-700 hover:border-zinc-600'
                                  : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <Icon
                            className={`w-5 h-5 mb-2 ${
                              isSelected ? 'text-cyan-500' : isDark ? 'text-zinc-400' : 'text-gray-500'
                            }`}
                          />
                          <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {opt.label}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                            {opt.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Data Types */}
                <div>
                  <label className={`text-sm font-medium block mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Include Data Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DATA_TYPE_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      const isSelected = selectedTypes.has(opt.id)
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleType(opt.id)}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                            ${
                              isSelected
                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                                : isDark
                                  ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{opt.label}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className={`text-sm font-medium block mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Date Range
                  </label>

                  {/* Quick options */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_DATE_RANGES.map((range) => (
                      <button
                        key={range.days}
                        onClick={() => {
                          setDateRangeDays(range.days)
                          setUseCustomRange(false)
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm transition-colors
                          ${
                            !useCustomRange && dateRangeDays === range.days
                              ? 'bg-cyan-500 text-white'
                              : isDark
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom range toggle */}
                  <button
                    onClick={() => setUseCustomRange(!useCustomRange)}
                    className={`
                      text-sm flex items-center gap-1
                      ${isDark ? 'text-cyan-400' : 'text-cyan-600'}
                    `}
                  >
                    <Calendar className="w-4 h-4" />
                    Custom date range
                  </button>

                  {/* Custom inputs */}
                  {useCustomRange && (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className={`
                          flex-1 px-3 py-2 rounded-lg border text-sm
                          ${isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                            : 'bg-white border-gray-200 text-gray-900'}
                        `}
                      />
                      <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>to</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className={`
                          flex-1 px-3 py-2 rounded-lg border text-sm
                          ${isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                            : 'bg-white border-gray-200 text-gray-900'}
                        `}
                      />
                    </div>
                  )}
                </div>

                {/* Options */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeArchived}
                      onChange={(e) => setIncludeArchived(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      Include archived items
                    </span>
                  </label>
                </div>

                {/* Stats Preview */}
                {stats && (
                  <div
                    className={`
                      p-4 rounded-xl
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}
                  >
                    <div className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      Export Preview
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stats.tasks}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Tasks</div>
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stats.events}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Events</div>
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stats.goals}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Goals</div>
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stats.projects}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Projects</div>
                      </div>
                    </div>
                    <div className={`text-center mt-3 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      Total: {stats.total} items
                    </div>
                  </div>
                )}

                {/* API Endpoint */}
                <div>
                  <label className={`text-sm font-medium block mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    API Endpoint
                  </label>
                  <div
                    className={`
                      flex items-center gap-2 p-3 rounded-lg font-mono text-xs
                      ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}
                    `}
                  >
                    <code className={`flex-1 truncate ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {apiUrl}
                    </code>
                    <button
                      onClick={copyApiUrl}
                      className={`
                        p-1.5 rounded transition-colors
                        ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'}
                      `}
                      title="Copy API URL"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {exportError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {exportError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className={`
                  p-6 border-t flex items-center justify-between
                  ${isDark ? 'border-zinc-800' : 'border-gray-200'}
                `}
              >
                <button
                  onClick={onClose}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm transition-colors
                    ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-100'}
                  `}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || selectedTypes.size === 0}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                    bg-gradient-to-r from-cyan-500 to-purple-500 text-white
                    hover:opacity-90 transition-opacity
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
