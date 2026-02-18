/**
 * CreateLoomModal - Loom Creation Wizard
 * @module components/quarry/ui/creation/CreateLoomModal
 *
 * Streamlined wizard for creating new looms (collections within weaves).
 * Simpler than weave creation - focuses on name, parent selection, and cover.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  FolderPlus,
  Sparkles,
  Palette,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  Search,
} from 'lucide-react'
import CoverPhotoPicker, { type CoverSelection } from './CoverPhotoPicker'
import CoverPreview from './CoverPreview'
import { suggestCoverForContent, detectCategoryFromText } from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface LoomFormData {
  name: string
  slug: string
  description: string
  parentPath: string
  parentName: string
  cover: CoverSelection | null
  emoji: string
  accentColor: string
}

export interface ParentOption {
  path: string
  name: string
  level: 'weave' | 'loom'
  depth: number
  icon?: string
}

export interface CreateLoomModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Submit handler with form data */
  onSubmit: (data: LoomFormData) => Promise<void>
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Initial parent path (weave or loom) */
  initialParentPath?: string
  /** Available parent options */
  parentOptions?: ParentOption[]
  /** Initial values for editing */
  initialValues?: Partial<LoomFormData>
  /** Mode: create or edit */
  mode?: 'create' | 'edit'
}

type WizardStep = 'basics' | 'cover' | 'style'

// ============================================================================
// CONSTANTS
// ============================================================================

const WIZARD_STEPS: { id: WizardStep; title: string }[] = [
  { id: 'basics', title: 'Name & Location' },
  { id: 'cover', title: 'Cover Photo' },
  { id: 'style', title: 'Style' },
]

const DEFAULT_EMOJIS = ['📁', '📂', '🗂️', '📚', '🎯', '💡', '🔬', '🎨', '📝', '🌟', '🚀', '🔧']

const ACCENT_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#64748b', name: 'Slate' },
]

const DEFAULT_FORM_DATA: LoomFormData = {
  name: '',
  slug: '',
  description: '',
  parentPath: 'weaves/inbox/',
  parentName: 'Inbox',
  cover: null,
  emoji: '📁',
  accentColor: '#6366f1',
}

const DEFAULT_PARENT_OPTIONS: ParentOption[] = [
  { path: 'weaves/inbox/', name: 'Inbox', level: 'weave', depth: 0, icon: '📥' },
  { path: 'weaves/wiki/', name: 'Wiki', level: 'weave', depth: 0, icon: '📖' },
  { path: 'weaves/notes/', name: 'Notes', level: 'weave', depth: 0, icon: '📝' },
  { path: 'weaves/projects/', name: 'Projects', level: 'weave', depth: 0, icon: '📋' },
  { path: 'weaves/research/', name: 'Research', level: 'weave', depth: 0, icon: '🔬' },
  { path: 'weaves/ideas/', name: 'Ideas', level: 'weave', depth: 0, icon: '💡' },
]

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

interface ParentSelectorProps {
  value: string
  onChange: (path: string, name: string) => void
  options: ParentOption[]
  isDark: boolean
}

