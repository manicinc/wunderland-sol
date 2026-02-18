'use client'

/**
 * Full-Screen Ask Page - Immersive AI Knowledge Discovery
 * @module quarry/ask/AskPageClient
 * 
 * A dedicated full-page experience for the Ask feature with:
 * - Full viewport layout
 * - Sidebar for context/strand picker
 * - All filters and settings visible
 * - Better typography and spacing
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Brain, Cpu, Send, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, AlertCircle, HelpCircle, Zap, Clock, Check, Info,
  Settings2, Mic, Copy, Search, Filter, BookOpen, Layers, FileText,
  XCircle, RefreshCw, Globe, CalendarCheck2, ListTodo, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, Plus, Wand2
} from 'lucide-react'
import { useStream } from '@/lib/llm/useStream'
import { isLLMAvailable, llm } from '@/lib/llm'
import { useOracle, type OracleMessage } from '@/lib/planner/oracle'
import StreamingText from '@/components/quarry/ui/common/StreamingText'
import AskNavIcon from '@/components/quarry/ui/ask/AskNavIcon'
import VoiceInput from '@/components/quarry/ui/media/VoiceInput'
import SuggestedQuestions from '@/components/quarry/ui/qa/SuggestedQuestions'
import AnswerCard from '@/components/quarry/ui/qa/AnswerCard'
import QAContextSelector, { type ContextScope, type ContextFilters } from '@/components/quarry/ui/qa/QAContextSelector'
import { CitationsList } from '@/components/quarry/ui/ask/AskEnhancements'
import OpenStrandsPanel, { type OpenStrand, loadOpenStrands, saveOpenStrands } from '@/components/quarry/ui/ask/OpenStrandsPanel'
import type { BackendStatus } from '@/lib/search/embeddingEngine'
import { SemanticSearchEngine, type SearchResult } from '@/lib/search/semanticSearch'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import { useTextToSpeech } from '@/components/quarry/hooks/useTextToSpeech'
import { useToast } from '@/components/quarry/ui/common/Toast'
import { useSearchSettings } from '@/lib/search/searchSettings'
import LearningFiltersPanel from '@/components/quarry/ui/learning/LearningFiltersPanel'
import { SetupWizard } from '@/components/quarry/ui/setup'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type AskMode = 'brain' | 'cloud' | 'hybrid' | 'planner' | 'setup'
type SearchMode = 'semantic' | 'lexical' | 'auto'
type ContextMode = 'current' | 'all-tabs'

interface Conversation {
  id: string
  question: string
  answer: string
  confidence: number
  sources: SearchResult[]
  timestamp: Date
  mode: AskMode
  isStreaming?: boolean
  latency?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return `ask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildLexicalAnswer(question: string, results: CodexSearchResult[]): string {
  if (!results.length) return 'No matching documents found.'
  
  const headline = results[0]
  const summaryLines = [
    `**${headline.title}**`,
    headline.summary || 'No summary available.',
    '',
  ]

  const related = results.slice(1, 4)
  if (related.length > 0) {
    summaryLines.push('**Related:**')
    related.forEach((entry) => {
      summaryLines.push(`• ${entry.title}`)
    })
  }

  return summaryLines.join('\n')
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODE TABS
═══════════════════════════════════════════════════════════════════════════ */

