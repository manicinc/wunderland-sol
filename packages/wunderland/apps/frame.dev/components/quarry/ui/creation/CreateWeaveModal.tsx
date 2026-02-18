/**
 * CreateWeaveModal - Full-Featured Weave Creation Wizard
 * @module components/quarry/ui/creation/CreateWeaveModal
 *
 * Multi-step wizard for creating new weaves (root-level knowledge universes).
 * Includes name/description, cover photo, icon/color, and visibility settings.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Folder,
  Sparkles,
  Palette,
  Eye,
  Globe,
  Lock,
  Users,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'
import CoverPhotoPicker, { type CoverSelection } from './CoverPhotoPicker'
import CoverPreview from './CoverPreview'
import { suggestCoverForContent, getSuggestedColorsForCategory, detectCategoryFromText } from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface WeaveFormData {
  name: string
  slug: string
  description: string
  cover: CoverSelection | null
  icon: string
  emoji: string
  accentColor: string
  visibility: 'private' | 'shared' | 'public'
}

export interface CreateWeaveModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Submit handler with form data */
  onSubmit: (data: WeaveFormData) => Promise<void>
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Initial values for editing */
  initialValues?: Partial<WeaveFormData>
  /** Mode: create or edit */
  mode?: 'create' | 'edit'
}

type WizardStep = 'basics' | 'cover' | 'style' | 'visibility' | 'review'

// ============================================================================
// CONSTANTS
// ============================================================================

const WIZARD_STEPS: { id: WizardStep; title: string; icon: React.ElementType }[] = [
  { id: 'basics', title: 'Basics', icon: Folder },
  { id: 'cover', title: 'Cover', icon: Sparkles },
  { id: 'style', title: 'Style', icon: Palette },
  { id: 'visibility', title: 'Visibility', icon: Eye },
  { id: 'review', title: 'Review', icon: Check },
]

const DEFAULT_EMOJIS = ['📚', '🎯', '💡', '🔬', '🎨', '📝', '🌟', '🚀', '🔧', '🌱', '📊', '🎓', '🏠', '💼', '🎮', '🎵']

const ACCENT_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' },
]

const VISIBILITY_OPTIONS = [
  {
    id: 'private' as const,
    icon: Lock,
    title: 'Private',
    description: 'Only you can access this weave',
  },
  {
    id: 'shared' as const,
    icon: Users,
    title: 'Shared',
    description: 'Share with specific people via link',
  },
  {
    id: 'public' as const,
    icon: Globe,
    title: 'Public',
    description: 'Anyone can view this weave',
  },
]

