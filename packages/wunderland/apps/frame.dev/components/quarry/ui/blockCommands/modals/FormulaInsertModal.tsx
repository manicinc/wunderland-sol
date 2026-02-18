/**
 * FormulaInsertModal - Modal for building and inserting Embark-style formulas
 * @module quarry/ui/blockCommands/modals/FormulaInsertModal
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calculator, ChevronDown, ChevronRight, Play, AlertCircle, CheckCircle2, Loader2, Zap, Eye } from 'lucide-react'
import { builtinFunctions, hasFunction } from '@/lib/formulas/builtinFunctions'
import { evaluateFormula, createFormulaContext, parseFormula } from '@/lib/formulas/formulaEngine'
import type { FunctionDefinition, FormulaContext } from '@/lib/formulas/types'

export interface FormulaInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
  /** Optional: Pre-populate formula from context */
  initialFormula?: string
  /** Optional: Context for live preview */
  contextStrandPath?: string
  contextBlockId?: string
}

interface FunctionGroup {
  name: string
  icon: string
  functions: FunctionDefinition[]
}

/**
 * Organize built-in functions by category
 */
function categorizeFunctions(): FunctionGroup[] {
  // builtinFunctions is an array of FunctionDefinition
  const funcs = builtinFunctions
  
  const math = funcs.filter(f => ['Sum', 'Average', 'Min', 'Max', 'Round', 'Abs'].includes(f.name))
  const text = funcs.filter(f => ['Concat', 'Upper', 'Lower', 'Length', 'Trim', 'Replace'].includes(f.name))
  const date = funcs.filter(f => ['Today', 'Now', 'DateAdd', 'FormatDate', 'Duration', 'DayOfWeek'].includes(f.name))
  const contextual = funcs.filter(f => ['Get', 'Mention', 'Route', 'Weather', 'Distance'].includes(f.name))
  const logic = funcs.filter(f => ['If', 'And', 'Or', 'Not', 'IsEmpty', 'Coalesce'].includes(f.name))
  const aggregate = funcs.filter(f => ['Count', 'SumField', 'Filter', 'MentionsOfType'].includes(f.name))

  return [
    { name: 'Math', icon: '🔢', functions: math },
    { name: 'Text', icon: '📝', functions: text },
    { name: 'Date & Time', icon: '📅', functions: date },
    { name: 'Logic', icon: '🔀', functions: logic },
    { name: 'Aggregate', icon: '📊', functions: aggregate },
    { name: 'Contextual', icon: '🔗', functions: contextual },
  ].filter(cat => cat.functions.length > 0)
}

/**
 * Generate formula markdown syntax
 */
function generateFormulaMarkdown(formula: string): string {
  return `\`\`\`formula
${formula}
\`\`\``
}

