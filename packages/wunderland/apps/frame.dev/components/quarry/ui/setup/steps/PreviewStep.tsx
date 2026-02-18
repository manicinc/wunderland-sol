/**
 * Preview Step
 * Preview and customize the proposed structure
 * @module quarry/ui/setup/steps/PreviewStep
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  Loader2,
  RefreshCw,
  Lightbulb,
  AlertCircle,
} from 'lucide-react'
import { useSetupWizard } from '../SetupWizardContext'
import type {
  ProposedWeave,
  ProposedLoom,
  ProposedStrand,
  TemplateRecommendation,
} from '../types'

// ============================================================================
// AI REASONING PANEL
// ============================================================================

interface AIReasoningProps {
  reasoning: string
  loading: boolean
}

function AIReasoningPanel({ reasoning, loading }: AIReasoningProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 via-cyan-50 to-pink-50 dark:from-purple-500/10 dark:via-cyan-500/10 dark:to-pink-500/10 border border-purple-200 dark:border-purple-500/20">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-zinc-900 dark:text-white mb-1">
            AI Suggestion
          </h4>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing your preferences...</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {reasoning || 'Based on your goals and organization preferences, we suggest the following structure.'}
              </p>
              {reasoning && reasoning.length > 150 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline mt-1"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-zinc-600 dark:text-zinc-400 mt-2"
                  >
                    {reasoning}
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STRUCTURE TREE
// ============================================================================

interface TreeNodeProps {
  weave: ProposedWeave
  weaveIndex: number
  onEdit: (path: string, value: string) => void
  onRemove: (path: string) => void
}

function TreeNode({ weave, weaveIndex, onEdit, onRemove }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(weave.name)

  const handleSave = () => {
    onEdit(`weave-${weaveIndex}`, editValue)
    setEditing(false)
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Weave Header */}
      <div
        className={`
          flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50
          ${expanded ? 'border-b border-zinc-200 dark:border-zinc-700' : ''}
        `}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </button>
        <span className="text-xl">{weave.emoji || '📁'}</span>
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="flex-1 px-2 py-1 text-sm rounded border border-cyan-500 bg-white dark:bg-zinc-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button
              onClick={handleSave}
              className="p-1 rounded bg-cyan-500 text-white"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 font-medium text-zinc-900 dark:text-white">
              {weave.name}
            </span>
            <span className="text-xs text-zinc-400 mr-2">Weave</span>
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(`weave-${weaveIndex}`)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Looms */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="divide-y divide-zinc-100 dark:divide-zinc-800"
          >
            {weave.looms.map((loom, loomIndex) => (
              <LoomNode
                key={`${weaveIndex}-${loomIndex}`}
                loom={loom}
                weaveIndex={weaveIndex}
                loomIndex={loomIndex}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
            {weave.looms.length === 0 && (
              <div className="p-3 pl-10 text-sm text-zinc-400 italic">
                No looms yet
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface LoomNodeProps {
  loom: ProposedLoom
  weaveIndex: number
  loomIndex: number
  onEdit: (path: string, value: string) => void
  onRemove: (path: string) => void
}

function LoomNode({ loom, weaveIndex, loomIndex, onEdit, onRemove }: LoomNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(loom.name)

  const handleSave = () => {
    onEdit(`weave-${weaveIndex}-loom-${loomIndex}`, editValue)
    setEditing(false)
  }

  return (
    <div className="pl-6">
      {/* Loom Header */}
      <div className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-400" />
          )}
        </button>
        <FolderOpen className="w-4 h-4 text-amber-500" />
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="flex-1 px-2 py-0.5 text-sm rounded border border-cyan-500 bg-white dark:bg-zinc-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button
              onClick={handleSave}
              className="p-0.5 rounded bg-cyan-500 text-white"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
              {loom.name}
            </span>
            <span className="text-xs text-zinc-400 mr-2">Loom</span>
            <button
              onClick={() => setEditing(true)}
              className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(`weave-${weaveIndex}-loom-${loomIndex}`)}
              className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Strands */}
      <AnimatePresence>
        {expanded && loom.strands && loom.strands.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-6 pb-2"
          >
            {loom.strands.map((strand, strandIndex) => (
              <div
                key={strandIndex}
                className="flex items-center gap-2 p-1.5 text-sm text-zinc-600 dark:text-zinc-400"
              >
                <FileText className="w-3 h-3" />
                <span>{strand.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// TEMPLATE RECOMMENDATIONS
// ============================================================================

interface TemplateRecommendationsProps {
  recommendations: TemplateRecommendation[]
  selected: string[]
  onToggle: (id: string) => void
}

function TemplateRecommendations({
  recommendations,
  selected,
  onToggle,
}: TemplateRecommendationsProps) {
  if (recommendations.length === 0) return null

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Recommended Templates
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {recommendations.map((template) => (
          <button
            key={template.id}
            onClick={() => onToggle(template.id)}
            className={`
              p-3 rounded-lg border text-left transition-all
              ${
                selected.includes(template.id)
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="font-medium text-sm text-zinc-900 dark:text-white">
                  {template.name}
                </h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {template.description}
                </p>
              </div>
              <div
                className={`
                  w-4 h-4 rounded border flex-shrink-0
                  ${
                    selected.includes(template.id)
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }
                `}
              >
                {selected.includes(template.id) && (
                  <Check className="w-full h-full text-white" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {template.category}
              </span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400">
                {Math.round(template.matchScore * 100)}% match
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PreviewStep() {
  const {
    state,
    setProposedStructure,
    toggleTemplate,
    editStructure,
    setAILoading,
  } = useSetupWizard()
  const [localStructure, setLocalStructure] = useState(state.proposedStructure)

  // Generate structure on mount
  useEffect(() => {
    if (!state.proposedStructure) {
      generateStructure()
    }
  }, [])

  const generateStructure = async () => {
    setAILoading(true)

    // Simulate AI generation (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const structure = generateStructureFromPreferences()
    const reasoning = generateReasoning()

    setProposedStructure(structure, reasoning)
    setLocalStructure(structure)
    setAILoading(false)
  }

  const generateStructureFromPreferences = () => {
    const { selectedGoals, organizationMethod, organizationPreferences, customGoals } = state

    // Base weaves based on organization method
    const weaves: ProposedWeave[] = []

    if (organizationMethod === 'gtd') {
      weaves.push(
        { name: 'Inbox', description: 'Capture everything', emoji: '📥', looms: [] },
        {
          name: 'Next Actions',
          description: 'Actionable items',
          emoji: '⚡',
          looms: (organizationPreferences.gtdContexts || ['@home', '@work']).map((ctx) => ({
            name: ctx,
            description: `Actions for ${ctx}`,
          })),
        },
        { name: 'Waiting', description: 'Delegated items', emoji: '⏳', looms: [] },
        { name: 'Projects', description: 'Multi-step outcomes', emoji: '📋', looms: [] },
        { name: 'Someday', description: 'Future possibilities', emoji: '💭', looms: [] },
        { name: 'Reference', description: 'Information storage', emoji: '📚', looms: [] }
      )
    } else if (organizationMethod === 'para') {
      weaves.push(
        { name: 'Projects', description: 'Active projects', emoji: '🚀', looms: [] },
        {
          name: 'Areas',
          description: 'Life areas',
          emoji: '🎯',
          looms: (organizationPreferences.paraAreas || ['Health', 'Finance']).map((area) => ({
            name: area,
            description: `Notes about ${area}`,
          })),
        },
        { name: 'Resources', description: 'Topic references', emoji: '📖', looms: [] },
        { name: 'Archives', description: 'Inactive items', emoji: '🗄️', looms: [] }
      )
    } else if (organizationMethod === 'zettelkasten') {
      weaves.push(
        { name: 'Permanent Notes', description: 'Atomic ideas', emoji: '💡', looms: [] },
        { name: 'Literature Notes', description: 'Source summaries', emoji: '📚', looms: [] },
        { name: 'Fleeting Notes', description: 'Quick captures', emoji: '✏️', looms: [] },
        { name: 'Index', description: 'Entry points', emoji: '🔍', looms: [] }
      )
    } else if (organizationMethod === 'chronological') {
      const year = new Date().getFullYear()
      weaves.push({
        name: String(year),
        description: 'This year',
        emoji: '📅',
        looms: ['January', 'February', 'March'].map((month) => ({
          name: month,
          description: `${month} ${year}`,
        })),
      })
    } else if (organizationMethod === 'custom') {
      (organizationPreferences.customWeaves || []).forEach((name) => {
        weaves.push({
          name,
          description: `Custom weave: ${name}`,
          emoji: '📁',
          looms: [],
        })
      })
    } else {
      // Default by-project or by-topic
      if (selectedGoals.includes('productivity')) {
        weaves.push({
          name: 'Work',
          description: 'Work-related notes',
          emoji: '💼',
          looms: [
            { name: 'Projects', description: 'Active work projects' },
            { name: 'Meetings', description: 'Meeting notes' },
            { name: 'Quick Notes', description: 'Quick captures' },
          ],
        })
      }
      if (selectedGoals.includes('learning')) {
        weaves.push({
          name: 'Learning',
          description: 'Study materials',
          emoji: '🎓',
          looms: [
            { name: 'Courses', description: 'Course notes' },
            { name: 'Books', description: 'Book summaries' },
            { name: 'Concepts', description: 'Key concepts' },
          ],
        })
      }
      if (selectedGoals.includes('journaling')) {
        weaves.push({
          name: 'Journal',
          description: 'Personal reflections',
          emoji: '📓',
          looms: [
            { name: 'Daily', description: 'Daily entries' },
            { name: 'Reflections', description: 'Weekly/monthly reviews' },
          ],
        })
      }
      if (selectedGoals.includes('projects')) {
        weaves.push({
          name: 'Projects',
          description: 'Project documentation',
          emoji: '🚀',
          looms: [
            { name: 'Active', description: 'In-progress projects' },
            { name: 'Archive', description: 'Completed projects' },
          ],
        })
      }
    }

    // Add custom goals as weaves
    customGoals.forEach((goal) => {
      weaves.push({
        name: goal,
        description: `Custom: ${goal}`,
        emoji: '✨',
        looms: [],
      })
    })

    // Calculate totals
    const totalLooms = weaves.reduce((sum, w) => sum + w.looms.length, 0)
    const totalStrands = weaves.reduce(
      (sum, w) => sum + w.looms.reduce((s, l) => s + (l.strands?.length || 0), 0),
      0
    )

    // Generate template recommendations
    const suggestedTemplates: TemplateRecommendation[] = []
    if (selectedGoals.includes('productivity')) {
      suggestedTemplates.push({
        id: 'meeting-notes',
        name: 'Meeting Notes',
        category: 'Productivity',
        description: 'Structured template for meeting notes',
        matchScore: 0.95,
        matchReason: 'Matches your productivity goal',
      })
    }
    if (selectedGoals.includes('learning')) {
      suggestedTemplates.push({
        id: 'lecture-notes',
        name: 'Lecture Notes',
        category: 'Learning',
        description: 'Template for taking lecture notes',
        matchScore: 0.92,
        matchReason: 'Matches your learning goal',
      })
    }
    if (selectedGoals.includes('journaling')) {
      suggestedTemplates.push({
        id: 'daily-journal',
        name: 'Daily Journal',
        category: 'Journaling',
        description: 'Daily reflection template',
        matchScore: 0.98,
        matchReason: 'Perfect for journaling',
      })
    }

    return {
      weaves,
      totalLooms,
      totalStrands,
      suggestedTemplates,
    }
  }

  const generateReasoning = () => {
    const { selectedGoals, organizationMethod } = state
    const goals = selectedGoals.join(', ')
    return `Based on your goals (${goals}) and preference for ${organizationMethod || 'default'} organization, I've created a structure that balances flexibility with consistency. Each weave represents a major category, with looms for sub-organization. You can customize this structure by editing, adding, or removing items.`
  }

  const handleEdit = (path: string, value: string) => {
    editStructure({ type: 'rename', path, value })
    // Update local structure
    if (localStructure) {
      const parts = path.split('-')
      const weaveIndex = parseInt(parts[1])
      if (parts.length === 2) {
        // Editing weave name
        const newWeaves = [...localStructure.weaves]
        newWeaves[weaveIndex] = { ...newWeaves[weaveIndex], name: value }
        setLocalStructure({ ...localStructure, weaves: newWeaves })
      }
    }
  }

  const handleRemove = (path: string) => {
    editStructure({ type: 'remove', path })
    // Update local structure
    if (localStructure) {
      const parts = path.split('-')
      const weaveIndex = parseInt(parts[1])
      if (parts.length === 2) {
        // Removing weave
        const newWeaves = localStructure.weaves.filter((_, i) => i !== weaveIndex)
        setLocalStructure({ ...localStructure, weaves: newWeaves })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Reasoning */}
      <AIReasoningPanel
        reasoning={state.aiReasoning}
        loading={state.aiSuggestionsLoading}
      />

      {/* Structure Preview */}
      {state.aiSuggestionsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Generating your structure...</p>
        </div>
      ) : localStructure ? (
        <>
          {/* Stats */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                <strong className="text-zinc-900 dark:text-white">
                  {localStructure.weaves.length}
                </strong>{' '}
                Weaves
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                <strong className="text-zinc-900 dark:text-white">
                  {localStructure.totalLooms}
                </strong>{' '}
                Looms
              </span>
            </div>
            <button
              onClick={generateStructure}
              className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </div>

          {/* Tree View */}
          <div className="space-y-3">
            {localStructure.weaves.map((weave, index) => (
              <TreeNode
                key={index}
                weave={weave}
                weaveIndex={index}
                onEdit={handleEdit}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Template Recommendations */}
          <TemplateRecommendations
            recommendations={localStructure.suggestedTemplates}
            selected={state.selectedTemplates}
            onToggle={toggleTemplate}
          />
        </>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-zinc-600 dark:text-zinc-400">
            Failed to generate structure. Please try again.
          </p>
          <button
            onClick={generateStructure}
            className="mt-4 px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
