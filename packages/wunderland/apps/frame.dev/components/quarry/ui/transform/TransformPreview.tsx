/**
 * Transform Preview Component
 * @module codex/ui/transform/TransformPreview
 *
 * Shows a before/after preview of strand transformation.
 * Displays extracted fields and their values for each strand.
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import type { SupertagSchema } from '@/lib/supertags/types'
import type { TransformResult } from '@/lib/transform/types'

interface TransformPreviewProps {
  /** Transformation preview results */
  results: TransformResult[]
  /** Target supertag schema */
  schema: SupertagSchema
  /** Optional class name */
  className?: string
}

/**
 * Transform Preview - Before/after view of transformation
 */
export default function TransformPreview({
  results,
  schema,
  className = '',
}: TransformPreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  // Calculate stats
  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length
  const avgConfidence =
    results.length > 0
      ? results.reduce((sum, r) => {
          if (!r.extractedValues) return sum
          const fieldConfidences = Object.values(r.extractedValues).map(
            (f) => f.confidence
          )
          return (
            sum +
            (fieldConfidences.length > 0
              ? fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
              : 0)
          )
        }, 0) / results.length
      : 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700">
        <StatBadge
          icon={CheckCircle2}
          label="Ready"
          value={successCount}
          color="green"
        />
        {errorCount > 0 && (
          <StatBadge
            icon={AlertCircle}
            label="Errors"
            value={errorCount}
            color="red"
          />
        )}
        <StatBadge
          icon={Sparkles}
          label="Avg Confidence"
          value={`${Math.round(avgConfidence * 100)}%`}
          color="primary"
        />
      </div>

      {/* Preview List */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <PreviewCard
            key={result.strandId}
            result={result}
            schema={schema}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No strands to preview</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatBadgeProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  color: 'green' | 'red' | 'amber' | 'primary'
}

function StatBadge({ icon: Icon, label, value, color }: StatBadgeProps) {
  const colorClasses = {
    green: 'text-green-400 bg-green-900/30',
    red: 'text-red-400 bg-red-900/30',
    amber: 'text-amber-400 bg-amber-900/30',
    primary: 'text-primary-400 bg-primary-900/30',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="text-sm font-medium text-neutral-200">{value}</div>
      </div>
    </div>
  )
}

interface PreviewCardProps {
  result: TransformResult
  schema: SupertagSchema
  isExpanded: boolean
  onToggle: () => void
}

function PreviewCard({ result, schema, isExpanded, onToggle }: PreviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border overflow-hidden transition-colors
        ${
          result.success
            ? 'bg-neutral-800/50 border-neutral-700'
            : 'bg-red-900/10 border-red-800/50'
        }
      `}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/50 transition-colors"
      >
        {/* Status Icon */}
        {result.success ? (
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        )}

        {/* Title */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-200 truncate">
              {result.strandTitle}
            </span>
          </div>
          {result.error && (
            <p className="text-xs text-red-400 mt-0.5">{result.error}</p>
          )}
        </div>

        {/* Arrow and Toggle */}
        <div className="flex items-center gap-2 text-neutral-500">
          <ArrowRight className="w-4 h-4" />
          <span
            className="text-xs px-2 py-1 rounded-lg"
            style={{
              backgroundColor: schema.color ? `${schema.color}20` : 'rgb(64, 64, 64)',
              color: schema.color || 'rgb(200, 200, 200)',
            }}
          >
            #{schema.tagName}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && result.extractedValues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-neutral-700/50">
              <div className="pt-3 space-y-2">
                {/* Field Mappings */}
                {Object.entries(result.extractedValues).map(([fieldName, extracted]) => {
                  const fieldDef = schema.fields.find((f) => f.name === fieldName)
                  return (
                    <FieldPreviewRow
                      key={fieldName}
                      fieldName={fieldName}
                      fieldType={fieldDef?.type || 'text'}
                      value={extracted.value}
                      confidence={extracted.confidence}
                      source={extracted.source}
                    />
                  )
                })}

                {/* Show any required fields that are missing */}
                {schema.fields
                  .filter(
                    (f) =>
                      f.required && !result.extractedValues?.[f.name]?.value
                  )
                  .map((field) => (
                    <FieldPreviewRow
                      key={field.name}
                      fieldName={field.name}
                      fieldType={field.type}
                      value={undefined}
                      confidence={0}
                      source="manual"
                      isMissing
                    />
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface FieldPreviewRowProps {
  fieldName: string
  fieldType: string
  value: unknown
  confidence: number
  source: string
  isMissing?: boolean
}

function FieldPreviewRow({
  fieldName,
  fieldType,
  value,
  confidence,
  source,
  isMissing = false,
}: FieldPreviewRowProps) {
  const formattedValue = formatFieldValue(value, fieldType)
  const confidencePercent = Math.round(confidence * 100)

  let confidenceColor = 'text-green-400'
  if (confidence < 0.5) {
    confidenceColor = 'text-red-400'
  } else if (confidence < 0.8) {
    confidenceColor = 'text-amber-400'
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-2 rounded-lg
        ${isMissing ? 'bg-red-900/10' : 'bg-neutral-900/50'}
      `}
    >
      {/* Field Name */}
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-medium text-neutral-400">{fieldName}</span>
        <span className="text-[10px] text-neutral-600 ml-1">({fieldType})</span>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />

      {/* Value */}
      <div className="flex-1 min-w-0">
        {isMissing ? (
          <span className="text-xs text-red-400 italic">Missing (required)</span>
        ) : value !== undefined && value !== null && value !== '' ? (
          <span className="text-xs text-neutral-200 truncate block">
            {formattedValue}
          </span>
        ) : (
          <span className="text-xs text-neutral-500 italic">No value</span>
        )}
      </div>

      {/* Confidence & Source */}
      {!isMissing && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-neutral-500">{source}</span>
          <span className={`text-[10px] font-medium ${confidenceColor}`}>
            {confidencePercent}%
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatFieldValue(value: unknown, fieldType: string): string {
  if (value === undefined || value === null) return ''

  switch (fieldType) {
    case 'checkbox':
      return value ? 'Yes' : 'No'
    case 'date':
    case 'datetime':
      if (typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return value
        }
      }
      return String(value)
    case 'tags':
    case 'multiselect':
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return String(value)
    case 'number':
    case 'rating':
    case 'progress':
      return String(value)
    case 'reference':
      if (typeof value === 'object' && value !== null && 'title' in value) {
        return (value as { title: string }).title
      }
      return String(value)
    default:
      return String(value)
  }
}