export function FormulaInsertModal({
  isOpen,
  onClose,
  onInsert,
  isDark,
  initialFormula = '',
  contextStrandPath,
  contextBlockId,
}: FormulaInsertModalProps) {
  const [formula, setFormula] = useState(initialFormula)
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Contextual')
  const [previewResult, setPreviewResult] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(true)
  const [evaluatedValue, setEvaluatedValue] = useState<unknown>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [dependencies, setDependencies] = useState<string[]>([])

  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const categories = useMemo(() => categorizeFunctions(), [])

  // Create formula context for live preview
  const formulaContext = useMemo((): FormulaContext => {
    return createFormulaContext({
      currentStrandPath: contextStrandPath || '',
      currentBlockId: contextBlockId || '',
      now: new Date(),
      fields: {
        // Sample fields for preview
        price: 100,
        quantity: 5,
        taxRate: 0.1,
        name: 'Sample Item',
        dueDate: new Date().toISOString().split('T')[0],
      },
      mentions: [],
      siblings: [],
    })
  }, [contextStrandPath, contextBlockId])

  // Live preview with debouncing
  useEffect(() => {
    if (!livePreviewEnabled || !formula.trim()) {
      setEvaluatedValue(null)
      setExecutionTime(null)
      setDependencies([])
      return
    }

    // Clear previous timeout
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current)
    }

    // Debounce evaluation
    evaluationTimeoutRef.current = setTimeout(async () => {
      setIsEvaluating(true)
      
      try {
        // First try to parse to check syntax
        const parsed = parseFormula(formula)
        setDependencies(parsed.dependencies)
        
        // Then evaluate
        const result = await evaluateFormula(formula, formulaContext)
        
        if (result.success) {
          setEvaluatedValue(result.value)
          setExecutionTime(result.evaluationTimeMs ?? null)
          setPreviewError(null)
          setPreviewResult(null)
        } else {
          setEvaluatedValue(null)
          setPreviewError(result.error || 'Evaluation failed')
          setPreviewResult(null)
        }
      } catch (error) {
        setEvaluatedValue(null)
        setPreviewError(error instanceof Error ? error.message : 'Parse error')
        setPreviewResult(null)
      } finally {
        setIsEvaluating(false)
      }
    }, 300)

    return () => {
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current)
      }
    }
  }, [formula, livePreviewEnabled, formulaContext])

  const handleInsert = useCallback(() => {
    if (!formula.trim()) return
    const markdown = generateFormulaMarkdown(formula.trim())
    onInsert(markdown)
    onClose()
  }, [formula, onInsert, onClose])

  const handleFunctionSelect = useCallback((func: FunctionDefinition) => {
    setSelectedFunction(func)
    // Build function template with placeholder args
    const argPlaceholders = func.parameters?.map(p => `<${p.name}>`) || []
    const template = `${func.name}(${argPlaceholders.join(', ')})`
    setFormula(template)
    setPreviewResult(null)
    setPreviewError(null)
  }, [])

  const handleTestFormula = useCallback(async () => {
    if (!formula.trim()) return
    
    setPreviewError(null)
    setPreviewResult(null)

    try {
      // Simple validation - check for balanced parentheses
      const openParens = (formula.match(/\(/g) || []).length
      const closeParens = (formula.match(/\)/g) || []).length
      
      if (openParens !== closeParens) {
        setPreviewError('Unbalanced parentheses')
        return
      }

      // Check if function name is valid
      const funcMatch = formula.match(/^([A-Z_]+)\(/i)
      if (!funcMatch) {
        setPreviewError('Invalid formula format. Use FUNCTION_NAME(args)')
        return
      }

      const funcName = funcMatch[1]
      if (!hasFunction(funcName)) {
        setPreviewError(`Unknown function: ${funcName}`)
        return
      }

      // Formula syntax is valid (actual evaluation would require context)
      setPreviewResult('✓ Valid formula syntax')
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Invalid formula')
    }
  }, [formula])

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategory(prev => prev === categoryName ? null : categoryName)
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
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
          }}
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
                isDark ? 'bg-violet-500/20' : 'bg-violet-100',
              ].join(' ')}>
                <Calculator className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  Insert Formula
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Build dynamic computed values
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

          <div className="flex h-[400px]">
            {/* Function browser sidebar */}
            <div className={[
              'w-64 border-r overflow-y-auto',
              isDark ? 'border-zinc-700 bg-zinc-850' : 'border-zinc-200 bg-zinc-50',
            ].join(' ')}>
              <div className={[
                'px-3 py-2 text-xs font-semibold uppercase tracking-wider',
                isDark ? 'text-zinc-500' : 'text-zinc-400',
              ].join(' ')}>
                Available Functions
              </div>
              {categories.map(category => (
                <div key={category.name}>
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className={[
                      'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                      isDark
                        ? 'hover:bg-zinc-700 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700',
                    ].join(' ')}
                  >
                    <span>{category.icon}</span>
                    <span className="flex-1 text-left">{category.name}</span>
                    {expandedCategory === category.name
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                  <AnimatePresence>
                    {expandedCategory === category.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {category.functions.map(func => (
                          <button
                            key={func.name}
                            onClick={() => handleFunctionSelect(func)}
                            className={[
                              'w-full px-6 py-2 text-left text-sm transition-colors',
                              selectedFunction?.name === func.name
                                ? isDark
                                  ? 'bg-violet-500/20 text-violet-300'
                                  : 'bg-violet-100 text-violet-700'
                                : isDark
                                  ? 'hover:bg-zinc-700 text-zinc-400'
                                  : 'hover:bg-zinc-100 text-zinc-600',
                            ].join(' ')}
                          >
                            <div className="font-mono">{func.name}</div>
                            <div className={[
                              'text-xs truncate',
                              isDark ? 'text-zinc-500' : 'text-zinc-400',
                            ].join(' ')}>
                              {func.description}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              {/* Selected function info */}
              {selectedFunction && (
                <div className={[
                  'mb-4 p-3 rounded-lg',
                  isDark ? 'bg-zinc-700' : 'bg-zinc-100',
                ].join(' ')}>
                  <div className={[
                    'font-mono font-semibold mb-1',
                    isDark ? 'text-white' : 'text-zinc-900',
                  ].join(' ')}>
                    {selectedFunction.name}({selectedFunction.parameters?.map(p => p.name).join(', ') || ''})
                  </div>
                  <div className={[
                    'text-sm',
                    isDark ? 'text-zinc-400' : 'text-zinc-600',
                  ].join(' ')}>
                    {selectedFunction.description}
                  </div>
                  {selectedFunction.parameters && selectedFunction.parameters.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedFunction.parameters.map(param => (
                        <div key={param.name} className="flex items-center gap-2 text-xs">
                          <span className={[
                            'font-mono px-1.5 py-0.5 rounded',
                            isDark ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-200 text-zinc-700',
                          ].join(' ')}>
                            {param.name}
                          </span>
                          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                            ({param.type})
                          </span>
                          {param.required && (
                            <span className="text-red-500">*required</span>
                          )}
                          {param.description && (
                            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                              — {param.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Formula input */}
              <div className="flex-1">
                <label className={[
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700',
                ].join(' ')}>
                  Formula Expression
                </label>
                <textarea
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Enter formula, e.g., ADD(1, 2) or GET_FIELD(&quot;dueDate&quot;)"
                  className={[
                    'w-full h-24 px-3 py-2 rounded-lg font-mono text-sm resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400',
                    'border',
                  ].join(' ')}
                />
              </div>

              {/* Live Preview Toggle */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setLivePreviewEnabled(!livePreviewEnabled)}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    livePreviewEnabled
                      ? 'bg-violet-500/20 text-violet-500 border border-violet-500/30'
                      : isDark
                        ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                  ].join(' ')}
                >
                  <Eye className="w-4 h-4" />
                  Live Preview {livePreviewEnabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={handleTestFormula}
                  disabled={!formula.trim()}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    formula.trim()
                      ? 'bg-violet-500 hover:bg-violet-600 text-white'
                      : isDark
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  <Play className="w-4 h-4" />
                  Validate
                </button>
              </div>

              {/* Live Preview Result */}
              {livePreviewEnabled && formula.trim() && (
                <div className={[
                  'mt-3 p-3 rounded-lg border',
                  isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200',
                ].join(' ')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={[
                      'text-xs font-semibold uppercase tracking-wider',
                      isDark ? 'text-zinc-500' : 'text-zinc-400',
                    ].join(' ')}>
                      Live Preview
                    </span>
                    {isEvaluating && (
                      <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
                    )}
                    {!isEvaluating && executionTime !== null && (
                      <span className={[
                        'flex items-center gap-1 text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400',
                      ].join(' ')}>
                        <Zap className="w-3 h-3" />
                        {executionTime}ms
                      </span>
                    )}
                  </div>

                  {evaluatedValue !== null && !previewError && (
                    <div className={[
                      'font-mono text-lg font-semibold',
                      isDark ? 'text-white' : 'text-zinc-900',
                    ].join(' ')}>
                      {typeof evaluatedValue === 'object' 
                        ? JSON.stringify(evaluatedValue, null, 2)
                        : String(evaluatedValue)
                      }
                    </div>
                  )}

                  {previewError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{previewError}</span>
                    </div>
                  )}

                  {dependencies.length > 0 && (
                    <div className={[
                      'mt-2 pt-2 border-t flex flex-wrap gap-1',
                      isDark ? 'border-zinc-700' : 'border-zinc-200',
                    ].join(' ')}>
                      <span className={[
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400',
                      ].join(' ')}>
                        Depends on:
                      </span>
                      {dependencies.map((dep, i) => (
                        <span
                          key={i}
                          className={[
                            'px-1.5 py-0.5 rounded text-xs font-mono',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600',
                          ].join(' ')}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Validation Result */}
              {previewResult && (
                <div className={[
                  'mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-green-500/10 text-green-500',
                ].join(' ')}>
                  <CheckCircle2 className="w-4 h-4" />
                  {previewResult}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className={[
            'flex gap-3 p-4 border-t',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <button
              onClick={onClose}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!formula.trim()}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                formula.trim()
                  ? 'bg-violet-500 hover:bg-violet-600 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
              ].join(' ')}
            >
              Insert Formula
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default FormulaInsertModal