function ModeTabs({
  mode,
  onModeChange,
  llmAvailable,
  localReady,
  localLoading,
}: {
  mode: AskMode
  onModeChange: (mode: AskMode) => void
  llmAvailable: boolean
  localReady: boolean
  localLoading: boolean
}) {
  const tabs: { id: AskMode; label: string; icon: typeof Brain; desc: string; requiresLLM?: boolean }[] = [
    { id: 'brain', label: 'Brain', icon: Brain, desc: 'On-device semantic search' },
    { id: 'hybrid', label: 'Hybrid', icon: Sparkles, desc: 'Local + Cloud enhance', requiresLLM: true },
    { id: 'cloud', label: 'Cloud AI', icon: Globe, desc: 'Claude / GPT / Ollama', requiresLLM: true },
    { id: 'planner', label: 'Planner', icon: CalendarCheck2, desc: 'Task management' },
    { id: 'setup', label: 'Setup', icon: Wand2, desc: 'AI-powered workspace setup' },
  ]

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = mode === tab.id
        const isDisabled = tab.requiresLLM && !llmAvailable

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onModeChange(tab.id)}
            disabled={isDisabled}
            title={tab.desc}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-600 text-white shadow-lg'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AskPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get initial values from URL params
  const initialStrand = searchParams.get('strand') || ''
  const initialMode = (searchParams.get('mode') as AskMode) || 'brain'

  // State
  const [mode, setMode] = useState<AskMode>(initialMode)
  const [question, setQuestion] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [showStrandPicker, setShowStrandPicker] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Search engine state
  const [searchEngine, setSearchEngine] = useState<SemanticSearchEngine | null>(null)
  const [localReady, setLocalReady] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic')
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)

  // Open strands tabs (VS Code style)
  const [openStrands, setOpenStrands] = useState<OpenStrand[]>([])
  const [activeStrandId, setActiveStrandId] = useState<string | null>(null)
  const [contextMode, setContextMode] = useState<ContextMode>('current')

  // Context/filters
  const [contextScope, setContextScope] = useState<ContextScope>(initialStrand ? 'current' : 'all')
  const [contextFilters, setContextFilters] = useState<ContextFilters>({})
  const [taxonomyFilters, setTaxonomyFilters] = useState<{
    tags: string[]
    subjects: string[]
    topics: string[]
  }>({ tags: [], subjects: [], topics: [] })

  // Load open strands from localStorage
  useEffect(() => {
    const saved = loadOpenStrands()
    if (saved.length > 0) {
      setOpenStrands(saved)
      setActiveStrandId(saved[0].id)
    }
    // Add initial strand if provided
    if (initialStrand) {
      const exists = saved.find(s => s.path === initialStrand)
      if (!exists) {
        const newStrand: OpenStrand = {
          id: `strand-${Date.now()}`,
          path: initialStrand,
          title: initialStrand.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
        }
        const updated = [newStrand, ...saved]
        setOpenStrands(updated)
        setActiveStrandId(newStrand.id)
        saveOpenStrands(updated)
      } else {
        setActiveStrandId(exists.id)
      }
    }
  }, [initialStrand])

  // Save open strands when they change
  useEffect(() => {
    if (openStrands.length > 0) {
      saveOpenStrands(openStrands)
    }
  }, [openStrands])

  // Strand management callbacks
  const handleStrandSelect = useCallback((id: string) => {
    setActiveStrandId(id)
  }, [])

  const handleStrandClose = useCallback((id: string) => {
    setOpenStrands(prev => {
      const updated = prev.filter(s => s.id !== id)
      // If closing active strand, select another
      if (id === activeStrandId && updated.length > 0) {
        setActiveStrandId(updated[0].id)
      } else if (updated.length === 0) {
        setActiveStrandId(null)
      }
      return updated
    })
  }, [activeStrandId])

  const handleStrandAdd = useCallback(() => {
    setShowStrandPicker(true)
  }, [])

  const handleAddStrand = useCallback((path: string, title: string, content?: string) => {
    const exists = openStrands.find(s => s.path === path)
    if (exists) {
      setActiveStrandId(exists.id)
      return
    }
    const newStrand: OpenStrand = {
      id: `strand-${Date.now()}`,
      path,
      title,
      content,
    }
    setOpenStrands(prev => [...prev, newStrand])
    setActiveStrandId(newStrand.id)
    setShowStrandPicker(false)
  }, [openStrands])

  // Get aggregated context based on contextMode
  const aggregatedContext = useMemo(() => {
    if (contextMode === 'current') {
      const active = openStrands.find(s => s.id === activeStrandId)
      return active?.content || ''
    }
    // All tabs mode - aggregate all open strand contents
    return openStrands
      .map(s => s.content ? `## ${s.title}\n\n${s.content}` : '')
      .filter(Boolean)
      .join('\n\n---\n\n')
  }, [contextMode, openStrands, activeStrandId])

  // LLM streaming
  const llmAvailable = isLLMAvailable()
  const { response, isStreaming, error: llmError, stream, abort } = useStream()

  // Oracle for planner mode
  const oracle = useOracle()

  // TTS
  const tts = useTextToSpeech()
  const [speakingConversationId, setSpeakingConversationId] = useState<string | null>(null)

  // Search settings
  const { settings: searchSettings, updateSettings: updateSearchSettings } = useSearchSettings()
  const minThreshold = searchSettings.minThreshold

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationsRef = useRef<HTMLDivElement>(null)

  // Initialize search engine
  useEffect(() => {
    const initSearch = async () => {
      setLocalLoading(true)
      try {
        const engine = new SemanticSearchEngine()
        await engine.initialize((status) => {
          setBackendStatus(status)
        })
        setSearchEngine(engine)
        setLocalReady(true)
      } catch (err) {
        console.error('[AskPage] Failed to initialize semantic search:', err)
        setSearchMode('lexical')
      } finally {
        setLocalLoading(false)
      }
    }
    initSearch()
  }, [])

  // Update streaming message
  useEffect(() => {
    if (response && isStreaming) {
      setConversations((prev) => {
        const updated = [...prev]
        if (updated.length > 0 && updated[0].isStreaming) {
          updated[0] = { ...updated[0], answer: response }
        }
        return updated
      })
    }
  }, [response, isStreaming])

  // Finalize streaming
  useEffect(() => {
    if (!isStreaming && response) {
      setConversations((prev) => {
        const updated = [...prev]
        if (updated.length > 0 && updated[0].isStreaming) {
          updated[0] = { ...updated[0], answer: response, isStreaming: false }
        }
        return updated
      })
    }
  }, [isStreaming, response])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  /* ─────────────────────────────────────────────────────────────────────────
     HANDLERS
  ───────────────────────────────────────────────────────────────────────── */

  const handleLocalSearch = useCallback(async (q: string): Promise<Conversation> => {
    const startTime = performance.now()
    
    if (searchEngine && searchMode !== 'lexical') {
      try {
        const result = await searchEngine.answerQuestion(q, { minScore: minThreshold })
        return {
          id: generateId(),
          question: q,
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
          timestamp: new Date(),
          mode: 'brain',
          latency: Math.round(performance.now() - startTime),
        }
      } catch (err) {
        console.warn('[AskPage] Semantic failed, trying lexical:', err)
      }
    }
    
    const fallbackEngine = getSearchEngine()
    const results = await fallbackEngine.search(q, { limit: 5, semantic: false })
    const rawScore = results[0]?.combinedScore ?? 0
    const normalizedConfidence = Math.min(1, Math.max(0, rawScore / (rawScore + 5)))
    
    return {
      id: generateId(),
      question: q,
      answer: buildLexicalAnswer(q, results),
      confidence: normalizedConfidence,
      sources: [],
      timestamp: new Date(),
      mode: 'brain',
      latency: Math.round(performance.now() - startTime),
    }
  }, [searchEngine, searchMode, minThreshold])

  const handleCloudSearch = useCallback(async (q: string) => {
    if (!llmAvailable) {
      const errorConv: Conversation = {
        id: generateId(),
        question: q,
        answer: `⚠️ **LLM Not Configured**\n\nNo API keys are set up. Configure at least one provider in Settings.`,
        confidence: 0,
        sources: [],
        timestamp: new Date(),
        mode: 'cloud',
      }
      setConversations(prev => [errorConv, ...prev])
      return
    }

    const streamingConv: Conversation = {
      id: generateId(),
      question: q,
      answer: '',
      confidence: 0,
      sources: [],
      timestamp: new Date(),
      mode: 'cloud',
      isStreaming: true,
    }
    setConversations(prev => [streamingConv, ...prev])

    const history = conversations
      .filter(c => c.mode === 'cloud' || c.mode === 'hybrid')
      .slice(0, 5)
      .reverse()
      .flatMap(c => [
        { role: 'user' as const, content: c.question },
        { role: 'assistant' as const, content: c.answer },
      ])

    await stream([...history, { role: 'user', content: q }])
  }, [conversations, stream, llmAvailable])

  const handleHybridSearch = useCallback(async (q: string) => {
    const localResult = await handleLocalSearch(q)
    
    if (localResult.confidence > 0.75) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      return
    }
    
    if (!llmAvailable) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      toast.info('Local answer shown (LLM unavailable)')
      return
    }

    const streamingConv: Conversation = {
      id: generateId(),
      question: q,
      answer: '',
      confidence: 0,
      sources: localResult.sources,
      timestamp: new Date(),
      mode: 'hybrid',
      isStreaming: true,
    }
    setConversations(prev => [streamingConv, ...prev])

    let enhancedPrompt = q
    if (localResult.confidence > 0.3) {
      enhancedPrompt = `Based on local search (${Math.round(localResult.confidence * 100)}% confidence): "${localResult.answer}"\n\nPlease expand: ${q}`
    }

    await stream([{ role: 'user', content: enhancedPrompt }])
  }, [handleLocalSearch, stream, llmAvailable, toast])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isSearching || isStreaming || oracle.isProcessing) return

    setQuestion('')

    if (mode === 'planner') {
      await oracle.sendMessage(q)
      return
    }

    setIsSearching(true)

    try {
      switch (mode) {
        case 'brain':
          const result = await handleLocalSearch(q)
          setConversations(prev => [result, ...prev])
          break
        case 'cloud':
          await handleCloudSearch(q)
          break
        case 'hybrid':
          await handleHybridSearch(q)
          break
      }
    } catch (err) {
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [question, isSearching, isStreaming, mode, handleLocalSearch, handleCloudSearch, handleHybridSearch, toast, oracle])

  const handleClear = useCallback(() => {
    setConversations([])
    oracle.clear()
  }, [oracle])

  const handleVoiceInput = useCallback((transcript: string) => {
    setQuestion(transcript)
    setShowVoiceInput(false)
    setTimeout(() => handleSubmit(), 100)
  }, [handleSubmit])

  const handleReadAloud = useCallback((convId: string, text: string) => {
    setSpeakingConversationId(convId)
    tts.speak(text)
  }, [tts])

  const handleStopReading = useCallback(() => {
    tts.stop()
    setSpeakingConversationId(null)
  }, [tts])

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/quarry')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <AskNavIcon size={28} isActive theme="dark" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Ask
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Context Mode Toggle */}
            <button
              onClick={() => setContextMode(prev => prev === 'current' ? 'all-tabs' : 'current')}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${contextMode === 'all-tabs' 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }
              `}
              title={contextMode === 'all-tabs' ? 'Using all open tabs for context' : 'Using current tab for context'}
            >
              {contextMode === 'all-tabs' ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {contextMode === 'all-tabs' ? 'All Tabs' : 'Current'}
              </span>
            </button>

            <div className="h-5 w-px bg-zinc-700 mx-1" />

            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Open Strands Tabs */}
      <OpenStrandsPanel
        strands={openStrands}
        activeStrandId={activeStrandId}
        onStrandSelect={handleStrandSelect}
        onStrandClose={handleStrandClose}
        onStrandAdd={handleStrandAdd}
        isDark={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Filters & Context */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-r border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              <div className="w-80 h-full overflow-y-auto p-4 space-y-4">
                {/* Mode Tabs */}
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mode</h3>
                  <div className="flex flex-wrap gap-2">
                    <ModeTabs
                      mode={mode}
                      onModeChange={setMode}
                      llmAvailable={llmAvailable}
                      localReady={localReady}
                      localLoading={localLoading}
                    />
                  </div>
                </div>

                {/* Context Selector */}
                {mode !== 'planner' && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Search Scope</h3>
                    <QAContextSelector
                      scope={contextScope}
                      onScopeChange={setContextScope}
                      filters={contextFilters}
                      onFiltersChange={setContextFilters}
                      currentStrand={initialStrand}
                      totalStrands={0}
                    />
                  </div>
                )}

                {/* Open Tabs Context Info */}
                {openStrands.length > 0 && (
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium">
                          {contextMode === 'all-tabs' 
                            ? `${openStrands.length} tabs in context` 
                            : 'Current tab'
                          }
                        </span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        contextMode === 'all-tabs' 
                          ? 'bg-cyan-500/20 text-cyan-400' 
                          : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {contextMode === 'all-tabs' ? 'Aggregated' : 'Single'}
                      </span>
                    </div>
                    {contextMode === 'current' && activeStrandId && (
                      <div className="text-xs text-zinc-400">
                        <FileText className="w-3 h-3 inline mr-1" />
                        {openStrands.find(s => s.id === activeStrandId)?.title || 'No tab selected'}
                      </div>
                    )}
                    {contextMode === 'all-tabs' && (
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        {openStrands.slice(0, 3).map(s => (
                          <div key={s.id} className="truncate">• {s.title}</div>
                        ))}
                        {openStrands.length > 3 && (
                          <div className="text-zinc-600">+{openStrands.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Taxonomy Filters */}
                {mode !== 'planner' && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Filters</h3>
                    <LearningFiltersPanel
                      selectedTags={taxonomyFilters.tags}
                      selectedSubjects={taxonomyFilters.subjects}
                      selectedTopics={taxonomyFilters.topics}
                      availableTags={[]}
                      availableSubjects={[]}
                      availableTopics={[]}
                      onTagsChange={(tags) => setTaxonomyFilters(prev => ({ ...prev, tags }))}
                      onSubjectsChange={(subjects) => setTaxonomyFilters(prev => ({ ...prev, subjects }))}
                      onTopicsChange={(topics) => setTaxonomyFilters(prev => ({ ...prev, topics }))}
                      theme="dark"
                      defaultExpanded={false}
                      compact
                    />
                  </div>
                )}

                {/* Status */}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {localReady ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Semantic search ready</span>
                      </>
                    ) : localLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Lexical search only</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Setup Wizard */}
          {mode === 'setup' && (
            <div className="flex-1 overflow-y-auto p-6">
              <SetupWizard />
            </div>
          )}

          {/* Chat Messages */}
          {mode !== 'setup' && (
          <div ref={conversationsRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Empty State */}
            {conversations.length === 0 && !isSearching && !isStreaming && mode !== 'planner' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                  <HelpCircle className="w-12 h-12 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Ask anything</h2>
                <p className="text-zinc-400 max-w-md">
                  Search your knowledge base, explain concepts, or get implementation help.
                  Use natural language questions for best results.
                </p>

                {/* Suggested Questions - Collapsible */}
                <div className="mt-8 w-full max-w-2xl">
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
                  >
                    {showSuggestions ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>Suggested Questions</span>
                  </button>
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <SuggestedQuestions
                          currentStrand={initialStrand}
                          strandContent=""
                          onSelectQuestion={setQuestion}
                          theme="dark"
                          maxQuestions={6}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Planner Empty State */}
            {mode === 'planner' && oracle.messages.length === 0 && !oracle.isProcessing && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-full bg-violet-500/10 mb-4">
                  <CalendarCheck2 className="w-12 h-12 text-violet-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Planner Oracle</h2>
                <p className="text-zinc-400 max-w-md">
                  Ask about tasks, scheduling, or focus priorities.
                  Try "What should I focus on?" or "Add a task for tomorrow"
                </p>
              </div>
            )}

            {/* Planner Messages */}
            {mode === 'planner' && oracle.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[70%] rounded-2xl px-5 py-3
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white'
                      : 'bg-zinc-800 text-zinc-100'
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}

            {/* Conversations */}
            {mode !== 'planner' && conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {conv.isStreaming ? (
                  <div className="p-5 rounded-xl bg-zinc-800">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-300 mb-2">{conv.question}</p>
                        <div className="prose prose-sm prose-invert max-w-none">
                          <StreamingText text={conv.answer} isStreaming={true} />
                          <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnswerCard
                      question={conv.question}
                      answer={conv.answer}
                      confidence={conv.confidence}
                      sources={conv.sources}
                      timestamp={conv.timestamp}
                      theme="dark"
                      onReadAloud={(text) => handleReadAloud(conv.id, text)}
                      onStopReading={handleStopReading}
                      isSpeaking={speakingConversationId === conv.id}
                      ttsSupported={tts.isSupported}
                    />
                    {conv.sources && conv.sources.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-zinc-700">
                        <CitationsList
                          citations={conv.sources.slice(0, 5).map((source, idx) => ({
                            index: idx + 1,
                            title: source.entry?.title || 'Untitled',
                            path: source.entry?.path || '',
                            snippet: source.snippet || source.entry?.content?.slice(0, 200) || '',
                            relevance: Math.round((source.score || 0) * 100),
                          }))}
                          onOpenCitation={(path) => {
                            router.push(`/quarry/${path.replace(/\.md$/, '')}`)
                          }}
                          isDark={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading */}
            {isSearching && !isStreaming && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Input Area */}
          {mode !== 'setup' && (
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-4">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus-within:border-purple-500 transition-colors">
                <Search className="w-5 h-5 text-zinc-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    mode === 'planner'
                      ? 'Ask Oracle about tasks...'
                      : 'Ask anything about your knowledge base...'
                  }
                  disabled={isSearching || isStreaming || oracle.isProcessing}
                  className="flex-1 bg-transparent outline-none text-lg placeholder-zinc-500"
                />
                
                <button
                  type="button"
                  onClick={() => setShowVoiceInput(true)}
                  disabled={isSearching || isStreaming}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {question && (
                  <button
                    type="button"
                    onClick={() => setQuestion('')}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={abort}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim() || isSearching || oracle.isProcessing}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${question.trim() && !isSearching
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSearching || oracle.isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
          )}
        </main>
      </div>

      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          isOpen={showVoiceInput}
          onClose={() => setShowVoiceInput(false)}
          onTranscript={handleVoiceInput}
          theme="dark"
        />
      )}
    </div>
  )
}