const DEFAULT_FORM_DATA: WeaveFormData = {
  name: '',
  slug: '',
  description: '',
  cover: null,
  icon: '',
  emoji: '📚',
  accentColor: '#6366f1',
  visibility: 'private',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StepIndicatorProps {
  steps: typeof WIZARD_STEPS
  currentStep: WizardStep
  onStepClick: (step: WizardStep) => void
  isDark: boolean
  completedSteps: Set<WizardStep>
}

function StepIndicator({ steps, currentStep, onStepClick, isDark, completedSteps }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isCompleted = completedSteps.has(step.id)
        const isClickable = index <= currentIndex || isCompleted
        const Icon = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                ${isActive
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-cyan-100 text-cyan-700'
                  : isCompleted
                    ? isDark
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : isDark
                      ? 'text-zinc-500'
                      : 'text-zinc-400'
                }
                ${isClickable ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800' : 'cursor-not-allowed'}
              `}
            >
              {isCompleted && !isActive ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:block">{step.title}</span>
            </button>

            {index < steps.length - 1 && (
              <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepBasicsProps {
  formData: WeaveFormData
  onChange: (updates: Partial<WeaveFormData>) => void
  isDark: boolean
  errors: Record<string, string>
}

function StepBasics({ formData, onChange, isDark, errors }: StepBasicsProps) {
  const handleNameChange = useCallback((name: string) => {
    onChange({
      name,
      slug: generateSlug(name),
    })
  }, [onChange])

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Name Your Weave
        </h2>
        <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Weaves are root-level knowledge universes that contain your looms and strands.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Weave Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Technology Notes, Research Papers, Creative Writing"
          className={`
            w-full px-4 py-3 rounded-xl text-base
            ${isDark
              ? 'bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700'
              : 'bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-200'
            }
            border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            ${errors.name ? 'border-red-500' : ''}
          `}
        />
        {errors.name && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          URL Slug
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            weaves/
          </span>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => onChange({ slug: generateSlug(e.target.value) })}
            placeholder="technology-notes"
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm font-mono
              ${isDark
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-white text-zinc-900 border-zinc-200'
              }
              border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            `}
          />
        </div>
        {errors.slug && (
          <p className="text-sm text-red-500">{errors.slug}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What will this weave contain? (optional)"
          rows={3}
          className={`
            w-full px-4 py-3 rounded-xl text-base resize-none
            ${isDark
              ? 'bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700'
              : 'bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-200'
            }
            border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
          `}
        />
      </div>

      {/* Tip */}
      <div className={`
        flex items-start gap-3 p-4 rounded-xl
        ${isDark ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-100'}
      `}>
        <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
        <div>
          <p className={`text-sm ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
            <strong>Pro tip:</strong> Use descriptive names that help you quickly identify what's inside.
            Good weave names are specific and actionable.
          </p>
        </div>
      </div>
    </div>
  )
}

interface StepCoverProps {
  formData: WeaveFormData
  onChange: (updates: Partial<WeaveFormData>) => void
  isDark: boolean
}

function StepCover({ formData, onChange, isDark }: StepCoverProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateSuggestion = useCallback(async () => {
    if (!formData.name) return
    
    setIsGenerating(true)
    try {
      const config = await suggestCoverForContent(formData.name, formData.description)
      const { generateCollectionCoverDataUrl } = await import('@/lib/collections/coverGenerator')
      const url = generateCollectionCoverDataUrl(config, 800, 400)
      
      onChange({
        cover: {
          type: 'generated',
          url,
          pattern: config.pattern,
          primaryColor: config.primaryColor,
        },
        accentColor: config.primaryColor,
      })
    } catch (err) {
      console.error('Failed to generate cover suggestion:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [formData.name, formData.description, onChange])

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Choose a Cover
        </h2>
        <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Pick a beautiful cover image to make your weave stand out.
        </p>
      </div>

      {/* AI Suggestion Button */}
      {formData.name && !formData.cover && (
        <button
          onClick={handleGenerateSuggestion}
          disabled={isGenerating}
          className={`
            w-full flex items-center justify-center gap-2 py-3 rounded-xl
            font-medium transition-all duration-200
            ${isDark
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
              : 'bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 hover:from-cyan-200 hover:to-blue-200'
            }
          `}
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span>Generate AI Suggestion</span>
        </button>
      )}

      {/* Cover Preview */}
      {formData.cover && (
        <CoverPreview
          cover={formData.cover}
          title={formData.name}
          icon={formData.emoji}
          aspectRatio="wide"
          size="lg"
          isDark={isDark}
        />
      )}

      {/* Cover Picker */}
      <CoverPhotoPicker
        value={formData.cover}
        onChange={(cover) => onChange({ cover })}
        isDark={isDark}
        suggestedCategory={formData.name ? detectCategoryFromText(formData.name) : undefined}
      />
    </div>
  )
}

interface StepStyleProps {
  formData: WeaveFormData
  onChange: (updates: Partial<WeaveFormData>) => void
  isDark: boolean
}

function StepStyle({ formData, onChange, isDark }: StepStyleProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Customize Style
        </h2>
        <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Add an emoji icon and accent color for quick recognition.
        </p>
      </div>

      {/* Emoji Selector */}
      <div className="space-y-3">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Icon Emoji
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onChange({ emoji })}
              className={`
                w-11 h-11 rounded-xl text-2xl flex items-center justify-center
                transition-all duration-150
                ${formData.emoji === emoji
                  ? isDark
                    ? 'bg-zinc-700 ring-2 ring-cyan-500'
                    : 'bg-zinc-200 ring-2 ring-cyan-500'
                  : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700'
                    : 'bg-zinc-100 hover:bg-zinc-200'
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={formData.emoji}
            onChange={(e) => onChange({ emoji: e.target.value.slice(-2) })}
            placeholder="📚"
            className={`
              w-16 px-3 py-2 rounded-lg text-center text-xl
              ${isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
              border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            `}
          />
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            or paste any emoji
          </span>
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-3">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Accent Color
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => onChange({ accentColor: color.hex })}
              title={color.name}
              className={`
                w-9 h-9 rounded-lg transition-all duration-150 relative
                ${formData.accentColor === color.hex
                  ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                  : 'hover:scale-105'
                }
              `}
              style={{ backgroundColor: color.hex }}
            >
              {formData.accentColor === color.hex && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className={`
        p-6 rounded-xl border
        ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
      `}>
        <p className={`text-sm mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Preview:
        </p>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${formData.accentColor}20` }}
          >
            {formData.emoji}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {formData.name || 'Your Weave'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              weaves/{formData.slug || 'your-weave'}/
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StepVisibilityProps {
  formData: WeaveFormData
  onChange: (updates: Partial<WeaveFormData>) => void
  isDark: boolean
}

function StepVisibility({ formData, onChange, isDark }: StepVisibilityProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Set Visibility
        </h2>
        <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Control who can access this weave.
        </p>
      </div>

      <div className="space-y-3">
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = formData.visibility === option.id
          const Icon = option.icon

          return (
            <button
              key={option.id}
              onClick={() => onChange({ visibility: option.id })}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl text-left
                transition-all duration-200 border
                ${isSelected
                  ? isDark
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-cyan-50 border-cyan-300'
                  : isDark
                    ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }
              `}
            >
              <div
                className={`
                  p-3 rounded-xl
                  ${isSelected
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-cyan-100 text-cyan-700'
                    : isDark
                      ? 'bg-zinc-700 text-zinc-400'
                      : 'bg-zinc-100 text-zinc-500'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {option.title}
                </h3>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <Check className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface StepReviewProps {
  formData: WeaveFormData
  isDark: boolean
}

function StepReview({ formData, isDark }: StepReviewProps) {
  const visibilityOption = VISIBILITY_OPTIONS.find(v => v.id === formData.visibility)

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Review & Create
        </h2>
        <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Everything looks good? Let's create your weave!
        </p>
      </div>

      {/* Cover Preview */}
      <CoverPreview
        cover={formData.cover}
        title={formData.name}
        subtitle={formData.description}
        icon={formData.emoji}
        aspectRatio="wide"
        size="lg"
        isDark={isDark}
      />

      {/* Details Grid */}
      <div className={`
        grid grid-cols-2 gap-4 p-4 rounded-xl
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
      `}>
        <div>
          <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Name
          </p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {formData.name}
          </p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Path
          </p>
          <p className={`font-mono text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            weaves/{formData.slug}/
          </p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Visibility
          </p>
          <div className="flex items-center gap-1.5">
            {visibilityOption && <visibilityOption.icon className="w-4 h-4" />}
            <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {visibilityOption?.title}
            </span>
          </div>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Accent
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: formData.accentColor }}
            />
            <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {ACCENT_COLORS.find(c => c.hex === formData.accentColor)?.name || 'Custom'}
            </span>
          </div>
        </div>
      </div>

      {formData.description && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
          <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Description
          </p>
          <p className={`${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {formData.description}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateWeaveModal({
  isOpen,
  onClose,
  onSubmit,
  isDark = false,
  initialValues,
  mode = 'create',
}: CreateWeaveModalProps) {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')
  const [formData, setFormData] = useState<WeaveFormData>({ ...DEFAULT_FORM_DATA, ...initialValues })
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('basics')
      setFormData({ ...DEFAULT_FORM_DATA, ...initialValues })
      setCompletedSteps(new Set())
      setErrors({})
    }
  }, [isOpen, initialValues])

  // Current step index
  const currentStepIndex = useMemo(
    () => WIZARD_STEPS.findIndex(s => s.id === currentStep),
    [currentStep]
  )

  // Handlers
  const updateFormData = useCallback((updates: Partial<WeaveFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }, [])

  const validateStep = useCallback((step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 'basics') {
      if (!formData.name.trim()) {
        newErrors.name = 'Weave name is required'
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters'
      }
      if (!formData.slug.trim()) {
        newErrors.slug = 'URL slug is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) return

    setCompletedSteps(prev => new Set([...prev, currentStep]))

    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].id)
    }
  }, [currentStep, currentStepIndex, validateStep])

  const goToPrevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].id)
    }
  }, [currentStepIndex])

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      console.error('Failed to create weave:', err)
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to create weave' })
    } finally {
      setIsSubmitting(false)
    }
  }, [currentStep, formData, onSubmit, onClose, validateStep])

  // Don't render if not open
  if (!isOpen) return null

  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl
            ${isDark ? 'bg-zinc-900' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-6 py-4 border-b
            ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
          `}>
            <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {mode === 'edit' ? 'Edit Weave' : 'Create New Weave'}
            </h1>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                }
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="px-6 pt-4">
            <StepIndicator
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
              isDark={isDark}
              completedSteps={completedSteps}
            />
          </div>

          {/* Step Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === 'basics' && (
                  <StepBasics formData={formData} onChange={updateFormData} isDark={isDark} errors={errors} />
                )}
                {currentStep === 'cover' && (
                  <StepCover formData={formData} onChange={updateFormData} isDark={isDark} />
                )}
                {currentStep === 'style' && (
                  <StepStyle formData={formData} onChange={updateFormData} isDark={isDark} />
                )}
                {currentStep === 'visibility' && (
                  <StepVisibility formData={formData} onChange={updateFormData} isDark={isDark} />
                )}
                {currentStep === 'review' && (
                  <StepReview formData={formData} isDark={isDark} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Submit Error */}
            {errors.submit && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`
            flex items-center justify-between px-6 py-4 border-t
            ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
          `}>
            <button
              onClick={goToPrevStep}
              disabled={currentStepIndex === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${currentStepIndex === 0
                  ? 'opacity-0 pointer-events-none'
                  : isDark
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold
                  bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                  hover:from-cyan-600 hover:to-blue-600
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {mode === 'edit' ? 'Save Changes' : 'Create Weave'}
              </button>
            ) : (
              <button
                onClick={goToNextStep}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold
                  transition-all duration-200
                  ${isDark
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }
                `}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Named export
export { CreateWeaveModal }

