/**
 * Q&A Interface - Natural language question answering
 * @module codex/ui/QAInterface
 * 
 * @remarks
 * Beautiful, thoughtful UX for knowledge discovery through questions.
 * Supports voice input, suggested questions, and conversational flow.
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Mic, MicOff, Sparkles, ChevronRight, 
  BookOpen, Code, HelpCircle, Lightbulb, 
  MessageSquare, Brain, Zap, Info, XCircle, ExternalLink
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { SemanticSearchEngine, type SearchResult } from '@/lib/search/semanticSearch'
import type { BackendStatus } from '@/lib/search/embeddingEngine'
import VoiceInput from '../media/VoiceInput'
import AnswerCard from './AnswerCard'
import SuggestedQuestions from './SuggestedQuestions'
import { useTextToSpeech } from '../../hooks/useTextToSpeech'
import SemanticSearchInfoPopover from '../search/SemanticSearchInfoPopover'
import QAContextSelector, { type ContextScope, type ContextFilters } from './QAContextSelector'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import { useToast } from '../common/Toast'

interface QAInterfaceProps {
  /** Whether the Q&A interface is active */
  isOpen: boolean
  /** Callback when closed */
  onClose: () => void
  /** Current strand context */
  currentStrand?: string
  /** Current strand content for question generation */
  strandContent?: string
  /** Theme */
  theme?: string
  /** Notify parent about semantic availability */
  onSemanticStatusChange?: (status: 'ready' | 'degraded' | 'offline', message?: string) => void
  /** Available weaves for filtering */
  availableWeaves?: string[]
  /** Available looms for filtering */
  availableLooms?: string[]
  /** Available tags for filtering */
  availableTags?: string[]
  /** Total strands in knowledge base */
  totalStrands?: number
}

interface Conversation {
  id: string
  question: string
  answer: string
  confidence: number
  sources: SearchResult[]
  timestamp: Date
}

/**
 * Natural language Q&A interface with semantic search
 * 
 * @remarks
 * - Voice and text input
 * - Real-time semantic search
 * - Conversational context
 * - Beautiful answer cards
 * - Suggested follow-ups
 */
