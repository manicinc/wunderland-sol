/**
 * Organization Step
 * Select organization method and preferences
 * @module quarry/ui/setup/steps/OrganizationStep
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderKanban,
  Tags,
  Calendar,
  ListTodo,
  Network,
  Layers,
  Settings2,
  ChevronDown,
  Info,
  Check,
  Plus,
  X,
} from 'lucide-react'
import { useSetupWizard } from '../SetupWizardContext'
import type { OrganizationMethod, OrganizationOption } from '../types'

// ============================================================================
// ORGANIZATION OPTIONS
// ============================================================================

const ORGANIZATION_OPTIONS: OrganizationOption[] = [
  {
    id: 'by-project',
    title: 'By Project',
    description: 'Organize around projects and initiatives',
    structure: 'Project A/\n  Notes/\n  Tasks/\n  Resources/',
    tooltip: 'Great for freelancers, entrepreneurs, and anyone juggling multiple projects',
    icon: 'FolderKanban',
  },
  {
    id: 'by-topic',
    title: 'By Topic',
    description: 'Group notes by subject area',
    structure: 'Science/\n  Physics/\n  Biology/\nTechnology/\n  Programming/',
    tooltip: 'Ideal for students, researchers, and lifelong learners',
    icon: 'Tags',
  },
  {
    id: 'chronological',
    title: 'Chronological',
    description: 'Organize by date and time',
    structure: '2024/\n  January/\n    01.md\n    02.md\n  February/',
    tooltip: 'Perfect for journaling, daily notes, and time-based tracking',
    icon: 'Calendar',
  },
  {
    id: 'gtd',
    title: 'GTD (Getting Things Done)',
    description: 'David Allen\'s productivity system',
    structure: 'Inbox/\nNext Actions/\nWaiting/\nProjects/\nSomeday/\nReference/',
    tooltip: 'A proven system for stress-free productivity and task management',
    icon: 'ListTodo',
  },
  {
    id: 'zettelkasten',
    title: 'Zettelkasten',
    description: 'Interconnected atomic notes',
    structure: 'Permanent Notes/\nLiterature Notes/\nFleeting Notes/\nIndex/',
    tooltip: 'A powerful method for building a second brain with linked notes',
    icon: 'Network',
  },
  {
    id: 'para',
    title: 'PARA Method',
    description: 'Projects, Areas, Resources, Archives',
    structure: 'Projects/\nAreas/\nResources/\nArchives/',
    tooltip: 'Tiago Forte\'s system for organizing digital information',
    icon: 'Layers',
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Create your own structure',
    structure: '(You define the structure)',
    tooltip: 'Full flexibility to design your own organizational system',
    icon: 'Settings2',
  },
]

const ICON_MAP: Record<string, React.ElementType> = {
  FolderKanban,
  Tags,
  Calendar,
  ListTodo,
  Network,
  Layers,
  Settings2,
}

// ============================================================================
// ORGANIZATION CARD
// ============================================================================

interface OrganizationCardProps {
  option: OrganizationOption
  selected: boolean
  onSelect: () => void
}

function OrganizationCard({ option, selected, onSelect }: OrganizationCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const Icon = ICON_MAP[option.icon] || FolderKanban

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl border-2 text-left transition-all
        ${
          selected
            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
            ${
              selected
                ? 'border-cyan-500 bg-cyan-500'
                : 'border-zinc-300 dark:border-zinc-600'
            }
          `}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Icon */}
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${
              selected
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }
          `}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`
                font-semibold
                ${selected ? 'text-cyan-700 dark:text-cyan-300' : 'text-zinc-900 dark:text-white'}
              `}
            >
              {option.title}
            </h3>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <Info className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-10 left-0 top-full mt-2 w-64 p-3 rounded-lg bg-zinc-900 text-white text-sm shadow-xl"
                  >
                    {option.tooltip}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-zinc-900 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {option.description}
          </p>
        </div>

        {/* Structure Preview */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            className="flex-shrink-0"
          >
            <pre className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 px-3 py-2 rounded-lg font-mono">
              {option.structure}
            </pre>
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

// ============================================================================
// PREFERENCES PANEL
// ============================================================================

interface PreferencesPanelProps {
  method: OrganizationMethod
}

function PreferencesPanel({ method }: PreferencesPanelProps) {
  const { state, setPreferences } = useSetupWizard()
  const [newContext, setNewContext] = useState('')
  const [newArea, setNewArea] = useState('')
  const [newWeave, setNewWeave] = useState('')

  const addGtdContext = () => {
    if (newContext.trim()) {
      setPreferences({
        gtdContexts: [...(state.organizationPreferences.gtdContexts || []), newContext.trim()],
      })
      setNewContext('')
    }
  }

  const removeGtdContext = (ctx: string) => {
    setPreferences({
      gtdContexts: (state.organizationPreferences.gtdContexts || []).filter((c) => c !== ctx),
    })
  }

  const addParaArea = () => {
    if (newArea.trim()) {
      setPreferences({
        paraAreas: [...(state.organizationPreferences.paraAreas || []), newArea.trim()],
      })
      setNewArea('')
    }
  }

  const removeParaArea = (area: string) => {
    setPreferences({
      paraAreas: (state.organizationPreferences.paraAreas || []).filter((a) => a !== area),
    })
  }

  const addCustomWeave = () => {
    if (newWeave.trim()) {
      setPreferences({
        customWeaves: [...(state.organizationPreferences.customWeaves || []), newWeave.trim()],
      })
      setNewWeave('')
    }
  }

  const removeCustomWeave = (weave: string) => {
    setPreferences({
      customWeaves: (state.organizationPreferences.customWeaves || []).filter((w) => w !== weave),
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-4"
    >
      <h4 className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        Preferences
      </h4>

      {/* Common preferences */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={state.organizationPreferences.createStarterStrands}
            onChange={(e) => setPreferences({ createStarterStrands: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Create starter strands with examples
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={state.organizationPreferences.includeReadme}
            onChange={(e) => setPreferences({ includeReadme: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Include README notes explaining each section
          </span>
        </label>
      </div>

      {/* GTD-specific */}
      {method === 'gtd' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            GTD Contexts (e.g., @home, @work, @phone)
          </label>
          <div className="flex flex-wrap gap-2">
            {(state.organizationPreferences.gtdContexts || ['@home', '@work', '@computer', '@phone']).map((ctx) => (
              <span
                key={ctx}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
              >
                {ctx}
                <button onClick={() => removeGtdContext(ctx)} className="hover:text-blue-900 dark:hover:text-blue-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="@context"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              onKeyDown={(e) => e.key === 'Enter' && addGtdContext()}
            />
            <button
              onClick={addGtdContext}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PARA-specific */}
      {method === 'para' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Life Areas (e.g., Health, Finance, Career)
          </label>
          <div className="flex flex-wrap gap-2">
            {(state.organizationPreferences.paraAreas || ['Health', 'Finance', 'Career', 'Relationships']).map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm"
              >
                {area}
                <button onClick={() => removeParaArea(area)} className="hover:text-purple-900 dark:hover:text-purple-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="New area..."
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              onKeyDown={(e) => e.key === 'Enter' && addParaArea()}
            />
            <button
              onClick={addParaArea}
              className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Zettelkasten-specific */}
      {method === 'zettelkasten' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note ID Format
          </label>
          <div className="flex gap-2">
            {(['date', 'sequence', 'uuid'] as const).map((format) => (
              <button
                key={format}
                onClick={() => setPreferences({ zettelIdFormat: format })}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium
                  ${
                    (state.organizationPreferences.zettelIdFormat || 'date') === format
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }
                `}
              >
                {format === 'date' && '202401151423'}
                {format === 'sequence' && '1a2b3c'}
                {format === 'uuid' && 'UUID'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chronological-specific */}
      {method === 'chronological' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note Frequency
          </label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setPreferences({ chronoFormat: freq })}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium capitalize
                  ${
                    (state.organizationPreferences.chronoFormat || 'daily') === freq
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }
                `}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom-specific */}
      {method === 'custom' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Top-level Weaves
          </label>
          <div className="flex flex-wrap gap-2">
            {(state.organizationPreferences.customWeaves || []).map((weave) => (
              <span
                key={weave}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm"
              >
                {weave}
                <button onClick={() => removeCustomWeave(weave)} className="hover:text-cyan-900 dark:hover:text-cyan-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWeave}
              onChange={(e) => setNewWeave(e.target.value)}
              placeholder="New weave..."
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              onKeyDown={(e) => e.key === 'Enter' && addCustomWeave()}
            />
            <button
              onClick={addCustomWeave}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrganizationStep() {
  const { state, setOrganization } = useSetupWizard()
  const [showPreferences, setShowPreferences] = useState(false)

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Choose an organization method that fits your workflow.
      </p>

      {/* Options */}
      <div className="space-y-2">
        {ORGANIZATION_OPTIONS.map((option) => (
          <OrganizationCard
            key={option.id}
            option={option}
            selected={state.organizationMethod === option.id}
            onSelect={() => setOrganization(option.id)}
          />
        ))}
      </div>

      {/* Preferences Toggle */}
      {state.organizationMethod && (
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400"
        >
          <Settings2 className="w-4 h-4" />
          <span>Customize preferences</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showPreferences ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Preferences Panel */}
      <AnimatePresence>
        {showPreferences && state.organizationMethod && (
          <PreferencesPanel method={state.organizationMethod} />
        )}
      </AnimatePresence>
    </div>
  )
}
