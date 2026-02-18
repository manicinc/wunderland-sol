/**
 * Goals Step
 * Select goals for your knowledge base
 * @module quarry/ui/setup/steps/GoalsStep
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  GraduationCap,
  BookOpen,
  FolderKanban,
  Search,
  PenTool,
  Database,
  ListTodo,
  Plus,
  X,
  Sparkles,
} from 'lucide-react'
import { useSetupWizard } from '../SetupWizardContext'
import type { GoalType, GoalOption } from '../types'

// ============================================================================
// GOAL OPTIONS
// ============================================================================

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'productivity',
    title: 'Productivity',
    description: 'Boost daily efficiency with organized notes and quick capture',
    icon: 'Briefcase',
    suggestedWeaves: ['Work', 'Quick Notes', 'Inbox'],
    suggestedTemplates: ['daily-note', 'meeting-notes', 'quick-capture'],
  },
  {
    id: 'learning',
    title: 'Learning',
    description: 'Study and retain knowledge with structured notes',
    icon: 'GraduationCap',
    suggestedWeaves: ['Courses', 'Study Notes', 'Flashcards'],
    suggestedTemplates: ['lecture-notes', 'book-summary', 'concept-map'],
  },
  {
    id: 'journaling',
    title: 'Journaling',
    description: 'Reflect and track your thoughts over time',
    icon: 'BookOpen',
    suggestedWeaves: ['Journal', 'Reflections', 'Gratitude'],
    suggestedTemplates: ['daily-journal', 'weekly-reflection', 'gratitude-log'],
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Manage projects with documentation and tracking',
    icon: 'FolderKanban',
    suggestedWeaves: ['Projects', 'Documentation', 'Resources'],
    suggestedTemplates: ['project-brief', 'project-log', 'decision-record'],
  },
  {
    id: 'research',
    title: 'Research',
    description: 'Collect, analyze, and synthesize information',
    icon: 'Search',
    suggestedWeaves: ['Research', 'Sources', 'Analysis'],
    suggestedTemplates: ['research-note', 'literature-review', 'hypothesis'],
  },
  {
    id: 'creative-writing',
    title: 'Creative Writing',
    description: 'Write stories, poems, and creative content',
    icon: 'PenTool',
    suggestedWeaves: ['Writing', 'Ideas', 'Drafts'],
    suggestedTemplates: ['story-outline', 'character-profile', 'writing-prompt'],
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base',
    description: 'Build a personal wiki and reference system',
    icon: 'Database',
    suggestedWeaves: ['Wiki', 'References', 'How-Tos'],
    suggestedTemplates: ['wiki-page', 'reference-card', 'procedure'],
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Track tasks, goals, and deadlines',
    icon: 'ListTodo',
    suggestedWeaves: ['Tasks', 'Goals', 'Routines'],
    suggestedTemplates: ['task-list', 'weekly-plan', 'goal-tracker'],
  },
]

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  GraduationCap,
  BookOpen,
  FolderKanban,
  Search,
  PenTool,
  Database,
  ListTodo,
}

// ============================================================================
// GOAL CARD
// ============================================================================

interface GoalCardProps {
  goal: GoalOption
  selected: boolean
  onToggle: () => void
}

function GoalCard({ goal, selected, onToggle }: GoalCardProps) {
  const Icon = ICON_MAP[goal.icon] || Briefcase

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`
        relative p-4 rounded-xl border-2 text-left transition-all
        ${
          selected
            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        }
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      {/* Icon */}
      <div
        className={`
          w-10 h-10 rounded-lg flex items-center justify-center mb-3
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
      <h3
        className={`
          font-semibold mb-1
          ${selected ? 'text-cyan-700 dark:text-cyan-300' : 'text-zinc-900 dark:text-white'}
        `}
      >
        {goal.title}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{goal.description}</p>

      {/* Suggested weaves preview */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-cyan-200 dark:border-cyan-800"
        >
          <div className="flex flex-wrap gap-1">
            {goal.suggestedWeaves.slice(0, 3).map((weave) => (
              <span
                key={weave}
                className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300"
              >
                {weave}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.button>
  )
}

// ============================================================================
// CUSTOM GOAL INPUT
// ============================================================================

interface CustomGoalInputProps {
  onAdd: (goal: string) => void
}

function CustomGoalInput({ onAdd }: CustomGoalInputProps) {
  const [value, setValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Add Custom Goal</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your custom goal..."
        autoFocus
        className="w-full px-3 py-2 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex-1 px-3 py-1.5 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Goal
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// CUSTOM GOAL TAG
// ============================================================================

interface CustomGoalTagProps {
  goal: string
  onRemove: () => void
}

function CustomGoalTag({ goal, onRemove }: CustomGoalTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm">
      <Sparkles className="w-3 h-3" />
      {goal}
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GoalsStep() {
  const { state, toggleGoal, addCustomGoal, removeCustomGoal } = useSetupWizard()

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Select one or more goals that describe how you&apos;ll use Quarry.
        <br />
        We&apos;ll suggest a structure tailored to your needs.
      </p>

      {/* Goal Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {GOAL_OPTIONS.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            selected={state.selectedGoals.includes(goal.id)}
            onToggle={() => toggleGoal(goal.id)}
          />
        ))}
      </div>

      {/* Custom Goals */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Custom Goals
        </h4>

        {/* Custom goal tags */}
        {state.customGoals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {state.customGoals.map((goal) => (
              <CustomGoalTag
                key={goal}
                goal={goal}
                onRemove={() => removeCustomGoal(goal)}
              />
            ))}
          </div>
        )}

        {/* Add custom goal */}
        <CustomGoalInput onAdd={addCustomGoal} />
      </div>

      {/* Summary */}
      {(state.selectedGoals.length > 0 || state.customGoals.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
        >
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>
              <strong className="text-zinc-900 dark:text-white">
                {state.selectedGoals.length + state.customGoals.length}
              </strong>{' '}
              goal{state.selectedGoals.length + state.customGoals.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