export default function QAInterface({
  isOpen,
  onClose,
  currentStrand,
  strandContent,
  theme = 'light',
  onSemanticStatusChange,
  availableWeaves = [],
  availableLooms = [],
  availableTags = [],
  totalStrands = 0,
}: QAInterfaceProps) {
  const [question, setQuestion] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchEngine, setSearchEngine] = useState<SemanticSearchEngine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [qaMode, setQaMode] = useState<'semantic' | 'lexical' | 'offline'>('semantic')
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [initProgress, setInitProgress] = useState<{ message: string; percent: number } | null>(null)
  const [contextScope, setContextScope] = useState<ContextScope>(currentStrand ? 'current' : 'all')
  const [contextFilters, setContextFilters] = useState<ContextFilters>({})
  // Track initialization to prevent infinite retry loops
  const [initAttempted, setInitAttempted] = useState(false)
  // User preference for search mode (null = auto, 'semantic' | 'lexical' = forced)
  const [forcedSearchMode, setForcedSearchMode] = useState<'semantic' | 'lexical' | null>(null)
  // Track which conversation is being read aloud
  const [speakingConversationId, setSpeakingConversationId] = useState<string | null>(null)
  
  // Text-to-Speech for reading answers aloud
  const tts = useTextToSpeech()
  
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme: currentTheme } = useTheme()
  const toast = useToast()
  const isTerminal = currentTheme?.includes('terminal')
  const isDark = theme.includes('dark')
  const isSepia = theme.includes('sepia')

  // Initialize semantic search - only attempt once to prevent infinite loops
  useEffect(() => {
    if (isOpen && !searchEngine && !initAttempted) {
      setInitAttempted(true)
      
      const initSearch = async () => {
        try {
          const engine = new SemanticSearchEngine('info')
          
          // Initialize with callbacks for progress and status
          await engine.initialize(
            (status: BackendStatus) => {
              setBackendStatus(status)
              
              if (status.type === 'ort') {
                setQaMode('semantic')
                setStatusNotice(null)
                toast.success(`Q&A ready! Using ${status.deviceInfo}`)
                onSemanticStatusChange?.('ready')
              } else if (status.type === 'transformers') {
                setQaMode('semantic')
                setStatusNotice('Using Transformers.js (CPU)')
                toast.info('Q&A initialized with Transformers.js (slower, but reliable)')
                onSemanticStatusChange?.('degraded', 'Using Transformers.js fallback')
              } else {
                setQaMode('lexical')
                setStatusNotice('Semantic embeddings unavailable. Using keyword search.')
                onSemanticStatusChange?.('offline', 'Semantic Q&A unavailable')
              }
            },
            (message: string, percent?: number) => {
              setInitProgress({ message, percent: percent ?? 0 })
            }
          )
          
          setSearchEngine(engine)
          setError(null)
          setInitProgress(null)
        } catch (err: any) {
          console.warn('[QAInterface] Semantic search initialization failed:', err)
          setQaMode('lexical')
          setStatusNotice('Semantic model unavailable. Using keyword search instead.')
          setInitProgress(null)
          onSemanticStatusChange?.('offline', 'Semantic Q&A unavailable – using lexical fallback.')
        }
      }
      initSearch()
    }
  }, [isOpen, searchEngine, initAttempted, onSemanticStatusChange, toast])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  /**
   * Handle question submission
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!question.trim() || isSearching) return
    
    setIsSearching(true)
    setError(null)
    
    try {
      // Determine if we should use semantic or lexical search
      const useSemantic = forcedSearchMode === 'lexical' ? false : (searchEngine !== null)
      
      if (useSemantic && searchEngine) {
        const result = await searchEngine.answerQuestion(question)
        const conversation: Conversation = {
          id: Date.now().toString(),
          question,
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
          timestamp: new Date(),
        }
        setConversations((prev) => [conversation, ...prev])
        setQuestion('')
        sessionStorage.setItem('qa-context', JSON.stringify([conversation, ...conversations].slice(0, 5)))
        setQaMode('semantic')
        setStatusNotice(null)
        onSemanticStatusChange?.('ready')
      } else {
        // Use lexical search (either forced or fallback)
        const fallbackEngine = getSearchEngine()
        const lexicalResults = await fallbackEngine.search(question, { limit: 5, semantic: false })
        if (!lexicalResults.length) {
          throw new Error('No matching documents found in lexical mode.')
        }

        const answer = buildLexicalAnswer(question, lexicalResults)
        
        // Normalize BM25 score to 0-1 range for confidence display
        // BM25 scores are unbounded, so we use a sigmoid-like normalization
        const rawScore = lexicalResults[0].combinedScore
        const normalizedConfidence = Math.min(1, Math.max(0, rawScore / (rawScore + 5)))
        
        const conversation: Conversation = {
          id: Date.now().toString(),
          question,
          answer,
          confidence: normalizedConfidence,
          sources: [],
          timestamp: new Date(),
        }
        setConversations((prev) => [conversation, ...prev])
        setQuestion('')
        setQaMode('lexical')
        
        if (forcedSearchMode === 'lexical') {
          setStatusNotice('Using keyword search (user preference)')
        } else {
          setStatusNotice('Semantic embeddings missing — showing lexical matches.')
        }
        onSemanticStatusChange?.('degraded', 'Lexical fallback active')
      }
      
    } catch (err) {
      console.error('Search failed:', err)
      setError('Sorry, I couldn\'t process that question. Please try again.')
      if (!searchEngine) {
        setQaMode('offline')
        onSemanticStatusChange?.('offline', 'Semantic Q&A unavailable – model missing.')
      }
    } finally {
      setIsSearching(false)
    }
  }, [question, searchEngine, isSearching, conversations, onSemanticStatusChange])

  /**
   * Reset the input field without altering history.
   */
  const handleClearInput = () => {
    setQuestion('')
    setError(null)
  }

  /**
   * Read a conversation answer aloud
   */
  const handleReadAnswerAloud = useCallback((conversationId: string, text: string) => {
    setSpeakingConversationId(conversationId)
    tts.speak(text)
  }, [tts])

  /**
   * Stop reading
   */
  const handleStopReading = useCallback(() => {
    tts.stop()
    setSpeakingConversationId(null)
  }, [tts])

  // Track when TTS finishes speaking
  useEffect(() => {
    if (!tts.state.speaking && speakingConversationId) {
      setSpeakingConversationId(null)
    }
  }, [tts.state.speaking, speakingConversationId])

  /**
   * Handle voice input
   */
  const handleVoiceInput = (transcript: string) => {
    setQuestion(transcript)
    setShowVoiceInput(false)
    // Auto-submit if it ends with a question mark
    if (transcript.trim().endsWith('?')) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {/* Mobile backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Panel: full-screen on mobile, compact bottom-right on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="
          fixed z-50
          md:bottom-4 md:right-4 md:w-[min(92vw,640px)] md:max-h-[80vh]
          max-md:inset-0 max-md:w-full max-md:h-full
          max-md:pb-20
        "
      >
        <div
          className={`
            relative overflow-hidden border h-full flex flex-col
            md:rounded-lg md:shadow-2xl
            max-md:rounded-none max-md:shadow-none
            ${isTerminal ? 'terminal-frame' : ''}
            ${isSepia && isDark ? 'bg-amber-950 border-amber-800' : ''}
            ${isSepia && !isDark ? 'bg-amber-50 border-amber-300' : ''}
            ${!isSepia && isDark ? 'bg-gray-900 border-gray-700' : ''}
            ${!isSepia && !isDark ? 'bg-white border-gray-200' : ''}
          `}
          role="dialog"
          aria-modal="true"
        >
          {/* Header - Compact */}
          <div className={`
            relative px-3 py-1.5 border-b shrink-0
            ${isDark ? 'border-gray-800' : 'border-gray-200'}
            ${isTerminal ? 'terminal-header' : ''}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`
                  p-1.5 rounded
                  ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}
                `}>
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold">Ask the Quarry Oracle</h2>
                  <p className="text-xs opacity-70 flex items-center gap-2">
                    Natural language knowledge discovery
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full uppercase tracking-wide text-[9px] font-semibold ${
                        qaMode === 'semantic'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : qaMode === 'lexical'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
                      }`}
                      title={backendStatus ? 
                        (backendStatus.type === 'ort' ? `ONNX Runtime: ${backendStatus.deviceInfo}` :
                         backendStatus.type === 'transformers' ? 'Transformers.js (CPU)' :
                         `Offline: ${backendStatus.reason}`) : 'Initializing...'}
                    >
                      {qaMode === 'semantic' ? (
                        backendStatus?.type === 'ort' ? (
                          <><Zap className="w-3 h-3" /> ORT</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> TF.js</>
                        )
                      ) : qaMode === 'lexical' ? (
                        'Lexical'
                      ) : (
                        'Offline'
                      )}
                    </span>
                  </p>
                </div>
                
                {/* Info Popover */}
                <SemanticSearchInfoPopover
                  status={backendStatus}
                  theme={theme}
                />
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Initialization Progress */}
          {initProgress && (
            <div className={`px-4 py-2 border-b shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>{initProgress.message}</span>
                {initProgress.percent > 0 && (
                  <span className="ml-auto font-semibold">{Math.round(initProgress.percent)}%</span>
                )}
              </div>
              {initProgress.percent > 0 && (
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${initProgress.percent}%` }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Compact Controls Row - Context + Mode in one line */}
          {!initProgress && (
            <div className={`px-3 py-1.5 border-b shrink-0 flex items-center justify-between gap-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              {/* Context selector inline */}
              <QAContextSelector
                scope={contextScope}
                onScopeChange={setContextScope}
                filters={contextFilters}
                onFiltersChange={setContextFilters}
                availableWeaves={availableWeaves}
                availableLooms={availableLooms}
                availableTags={availableTags}
                currentStrand={currentStrand}
                totalStrands={totalStrands}
              />

              {/* Search mode toggle - compact */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                  <button
                    onClick={() => setForcedSearchMode(forcedSearchMode === 'semantic' ? null : 'semantic')}
                    disabled={!searchEngine}
                    className={`
                      px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center gap-1
                      ${(forcedSearchMode === 'semantic' || (forcedSearchMode === null && searchEngine))
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }
                      ${!searchEngine ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title="AI semantic search"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </button>
                  <button
                    onClick={() => setForcedSearchMode(forcedSearchMode === 'lexical' ? null : 'lexical')}
                    className={`
                      px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center gap-1
                      ${forcedSearchMode === 'lexical'
                        ? 'bg-amber-500 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }
                    `}
                    title="Keyword search"
                  >
                    <Search className="w-2.5 h-2.5" />
                    BM25
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Question Input - Compact */}
          <div className="px-3 py-2 border-b shrink-0 border-gray-200 dark:border-gray-800">
            <form onSubmit={handleSubmit} className="relative">
              <div className={`
                relative flex items-center gap-2 px-3 py-2 rounded
                ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
                ${isTerminal ? 'terminal-input-container' : ''}
                transition-all duration-200
                ${isSearching ? 'ring-2 ring-emerald-500' : ''}
              `}>
                <Search className="w-5 h-5 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about the Codex..."
                  className={`
                    flex-1 bg-transparent outline-none placeholder-gray-500 text-sm
                    ${isTerminal ? 'font-mono' : ''}
                  `}
                  disabled={isSearching}
                />
                
                {/* Voice Input Toggle */}
                <button
                  type="button"
                  onClick={() => setShowVoiceInput(!showVoiceInput)}
                  className={`
                    p-2 rounded transition-colors
                    ${isListening 
                      ? 'bg-red-500 text-white' 
                      : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }
                  `}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                {/* Clear Button */}
                {question && (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    className="p-2 rounded text-gray-500 hover:bg-gray-700/20 dark:hover:bg-gray-100/10 transition-colors"
                    title="Clear question"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!question.trim() || isSearching || qaMode === 'offline'}
                  className={`
                    px-3 py-2 rounded font-semibold transition-all text-sm inline-flex items-center justify-center
                    ${isSearching || !question.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }
                  `}
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              
            </form>

            {/* Suggested Questions - only show when empty */}
            {conversations.length === 0 && (
              <SuggestedQuestions
                currentStrand={currentStrand}
                strandContent={strandContent}
                onSelectQuestion={setQuestion}
                theme={theme}
              />
            )}
          </div>

          {/* Voice Input Modal */}
          {showVoiceInput && (
            <VoiceInput
              isOpen={showVoiceInput}
              onClose={() => setShowVoiceInput(false)}
              onTranscript={handleVoiceInput}
              theme={theme}
            />
          )}

          {/* Error Message - Compact */}
          {(error || statusNotice) && (
            <div className="mx-3 mt-2 px-2 py-1.5 rounded text-xs flex items-center gap-1.5"
              style={{
                backgroundColor: error ? 'rgba(248, 113, 113, 0.15)' : 'rgba(251, 191, 36, 0.15)',
              }}
            >
              <Sparkles className="w-3 h-3 shrink-0 opacity-70" />
              <span className="opacity-90">{error || statusNotice}</span>
            </div>
          )}

          {/* Conversation History - Flex-1 to fill remaining space */}
          <div className="p-2 space-y-2 flex-1 min-h-0 overflow-y-auto">
            <AnimatePresence>
              {conversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: Math.min(index * 0.05, 0.2) }}
                >
                  <AnswerCard
                    question={conv.question}
                    answer={conv.answer}
                    confidence={conv.confidence}
                    sources={conv.sources}
                    timestamp={conv.timestamp}
                    theme={theme}
                    onReadAloud={(text) => handleReadAnswerAloud(conv.id, text)}
                    onStopReading={handleStopReading}
                    isSpeaking={speakingConversationId === conv.id}
                    ttsSupported={tts.isSupported}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty State - Compact */}
            {conversations.length === 0 && !isSearching && (
              <div className="text-center py-6">
                <div className={`
                  inline-flex p-3 rounded-full mb-3
                  ${isDark ? 'bg-purple-900/20' : 'bg-purple-100'}
                `}>
                  <HelpCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">No questions yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  Ask me anything about Quarry Codex!
                </p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Searching the knowledge fabric...
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer Tips */}
          <div className={`
            px-4 py-3 border-t shrink-0
            ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}
          `}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>
                  Tip: Ask "how", "what", or "why" questions for best results.
                </span>
              </div>
              <a
                href="https://github.com/framersai/frame.dev/blob/master/apps/frame.dev/components/quarry/ORT_INTEGRATION.md"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap
                  text-cyan-600 dark:text-cyan-400 hover:underline
                  min-h-[44px] md:min-h-0
                `}
                title="Learn how semantic search works and how to optimize performance"
              >
                <HelpCircle className="w-3 h-3" />
                <span>About Semantic Search</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Build a readable fallback answer from lexical search results.
 */
function buildLexicalAnswer(question: string, results: CodexSearchResult[]): string {
  const headline = results[0]
  const summaryLines = [
    `Top match: ${headline.title}`,
    headline.summary,
    '',
  ]

  const related = results.slice(1, 4)
  if (related.length > 0) {
    summaryLines.push('Related entries:')
    related.forEach((entry) => {
      summaryLines.push(`• ${entry.title} — ${entry.summary}`)
    })
  }

  summaryLines.push('', `Query: "${question}"`)
  return summaryLines.join('\n')
}