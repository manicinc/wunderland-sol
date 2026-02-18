/**
 * Temporal Filter Bar
 * Date range picker and auto-detect indicator for time-aware search
 * @module quarry/ui/ask/TemporalFilterBar
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CalendarDays,
  Clock,
  ChevronDown,
  X,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react'
import {
  parseTemporalContext,
  formatDateRange,
  getQuickDateRanges,
  type TemporalContext,
} from '@/lib/search/temporalSearch'
import { useRAGContext } from './RAGContext'

// ============================================================================
// TYPES
// ============================================================================

interface TemporalFilterBarProps {
  query: string
  className?: string
  compact?: boolean
}

// ============================================================================
// QUICK DATE PICKER
// ============================================================================

interface QuickDatePickerProps {
  onSelect: (range: { start: Date; end: Date }) => void
  selectedRange: { start: Date; end: Date } | null
}

function QuickDatePicker({ onSelect, selectedRange }: QuickDatePickerProps) {
  const quickRanges = getQuickDateRanges()

  const isSelected = (range: { start: Date; end: Date }) => {
    if (!selectedRange) return false
    return (
      range.start.getTime() === selectedRange.start.getTime() &&
      range.end.getTime() === selectedRange.end.getTime()
    )
  }

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        Quick Select
      </div>
      <div className="flex flex-wrap gap-2">
        {quickRanges.map(({ label, range }) => (
          <button
            key={label}
            onClick={() => onSelect(range)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${
                isSelected(range)
                  ? 'bg-cyan-500 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// CUSTOM DATE RANGE
// ============================================================================

interface CustomDateRangeProps {
  onSelect: (range: { start: Date; end: Date }) => void
  initialRange?: { start: Date; end: Date } | null
}

function CustomDateRange({ onSelect, initialRange }: CustomDateRangeProps) {
  const [startDate, setStartDate] = useState(
    initialRange?.start.toISOString().split('T')[0] || ''
  )
  const [endDate, setEndDate] = useState(
    initialRange?.end.toISOString().split('T')[0] || ''
  )

  const handleApply = () => {
    if (startDate && endDate) {
      onSelect({
        start: new Date(startDate + 'T00:00:00'),
        end: new Date(endDate + 'T23:59:59'),
      })
    }
  }

  return (
    <div className="p-3 border-t border-zinc-700 space-y-3">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Custom Range
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500"
        />
        <span className="text-zinc-500">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={handleApply}
          disabled={!startDate || !endDate}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// AUTO-DETECT INDICATOR
// ============================================================================

interface AutoDetectIndicatorProps {
  context: TemporalContext
  onAccept: () => void
  onDismiss: () => void
}

function AutoDetectIndicator({ context, onAccept, onDismiss }: AutoDetectIndicatorProps) {
  if (!context.detected || !context.dateRange) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30"
    >
      <Sparkles className="w-4 h-4 text-amber-400" />
      <div className="flex-1 text-sm">
        <span className="text-amber-300">Detected: </span>
        <span className="text-zinc-300">
          {context.relativeTerms.join(', ')} → {formatDateRange(context.dateRange)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onAccept}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-400"
          title="Use this date range"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TemporalFilterBar({
  query,
  className = '',
  compact = false,
}: TemporalFilterBarProps) {
  const {
    state,
    setDetectedDateRange,
    setManualDateRange,
    setTemporalTerms,
    resetTemporal,
    getEffectiveDateRange,
  } = useRAGContext()

  const [showPicker, setShowPicker] = useState(false)
  const [dismissedDetection, setDismissedDetection] = useState(false)

  // Parse temporal context from query
  const temporalContext = useMemo(() => {
    if (!query || !state.settings.autoDetectTemporal) {
      return { detected: false, dateRange: null, relativeTerms: [], confidence: 0, type: null }
    }
    return parseTemporalContext(query)
  }, [query, state.settings.autoDetectTemporal])

  // Update detected date range when query changes
  useEffect(() => {
    if (temporalContext.detected && temporalContext.dateRange) {
      setDetectedDateRange(temporalContext.dateRange)
      setTemporalTerms(temporalContext.relativeTerms)
      setDismissedDetection(false)
    } else {
      setDetectedDateRange(null)
      setTemporalTerms([])
    }
  }, [temporalContext, setDetectedDateRange, setTemporalTerms])

  const effectiveRange = getEffectiveDateRange()
  const hasActiveFilter = !!effectiveRange

  const handleQuickSelect = (range: { start: Date; end: Date }) => {
    setManualDateRange(range)
    setShowPicker(false)
  }

  const handleCustomSelect = (range: { start: Date; end: Date }) => {
    setManualDateRange(range)
    setShowPicker(false)
  }

  const handleClear = () => {
    resetTemporal()
    setDismissedDetection(true)
  }

  const handleAcceptDetection = () => {
    if (temporalContext.dateRange) {
      setManualDateRange(temporalContext.dateRange)
    }
  }

  const handleDismissDetection = () => {
    setDismissedDetection(true)
  }

  // Compact mode
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
            transition-colors
            ${
              hasActiveFilter
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }
          `}
        >
          <Calendar className="w-3 h-3" />
          {hasActiveFilter ? formatDateRange(effectiveRange!) : 'Date Filter'}
          {hasActiveFilter && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="ml-1 p-0.5 rounded hover:bg-white/10"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50"
            >
              <QuickDatePicker onSelect={handleQuickSelect} selectedRange={effectiveRange} />
              <CustomDateRange onSelect={handleCustomSelect} initialRange={effectiveRange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full mode
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          Date Filter
        </h4>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Auto-detect indicator */}
      <AnimatePresence>
        {temporalContext.detected &&
          temporalContext.dateRange &&
          !dismissedDetection &&
          !state.manualDateRange && (
            <AutoDetectIndicator
              context={temporalContext}
              onAccept={handleAcceptDetection}
              onDismiss={handleDismissDetection}
            />
          )}
      </AnimatePresence>

      {/* Current filter */}
      {hasActiveFilter && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-200">{formatDateRange(effectiveRange!)}</span>
            {state.temporalTerms.length > 0 && (
              <span className="text-xs text-zinc-500">
                ({state.temporalTerms.join(', ')})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Picker toggle */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center justify-between w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
      >
        <span className="text-sm text-zinc-300">
          {hasActiveFilter ? 'Change date range' : 'Select date range'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform ${showPicker ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Picker dropdown */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg bg-zinc-800/50 border border-zinc-700"
          >
            <QuickDatePicker onSelect={handleQuickSelect} selectedRange={effectiveRange} />
            <CustomDateRange onSelect={handleCustomSelect} initialRange={effectiveRange} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-detect status */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {state.settings.autoDetectTemporal ? (
          <>
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Auto-detect enabled</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3 h-3" />
            <span>Auto-detect disabled</span>
          </>
        )}
      </div>
    </div>
  )
}
