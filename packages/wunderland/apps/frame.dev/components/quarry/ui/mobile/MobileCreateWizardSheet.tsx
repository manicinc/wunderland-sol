/**
 * MobileCreateWizardSheet Component
 * @module codex/ui/MobileCreateWizardSheet
 *
 * @description
 * Mobile-optimized bottom sheet for the Create Node Wizard.
 * Features:
 * - Three snap heights (25vh/50vh/90vh)
 * - Drag handle with velocity-based snapping
 * - Safe area inset support
 * - Swipe navigation between steps
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
  X,
  GripHorizontal,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Layers,
  FileText,
  BookOpen,
  PenTool,
  GitBranch,
  Check,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LoomConfig, WeaveConfig } from '../../lib/nodeConfig'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type NodeType = 'weave' | 'loom' | 'strand' | 'pdf-import' | 'canvas' | 'mindmap'
type WizardStep = 'select-type' | 'select-template' | 'form'
type SheetHeight = 'peek' | 'half' | 'full'

interface NodeTypeOption {
  type: NodeType
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

export interface MobileCreateWizardSheetProps {
  isOpen: boolean
  onClose: () => void
  parentPath?: string
  parentLevel?: 'root' | 'weave' | 'loom'
  onCreateNode: (type: NodeType, data: Record<string, unknown>, path: string) => Promise<void>
  parentLoomConfig?: LoomConfig | null
  parentWeaveConfig?: WeaveConfig | null
  isDark?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const SHEET_HEIGHTS: Record<SheetHeight, string> = {
  peek: '25vh',
  half: '50vh',
  full: '90vh',
}

const NODE_TYPE_OPTIONS: NodeTypeOption[] = [
  {
    type: 'weave',
    name: 'Weave',
    description: 'Top-level knowledge domain',
    icon: <FolderTree className="w-5 h-5" />,
    color: 'bg-emerald-500',
  },
  {
    type: 'loom',
    name: 'Loom',
    description: 'Topic within a weave',
    icon: <Layers className="w-5 h-5" />,
    color: 'bg-cyan-500',
  },
  {
    type: 'strand',
    name: 'Strand',
    description: 'Individual content piece',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-amber-500',
  },
  {
    type: 'pdf-import',
    name: 'Import PDF',
    description: 'Convert PDF to content',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-purple-500',
  },
  {
    type: 'canvas',
    name: 'Canvas',
    description: 'Visual whiteboard',
    icon: <PenTool className="w-5 h-5" />,
    color: 'bg-rose-500',
  },
  {
    type: 'mindmap',
    name: 'Mind Map',
    description: 'Node-based diagram',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'bg-violet-500',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   STEP INDICATOR
═══════════════════════════════════════════════════════════════════════════ */

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  isDark: boolean
}

function StepIndicator({ currentStep, totalSteps, isDark }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-200',
            i === currentStep
              ? 'w-6 bg-cyan-500'
              : i < currentStep
                ? 'w-1.5 bg-cyan-400/50'
                : isDark
                  ? 'w-1.5 bg-zinc-600'
                  : 'w-1.5 bg-zinc-300'
          )}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   NODE TYPE CARD (Mobile Optimized)
═══════════════════════════════════════════════════════════════════════════ */

interface NodeTypeCardProps {
  option: NodeTypeOption
  onSelect: () => void
  disabled?: boolean
  isDark: boolean
}

