/**
 * Supertag Picker Component
 * @module codex/ui/transform/SupertagPicker
 *
 * Grid of supertag schemas for selection during transformation.
 * Shows built-in and custom supertags with icons and descriptions.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Calendar,
  CheckSquare,
  Heart,
  BookOpen,
  FileText,
  Folder,
  Lightbulb,
  HelpCircle,
  GitBranch,
  CalendarClock,
  Plus,
  Sparkles,
} from 'lucide-react'
import type { SupertagSchema } from '@/lib/supertags/types'
import { getAllSchemas } from '@/lib/supertags/supertagManager'
import { WORKFLOW_PRESETS, type TransformWorkflowPreset } from '@/lib/transform/types'

interface SupertagPickerProps {
  /** Currently selected supertag */
  selected?: SupertagSchema | null
  /** Called when a supertag is selected */
  onSelect: (schema: SupertagSchema) => void
  /** Called when a workflow preset is selected */
  onSelectPreset?: (preset: TransformWorkflowPreset) => void
  /** Whether to show workflow presets */
  showPresets?: boolean
  /** Optional class name */
  className?: string
}

/**
 * Icon map for built-in supertags
 */
const SUPERTAG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  meeting: Calendar,
  task: CheckSquare,
  habit: Heart,
  book: BookOpen,
  article: FileText,
  project: Folder,
  idea: Lightbulb,
  question: HelpCircle,
  decision: GitBranch,
  event: CalendarClock,
}

/**
 * Supertag Picker - Grid of supertag options
 *
 * @example
 * ```tsx
 * <SupertagPicker
 *   selected={selectedSchema}
 *   onSelect={setSelectedSchema}
 *   showPresets={true}
 * />
 * ```
 */
export default function SupertagPicker({
  selected,
  onSelect,
  onSelectPreset,
  showPresets = true,
  className = '',
}: SupertagPickerProps) {
  const [schemas, setSchemas] = useState<SupertagSchema[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSchemas()
  }, [])

  async function loadSchemas() {
    try {
      const allSchemas = await getAllSchemas()
      setSchemas(allSchemas)
    } catch (error) {
      console.error('[SupertagPicker] Failed to load schemas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Separate built-in from custom schemas
  const builtInSchemas = schemas.filter((s) =>
    Object.keys(SUPERTAG_ICONS).includes(s.tagName)
  )
  const customSchemas = schemas.filter(
    (s) => !Object.keys(SUPERTAG_ICONS).includes(s.tagName)
  )

  if (loading) {
    return (
      <div className={`p-8 text-center text-neutral-500 ${className}`}>
        Loading supertags...
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workflow Presets */}
      {showPresets && (
        <section>
          <h3 className="text-sm font-medium text-neutral-400 mb-3">
            Quick Workflows
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WORKFLOW_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onClick={() => {
                  // Find the matching schema
                  const schema = schemas.find(
                    (s) => s.tagName === preset.targetSupertag
                  )
                  if (schema) {
                    onSelect(schema)
                    onSelectPreset?.(preset)
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Built-in Supertags */}
      <section>
        <h3 className="text-sm font-medium text-neutral-400 mb-3">
          Built-in Supertags
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {builtInSchemas.map((schema) => (
            <SupertagCard
              key={schema.id}
              schema={schema}
              isSelected={selected?.id === schema.id}
              onClick={() => onSelect(schema)}
            />
          ))}
        </div>
      </section>

      {/* Custom Supertags */}
      {customSchemas.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-neutral-400 mb-3">
            Custom Supertags
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {customSchemas.map((schema) => (
              <SupertagCard
                key={schema.id}
                schema={schema}
                isSelected={selected?.id === schema.id}
                onClick={() => onSelect(schema)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface SupertagCardProps {
  schema: SupertagSchema
  isSelected: boolean
  onClick: () => void
}

function SupertagCard({ schema, isSelected, onClick }: SupertagCardProps) {
  const Icon = SUPERTAG_ICONS[schema.tagName] || Sparkles

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-xl
        border transition-all duration-150
        ${
          isSelected
            ? 'bg-primary-600/20 border-primary-500 ring-2 ring-primary-500/30'
            : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800'
        }
      `}
      title={schema.description}
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: schema.color ? `${schema.color}20` : undefined }}
      >
        <span style={{ color: schema.color || undefined }}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <span className="text-xs font-medium text-neutral-200 text-center line-clamp-1">
        {schema.displayName}
      </span>
    </motion.button>
  )
}

interface PresetCardProps {
  preset: TransformWorkflowPreset
  onClick: () => void
}

function PresetCard({ preset, onClick }: PresetCardProps) {
  const presetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    CheckSquare: CheckSquare,
    Calendar: Calendar,
    Folder: Folder,
    Lightbulb: Lightbulb,
    GitBranch: GitBranch,
  }

  const Icon = preset.icon ? presetIcons[preset.icon] || Sparkles : Sparkles

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="
        flex items-start gap-3 p-3 rounded-xl text-left
        bg-gradient-to-br from-primary-900/30 to-primary-800/20
        border border-primary-700/50 hover:border-primary-600
        transition-all duration-150
      "
      title={preset.description}
    >
      <div className="p-1.5 rounded-lg bg-primary-600/20">
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-200 line-clamp-1">
          {preset.name}
        </div>
        <div className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
          {preset.description}
        </div>
      </div>
    </motion.button>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SupertagCard, PresetCard }
