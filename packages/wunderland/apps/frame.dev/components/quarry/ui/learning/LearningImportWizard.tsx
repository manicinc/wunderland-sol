/**
 * Learning Import Wizard
 * @module components/quarry/ui/learning/LearningImportWizard
 *
 * Multi-step wizard for importing flashcards, quizzes, and glossary terms.
 * Supports strand mapping when source strands don't exist locally.
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Link2,
  Link2Off,
  Plus,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import {
  parseImportFile,
  findMissingStrands,
  importLearningData,
  type ParsedImportData,
  type ImportOptions,
  type ImportResult,
  type StrandMappingChoice,
  type StrandMappingAction,
} from '@/lib/import-export/learningImporter'
import type { StrandMapping } from '@/lib/import-export/learningExporter'

// ============================================================================
// TYPES
// ============================================================================

type WizardStep = 'upload' | 'preview' | 'mapping' | 'options' | 'importing' | 'complete'

interface LearningImportWizardProps {
  onComplete?: (result: ImportResult) => void
  onCancel?: () => void
  theme?: string
}

// ============================================================================
// COMPONENTS
// ============================================================================

function FileDropZone({
  onFile,
  isDark,
}: {
  onFile: (file: File) => void
  isDark: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      onFile(file)
    }
  }, [onFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
    }
  }, [onFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all
        ${isDragging 
          ? isDark 
            ? 'border-emerald-500 bg-emerald-900/20' 
            : 'border-emerald-500 bg-emerald-50'
          : isDark
            ? 'border-zinc-600 hover:border-zinc-500 bg-zinc-800/50'
            : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.tsv,.txt"
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="text-center">
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <p className={`text-lg font-medium mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
          Drop your file here
        </p>
        <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
          or click to browse
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FileJson className="w-4 h-4" /> JSON
          </div>
          <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FileSpreadsheet className="w-4 h-4" /> CSV/TSV
          </div>
          <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FileText className="w-4 h-4" /> Anki
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({
  data,
  isDark,
}: {
  data: ParsedImportData
  isDark: boolean
}) {
  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        Import Preview
      </h3>
      
      <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Format: <span className="font-medium">{data.format.toUpperCase()}</span>
          {data.version && <span> (v{data.version})</span>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {data.flashcards.length}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Flashcards
          </p>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {data.quizzes.reduce((sum, q) => sum + q.questions.length, 0)}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Quiz Questions
          </p>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {data.glossary.length}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Glossary Terms
          </p>
        </div>
      </div>

      {data.sourceStrands.length > 0 && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-sm mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Source Strands:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.sourceStrands.slice(0, 5).map((strand) => (
              <span
                key={strand.id}
                className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}
              >
                {strand.title}
              </span>
            ))}
            {data.sourceStrands.length > 5 && (
              <span className={`px-2 py-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                +{data.sourceStrands.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MappingStep({
  missingStrands,
  mappings,
  onMappingChange,
  isDark,
}: {
  missingStrands: StrandMapping[]
  mappings: StrandMappingChoice[]
  onMappingChange: (mappings: StrandMappingChoice[]) => void
  isDark: boolean
}) {
  const updateMapping = (index: number, action: StrandMappingAction) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], action }
    onMappingChange(newMappings)
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg flex items-start gap-3 ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}`}>
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
        <div>
          <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Source Strands Not Found
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            The following strands from the import don&apos;t exist in your knowledge base.
            Choose how to handle them.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {missingStrands.map((strand, index) => (
          <div
            key={strand.id}
            className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
          >
            <p className={`font-medium mb-3 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {strand.title}
            </p>
            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {strand.path}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => updateMapping(index, 'orphan')}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${mappings[index]?.action === 'orphan'
                    ? isDark
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 text-white'
                    : isDark
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }
                `}
              >
                <Link2Off className="w-4 h-4" />
                Import Standalone
              </button>
              
              <button
                onClick={() => updateMapping(index, 'create')}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${mappings[index]?.action === 'create'
                    ? isDark
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDark
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }
                `}
              >
                <Plus className="w-4 h-4" />
                Create Strand
              </button>
              
              <button
                onClick={() => updateMapping(index, 'map')}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${mappings[index]?.action === 'map'
                    ? isDark
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-500 text-white'
                    : isDark
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }
                `}
              >
                <Link2 className="w-4 h-4" />
                Map to Existing
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OptionsStep({
  options,
  onOptionsChange,
  isDark,
}: {
  options: ImportOptions
  onOptionsChange: (options: ImportOptions) => void
  isDark: boolean
}) {
  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        Import Options
      </h3>

      <div className="space-y-3">
        <label className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <input
            type="checkbox"
            checked={options.importFlashcards ?? true}
            onChange={(e) => onOptionsChange({ ...options, importFlashcards: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Import Flashcards</span>
        </label>
        
        <label className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <input
            type="checkbox"
            checked={options.importQuizzes ?? true}
            onChange={(e) => onOptionsChange({ ...options, importQuizzes: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Import Quizzes</span>
        </label>
        
        <label className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <input
            type="checkbox"
            checked={options.importGlossary ?? true}
            onChange={(e) => onOptionsChange({ ...options, importGlossary: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Import Glossary</span>
        </label>
        
        <label className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <input
            type="checkbox"
            checked={options.importFSRSData ?? true}
            onChange={(e) => onOptionsChange({ ...options, importFSRSData: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Import Spaced Repetition Data</span>
        </label>
      </div>

      <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <p className={`text-sm mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Conflict Resolution:
        </p>
        <div className="flex gap-2">
          {(['skip', 'replace', 'merge'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onOptionsChange({ ...options, conflictResolution: mode })}
              className={`
                px-3 py-1.5 rounded-lg text-sm capitalize transition-colors
                ${options.conflictResolution === mode
                  ? isDark
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompleteStep({
  result,
  isDark,
}: {
  result: ImportResult
  isDark: boolean
}) {
  return (
    <div className="space-y-4 text-center">
      {result.success ? (
        <>
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
          <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Import Complete!
          </h3>
        </>
      ) : (
        <>
          <XCircle className="w-16 h-16 mx-auto text-red-500" />
          <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Import Failed
          </h3>
        </>
      )}

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold text-emerald-500`}>
            {result.imported.flashcards}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Flashcards
          </p>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold text-emerald-500`}>
            {result.imported.quizzes}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Quizzes
          </p>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <p className={`text-2xl font-bold text-emerald-500`}>
            {result.imported.glossary}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Terms
          </p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className={`p-4 rounded-lg text-left ${isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-medium mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>Errors:</p>
          <ul className={`text-sm space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {result.errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LearningImportWizard({
  onComplete,
  onCancel,
  theme = 'light',
}: LearningImportWizardProps) {
  const isDark = theme.includes('dark')
  
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null)
  const [missingStrands, setMissingStrands] = useState<StrandMapping[]>([])
  const [mappings, setMappings] = useState<StrandMappingChoice[]>([])
  const [options, setOptions] = useState<ImportOptions>({
    conflictResolution: 'skip',
    importFlashcards: true,
    importQuizzes: true,
    importGlossary: true,
    importFSRSData: true,
  })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setLoading(true)
    
    try {
      const content = await f.text()
      const parsed = parseImportFile(content, f.name)
      setParsedData(parsed)
      
      if (!parsed.isValid) {
        // Show errors in preview step
        setStep('preview')
        return
      }
      
      // Check for missing strands
      if (parsed.sourceStrands.length > 0) {
        const missing = await findMissingStrands(parsed.sourceStrands)
        setMissingStrands(missing)
        
        // Initialize mappings
        setMappings(missing.map(strand => ({
          sourceStrand: strand,
          action: 'orphan',
        })))
      }
      
      setStep('preview')
    } catch (err) {
      console.error('[ImportWizard] Failed to parse file:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNext = useCallback(async () => {
    switch (step) {
      case 'preview':
        if (missingStrands.length > 0) {
          setStep('mapping')
        } else {
          setStep('options')
        }
        break
        
      case 'mapping':
        setStep('options')
        break
        
      case 'options':
        setStep('importing')
        setLoading(true)
        
        try {
          const importResult = await importLearningData(parsedData!, {
            ...options,
            strandMappings: mappings,
          })
          setResult(importResult)
          setStep('complete')
          onComplete?.(importResult)
        } catch (err) {
          setResult({
            success: false,
            imported: { flashcards: 0, quizzes: 0, glossary: 0 },
            skipped: { flashcards: 0, quizzes: 0, glossary: 0 },
            errors: [err instanceof Error ? err.message : 'Import failed'],
            strandsMissing: [],
          })
          setStep('complete')
        } finally {
          setLoading(false)
        }
        break
    }
  }, [step, missingStrands, parsedData, options, mappings, onComplete])

  const handleBack = useCallback(() => {
    switch (step) {
      case 'preview':
        setStep('upload')
        setFile(null)
        setParsedData(null)
        break
      case 'mapping':
        setStep('preview')
        break
      case 'options':
        if (missingStrands.length > 0) {
          setStep('mapping')
        } else {
          setStep('preview')
        }
        break
    }
  }, [step, missingStrands])

  return (
    <div className={`w-full max-w-2xl mx-auto p-6 rounded-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'} shadow-2xl`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <h2 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Import Learning Data
        </h2>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {(['upload', 'preview', 'mapping', 'options', 'complete'] as WizardStep[])
          .filter(s => s !== 'importing')
          .filter(s => s !== 'mapping' || missingStrands.length > 0)
          .map((s, i, arr) => (
            <React.Fragment key={s}>
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s || (arr as string[]).indexOf(step) > i
                    ? isDark
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 text-white'
                    : isDark
                      ? 'bg-zinc-700 text-zinc-400'
                      : 'bg-zinc-200 text-zinc-500'
                  }
                `}
              >
                {i + 1}
              </div>
              {i < arr.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    (arr as string[]).indexOf(step) > i
                      ? isDark ? 'bg-emerald-600' : 'bg-emerald-500'
                      : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 'upload' && (
            <FileDropZone onFile={handleFile} isDark={isDark} />
          )}
          
          {step === 'preview' && parsedData && (
            <PreviewStep data={parsedData} isDark={isDark} />
          )}
          
          {step === 'mapping' && (
            <MappingStep
              missingStrands={missingStrands}
              mappings={mappings}
              onMappingChange={setMappings}
              isDark={isDark}
            />
          )}
          
          {step === 'options' && (
            <OptionsStep
              options={options}
              onOptionsChange={setOptions}
              isDark={isDark}
            />
          )}
          
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className={`w-12 h-12 mx-auto animate-spin ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <p className={`mt-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Importing your learning data...
              </p>
            </div>
          )}
          
          {step === 'complete' && result && (
            <CompleteStep result={result} isDark={isDark} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-between mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={step === 'complete' ? onCancel : handleBack}
          disabled={step === 'upload' || loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isDark
              ? 'text-zinc-300 hover:bg-zinc-800'
              : 'text-zinc-600 hover:bg-zinc-100'
            }
          `}
        >
          {step === 'complete' ? 'Close' : (
            <>
              <ArrowLeft className="w-4 h-4" />
              Back
            </>
          )}
        </button>

        {step !== 'complete' && step !== 'importing' && step !== 'upload' && (
          <button
            onClick={handleNext}
            disabled={loading || (step === 'preview' && !parsedData?.isValid)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isDark
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }
            `}
          >
            {step === 'options' ? 'Import' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default LearningImportWizard

