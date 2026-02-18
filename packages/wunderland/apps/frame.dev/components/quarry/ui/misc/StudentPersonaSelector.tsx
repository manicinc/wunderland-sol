/**
 * Student Persona Selector Component
 *
 * Displays the 5 AI student personas for Teach Mode selection.
 * Each persona has a distinct personality for asking questions.
 *
 * @module codex/ui/StudentPersonaSelector
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Info } from 'lucide-react'
import type { StudentPersona, StudentPersonaConfig } from '@/types/openstrand'
import { STUDENT_PERSONAS } from '@/types/openstrand'

interface StudentPersonaSelectorProps {
  /** Currently selected persona */
  selectedPersona: StudentPersona | null
  /** Callback when persona is selected */
  onSelect: (persona: StudentPersona) => void
  /** Theme */
  isDark?: boolean
  /** Compact mode (for mobile) */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
}

/**
 * Get Tailwind color classes for a persona
 */
function getPersonaColors(color: string, isDark: boolean, isSelected: boolean) {
  const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    sky: {
      bg: isSelected
        ? isDark ? 'bg-sky-500/20' : 'bg-sky-100'
        : isDark ? 'bg-zinc-800/50' : 'bg-white',
      border: isSelected
        ? 'border-sky-500'
        : isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isSelected
        ? isDark ? 'text-sky-400' : 'text-sky-600'
        : isDark ? 'text-zinc-300' : 'text-zinc-700',
      hover: isDark ? 'hover:border-sky-500/50' : 'hover:border-sky-300',
    },
    amber: {
      bg: isSelected
        ? isDark ? 'bg-amber-500/20' : 'bg-amber-100'
        : isDark ? 'bg-zinc-800/50' : 'bg-white',
      border: isSelected
        ? 'border-amber-500'
        : isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isSelected
        ? isDark ? 'text-amber-400' : 'text-amber-600'
        : isDark ? 'text-zinc-300' : 'text-zinc-700',
      hover: isDark ? 'hover:border-amber-500/50' : 'hover:border-amber-300',
    },
    red: {
      bg: isSelected
        ? isDark ? 'bg-red-500/20' : 'bg-red-100'
        : isDark ? 'bg-zinc-800/50' : 'bg-white',
      border: isSelected
        ? 'border-red-500'
        : isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isSelected
        ? isDark ? 'text-red-400' : 'text-red-600'
        : isDark ? 'text-zinc-300' : 'text-zinc-700',
      hover: isDark ? 'hover:border-red-500/50' : 'hover:border-red-300',
    },
    purple: {
      bg: isSelected
        ? isDark ? 'bg-purple-500/20' : 'bg-purple-100'
        : isDark ? 'bg-zinc-800/50' : 'bg-white',
      border: isSelected
        ? 'border-purple-500'
        : isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isSelected
        ? isDark ? 'text-purple-400' : 'text-purple-600'
        : isDark ? 'text-zinc-300' : 'text-zinc-700',
      hover: isDark ? 'hover:border-purple-500/50' : 'hover:border-purple-300',
    },
    emerald: {
      bg: isSelected
        ? isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
        : isDark ? 'bg-zinc-800/50' : 'bg-white',
      border: isSelected
        ? 'border-emerald-500'
        : isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isSelected
        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
        : isDark ? 'text-zinc-300' : 'text-zinc-700',
      hover: isDark ? 'hover:border-emerald-500/50' : 'hover:border-emerald-300',
    },
  }
  return colors[color] || colors.sky
}

/**
 * Individual persona card
 */
function PersonaCard({
  persona,
  isSelected,
  isDark,
  compact,
  disabled,
  onSelect,
}: {
  persona: StudentPersonaConfig
  isSelected: boolean
  isDark: boolean
  compact: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const colors = getPersonaColors(persona.color, isDark, isSelected)

  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative flex ${compact ? 'flex-row items-center gap-2 p-2' : 'flex-col items-center gap-2 p-4'}
        rounded-xl border-2 transition-all
        ${colors.bg} ${colors.border} ${!disabled && colors.hover}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
        ${isSelected ? (isDark ? 'ring-offset-zinc-900' : 'ring-offset-white') : ''}
        ${isSelected ? `ring-${persona.color}-500` : ''}
      `}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute ${compact ? 'top-1 right-1' : 'top-2 right-2'}
            w-5 h-5 rounded-full flex items-center justify-center
            ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'}
          `}
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}

      {/* Icon */}
      <span className={`${compact ? 'text-2xl' : 'text-4xl'}`}>
        {persona.icon}
      </span>

      {/* Name and description */}
      <div className={`${compact ? 'flex-1 text-left' : 'text-center'}`}>
        <h3 className={`
          font-semibold ${compact ? 'text-sm' : 'text-base'}
          ${colors.text}
        `}>
          {persona.name}
        </h3>
        {!compact && (
          <p className={`
            text-xs mt-1 line-clamp-2
            ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
          `}>
            {persona.description}
          </p>
        )}
      </div>

      {/* Info tooltip for compact mode */}
      {compact && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowTooltip(!showTooltip)
          }}
          className={`
            p-1 rounded-full
            ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}
          `}
        >
          <Info className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && compact && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`
              absolute left-0 top-full mt-2 z-50
              p-2 rounded-lg shadow-lg
              ${isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-white text-zinc-700'}
              border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
              text-xs max-w-[200px]
            `}
          >
            {persona.description}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/**
 * Student Persona Selector
 *
 * Displays a grid of AI student personas for selection
 */
export function StudentPersonaSelector({
  selectedPersona,
  onSelect,
  isDark = false,
  compact = false,
  disabled = false,
}: StudentPersonaSelectorProps) {
  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between`}>
        <h2 className={`
          text-sm font-medium
          ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
        `}>
          Choose Your Student
        </h2>
        <span className={`
          text-xs
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          Different personas ask different questions
        </span>
      </div>

      <div className={`
        grid gap-3
        ${compact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}
      `}>
        {STUDENT_PERSONAS.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            isSelected={selectedPersona === persona.id}
            isDark={isDark}
            compact={compact}
            disabled={disabled}
            onSelect={() => onSelect(persona.id)}
          />
        ))}
      </div>

      {/* Selected persona description (for non-compact) */}
      {!compact && selectedPersona && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`
            p-3 rounded-lg
            ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {STUDENT_PERSONAS.find(p => p.id === selectedPersona)?.icon}
            </span>
            <div>
              <h4 className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                {STUDENT_PERSONAS.find(p => p.id === selectedPersona)?.name}
              </h4>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {STUDENT_PERSONAS.find(p => p.id === selectedPersona)?.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default StudentPersonaSelector
