/**
 * Suggested Questions - Hybrid Question System
 * @module codex/ui/SuggestedQuestions
 * 
 * @remarks
 * HYBRID SYSTEM - Priority order:
 * 1. Manual questions from strand frontmatter (highest priority)
 * 2. Pre-built questions from suggested-questions.json
 * 3. Server-side API generation (when available)
 * 4. Dynamic client-side NLP generation as fallback
 * 
 * Frontmatter schema:
 * ```yaml
 * ---
 * suggestedQuestions:
 *   - question: "What is X?"
 *     difficulty: beginner
 *     tags: [concept]
 * ---
 * ```
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Zap, RefreshCw, HelpCircle, Lightbulb, Code, Layers, ArrowRight, PenLine } from 'lucide-react'
import {
  generateQuestionsFromContent,
  inferQuestionType,
  type GeneratedQuestion,
  type QuestionType,
} from '@/lib/questions'

interface SuggestedQuestionsProps {
  /** Current strand context (file path) */
  currentStrand?: string
  /** Actual content of the strand for NLP analysis */
  strandContent?: string
  /** Callback when a question is selected */
  onSelectQuestion: (question: string) => void
  /** Theme */
  theme?: string
  /** Maximum questions to show */
  maxQuestions?: number
  /** API base URL for server-side generation (optional) */
  apiBaseUrl?: string
}

interface PrebuiltQuestion {
  question: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
}

interface PrebuiltEntry {
  source: 'manual' | 'auto'
  analysis?: {
    words: number
    headings: number
    codeBlocks: number
    links: number
    significance: number
    difficulty: number
  }
  questions: PrebuiltQuestion[]
}

interface SuggestedQuestionsData {
  generatedAt: string
  repo: string
  branch: string
  stats?: {
    total: number
    manual: number
    auto: number
  }
  questions: Record<string, PrebuiltEntry>
}

// Cache for prebuilt questions
let prebuiltQuestionsCache: SuggestedQuestionsData | null = null
let prebuiltLoadAttempted = false

/**
 * Load prebuilt questions from JSON file
 */
async function loadPrebuiltQuestions(): Promise<SuggestedQuestionsData | null> {
  if (prebuiltQuestionsCache) return prebuiltQuestionsCache
  if (prebuiltLoadAttempted) return null
  
  prebuiltLoadAttempted = true
  
  try {
    const res = await fetch('/assets/suggested-questions.json')
    if (!res.ok) return null
    
    const data = await res.json()
    prebuiltQuestionsCache = data
    return data
  } catch (err) {
    console.warn('[SuggestedQuestions] Could not load prebuilt questions:', err)
    return null
  }
}

/**
 * Get prebuilt questions for a strand
 */
async function getPrebuiltForStrand(strandPath: string): Promise<{ questions: GeneratedQuestion[], isManual: boolean } | null> {
  const data = await loadPrebuiltQuestions()
  if (!data?.questions) return null
  
  // Try exact match first
  let entry = data.questions[strandPath]
  
  // Try without leading slash
  if (!entry && strandPath.startsWith('/')) {
    entry = data.questions[strandPath.slice(1)]
  }
  
  // Try with weaves/ prefix
  if (!entry && !strandPath.startsWith('weaves/')) {
    entry = data.questions[`weaves/${strandPath}`]
  }
  
  if (!entry?.questions?.length) return null
  
  const isManual = entry.source === 'manual'
  
  const questions: GeneratedQuestion[] = entry.questions.map(q => ({
    text: q.question,
    type: inferQuestionType(q.question),
    confidence: isManual ? 1.0 : 0.8,
    source: isManual ? 'manual' : 'prebuilt',
  }))
  
  return { questions, isManual }
}

/**
 * Fetch questions from server-side API
 */
async function fetchFromAPI(
  strandPath: string,
  maxQuestions: number,
  apiBaseUrl: string
): Promise<{ questions: GeneratedQuestion[], source: 'manual' | 'prebuilt' | 'dynamic' } | null> {
  try {
    const url = `${apiBaseUrl}/api/v1/questions/strand/${encodeURIComponent(strandPath)}?maxQuestions=${maxQuestions}`
    const res = await fetch(url)
    
    if (!res.ok) return null
    
    const data = await res.json()
    if (!data?.questions?.length) return null
    
    return {
      questions: data.questions,
      source: data.source || 'dynamic',
    }
  } catch (err) {
    console.warn('[SuggestedQuestions] API fetch failed:', err)
    return null
  }
}

const TYPE_CONFIG: Record<QuestionType, { icon: React.ElementType; color: string }> = {
  definition: { icon: BookOpen, color: 'text-blue-500' },
  comparison: { icon: Layers, color: 'text-purple-500' },
  application: { icon: Zap, color: 'text-amber-500' },
  exploration: { icon: Lightbulb, color: 'text-emerald-500' },
  code: { icon: Code, color: 'text-cyan-500' },
  concept: { icon: HelpCircle, color: 'text-rose-500' },
}

/**
 * Hybrid question suggestions - prefers manual > prebuilt > API > dynamic NLP
 */
