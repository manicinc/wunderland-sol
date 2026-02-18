/**
 * ViewConfigWizard - Step-by-step wizard for configuring embeddable views
 * @module quarry/ui/blockCommands/modals/ViewConfigWizard
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Map,
  Calendar,
  Table2,
  BarChart3,
  List,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Settings2,
  Filter,
  Eye,
} from 'lucide-react'
import {
  VIEW_TYPE_REGISTRY,
  getDefaultViewSettings,
  createViewConfig,
  type EmbeddableViewType,
  type EmbeddableViewConfig,
  type ViewScope,
  type ViewFilter,
} from '@/lib/views/embeddableViews'

export interface ViewConfigWizardProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
  /** Current strand path for context */
  strandPath?: string
}

type WizardStep = 'type' | 'scope' | 'filter' | 'settings' | 'preview'

interface ViewTypeCardProps {
  type: EmbeddableViewType
  label: string
  description: string
  icon: React.ReactNode
  isSelected: boolean
  onSelect: () => void
  isDark: boolean
}

const ViewTypeCard: React.FC<ViewTypeCardProps> = ({
  type,
  label,
  description,
  icon,
  isSelected,
  onSelect,
  isDark,
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onSelect}
    className={[
      'p-4 rounded-xl border-2 text-left transition-all',
      isSelected
        ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
        : isDark
          ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
          : 'border-zinc-200 bg-white hover:border-zinc-300',
    ].join(' ')}
  >
    <div className="flex items-start gap-3">
      <div className={[
        'w-10 h-10 rounded-lg flex items-center justify-center',
        isSelected
          ? 'bg-violet-500 text-white'
          : isDark
            ? 'bg-zinc-700 text-zinc-400'
            : 'bg-zinc-100 text-zinc-500',
      ].join(' ')}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className={[
          'font-semibold',
          isSelected
            ? 'text-violet-500'
            : isDark ? 'text-white' : 'text-zinc-900',
        ].join(' ')}>
          {label}
        </h4>
        <p className={[
          'text-sm mt-0.5',
          isDark ? 'text-zinc-400' : 'text-zinc-500',
        ].join(' ')}>
          {description}
        </p>
      </div>
      {isSelected && (
        <Check className="w-5 h-5 text-violet-500" />
      )}
    </div>
  </motion.button>
)

const VIEW_ICONS: Record<EmbeddableViewType, React.ReactNode> = {
  map: <Map className="w-5 h-5" />,
  calendar: <Calendar className="w-5 h-5" />,
  table: <Table2 className="w-5 h-5" />,
  chart: <BarChart3 className="w-5 h-5" />,
  list: <List className="w-5 h-5" />,
}

const SCOPE_OPTIONS: Array<{ type: ViewScope['type']; label: string; description: string }> = [
  { type: 'document', label: 'Entire Document', description: 'Include all mentions in this document' },
  { type: 'subtree', label: 'Current Section', description: 'Only include mentions in this section and children' },
  { type: 'block', label: 'Current Block', description: 'Only include mentions in this block' },
  { type: 'query', label: 'Custom Query', description: 'Use a query expression to filter mentions' },
]

const MENTION_TYPE_OPTIONS = [
  { type: 'place', label: 'Places', icon: '📍' },
  { type: 'date', label: 'Dates', icon: '📅' },
  { type: 'event', label: 'Events', icon: '🗓️' },
  { type: 'person', label: 'People', icon: '👤' },
  { type: 'concept', label: 'Concepts', icon: '💡' },
  { type: 'tag', label: 'Tags', icon: '🏷️' },
]

/**
 * Generate view markdown from config
 */