function NodeTypeCard({ option, onSelect, disabled, isDark }: NodeTypeCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left transition-all',
        'min-h-[72px] touch-manipulation', // 72px minimum for touch targets
        disabled
          ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
          : isDark
            ? 'border-zinc-700 active:border-cyan-500 active:bg-zinc-800'
            : 'border-zinc-200 active:border-cyan-400 active:bg-zinc-50'
      )}
    >
      <div className={cn('p-2.5 rounded-lg text-white', option.color)}>
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {option.name}
        </h3>
        <p className={cn('text-sm truncate', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {option.description}
        </p>
      </div>
      <ChevronRight className={cn('w-5 h-5 flex-shrink-0', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MobileCreateWizardSheet({
  isOpen,
  onClose,
  parentPath = '',
  parentLevel = 'root',
  onCreateNode,
  isDark = false,
}: MobileCreateWizardSheetProps) {
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('half')
  const [step, setStep] = useState<WizardStep>('select-type')
  const [selectedType, setSelectedType] = useState<NodeType | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Get available node types based on parent level
  const availableTypes = useMemo(() => {
    return NODE_TYPE_OPTIONS.filter((opt) => {
      if (parentLevel === 'root') {
        return opt.type === 'weave'
      }
      if (parentLevel === 'weave') {
        return opt.type === 'loom'
      }
      // loom level - all strand-like types
      return ['strand', 'pdf-import', 'canvas', 'mindmap'].includes(opt.type)
    })
  }, [parentLevel])

  // Handle drag end for sheet height
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y
    const offset = info.offset.y

    // Fast swipe down = shrink or close
    if (velocity > 500) {
      if (sheetHeight === 'peek') {
        onClose()
      } else if (sheetHeight === 'half') {
        setSheetHeight('peek')
      } else {
        setSheetHeight('half')
      }
      return
    }

    // Fast swipe up = expand
    if (velocity < -500) {
      if (sheetHeight === 'peek') {
        setSheetHeight('half')
      } else if (sheetHeight === 'half') {
        setSheetHeight('full')
      }
      return
    }

    // Slow drag - snap based on position
    if (offset > 80) {
      if (sheetHeight === 'peek') {
        onClose()
      } else if (sheetHeight === 'half') {
        setSheetHeight('peek')
      } else {
        setSheetHeight('half')
      }
    } else if (offset < -80) {
      if (sheetHeight === 'peek') {
        setSheetHeight('half')
      } else if (sheetHeight === 'half') {
        setSheetHeight('full')
      }
    }
  }, [sheetHeight, onClose])

  // Handle horizontal swipe for step navigation
  const handleHorizontalSwipe = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.x
    const offset = info.offset.x

    // Swipe right = go back
    if ((velocity > 300 || offset > 100) && step !== 'select-type') {
      setSwipeDirection('right')
      setTimeout(() => {
        if (step === 'form') {
          setStep('select-template')
        } else if (step === 'select-template') {
          setStep('select-type')
          setSelectedType(null)
        }
        setSwipeDirection(null)
      }, 150)
    }

    // Swipe left = go forward (if valid)
    // This would need form validation logic
  }, [step])

  // Select node type
  const handleSelectType = useCallback((type: NodeType) => {
    setSelectedType(type)
    // For types that skip template selection
    if (['weave', 'loom', 'canvas', 'mindmap'].includes(type)) {
      setStep('form')
    } else {
      setStep('select-template')
    }
    // Auto-expand sheet when moving to next step
    if (sheetHeight === 'peek') {
      setSheetHeight('half')
    }
  }, [sheetHeight])

  // Go back
  const handleBack = useCallback(() => {
    if (step === 'form') {
      if (['weave', 'loom', 'canvas', 'mindmap'].includes(selectedType || '')) {
        setStep('select-type')
        setSelectedType(null)
      } else {
        setStep('select-template')
      }
    } else if (step === 'select-template') {
      setStep('select-type')
      setSelectedType(null)
    }
  }, [step, selectedType])

  // Get current step index for indicator
  const currentStepIndex = step === 'select-type' ? 0 : step === 'select-template' ? 1 : 2
  const totalSteps = ['weave', 'loom', 'canvas', 'mindmap'].includes(selectedType || '') ? 2 : 3

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0, height: SHEET_HEIGHTS[sheetHeight] }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl flex flex-col',
              'pb-safe', // Safe area inset for home indicator
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={cn(
                'w-10 h-1 rounded-full',
                isDark ? 'bg-zinc-700' : 'bg-zinc-300'
              )} />
            </div>

            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-4 pb-2 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className="flex items-center gap-2">
                {step !== 'select-type' && (
                  <button
                    onClick={handleBack}
                    className={cn(
                      'p-2 -ml-2 rounded-lg transition-colors touch-manipulation',
                      isDark
                        ? 'text-zinc-400 active:bg-zinc-800'
                        : 'text-zinc-500 active:bg-zinc-100'
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className={cn('font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
                  {step === 'select-type' && 'Create New'}
                  {step === 'select-template' && 'Choose Template'}
                  {step === 'form' && `New ${selectedType}`}
                </h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 -mr-2 rounded-lg transition-colors touch-manipulation',
                  isDark
                    ? 'text-zinc-400 active:bg-zinc-800'
                    : 'text-zinc-500 active:bg-zinc-100'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <StepIndicator
              currentStep={currentStepIndex}
              totalSteps={totalSteps}
              isDark={isDark}
            />

            {/* Content */}
            <motion.div
              className="flex-1 overflow-auto px-4 pb-4"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleHorizontalSwipe}
            >
              <AnimatePresence mode="wait">
                {step === 'select-type' && (
                  <motion.div
                    key="select-type"
                    initial={{ opacity: 0, x: swipeDirection === 'right' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: swipeDirection === 'right' ? 20 : -20 }}
                    className="space-y-3"
                  >
                    {availableTypes.map((option) => (
                      <NodeTypeCard
                        key={option.type}
                        option={option}
                        onSelect={() => handleSelectType(option.type)}
                        isDark={isDark}
                      />
                    ))}
                  </motion.div>
                )}

                {step === 'select-template' && (
                  <motion.div
                    key="select-template"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="py-8 text-center"
                  >
                    <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                      Template selection coming soon...
                    </p>
                    <button
                      onClick={() => setStep('form')}
                      className={cn(
                        'mt-4 px-4 py-2 rounded-lg font-medium',
                        'bg-cyan-500 text-white active:bg-cyan-600'
                      )}
                    >
                      Use Blank Template
                    </button>
                  </motion.div>
                )}

                {step === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="py-8 text-center"
                  >
                    <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                      Form for {selectedType} coming soon...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Swipe Hint */}
            {step !== 'select-type' && (
              <div className={cn(
                'flex items-center justify-center gap-1 py-2 text-xs',
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              )}>
                <ChevronRight className="w-3 h-3 rotate-180" />
                <span>Swipe to go back</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export { MobileCreateWizardSheet }
