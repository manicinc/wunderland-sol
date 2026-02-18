'use client'

/**
 * Unified Ask Interface - The Ultimate Knowledge Discovery Experience
 * @module codex/ui/UnifiedAskInterface
 * 
 * @description
 * Consolidates QAInterface + AskTab into one SUPER ADVANCED interface:
 * - Local on-device semantic/lexical search (transformers.js)
 * - LLM-powered conversational AI (Claude, OpenAI, Ollama)
 * - Hybrid mode combining both
 * - Beautiful TUI with tabs, voice input, TTS, suggested questions
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Brain, Cpu, Send, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, Wifi, WifiOff, AlertCircle,
  ChevronDown, ChevronRight, HelpCircle, Zap, Clock, Check, Info,
  Settings2, Volume2, VolumeX, Mic, MicOff, Copy,
  ExternalLink, Search, Filter, BookOpen, Layers, FileText,
  XCircle, RefreshCw, Globe, Server, Terminal, CalendarCheck2, ListTodo
} from 'lucide-react'
import { useStream } from '@/lib/llm/useStream'
import { isLLMAvailable, llm } from '@/lib/llm'
import { useOracle, type OracleMessage } from '@/lib/planner/oracle'
import StreamingText from '../common/StreamingText'
import AskNavIcon from '../ask/AskNavIcon'
import VoiceInput from '../media/VoiceInput'
import SuggestedQuestions from './SuggestedQuestions'
import AnswerCard from './AnswerCard'
import SemanticSearchInfoPopover from '../search/SemanticSearchInfoPopover'
import QAContextSelector, { type ContextScope, type ContextFilters } from './QAContextSelector'
import {
  ContextPicker,
  FileUploadZone,
  RAGModeToggle,
  CitationsList,
  type ContextStrand,
  type UploadedFile,
} from '../ask/AskEnhancements'
import type { RAGMode } from '@/lib/ai/types'
import type { BackendStatus } from '@/lib/search/embeddingEngine'
import { SemanticSearchEngine, type SearchResult } from '@/lib/search/semanticSearch'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import { useTextToSpeech } from '../../hooks/useTextToSpeech'
import { useToast } from '../common/Toast'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import { useSelectedStrandsSafe, type SelectedStrand } from '../../contexts/SelectedStrandsContext'
import {
  useContentSourcesSafe,
  ContentSourcesProvider,
  type UnifiedStrand,
} from '../../contexts/ContentSourcesContext'
import { UnifiedStrandSelector } from '../selection/UnifiedStrandSelector'
import LearningFiltersPanel from '../learning/LearningFiltersPanel'
import { useSearchSettings } from '@/lib/search/searchSettings'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type AskMode = 'brain' | 'cloud' | 'hybrid' | 'planner'
export type SearchMode = 'semantic' | 'lexical' | 'auto'

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

export interface UnifiedAskInterfaceProps {
  isOpen: boolean
  onClose: () => void
  currentStrand?: string
  strandContent?: string
  strandTitle?: string
  theme?: string
  onSemanticStatusChange?: (status: 'ready' | 'degraded' | 'offline', message?: string) => void
  availableWeaves?: string[]
  availableLooms?: string[]
  availableTags?: string[]
  availableSubjects?: string[]
  availableTopics?: string[]
  totalStrands?: number
  /** Show expandable taxonomy filter section */
  showTaxonomyFilters?: boolean
  /** Selection count from sidebar */
  sidebarSelectionCount?: number
  /** Callback for navigating to a source/document path */
  onNavigate?: (path: string) => void
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
   MODE TAB COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface ModeTabProps {
  mode: AskMode
  onModeChange: (mode: AskMode) => void
  llmAvailable: boolean
  localReady: boolean
  localLoading: boolean
  isDark: boolean
  backendStatus: BackendStatus | null
}

