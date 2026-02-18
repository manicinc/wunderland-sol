/**
 * Transform Modal Component
 * @module codex/ui/transform/TransformModal
 *
 * Multi-step wizard for transforming strands to structured supertag data.
 * Steps: Select Supertag → Configure Filters → Map Fields → Preview → Process
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Filter,
  Settings2,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  SkipForward,
} from 'lucide-react'
import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'
import type { SupertagSchema } from '@/lib/supertags/types'
import type {
  TransformConfig,
  TransformFilters,
  TransformResult,
  BatchTransformResult,
  FieldMappingConfig,
  TransformStep,
  TransformWorkflowPreset,
} from '@/lib/transform/types'
import { useModalAccessibility } from '@/components/quarry/hooks'
import {
  transformStrands,
  previewTransformation,
  getSuggestedMappings,
} from '@/lib/transform/transformService'
import SupertagPicker from './SupertagPicker'
import FieldMappingEditor from './FieldMappingEditor'
import FilterPanel from './FilterPanel'
import TransformPreview from './TransformPreview'

interface TransformModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Strands to transform */
  strands: SelectedStrand[]
  /** Called when transformation completes */
  onComplete?: (result: BatchTransformResult) => void
}

/**
 * Step configuration
 */
const STEPS: { id: TransformStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'select-supertag', label: 'Select Supertag', icon: Wand2 },
  { id: 'configure-filters', label: 'Filters', icon: Filter },
  { id: 'map-fields', label: 'Map Fields', icon: Settings2 },
  { id: 'preview', label: 'Preview', icon: Eye },
]

/**
 * Transform Modal - Multi-step transformation wizard
 */
