/**
 * Field Mapping Editor Component
 * @module codex/ui/transform/FieldMappingEditor
 *
 * Editor for configuring how fields are extracted from strand content.
 * Shows extraction source, confidence, and allows manual overrides.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Tag,
  Calendar,
  Hash,
  Link,
  Mail,
  Phone,
  Star,
  CheckSquare,
  List,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { SupertagSchema, SupertagFieldDefinition } from '@/lib/supertags/types'
import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'
import type { FieldMappingConfig, ExtractionSource } from '@/lib/transform/types'
import { extractFieldsFromStrand } from '@/lib/transform/contentExtractor'

interface FieldMappingEditorProps {
  /** Target supertag schema */
  schema: SupertagSchema
  /** Current field mappings */
  mappings: FieldMappingConfig[]
  /** Called when mappings change */
  onChange: (mappings: FieldMappingConfig[]) => void
  /** Sample strand for preview */
  sampleStrand?: SelectedStrand
  /** Optional class name */
  className?: string
}

/**
 * Field type icons
 */
const FIELD_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  textarea: FileText,
  number: Hash,
  date: Calendar,
  datetime: Calendar,
  checkbox: CheckSquare,
  select: List,
  multiselect: List,
  url: Link,
  email: Mail,
  phone: Phone,
  rating: Star,
  progress: Sparkles,
  tags: Tag,
  reference: Link,
}

/**
 * Extraction source labels
 */
const SOURCE_LABELS: Record<ExtractionSource | 'auto', string> = {
  auto: 'Auto-detect',
  title: 'From Title',
  content: 'From Content',
  frontmatter: 'From Frontmatter',
  tags: 'From Tags',
  filename: 'From Filename',
  manual: 'Manual Input',
  ai: 'AI Extraction',
}

/**
 * Field Mapping Editor
 */
export default function FieldMappingEditor({
  schema,
  mappings,
  onChange,
  sampleStrand,
  className = '',
}: FieldMappingEditorProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [sampleExtractions, setSampleExtractions] = useState<Record<string, { value: unknown; confidence: number; preview?: string }>>({})

  // Extract sample values when sample strand changes
  useEffect(() => {
    if (sampleStrand) {
      extractSampleValues()
    }
  }, [sampleStrand, schema])

  async function extractSampleValues() {
    if (!sampleStrand) return

    try {
      const extracted = await extractFieldsFromStrand(sampleStrand, schema)
      const samples: Record<string, { value: unknown; confidence: number; preview?: string }> = {}
      for (const [fieldName, result] of Object.entries(extracted)) {
        samples[fieldName] = {
          value: result.value,
          confidence: result.confidence,
          preview: result.preview,
        }
      }
      setSampleExtractions(samples)
    } catch (error) {
      console.error('[FieldMappingEditor] Failed to extract sample:', error)
    }
  }

  const updateMapping = (fieldName: string, updates: Partial<FieldMappingConfig>) => {
    onChange(
      mappings.map((m) =>
        m.fieldName === fieldName ? { ...m, ...updates } : m
      )
    )
  }

  const toggleSkip = (fieldName: string) => {
    const mapping = mappings.find((m) => m.fieldName === fieldName)
    if (mapping) {
      updateMapping(fieldName, { skip: !mapping.skip })
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-400">
          Field Mappings
        </h3>
        {sampleStrand && (
          <span className="text-xs text-neutral-500">
            Previewing: {sampleStrand.title}
          </span>
        )}
      </div>

      {schema.fields.map((field) => {
        const mapping = mappings.find((m) => m.fieldName === field.name)
        const sample = sampleExtractions[field.name]
        const isExpanded = expandedField === field.name
        const FieldIcon = FIELD_TYPE_ICONS[field.type] || FileText

        return (
          <motion.div
            key={field.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              rounded-xl border transition-colors
              ${mapping?.skip
                ? 'bg-neutral-900/50 border-neutral-800/50 opacity-60'
                : 'bg-neutral-800/50 border-neutral-700'
              }
            `}
          >
            {/* Field Header */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedField(isExpanded ? null : field.name)}
            >
              {/* Field Icon */}
              <div className="p-2 rounded-lg bg-neutral-700/50">
                <FieldIcon className="w-4 h-4 text-neutral-400" />
              </div>

              {/* Field Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-200">
                    {field.name}
                  </span>
                  <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-neutral-800 rounded">
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="text-xs text-amber-400">Required</span>
                  )}
                </div>
                {sample && !mapping?.skip && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                      {sample.preview || String(sample.value) || 'No value'}
                    </span>
                    <ConfidenceBadge confidence={sample.confidence} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSkip(field.name)
                  }}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${mapping?.skip
                      ? 'text-neutral-600 hover:text-neutral-400'
                      : 'text-neutral-400 hover:text-white'
                    }
                  `}
                  title={mapping?.skip ? 'Enable field' : 'Skip field'}
                >
                  {mapping?.skip ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                )}
              </div>
            </div>

            {/* Expanded Options */}
            {isExpanded && !mapping?.skip && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 pb-3 border-t border-neutral-700/50"
              >
                <div className="pt-3 space-y-3">
                  {/* Extraction Source */}
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">
                      Extraction Source
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['auto', 'title', 'content', 'frontmatter', 'tags', 'manual'] as const).map(
                        (source) => (
                          <button
                            key={source}
                            onClick={() => updateMapping(field.name, { extractionSource: source })}
                            className={`
                              px-2.5 py-1 text-xs rounded-lg transition-colors
                              ${mapping?.extractionSource === source
                                ? 'bg-primary-600 text-white'
                                : 'bg-neutral-700 text-neutral-400 hover:text-white'
                              }
                            `}
                          >
                            {SOURCE_LABELS[source]}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Manual Value (when manual source selected) */}
                  {mapping?.extractionSource === 'manual' && (
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1.5">
                        Manual Value
                      </label>
                      <input
                        type="text"
                        value={String(mapping.manualValue || '')}
                        onChange={(e) =>
                          updateMapping(field.name, { manualValue: e.target.value })
                        }
                        placeholder="Enter value..."
                        className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}

                  {/* Default Value */}
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">
                      Default Value (if extraction fails)
                    </label>
                    <input
                      type="text"
                      value={String(mapping?.defaultValue || '')}
                      onChange={(e) =>
                        updateMapping(field.name, { defaultValue: e.target.value || undefined })
                      }
                      placeholder="No default"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Custom Pattern (advanced) */}
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">
                      Custom Regex Pattern (optional)
                    </label>
                    <input
                      type="text"
                      value={mapping?.pattern || ''}
                      onChange={(e) =>
                        updateMapping(field.name, { pattern: e.target.value || undefined })
                      }
                      placeholder="e.g., Due:\s*(.+)"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  let colorClass = 'text-green-400 bg-green-900/30'
  if (confidence < 0.5) {
    colorClass = 'text-red-400 bg-red-900/30'
  } else if (confidence < 0.8) {
    colorClass = 'text-amber-400 bg-amber-900/30'
  }

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${colorClass}`}>
      {percent}%
    </span>
  )
}