export default function SuggestedQuestions({
  currentStrand,
  strandContent,
  onSelectQuestion,
  theme = 'light',
  maxQuestions = 4,
  apiBaseUrl,
}: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [contentFetched, setContentFetched] = useState(false)
  const [localContent, setLocalContent] = useState<string>('')
  const [questionSource, setQuestionSource] = useState<'manual' | 'prebuilt' | 'dynamic'>('dynamic')
  
  const isDark = theme.includes('dark')

  // Use provided content or fetch it
  const content = strandContent || localContent

  // Fetch content if not provided
  useEffect(() => {
    if (strandContent) {
      setLocalContent('')
      setContentFetched(true)
      return
    }
    
    if (!currentStrand) {
      setContentFetched(true)
      return
    }
    
    const fetchContent = async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://raw.githubusercontent.com/framersai/codex/main/${currentStrand}`)
        if (res.ok) {
          const text = await res.text()
          setLocalContent(text)
        }
      } catch (err) {
        console.warn('[SuggestedQuestions] Failed to fetch content:', err)
      } finally {
        setContentFetched(true)
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [currentStrand, strandContent])

  // Load questions - priority: manual > prebuilt > API > dynamic
  useEffect(() => {
    if (!contentFetched) return
    
    const loadQuestions = async () => {
      setLoading(true)
      
      // 1. Try prebuilt questions first (includes manual from frontmatter)
      if (currentStrand) {
        const prebuilt = await getPrebuiltForStrand(currentStrand)
        if (prebuilt && prebuilt.questions.length > 0) {
          setQuestions(prebuilt.questions.slice(0, maxQuestions))
          setQuestionSource(prebuilt.isManual ? 'manual' : 'prebuilt')
          setLoading(false)
          return
        }
      }
      
      // 2. Try server-side API (if available and not in static export)
      if (apiBaseUrl && currentStrand) {
        const apiResult = await fetchFromAPI(currentStrand, maxQuestions, apiBaseUrl)
        if (apiResult && apiResult.questions.length > 0) {
          setQuestions(apiResult.questions.slice(0, maxQuestions))
          setQuestionSource(apiResult.source)
          setLoading(false)
          return
        }
      }
      
      // 3. Fall back to client-side dynamic NLP generation
      const generated = generateQuestionsFromContent(content, currentStrand, { maxQuestions })
      setQuestions(generated.slice(0, maxQuestions))
      setQuestionSource('dynamic')
      setLoading(false)
    }
    
    loadQuestions()
  }, [content, currentStrand, contentFetched, maxQuestions, apiBaseUrl])

  // Regenerate questions (for dynamic mode)
  const regenerate = useCallback(() => {
    // For manual/prebuilt, just shuffle
    if (questionSource !== 'dynamic') {
      setQuestions(prev => [...prev].sort(() => Math.random() - 0.5))
      return
    }
    
    setLoading(true)
    setTimeout(() => {
      // Shuffle and regenerate
      const generated = generateQuestionsFromContent(content, currentStrand, { maxQuestions })
      // Take different questions this time by shuffling
      const shuffled = generated.sort(() => Math.random() - 0.5)
      setQuestions(shuffled.slice(0, maxQuestions))
      setLoading(false)
    }, 100)
  }, [content, currentStrand, maxQuestions, questionSource])

  if (loading && questions.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-[10px] font-medium opacity-60 mb-1">Generating...</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`p-2 rounded animate-pulse ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}
            >
              <div className="h-3 w-3/4 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-[10px] font-medium opacity-50">
          {currentStrand ? 'No suggestions available' : 'Select a strand for suggestions'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-medium opacity-60 flex items-center gap-1">
          {questionSource === 'manual' ? (
            <>
              <PenLine className="w-2.5 h-2.5 text-violet-500" />
              Curated:
            </>
          ) : (
            <>
              <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
              Suggested:
            </>
          )}
        </p>
        <button
          onClick={regenerate}
          disabled={loading}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title={questionSource === 'dynamic' ? 'Generate different questions' : 'Shuffle questions'}
        >
          <RefreshCw className={`w-2.5 h-2.5 opacity-50 hover:opacity-100 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {questions.map((question, idx) => {
          const config = TYPE_CONFIG[question.type]
          const Icon = config.icon

          return (
            <motion.button
              key={`${question.text.slice(0, 20)}-${idx}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onSelectQuestion(question.text)}
              className={`
                relative p-2 rounded text-left text-xs
                transition-all hover:scale-[1.01] active:scale-[0.99]
                ${isDark
                  ? 'bg-gray-800/50 hover:bg-gray-700/50'
                  : 'bg-gray-100/50 hover:bg-gray-200/50'
                }
                ring-1 ring-transparent ${questionSource === 'manual' ? 'hover:ring-violet-500/30' : 'hover:ring-emerald-500/30'}
              `}
            >
              <div className="flex items-start gap-1.5">
                <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${config.color}`} />
                <span className="line-clamp-2 flex-1 leading-tight">{question.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Show more button */}
      {questions.length >= maxQuestions && (
        <button
          onClick={regenerate}
          className={`mt-1.5 w-full py-1 text-[10px] flex items-center justify-center gap-1 rounded transition-colors ${
            isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ArrowRight className="w-2.5 h-2.5" />
          More
        </button>
      )}
    </div>
  )
}