export default function TransformModal({
  isOpen,
  onClose,
  strands,
  onComplete,
}: TransformModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    modalId: 'transform-modal',
    trapFocus: true,
    lockScroll: true,
  })

  // State
  const [currentStep, setCurrentStep] = useState<TransformStep>('select-supertag')
  const [selectedSchema, setSelectedSchema] = useState<SupertagSchema | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<TransformWorkflowPreset | null>(null)
  const [filters, setFilters] = useState<TransformFilters>({})
  const [fieldMappings, setFieldMappings] = useState<FieldMappingConfig[]>([])
  const [previewResults, setPreviewResults] = useState<TransformResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [result, setResult] = useState<BatchTransformResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select-supertag')
      setSelectedSchema(null)
      setSelectedPreset(null)
      setFilters({})
      setFieldMappings([])
      setPreviewResults([])
      setIsProcessing(false)
      setProcessingProgress(0)
      setResult(null)
      setError(null)
    }
  }, [isOpen])

  // Update field mappings when schema changes
  useEffect(() => {
    if (selectedSchema) {
      const suggestedMappings = getSuggestedMappings(selectedSchema, strands)

      // If preset is selected, merge with preset defaults
      if (selectedPreset) {
        const presetMappings = new Map(
          selectedPreset.defaultMappings.map((m) => [m.fieldName, m])
        )
        setFieldMappings(
          suggestedMappings.map((m) => ({
            ...m,
            ...presetMappings.get(m.fieldName),
          }))
        )
      } else {
        setFieldMappings(suggestedMappings)
      }
    }
  }, [selectedSchema, selectedPreset, strands])

  // Navigation
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = currentStepIndex > 0 && currentStep !== 'processing' && currentStep !== 'complete'
  const canGoNext = currentStep !== 'complete' && currentStep !== 'processing'

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentStep(STEPS[currentStepIndex - 1].id)
    }
  }, [canGoBack, currentStepIndex])

  const goNext = useCallback(async () => {
    if (!canGoNext) return

    if (currentStep === 'select-supertag' && selectedSchema) {
      setCurrentStep('configure-filters')
    } else if (currentStep === 'configure-filters') {
      setCurrentStep('map-fields')
    } else if (currentStep === 'map-fields') {
      // Generate preview
      setCurrentStep('preview')
      await generatePreview()
    } else if (currentStep === 'preview') {
      // Start transformation
      await executeTransformation()
    }
  }, [currentStep, selectedSchema, canGoNext])

  const skipFilters = useCallback(() => {
    setFilters({})
    setCurrentStep('map-fields')
  }, [])

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!selectedSchema) return

    try {
      setError(null)
      const config: TransformConfig = {
        targetSupertag: selectedSchema,
        fieldMappings,
        filters,
        postActions: [],
        previewOnly: true,
      }
      const results = await previewTransformation(strands, config)
      setPreviewResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    }
  }, [selectedSchema, fieldMappings, filters, strands])

  // Execute transformation
  const executeTransformation = useCallback(async () => {
    if (!selectedSchema) return

    try {
      setIsProcessing(true)
      setError(null)
      setCurrentStep('processing')

      const config: TransformConfig = {
        targetSupertag: selectedSchema,
        fieldMappings,
        filters,
        postActions: [],
        previewOnly: false,
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress((p) => Math.min(p + 5, 90))
      }, 100)

      const batchResult = await transformStrands(strands, config)

      clearInterval(progressInterval)
      setProcessingProgress(100)
      setResult(batchResult)
      setCurrentStep('complete')
      onComplete?.(batchResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transformation failed')
      setCurrentStep('preview')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedSchema, fieldMappings, filters, strands, onComplete])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          ref={contentRef as React.RefObject<HTMLDivElement>}
          {...modalProps}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-primary-400" />
              <h2 id="transform-modal-title" className="text-lg font-semibold text-white">
                Transform Strands
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-400 rounded-full">
                {strands.length} strand{strands.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          {currentStep !== 'processing' && currentStep !== 'complete' && (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-800 bg-neutral-900/50">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === currentStep
                const isPast = currentStepIndex > index

                return (
                  <React.Fragment key={step.id}>
                    {index > 0 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          isPast ? 'bg-primary-500' : 'bg-neutral-700'
                        }`}
                      />
                    )}
                    <div
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg
                        ${isActive ? 'bg-primary-600/20 text-primary-400' : ''}
                        ${isPast ? 'text-primary-400' : 'text-neutral-500'}
                      `}
                    >
                      <StepIcon className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {currentStep === 'select-supertag' && (
                <motion.div
                  key="select-supertag"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SupertagPicker
                    selected={selectedSchema}
                    onSelect={setSelectedSchema}
                    onSelectPreset={setSelectedPreset}
                    showPresets={true}
                  />
                </motion.div>
              )}

              {currentStep === 'configure-filters' && (
                <motion.div
                  key="configure-filters"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    availableStrands={strands}
                  />
                </motion.div>
              )}

              {currentStep === 'map-fields' && selectedSchema && (
                <motion.div
                  key="map-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <FieldMappingEditor
                    schema={selectedSchema}
                    mappings={fieldMappings}
                    onChange={setFieldMappings}
                    sampleStrand={strands[0]}
                  />
                </motion.div>
              )}

              {currentStep === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <TransformPreview
                    results={previewResults}
                    schema={selectedSchema!}
                  />
                </motion.div>
              )}

              {currentStep === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Transforming Strands...
                  </h3>
                  <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${processingProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">
                    {processingProgress}% complete
                  </p>
                </motion.div>
              )}

              {currentStep === 'complete' && result && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Transformation Complete!
                  </h3>
                  <p className="text-neutral-400 mb-6">
                    Successfully transformed {result.successful} of {result.total} strands
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-green-900/20 border border-green-700">
                      <div className="text-2xl font-bold text-green-400">
                        {result.successful}
                      </div>
                      <div className="text-xs text-green-400/70">Successful</div>
                    </div>
                    <div className="p-4 rounded-lg bg-red-900/20 border border-red-700">
                      <div className="text-2xl font-bold text-red-400">
                        {result.failed}
                      </div>
                      <div className="text-xs text-red-400/70">Failed</div>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
                      <div className="text-2xl font-bold text-neutral-400">
                        {result.skipped}
                      </div>
                      <div className="text-xs text-neutral-500">Skipped</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center gap-2">
              {canGoBack && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep === 'configure-filters' && (
                <button
                  onClick={skipFilters}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Skip Filters</span>
                </button>
              )}

              {currentStep === 'complete' ? (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
                >
                  Done
                </button>
              ) : canGoNext && (
                <button
                  onClick={goNext}
                  disabled={currentStep === 'select-supertag' && !selectedSchema}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {currentStep === 'preview' ? (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Transform</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