function generateViewMarkdown(config: EmbeddableViewConfig): string {
  const lines = [`\`\`\`view-${config.type}`]
  
  lines.push(JSON.stringify({
    title: config.title || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} View`,
    scope: config.scope,
    filter: config.filter,
    ...config.settings,
  }, null, 2))
  
  lines.push('```')
  
  return lines.join('\n')
}

export function ViewConfigWizard({
  isOpen,
  onClose,
  onInsert,
  isDark,
  strandPath,
}: ViewConfigWizardProps) {
  const [step, setStep] = useState<WizardStep>('type')
  const [selectedType, setSelectedType] = useState<EmbeddableViewType>('table')
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<ViewScope>({ type: 'document' })
  const [filter, setFilter] = useState<ViewFilter>({})
  const [selectedMentionTypes, setSelectedMentionTypes] = useState<string[]>([])
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  // Build config from wizard state
  const config = useMemo((): EmbeddableViewConfig => {
    const baseSettings = getDefaultViewSettings(selectedType)
    return createViewConfig(selectedType, {
      title: title || undefined,
      scope,
      filter: selectedMentionTypes.length > 0 ? { mentionTypes: selectedMentionTypes } : undefined,
      settings: { ...baseSettings, ...settings },
    })
  }, [selectedType, title, scope, selectedMentionTypes, settings])

  const steps: WizardStep[] = ['type', 'scope', 'filter', 'settings', 'preview']
  const currentStepIndex = steps.indexOf(step)

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex])
    }
  }, [currentStepIndex, steps])

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex])
    }
  }, [currentStepIndex, steps])

  const handleInsert = useCallback(() => {
    const markdown = generateViewMarkdown(config)
    onInsert(markdown)
    onClose()
  }, [config, onInsert, onClose])

  const toggleMentionType = useCallback((type: string) => {
    setSelectedMentionTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className={[
            'relative z-10 w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className={[
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <div className="flex items-center gap-3">
              <div className={[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
              ].join(' ')}>
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  Create View
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={[
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500',
              ].join(' ')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className={[
            'h-1',
            isDark ? 'bg-zinc-700' : 'bg-zinc-200',
          ].join(' ')}>
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            <AnimatePresence mode="wait">
              {/* Step 1: View Type Selection */}
              {step === 'type' && (
                <motion.div
                  key="type"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className={[
                    'text-lg font-semibold mb-4',
                    isDark ? 'text-white' : 'text-zinc-900',
                  ].join(' ')}>
                    Choose View Type
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {VIEW_TYPE_REGISTRY.map(viewType => (
                      <ViewTypeCard
                        key={viewType.type}
                        type={viewType.type}
                        label={viewType.label}
                        description={viewType.description}
                        icon={VIEW_ICONS[viewType.type]}
                        isSelected={selectedType === viewType.type}
                        onSelect={() => setSelectedType(viewType.type)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Scope Selection */}
              {step === 'scope' && (
                <motion.div
                  key="scope"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className={[
                    'text-lg font-semibold mb-4',
                    isDark ? 'text-white' : 'text-zinc-900',
                  ].join(' ')}>
                    Data Scope
                  </h4>
                  <div className="space-y-2">
                    {SCOPE_OPTIONS.map(option => (
                      <button
                        key={option.type}
                        onClick={() => setScope({ type: option.type })}
                        className={[
                          'w-full p-4 rounded-lg border text-left transition-all',
                          scope.type === option.type
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : isDark
                              ? 'border-zinc-700 hover:border-zinc-600'
                              : 'border-zinc-200 hover:border-zinc-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className={[
                              'font-medium',
                              scope.type === option.type
                                ? 'text-emerald-500'
                                : isDark ? 'text-white' : 'text-zinc-900',
                            ].join(' ')}>
                              {option.label}
                            </h5>
                            <p className={[
                              'text-sm',
                              isDark ? 'text-zinc-400' : 'text-zinc-500',
                            ].join(' ')}>
                              {option.description}
                            </p>
                          </div>
                          {scope.type === option.type && (
                            <Check className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* View Title */}
                  <div className="mt-6">
                    <label className={[
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-zinc-300' : 'text-zinc-700',
                    ].join(' ')}>
                      View Title (optional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`My ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} View`}
                      className={[
                        'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500',
                        isDark
                          ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500'
                          : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400',
                      ].join(' ')}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Filter Selection */}
              {step === 'filter' && (
                <motion.div
                  key="filter"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className={[
                      'w-5 h-5',
                      isDark ? 'text-zinc-400' : 'text-zinc-500',
                    ].join(' ')} />
                    <h4 className={[
                      'text-lg font-semibold',
                      isDark ? 'text-white' : 'text-zinc-900',
                    ].join(' ')}>
                      Filter Mentions
                    </h4>
                  </div>
                  <p className={[
                    'text-sm mb-4',
                    isDark ? 'text-zinc-400' : 'text-zinc-500',
                  ].join(' ')}>
                    Select which types of mentions to include (leave empty for all)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {MENTION_TYPE_OPTIONS.map(option => (
                      <button
                        key={option.type}
                        onClick={() => toggleMentionType(option.type)}
                        className={[
                          'p-3 rounded-lg border text-center transition-all',
                          selectedMentionTypes.includes(option.type)
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : isDark
                              ? 'border-zinc-700 hover:border-zinc-600'
                              : 'border-zinc-200 hover:border-zinc-300',
                        ].join(' ')}
                      >
                        <div className="text-2xl mb-1">{option.icon}</div>
                        <div className={[
                          'text-sm font-medium',
                          selectedMentionTypes.includes(option.type)
                            ? 'text-emerald-500'
                            : isDark ? 'text-white' : 'text-zinc-900',
                        ].join(' ')}>
                          {option.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: View Settings */}
              {step === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Settings2 className={[
                      'w-5 h-5',
                      isDark ? 'text-zinc-400' : 'text-zinc-500',
                    ].join(' ')} />
                    <h4 className={[
                      'text-lg font-semibold',
                      isDark ? 'text-white' : 'text-zinc-900',
                    ].join(' ')}>
                      View Settings
                    </h4>
                  </div>

                  {/* Type-specific settings */}
                  {selectedType === 'map' && (
                    <div className="space-y-4">
                      <div>
                        <label className={['block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700'].join(' ')}>
                          Map Style
                        </label>
                        <select
                          value={(settings.style as string) || 'street'}
                          onChange={(e) => setSettings({ ...settings, style: e.target.value })}
                          className={[
                            'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500',
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300',
                          ].join(' ')}
                        >
                          <option value="street">Street</option>
                          <option value="satellite">Satellite</option>
                          <option value="terrain">Terrain</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={(settings.showRoutes as boolean) || false}
                          onChange={(e) => setSettings({ ...settings, showRoutes: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Show routes between places</span>
                      </label>
                    </div>
                  )}

                  {selectedType === 'calendar' && (
                    <div className="space-y-4">
                      <div>
                        <label className={['block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700'].join(' ')}>
                          View Mode
                        </label>
                        <select
                          value={(settings.mode as string) || 'month'}
                          onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                          className={[
                            'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500',
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300',
                          ].join(' ')}
                        >
                          <option value="month">Month</option>
                          <option value="week">Week</option>
                          <option value="day">Day</option>
                          <option value="agenda">Agenda</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedType === 'chart' && (
                    <div className="space-y-4">
                      <div>
                        <label className={['block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700'].join(' ')}>
                          Chart Type
                        </label>
                        <select
                          value={(settings.chartType as string) || 'bar'}
                          onChange={(e) => setSettings({ ...settings, chartType: e.target.value })}
                          className={[
                            'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500',
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300',
                          ].join(' ')}
                        >
                          <option value="bar">Bar</option>
                          <option value="line">Line</option>
                          <option value="pie">Pie</option>
                          <option value="donut">Donut</option>
                          <option value="area">Area</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedType === 'list' && (
                    <div className="space-y-4">
                      <div>
                        <label className={['block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700'].join(' ')}>
                          List Style
                        </label>
                        <select
                          value={(settings.style as string) || 'bullet'}
                          onChange={(e) => setSettings({ ...settings, style: e.target.value })}
                          className={[
                            'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500',
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300',
                          ].join(' ')}
                        >
                          <option value="bullet">Bullet</option>
                          <option value="numbered">Numbered</option>
                          <option value="checklist">Checklist</option>
                          <option value="cards">Cards</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedType === 'table' && (
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={(settings.showRowNumbers as boolean) || false}
                          onChange={(e) => setSettings({ ...settings, showRowNumbers: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Show row numbers</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={(settings.compact as boolean) || false}
                          onChange={(e) => setSettings({ ...settings, compact: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Compact mode</span>
                      </label>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 5: Preview */}
              {step === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className={[
                      'w-5 h-5',
                      isDark ? 'text-zinc-400' : 'text-zinc-500',
                    ].join(' ')} />
                    <h4 className={[
                      'text-lg font-semibold',
                      isDark ? 'text-white' : 'text-zinc-900',
                    ].join(' ')}>
                      Preview
                    </h4>
                  </div>

                  <div className={[
                    'p-4 rounded-lg border font-mono text-sm overflow-auto max-h-64',
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700',
                  ].join(' ')}>
                    <pre>{generateViewMarkdown(config)}</pre>
                  </div>

                  <div className={[
                    'mt-4 p-3 rounded-lg',
                    isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
                  ].join(' ')}>
                    <p className="text-sm text-emerald-600">
                      ✨ This view will be inserted into your document. The view will automatically
                      extract and display {selectedMentionTypes.length > 0 ? selectedMentionTypes.join(', ') : 'all'} mentions
                      from the {scope.type} scope.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className={[
            'flex justify-between gap-3 p-4 border-t',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                currentStepIndex === 0
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : isDark
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700',
              ].join(' ')}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step !== 'preview' ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleInsert}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                <Check className="w-4 h-4" />
                Insert View
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ViewConfigWizard