function ModeTabs({
  mode,
  onModeChange,
  llmAvailable,
  localReady,
  localLoading,
  isDark,
  backendStatus,
}: ModeTabProps) {
  const tabs: { id: AskMode; label: string; icon: typeof Brain; desc: string; requiresLLM?: boolean; alwaysReady?: boolean }[] = [
    {
      id: 'brain',
      label: 'Brain',
      icon: Brain,
      desc: 'On-device semantic search',
    },
    {
      id: 'hybrid',
      label: 'Hybrid',
      icon: Sparkles,
      desc: 'Local + Cloud enhance',
      requiresLLM: true,
    },
    {
      id: 'cloud',
      label: 'Cloud AI',
      icon: Globe,
      desc: llmAvailable ? 'Claude / GPT / Ollama' : 'No API key',
      requiresLLM: true,
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: CalendarCheck2,
      desc: 'Task management',
      alwaysReady: true,
    },
  ]

  return (
    <div className={`flex rounded-lg p-0.5 gap-0.5 ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = mode === tab.id
        const isLLMDisabled = tab.requiresLLM && !llmAvailable
        const isLocalDisabled = tab.id === 'brain' && !localReady && !localLoading
        const isDisabled = isLLMDisabled || isLocalDisabled

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onModeChange(tab.id)}
            disabled={isDisabled}
            title={tab.desc}
            className={`
              relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? isDark
                  ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-600 text-white shadow-sm'
                  : 'bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 text-white shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH MODE TOGGLE
═══════════════════════════════════════════════════════════════════════════ */

interface SearchModeToggleProps {
  searchMode: SearchMode
  onSearchModeChange: (mode: SearchMode) => void
  semanticAvailable: boolean
  isDark: boolean
}

function SearchModeToggle({ searchMode, onSearchModeChange, semanticAvailable, isDark }: SearchModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Search:</span>
      <div className={`flex rounded-lg p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <button
          onClick={() => onSearchModeChange('semantic')}
          disabled={!semanticAvailable}
          className={`
            px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
            ${searchMode === 'semantic'
              ? 'bg-purple-500 text-white shadow-sm'
              : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }
            ${!semanticAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Sparkles className="w-3 h-3" />
          Semantic
        </button>
        <button
          onClick={() => onSearchModeChange('lexical')}
          className={`
            px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
            ${searchMode === 'lexical'
              ? 'bg-amber-500 text-white shadow-sm'
              : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }
          `}
        >
          <Search className="w-3 h-3" />
          Lexical
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH SENSITIVITY SLIDER
═══════════════════════════════════════════════════════════════════════════ */

interface SearchSensitivitySliderProps {
  value: number
  onChange: (value: number) => void
  isDark: boolean
}

function SearchSensitivitySlider({ value, onChange, isDark }: SearchSensitivitySliderProps) {
  // Map 0.05-0.4 threshold to 0-100 slider (inverted: low threshold = high sensitivity)
  const sliderValue = Math.round((0.4 - value) / 0.35 * 100)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSliderValue = parseInt(e.target.value)
    // Convert back: high slider = low threshold = more results
    const newThreshold = 0.4 - (newSliderValue / 100 * 0.35)
    onChange(Math.round(newThreshold * 100) / 100)
  }

  const getLabel = () => {
    if (value <= 0.08) return 'Maximum'
    if (value <= 0.15) return 'High'
    if (value <= 0.25) return 'Medium'
    if (value <= 0.35) return 'Low'
    return 'Minimum'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Search Sensitivity
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
        }`}>
          {getLabel()}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Strict</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={handleChange}
          className={`flex-1 h-2 rounded-full appearance-none cursor-pointer
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
          `}
        />
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Broad</span>
      </div>
      <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Higher sensitivity returns more results but with lower relevance. Threshold: {Math.round(value * 100)}%
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVERSATION MESSAGE
═══════════════════════════════════════════════════════════════════════════ */

interface MessageProps {
  conversation: Conversation
  isDark: boolean
  onReadAloud?: (text: string) => void
  onStopReading?: () => void
  isSpeaking?: boolean
  ttsSupported?: boolean
}

function ConversationMessage({
  conversation,
  isDark,
  onReadAloud,
  onStopReading,
  isSpeaking,
  ttsSupported,
}: MessageProps) {
  const getModeIcon = () => {
    switch (conversation.mode) {
      case 'brain': return <Brain className="w-4 h-4" />
      case 'cloud': return <Globe className="w-4 h-4" />
      case 'hybrid': return <Sparkles className="w-4 h-4" />
    }
  }
  
  const getModeColor = () => {
    switch (conversation.mode) {
      case 'brain': return 'from-purple-500 to-violet-600'
      case 'cloud': return 'from-cyan-500 to-blue-600'
      case 'hybrid': return 'from-amber-500 to-orange-600'
    }
  }

  return (
    <AnswerCard
      question={conversation.question}
      answer={conversation.answer}
      confidence={conversation.confidence}
      sources={conversation.sources}
      timestamp={conversation.timestamp}
      theme={isDark ? 'dark' : 'light'}
      onReadAloud={onReadAloud}
      onStopReading={onStopReading}
      isSpeaking={isSpeaking}
      ttsSupported={ttsSupported}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ORACLE MESSAGE BUBBLE (Planner Mode)
═══════════════════════════════════════════════════════════════════════════ */

interface OracleMessageProps {
  message: OracleMessage
  isDark: boolean
  onConfirm: () => void
  onCancel: () => void
}

function OracleMessageBubble({ message, isDark, onConfirm, onCancel }: OracleMessageProps) {
  const isUser = message.role === 'user'
  const hasAction = message.action && !message.actionResult && message.action.requiresConfirmation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-br-md'
            : isDark
              ? 'bg-zinc-800 text-zinc-100 rounded-bl-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }
        `}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Action confirmation */}
        {hasAction && (
          <div
            className={`mt-3 pt-3 border-t flex items-center gap-2 ${
              isDark ? 'border-zinc-700' : 'border-gray-200'
            }`}
          >
            {message.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing...
              </div>
            ) : (
              <>
                <button
                  onClick={onConfirm}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Confirm
                </button>
                <button
                  onClick={onCancel}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isDark
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  <XCircle className="w-3 h-3" />
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* Action result indicator */}
        {message.actionResult && (
          <div
            className={`mt-2 flex items-center gap-1 text-xs ${
              message.actionResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {message.actionResult.success ? (
              <Check className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {message.actionResult.success ? 'Done' : 'Failed'}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-[10px] mt-1 ${
            isUser ? 'text-violet-200' : isDark ? 'text-zinc-500' : 'text-gray-400'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLANNER SUGGESTIONS
═══════════════════════════════════════════════════════════════════════════ */

function PlannerSuggestions({
  isDark,
  onSuggestionClick,
}: {
  isDark: boolean
  onSuggestionClick: (text: string) => void
}) {
  const suggestions = [
    { text: "What should I focus on?", icon: ListTodo },
    { text: "Add a task 'Review emails' for today", icon: CalendarCheck2 },
    { text: "Timebox my day", icon: Clock },
    { text: "When am I free for 2 hours?", icon: Search },
  ]

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s) => {
        const Icon = s.icon
        return (
          <button
            key={s.text}
            onClick={() => onSuggestionClick(s.text)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${isDark
                ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30'
                : 'bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200'
              }
            `}
          >
            <Icon className="w-3 h-3" />
            {s.text.length > 25 ? s.text.slice(0, 25) + '...' : s.text}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function UnifiedAskInterface({
  isOpen,
  onClose,
  currentStrand,
  strandContent = '',
  strandTitle,
  theme = 'dark',
  onSemanticStatusChange,
  availableWeaves = [],
  availableLooms = [],
  availableTags = [],
  availableSubjects = [],
  availableTopics = [],
  totalStrands = 0,
  showTaxonomyFilters = true,
  sidebarSelectionCount = 0,
  onNavigate,
}: UnifiedAskInterfaceProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')

  // Mode state
  const [mode, setMode] = useState<AskMode>('brain')
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic')
  
  // Search sensitivity settings (synced with global settings)
  const { settings: searchSettings, updateSettings: updateSearchSettings } = useSearchSettings()
  const minThreshold = searchSettings.minThreshold

  // Input state
  const [question, setQuestion] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [speakingConversationId, setSpeakingConversationId] = useState<string | null>(null)

  // Semantic engine
  const [searchEngine, setSearchEngine] = useState<SemanticSearchEngine | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [localReady, setLocalReady] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [initProgress, setInitProgress] = useState<{ message: string; percent: number } | null>(null)
  const [initAttempted, setInitAttempted] = useState(false)

  // LLM state
  const [llmAvailable, setLLMAvailable] = useState(false)
  const [llmError, setLLMError] = useState<string | null>(null)

  // Context
  const [contextScope, setContextScope] = useState<ContextScope>(currentStrand ? 'current' : 'all')
  const [contextFilters, setContextFilters] = useState<ContextFilters>({})
  const [showSettings, setShowSettings] = useState(false)
  
  // Unified content sources (new feature)
  const [useUnifiedSelector, setUseUnifiedSelector] = useState(true) // Toggle for new selector UI
  const contentSources = useContentSourcesSafe()
  const [unifiedSelectedStrands, setUnifiedSelectedStrands] = useState<UnifiedStrand[]>([])

  // Taxonomy filters for Brain Oracle
  const [taxonomyFiltersExpanded, setTaxonomyFiltersExpanded] = useState(false)
  const [taxonomyFilters, setTaxonomyFilters] = useState({
    tags: [] as string[],
    subjects: [] as string[],
    topics: [] as string[],
  })
  const totalTaxonomyFilters = taxonomyFilters.tags.length + taxonomyFilters.subjects.length + taxonomyFilters.topics.length

  // Enhanced context (multi-strand picker)
  const [localSelectedStrands, setLocalSelectedStrands] = useState<ContextStrand[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [ragMode, setRagMode] = useState<RAGMode>('local')

  // Shared strand context (from sidebar selection)
  const sharedStrandsContext = useSelectedStrandsSafe()

  // Merge local and shared strands - shared strands take precedence
  const selectedStrands = useMemo(() => {
    if (!sharedStrandsContext || sharedStrandsContext.strands.length === 0) {
      return localSelectedStrands
    }
    // Convert shared strands to ContextStrand format
    const sharedAsContext: ContextStrand[] = sharedStrandsContext.strands.map(s => ({
      id: s.id,
      title: s.title,
      path: s.path,
      wordCount: s.wordCount,
    }))
    // Merge with local, avoiding duplicates
    const localIds = new Set(localSelectedStrands.map(s => s.id))
    const uniqueShared = sharedAsContext.filter(s => !localIds.has(s.id))
    return [...uniqueShared, ...localSelectedStrands]
  }, [sharedStrandsContext, localSelectedStrands])

  const hasSharedContext = sharedStrandsContext && sharedStrandsContext.strands.length > 0

  // Build RAG context from selected strands
  const ragContext = useMemo(() => {
    if (selectedStrands.length === 0 && uploadedFiles.length === 0) {
      return null
    }

    const contextParts: string[] = []

    // Add strand content/titles
    if (selectedStrands.length > 0) {
      const strandInfo = selectedStrands.map(s => {
        // Check if we have full content from shared context
        const sharedStrand = sharedStrandsContext?.strands.find(ss => ss.id === s.id)
        if (sharedStrand?.content) {
          return `## ${s.title}\n${sharedStrand.content.slice(0, 2000)}${sharedStrand.content.length > 2000 ? '...' : ''}`
        }
        return `- ${s.title} (${s.path})`
      })
      contextParts.push(`**Selected Knowledge Sources (${selectedStrands.length}):**\n${strandInfo.join('\n')}`)
    }

    // Add uploaded file content
    if (uploadedFiles.length > 0) {
      const fileInfo = uploadedFiles.map(f => {
        if (f.content) {
          return `## ${f.name}\n${f.content.slice(0, 1500)}${f.content.length > 1500 ? '...' : ''}`
        }
        return `- ${f.name} (${f.type}, ${Math.round(f.size / 1024)}KB)`
      })
      contextParts.push(`**Attached Files (${uploadedFiles.length}):**\n${fileInfo.join('\n')}`)
    }

    return contextParts.join('\n\n')
  }, [selectedStrands, uploadedFiles, sharedStrandsContext])

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationsRef = useRef<HTMLDivElement>(null)
  
  // Hooks
  const tts = useTextToSpeech()
  const toast = useToast()

  // Oracle (Planner mode)
  const oracle = useOracle({
    requireConfirmation: true,
    onActionComplete: (result) => {
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    },
  })

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'unified-ask-interface',
  })

  // LLM streaming
  const { text: streamingText, isStreaming, error: streamError, stream, abort, reset } = useStream({
    system: `You are a knowledgeable AI assistant for Quarry Codex, a knowledge management system. ${
      strandTitle ? `The user is viewing "${strandTitle}". Context:\n\n${strandContent.slice(0, 4000)}` : ''
    }`,
    onComplete: useCallback((responseText: string) => {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            answer: responseText,
            isStreaming: false,
            confidence: 0.9,
          }
        }
        return updated
      })
    }, []),
    onError: useCallback((error: string) => {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            answer: `❌ **Error:** ${error}\n\n*Check your API keys in Settings.*`,
            isStreaming: false,
            confidence: 0,
          }
        }
        return updated
      })
    }, []),
  })

  // Update streaming message
  useEffect(() => {
    if (isStreaming && streamingText) {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = { ...updated[lastIdx], answer: streamingText }
        }
        return updated
      })
    }
  }, [streamingText, isStreaming])

  // Check LLM availability
  useEffect(() => {
    const checkLLM = () => {
      const available = isLLMAvailable()
      setLLMAvailable(available)
      if (!available && (mode === 'cloud' || mode === 'hybrid')) {
        setLLMError('No API keys configured. Go to Settings → API Keys.')
      } else {
        setLLMError(null)
      }
    }
    checkLLM()
    window.addEventListener('api-keys-changed', checkLLM)
    return () => window.removeEventListener('api-keys-changed', checkLLM)
  }, [mode])

  // Initialize semantic search
  useEffect(() => {
    if (isOpen && !searchEngine && !initAttempted) {
      setInitAttempted(true)
      setLocalLoading(true)
      
      const initSearch = async () => {
        try {
          const engine = new SemanticSearchEngine('info')
          await engine.initialize(
            (status: BackendStatus) => {
              setBackendStatus(status)
              if (status.type === 'ort' || status.type === 'transformers') {
                setLocalReady(true)
                setSearchMode('semantic')
                toast.success(`Brain ready! Using ${status.type === 'ort' ? status.deviceInfo : 'Transformers.js'}`)
                onSemanticStatusChange?.('ready')
              } else {
                setSearchMode('lexical')
                onSemanticStatusChange?.('offline', status.reason)
              }
            },
            (message: string, percent?: number) => {
              setInitProgress({ message, percent: percent ?? 0 })
            }
          )
          setSearchEngine(engine)
        } catch (err) {
          console.warn('[UnifiedAsk] Semantic init failed:', err)
          setSearchMode('lexical')
          onSemanticStatusChange?.('offline', 'Model unavailable')
        } finally {
          setLocalLoading(false)
          setInitProgress(null)
        }
      }
      initSearch()
    }
  }, [isOpen, searchEngine, initAttempted, onSemanticStatusChange, toast])

  // Scroll to bottom on new messages
  useEffect(() => {
    conversationsRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [conversations])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // TTS tracking
  useEffect(() => {
    if (!tts.state.speaking && speakingConversationId) {
      setSpeakingConversationId(null)
    }
  }, [tts.state.speaking, speakingConversationId])

  /* ─────────────────────────────────────────────────────────────────────────
     HANDLERS
  ───────────────────────────────────────────────────────────────────────── */

  const handleLocalSearch = useCallback(async (q: string): Promise<Conversation> => {
    const startTime = performance.now()
    
    // Try semantic search first
    if (searchEngine && searchMode !== 'lexical') {
      try {
        // Pass minThreshold from settings to answerQuestion
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
        console.warn('[UnifiedAsk] Semantic failed, trying lexical:', err)
      }
    }
    
    // Fallback to lexical
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
        answer: `⚠️ **LLM Not Configured**\n\nNo API keys are set up. Configure at least one provider:\n\n• **OpenAI** - [platform.openai.com](https://platform.openai.com)\n• **Anthropic** - [console.anthropic.com](https://console.anthropic.com)\n• **Ollama** - [ollama.com](https://ollama.com) (free, local)\n\nGo to **Settings → API Keys** to configure.`,
        confidence: 0,
        sources: [],
        timestamp: new Date(),
        mode: 'cloud',
      }
      setConversations(prev => [errorConv, ...prev])
      return
    }

    // Add streaming placeholder
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

    // Build message history
    const history = conversations
      .filter(c => c.mode === 'cloud' || c.mode === 'hybrid')
      .slice(0, 5)
      .reverse()
      .flatMap(c => [
        { role: 'user' as const, content: c.question },
        { role: 'assistant' as const, content: c.answer },
      ])

    // Enhance prompt with RAG context if available
    const enhancedQuery = ragContext
      ? `I have the following context from my knowledge base:\n\n${ragContext}\n\n---\n\nBased on this context, please answer: ${q}`
      : q

    await stream([...history, { role: 'user', content: enhancedQuery }])
  }, [conversations, stream, llmAvailable, ragContext])

  const handleHybridSearch = useCallback(async (q: string) => {
    // First get local results
    const localResult = await handleLocalSearch(q)
    
    // If high confidence, use local
    if (localResult.confidence > 0.75) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      return
    }
    
    // Otherwise enhance with LLM
    if (!llmAvailable) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      toast.info('Local answer shown (LLM unavailable for enhancement)')
      return
    }

    // Add streaming placeholder with local context
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

    // Build enhanced prompt with local results and RAG context
    let enhancedPrompt = q

    // Add RAG context if available
    if (ragContext) {
      enhancedPrompt = `I have the following context from my knowledge base:\n\n${ragContext}\n\n---\n\n${enhancedPrompt}`
    }

    // Add local search results if confident
    if (localResult.confidence > 0.3) {
      enhancedPrompt = `Based on local search (${Math.round(localResult.confidence * 100)}% confidence): "${localResult.answer}"\n\nPlease expand on this: ${enhancedPrompt}`
    }

    await stream([{ role: 'user', content: enhancedPrompt }])
  }, [handleLocalSearch, stream, llmAvailable, toast, ragContext])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isSearching || isStreaming || oracle.isProcessing) return

    setQuestion('')

    // Handle planner mode with Oracle
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

  const handleVoiceInput = useCallback((transcript: string) => {
    setQuestion(transcript)
    setShowVoiceInput(false)
    if (transcript.trim().endsWith('?')) {
      setTimeout(() => handleSubmit(), 100)
    }
  }, [handleSubmit])

  const handleReadAloud = useCallback((id: string, text: string) => {
    setSpeakingConversationId(id)
    tts.speak(text)
  }, [tts])

  const handleStopReading = useCallback(() => {
    tts.stop()
    setSpeakingConversationId(null)
  }, [tts])

  const handleClear = useCallback(() => {
    setConversations([])
    oracle.clearMessages()
    reset()
  }, [reset, oracle])

  // Enhanced context handlers
  const handleAddStrand = useCallback((strand: ContextStrand) => {
    // Check if this is a shared strand - if so, add to shared context
    if (sharedStrandsContext) {
      const sharedStrand: SelectedStrand = {
        id: strand.id,
        path: strand.path,
        title: strand.title,
        wordCount: strand.wordCount,
      }
      sharedStrandsContext.addStrand(sharedStrand)
    } else {
      setLocalSelectedStrands(prev => [...prev, strand])
    }
  }, [sharedStrandsContext])

  const handleRemoveStrand = useCallback((strandId: string) => {
    // Remove from both contexts
    if (sharedStrandsContext) {
      sharedStrandsContext.removeStrand(strandId)
    }
    setLocalSelectedStrands(prev => prev.filter(s => s.id !== strandId))
  }, [sharedStrandsContext])

  const handleClearStrands = useCallback(() => {
    if (sharedStrandsContext) {
      sharedStrandsContext.clearAll()
    }
    setLocalSelectedStrands([])
  }, [sharedStrandsContext])

  const handleFilesAdd = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files])
  }, [])

  const handleFileRemove = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const handleClearFiles = useCallback(() => {
    setUploadedFiles([])
  }, [])

  // Build available strands from props (memoized)
  const availableStrands = useMemo((): ContextStrand[] => {
    // Combine weaves and looms into available strands for selection
    const strands: ContextStrand[] = []
    availableWeaves.forEach((weave, idx) => {
      strands.push({
        id: `weave-${idx}`,
        title: weave,
        path: `/weaves/${weave}`,
      })
    })
    availableLooms.forEach((loom, idx) => {
      strands.push({
        id: `loom-${idx}`,
        title: loom,
        path: `/looms/${loom}`,
      })
    })
    return strands
  }, [availableWeaves, availableLooms])

  if (!isOpen) return null

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {/* Backdrop - z-30 to stay below nav (z-50) */}
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 top-14 z-30 backdrop-blur-sm ${isDark ? 'bg-black/40' : 'bg-black/20'}`}
        onClick={handleBackdropClick}
      />

      {/* Panel - z-[35] to stay below nav (z-50), positioned below nav */}
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="fixed z-[35] top-16 right-3 bottom-3 w-[340px] sm:w-[360px] lg:w-[400px] max-w-[calc(100vw-24px)] flex flex-col"
      >
        <div
          ref={contentRef}
          {...modalProps}
          className={`
            relative flex flex-col h-full overflow-hidden
            rounded-xl border shadow-2xl
            ${isTerminal ? 'terminal-frame' : ''}
            ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
          `}
        >
          {/* ════════════════════════════════════════════════════════════════
             HEADER - Ultra Compact
          ════════════════════════════════════════════════════════════════ */}
          <div className={`
            shrink-0 px-2.5 py-2 border-b
            ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AskNavIcon size={22} isActive theme={isDark ? 'dark' : 'light'} />
                <h2 className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {mode === 'planner' ? 'Planner' : 'Ask'}
                </h2>
              </div>

              <div className="flex items-center gap-0.5">
                {/* Pop-out to full page - more prominent */}
                <button
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (currentStrand) params.set('strand', currentStrand)
                    if (mode) params.set('mode', mode)
                    window.open(`/quarry/ask${params.toString() ? `?${params.toString()}` : ''}`, '_blank')
                  }}
                  className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300' : 'hover:bg-cyan-100 text-cyan-600 hover:text-cyan-700'}`}
                  title="Open full Ask page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'}`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClear}
                  className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'}`}
                  title="Clear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
             MODE TABS - Ultra Compact
          ════════════════════════════════════════════════════════════════ */}
          <div className={`shrink-0 px-2 py-1 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <ModeTabs
              mode={mode}
              onModeChange={setMode}
              llmAvailable={llmAvailable}
              localReady={localReady}
              localLoading={localLoading}
              isDark={isDark}
              backendStatus={backendStatus}
            />
            
            {/* LLM Error */}
            {llmError && (mode === 'cloud' || mode === 'hybrid') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs ${
                  isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cloud AI Unavailable</p>
                  <p className="opacity-80">{llmError}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
             INIT PROGRESS - Slim bar
          ════════════════════════════════════════════════════════════════ */}
          {initProgress && (
            <div className="shrink-0 relative">
              <div className={`h-1 overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${initProgress.percent || 10}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                />
              </div>
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
                <span className={`text-[9px] font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  {initProgress.message}
                </span>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
             CONTEXT SELECTOR (hidden in planner mode) - Ultra Compact
          ════════════════════════════════════════════════════════════════ */}
          {mode !== 'planner' && (
            <div className={`shrink-0 px-2 py-1 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {/* Toggle between old and new selector */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Context Sources
                </span>
                <button
                  onClick={() => setUseUnifiedSelector(!useUnifiedSelector)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                  }`}
                  title={useUnifiedSelector ? 'Switch to classic view' : 'Switch to tabs view'}
                >
                  {useUnifiedSelector ? 'Classic' : 'Tabs'}
                </button>
              </div>

              {/* New Unified Selector with tabs */}
              {useUnifiedSelector && contentSources ? (
                <UnifiedStrandSelector
                  isDark={isDark}
                  compact={true}
                  showSearch={false}
                  maxListHeight={150}
                  showRefresh={false}
                  onSelectionChange={(strands, cacheKey) => {
                    setUnifiedSelectedStrands(strands)
                    // Map to legacy context scope for search compatibility
                    if (strands.length === 0) {
                      setContextScope('all')
                    } else if (strands.length === 1 && strands[0]?.path === currentStrand) {
                      setContextScope('current')
                    } else {
                      setContextScope('filtered')
                    }
                  }}
                />
              ) : (
                <>
                  {/* Classic Context Selector */}
                  <QAContextSelector
                    scope={contextScope}
                    onScopeChange={setContextScope}
                    filters={contextFilters}
                    onFiltersChange={setContextFilters}
                    availableWeaves={availableWeaves}
                    availableLooms={availableLooms}
                    availableTags={availableTags}
                    availableSubjects={availableSubjects}
                    availableTopics={availableTopics}
                    currentStrand={currentStrand}
                    totalStrands={totalStrands}
                  />

                  {/* Current strand indicator or no-strand message */}
                  {contextScope === 'current' && !currentStrand && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                        isDark
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-semibold">No strand selected</p>
                        <p className="opacity-80">Open a document first, or use &quot;All&quot; or &quot;Filter&quot; to search across your knowledge base.</p>
                      </div>
                    </motion.div>
                  )}

                  {contextScope === 'current' && currentStrand && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`mt-2 text-xs flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate font-medium">{strandTitle || currentStrand}</span>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
             TAXONOMY FILTERS - Hidden in modal, available in full page
          ════════════════════════════════════════════════════════════════ */}
          {/* Taxonomy filters removed from compact modal - use pop-out for full experience */}

          {/* ════════════════════════════════════════════════════════════════
             ADVANCED SETTINGS (collapsible)
          ════════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`shrink-0 overflow-hidden border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}
              >
                <div className="p-4 space-y-4">
                  {/* Search Mode Toggle */}
                  {mode === 'brain' && (
                    <SearchModeToggle
                      searchMode={searchMode}
                      onSearchModeChange={setSearchMode}
                      semanticAvailable={!!searchEngine}
                      isDark={isDark}
                    />
                  )}

                  {/* RAG Mode Toggle (for brain and hybrid modes) */}
                  {(mode === 'brain' || mode === 'hybrid') && (
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Answer Mode:
                      </span>
                      <RAGModeToggle
                        mode={ragMode}
                        onModeChange={setRagMode}
                        isDark={isDark}
                        isAvailable={llmAvailable}
                      />
                    </div>
                  )}

                  {/* Search Sensitivity Slider (for brain and hybrid modes) */}
                  {(mode === 'brain' || mode === 'hybrid') && (
                    <SearchSensitivitySlider
                      value={minThreshold}
                      onChange={(val) => updateSearchSettings({ minThreshold: val })}
                      isDark={isDark}
                    />
                  )}

                  {/* Help Section */}
                  <details className={`rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                    <summary className={`cursor-pointer px-3 py-2 text-xs font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <HelpCircle className="w-3.5 h-3.5" />
                      How Ask Works
                    </summary>
                    <div className={`px-3 pb-3 pt-1 text-xs space-y-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <p><strong>Current:</strong> Ask questions about the currently open document only.</p>
                      <p><strong>All:</strong> Search your entire knowledge base ({totalStrands} strands).</p>
                      <p><strong>Filter:</strong> Select specific weaves, looms, or tags to narrow your search.</p>
                      <p className="pt-1 border-t border-zinc-700/30">
                        <strong>Tip:</strong> Use filters when you want to ask about a specific topic area without searching everything.
                      </p>
                    </div>
                  </details>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════════════════════════════════════════════════════
             INPUT - Ultra compact with suggestions ABOVE input
          ════════════════════════════════════════════════════════════════ */}
          <div className={`shrink-0 px-2 py-1.5 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            {/* Suggested Questions FIRST - above input */}
            {mode === 'planner' ? (
              <PlannerSuggestions
                isDark={isDark}
                onSuggestionClick={setQuestion}
              />
            ) : (
              <SuggestedQuestions
                currentStrand={currentStrand}
                strandContent={strandContent}
                onSelectQuestion={setQuestion}
                theme={theme}
                maxQuestions={4}
              />
            )}

            {/* Input form - compact */}
            <form onSubmit={handleSubmit} className="mt-2">
              <div className={`
                flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all
                ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                ${isSearching || isStreaming || oracle.isProcessing ? 'ring-1 ring-purple-500' : ''}
              `}>
                {mode === 'planner' ? (
                  <Sparkles className={`w-4 h-4 ${isDark ? 'text-violet-500' : 'text-violet-400'}`} />
                ) : (
                  <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    mode === 'planner'
                      ? 'Ask Oracle...'
                      : mode === 'brain'
                        ? 'Ask (on-device)...'
                        : mode === 'cloud'
                          ? 'Ask Cloud AI...'
                          : 'Ask anything...'
                  }
                  disabled={isSearching || isStreaming || oracle.isProcessing}
                  className={`flex-1 bg-transparent outline-none text-base ${isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'}`}
                  style={{ fontSize: '16px' }}
                />

                {/* Voice - touch optimized */}
                <button
                  type="button"
                  onClick={() => setShowVoiceInput(true)}
                  disabled={isSearching || isStreaming || oracle.isProcessing}
                  className={`p-2 sm:p-1.5 rounded-lg sm:rounded transition-colors touch-manipulation ${isDark ? 'hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500'}`}
                >
                  <Mic className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Clear - touch optimized */}
                {question && (
                  <button
                    type="button"
                    onClick={() => setQuestion('')}
                    className={`p-2 sm:p-1.5 rounded-lg sm:rounded transition-colors touch-manipulation ${isDark ? 'hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500'}`}
                  >
                    <XCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}

                {/* Submit / Stop - visible on mobile */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={abort}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim() || isSearching || oracle.isProcessing}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all
                      ${question.trim() && !isSearching && !oracle.isProcessing
                        ? mode === 'planner'
                          ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm'
                          : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-sm'
                        : isDark
                          ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                          : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSearching || oracle.isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden xs:inline">Send</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ════════════════════════════════════════════════════════════════
             CONVERSATIONS / PLANNER MESSAGES - Scrollable area
          ════════════════════════════════════════════════════════════════ */}
          <div ref={conversationsRef} className="flex-1 min-h-[120px] overflow-y-auto px-2 py-1.5 space-y-2">
            {/* Planner Mode - Oracle Messages */}
            {mode === 'planner' ? (
              <>
                <AnimatePresence>
                  {oracle.messages.map((msg) => (
                    <OracleMessageBubble
                      key={msg.id}
                      message={msg}
                      isDark={isDark}
                      onConfirm={() => oracle.confirmAction(msg.id)}
                      onCancel={() => oracle.cancelAction(msg.id)}
                    />
                  ))}
                </AnimatePresence>

                {/* Planner Empty State - Compact */}
                {oracle.messages.length === 0 && !oracle.isProcessing && (
                  <div className="text-center py-4">
                    <div className={`inline-flex p-2 rounded-full mb-2 ${isDark ? 'bg-violet-500/10' : 'bg-violet-100'}`}>
                      <CalendarCheck2 className="w-6 h-6 text-violet-500" />
                    </div>
                    <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Planner Oracle
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Ask about tasks, scheduling, or focus priorities
                    </p>
                  </div>
                )}

                {/* Planner Loading State */}
                {oracle.isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4"
                  >
                    <div className="inline-flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                      <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Thinking...
                      </span>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <>
                {/* Other Modes - Regular Conversations */}
                <AnimatePresence>
                  {conversations.map((conv, idx) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.2) }}
                    >
                      {conv.isStreaming ? (
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                              <Globe className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                {conv.question}
                              </p>
                              <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                                <StreamingText text={conv.answer} isStreaming={true} />
                                <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <ConversationMessage
                            conversation={conv}
                            isDark={isDark}
                            onReadAloud={(text) => handleReadAloud(conv.id, text)}
                            onStopReading={handleStopReading}
                            isSpeaking={speakingConversationId === conv.id}
                            ttsSupported={tts.isSupported}
                          />
                          {/* Citations list for sources */}
                          {conv.sources && conv.sources.length > 0 && (
                            <div className={`ml-4 pl-4 border-l-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                              <CitationsList
                                citations={conv.sources.slice(0, 5).map((source, idx) => ({
                                  index: idx + 1,
                                  title: source.entry?.title || 'Untitled',
                                  path: source.entry?.path || '',
                                  snippet: source.snippet || source.entry?.content?.slice(0, 200) || '',
                                  relevance: Math.round((source.score || 0) * 100),
                                }))}
                                onOpenCitation={(path) => {
                                  if (onNavigate) {
                                    onNavigate(path)
                                    onClose()
                                  } else {
                                    toast.info(`Opening: ${path}`)
                                  }
                                }}
                                isDark={isDark}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State - Compact */}
                {conversations.length === 0 && !isSearching && !isStreaming && (
                  <div className="text-center py-4">
                    <div className={`inline-flex p-2 rounded-full mb-2 ${isDark ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
                      <HelpCircle className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Ask anything
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Search docs, explain concepts, or get implementation help
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Loading State */}
            {isSearching && !isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className={`mt-4 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Searching the knowledge fabric...
                </p>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
             FOOTER - Minimal
          ════════════════════════════════════════════════════════════════ */}
          <div className={`
            shrink-0 px-2 py-1 border-t
            ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
          `}>
            <div className="flex items-center justify-between text-[9px]">
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                {mode === 'planner' ? 'Oracle' : `${totalStrands} strands`}
              </span>
              <span className={isDark ? 'text-zinc-600' : 'text-zinc-400'}>
                {mode === 'planner' ? '' : 'Ask "how" or "why" for best results'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          isOpen={showVoiceInput}
          onClose={() => setShowVoiceInput(false)}
          onTranscript={handleVoiceInput}
          theme={theme}
        />
      )}
    </AnimatePresence>
  )
}