function ParentSelector({ value, onChange, options, isDark }: ParentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter(opt => 
      opt.name.toLowerCase().includes(lower) ||
      opt.path.toLowerCase().includes(lower)
    )
  }, [options, search])

  const selectedOption = useMemo(
    () => options.find(opt => opt.path === value),
    [options, value]
  )

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left
          transition-colors border
          ${isDark
            ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            : 'bg-white border-zinc-200 hover:bg-zinc-50'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <FolderOpen className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <div>
            <div className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  {selectedOption.icon && <span>{selectedOption.icon}</span>}
                  {selectedOption.name}
                </span>
              ) : 'Select parent'}
            </div>
            <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {value}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`
                absolute top-full left-0 right-0 mt-2 z-20
                rounded-xl shadow-xl border overflow-hidden
                ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              {/* Search */}
              <div className={`p-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-100'}`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className={`
                      w-full pl-9 pr-3 py-2 rounded-lg text-sm
                      ${isDark
                        ? 'bg-zinc-700 text-white placeholder:text-zinc-500'
                        : 'bg-zinc-50 text-zinc-900 placeholder:text-zinc-400'
                      }
                      focus:outline-none
                    `}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredOptions.map((option) => {
                  const isSelected = option.path === value

                  return (
                    <button
                      key={option.path}
                      onClick={() => {
                        onChange(option.path, option.name)
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left
                        transition-colors
                        ${isSelected
                          ? isDark
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-cyan-50 text-cyan-700'
                          : isDark
                            ? 'hover:bg-zinc-700 text-zinc-300'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }
                      `}
                      style={{ paddingLeft: `${16 + option.depth * 16}px` }}
                    >
                      <span className="text-lg">{option.icon || '📁'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{option.name}</div>
                        <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {option.path}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
                
                {filteredOptions.length === 0 && (
                  <div className={`px-4 py-8 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    No matching locations found
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ProgressDotsProps {
  steps: typeof WIZARD_STEPS
  currentStep: WizardStep
  isDark: boolean
}

function ProgressDots({ steps, currentStep, isDark }: ProgressDotsProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`
            h-2 rounded-full transition-all duration-300
            ${index === currentIndex
              ? 'w-8 bg-cyan-500'
              : index < currentIndex
                ? 'w-2 bg-cyan-500'
                : isDark
                  ? 'w-2 bg-zinc-700'
                  : 'w-2 bg-zinc-200'
            }
          `}
        />
      ))}
    </div>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepBasicsProps {
  formData: LoomFormData
  onChange: (updates: Partial<LoomFormData>) => void
  parentOptions: ParentOption[]
  isDark: boolean
  errors: Record<string, string>
}

function StepBasics({ formData, onChange, parentOptions, isDark, errors }: StepBasicsProps) {
  const handleNameChange = useCallback((name: string) => {
    onChange({
      name,
      slug: generateSlug(name),
    })
  }, [onChange])

  return (
    <div className="space-y-5">
      {/* Parent Selection */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Location
        </label>
        <ParentSelector
          value={formData.parentPath}
          onChange={(path, name) => onChange({ parentPath: path, parentName: name })}
          options={parentOptions}
          isDark={isDark}
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Loom Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Getting Started, API Reference, Design Patterns"
          autoFocus
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

      {/* Description */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Description <span className={`font-normal ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>(optional)</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What will this loom contain?"
          rows={2}
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

      {/* Path Preview */}
      <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Full Path
        </p>
        <p className={`font-mono text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {formData.parentPath}{formData.slug || 'your-loom'}/
        </p>
      </div>
    </div>
  )
}

interface StepCoverProps {
  formData: LoomFormData
  onChange: (updates: Partial<LoomFormData>) => void
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
    <div className="space-y-5">
      {/* AI Suggestion */}
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
          <span>Auto-Generate Cover</span>
        </button>
      )}

      {/* Preview */}
      {formData.cover && (
        <CoverPreview
          cover={formData.cover}
          title={formData.name}
          icon={formData.emoji}
          aspectRatio="wide"
          size="md"
          isDark={isDark}
        />
      )}

      {/* Picker */}
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
  formData: LoomFormData
  onChange: (updates: Partial<LoomFormData>) => void
  isDark: boolean
}

function StepStyle({ formData, onChange, isDark }: StepStyleProps) {
  return (
    <div className="space-y-6">
      {/* Emoji */}
      <div className="space-y-3">
        <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onChange({ emoji })}
              className={`
                w-10 h-10 rounded-lg text-xl flex items-center justify-center
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
                w-8 h-8 rounded-lg transition-all duration-150 relative
                ${formData.accentColor === color.hex
                  ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                  : 'hover:scale-105'
                }
              `}
              style={{ backgroundColor: color.hex }}
            >
              {formData.accentColor === color.hex && (
                <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Card */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
        <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Preview
        </p>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${formData.accentColor}20` }}
          >
            {formData.emoji}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {formData.name || 'Your Loom'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              in {formData.parentName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateLoomModal({
  isOpen,
  onClose,
  onSubmit,
  isDark = false,
  initialParentPath,
  parentOptions = DEFAULT_PARENT_OPTIONS,
  initialValues,
  mode = 'create',
}: CreateLoomModalProps) {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')
  const [formData, setFormData] = useState<LoomFormData>(() => {
    const initial = { ...DEFAULT_FORM_DATA, ...initialValues }
    if (initialParentPath) {
      initial.parentPath = initialParentPath
      const parent = parentOptions.find(p => p.path === initialParentPath)
      if (parent) initial.parentName = parent.name
    }
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('basics')
      const initial = { ...DEFAULT_FORM_DATA, ...initialValues }
      if (initialParentPath) {
        initial.parentPath = initialParentPath
        const parent = parentOptions.find(p => p.path === initialParentPath)
        if (parent) initial.parentName = parent.name
      }
      setFormData(initial)
      setErrors({})
    }
  }, [isOpen, initialValues, initialParentPath, parentOptions])

  // Current step index
  const currentStepIndex = useMemo(
    () => WIZARD_STEPS.findIndex(s => s.id === currentStep),
    [currentStep]
  )

  // Handlers
  const updateFormData = useCallback((updates: Partial<LoomFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }, [])

  const validateStep = useCallback((step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 'basics') {
      if (!formData.name.trim()) {
        newErrors.name = 'Loom name is required'
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) return

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
      console.error('Failed to create loom:', err)
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to create loom' })
    } finally {
      setIsSubmitting(false)
    }
  }, [currentStep, formData, onSubmit, onClose, validateStep])

  // Quick create (skip to end)
  const handleQuickCreate = useCallback(async () => {
    if (!validateStep('basics')) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      console.error('Failed to create loom:', err)
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to create loom' })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, onClose, validateStep])

  // Don't render if not open
  if (!isOpen) return null

  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1
  const isFirstStep = currentStepIndex === 0

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
            w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl
            ${isDark ? 'bg-zinc-900' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-6 py-4 border-b
            ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <FolderPlus className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
              <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {mode === 'edit' ? 'Edit Loom' : 'New Loom'}
              </h1>
            </div>
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

          {/* Progress */}
          <div className="px-6 py-3">
            <ProgressDots steps={WIZARD_STEPS} currentStep={currentStep} isDark={isDark} />
          </div>

          {/* Step Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-200px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === 'basics' && (
                  <StepBasics
                    formData={formData}
                    onChange={updateFormData}
                    parentOptions={parentOptions}
                    isDark={isDark}
                    errors={errors}
                  />
                )}
                {currentStep === 'cover' && (
                  <StepCover formData={formData} onChange={updateFormData} isDark={isDark} />
                )}
                {currentStep === 'style' && (
                  <StepStyle formData={formData} onChange={updateFormData} isDark={isDark} />
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
              disabled={isFirstStep}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isFirstStep
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

            <div className="flex items-center gap-2">
              {/* Quick Create (skip customization) */}
              {isFirstStep && (
                <button
                  onClick={handleQuickCreate}
                  disabled={isSubmitting || !formData.name.trim()}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors
                    ${isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }
                    disabled:opacity-50
                  `}
                >
                  Quick Create
                </button>
              )}

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
                  {mode === 'edit' ? 'Save' : 'Create Loom'}
                </button>
              ) : (
                <button
                  onClick={goToNextStep}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
                    transition-all duration-200
                    ${isDark
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }
                  `}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Named export
export { CreateLoomModal }

