'use client'

/**
 * Ask Tab - Unified AI Knowledge Discovery Interface
 * @module codex/ui/AskTab
 * 
 * @description
 * The standout feature of Quarry Codex - a unified interface for asking questions
 * about your knowledge base. Consolidates:
 * - Local on-device Q&A (semantic search via transformers.js)
 * - LLM-powered conversational AI (Claude, OpenAI)
 * - Brain questionnaire integration
 * 
 * Uses local model by DEFAULT for privacy and speed, with LLM as optional enhancement.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Brain, Cpu, Send, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, Wifi, WifiOff, AlertCircle,
  ChevronDown, HelpCircle, Zap, Clock, Check, Info,
  Settings2, Volume2, VolumeX, Mic, MicOff, Copy,
  ExternalLink, Search, Filter, BookOpen, Layers,
} from 'lucide-react'
import { useStream } from '@/lib/llm/useStream'
import StreamingText from '../common/StreamingText'
import AskNavIcon from './AskNavIcon'
import VoiceInput from '../media/VoiceInput'
import SuggestedQuestions from '../qa/SuggestedQuestions'
import AnswerCard from '../qa/AnswerCard'
import type { BackendStatus } from '@/lib/search/embeddingEngine'
import { SemanticSearchEngine, type SearchResult } from '@/lib/search/semanticSearch'
import { isLLMAvailable, llm } from '@/lib/llm'
import { useTextToSpeech } from '../../hooks/useTextToSpeech'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type AskMode = 'local' | 'llm' | 'hybrid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode: AskMode
  usage?: { tokens: number }
  score?: number // For local Q&A confidence
  latency?: number // Response time in ms
  sources?: SearchResult[] // Semantic search sources
}

interface LocalQAResult {
  answer: string
  score: number
  start: number
  end: number
}

export interface AskTabProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Current strand content for context */
  strandContent?: string
  /** Current strand title */
  strandTitle?: string
  /** Current strand path */
  strandPath?: string
  /** Theme */
  theme?: 'light' | 'dark'
  /** Default mode - local is the default for privacy */
  defaultMode?: AskMode
  /** Custom system prompt for LLM mode */
  systemPrompt?: string
  /** Available weaves for filtering */
  availableWeaves?: string[]
  /** Available tags for filtering */
  availableTags?: string[]
  /** Total strands in knowledge base */
  totalStrands?: number
  /** Callback when semantic status changes */
  onSemanticStatusChange?: (status: 'ready' | 'degraded' | 'offline', message?: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return `ask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Dynamically import transformers.js Q&A
let qaPromise: Promise<any> | null = null
async function getLocalQA() {
  if (typeof window === 'undefined') return null

  if (!qaPromise) {
    qaPromise = import('@huggingface/transformers').then(async (mod) => {
      const { pipeline, env } = mod
      env.allowLocalModels = false
      env.useBrowserCache = true
      return pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad')
    })
  }

  return qaPromise
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODE SELECTOR
═══════════════════════════════════════════════════════════════════════════ */

interface ModeSelectorProps {
  mode: AskMode
  onModeChange: (mode: AskMode) => void
  localReady: boolean
  localLoading: boolean
  isDark: boolean
  backendStatus?: BackendStatus | null
  llmAvailable: boolean
  llmError?: string | null
}

function ModeSelector({ 
  mode, 
  onModeChange, 
  localReady, 
  localLoading,
  isDark,
  backendStatus,
  llmAvailable,
  llmError,
}: ModeSelectorProps) {
  const modes: { id: AskMode; label: string; sublabel: string; icon: typeof Brain; requiresLLM?: boolean }[] = [
    { 
      id: 'local', 
      label: 'Local', 
      sublabel: 'On-device, private',
      icon: Cpu,
    },
    { 
      id: 'hybrid', 
      label: 'Hybrid', 
      sublabel: 'Local + LLM enhance',
      icon: Sparkles,
      requiresLLM: true,
    },
    { 
      id: 'llm', 
      label: 'Cloud', 
      sublabel: llmAvailable ? 'Full LLM power' : 'No API key set',
      icon: Brain,
      requiresLLM: true,
    },
  ]

  return (
    <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
      <div className={`flex gap-0.5 p-0.5 rounded-lg sm:rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
        {modes.map((m) => {
          const Icon = m.icon
          const isActive = mode === m.id
          const isLocalDisabled = m.id === 'local' && !localReady && !localLoading
          const isLLMDisabled = m.requiresLLM && !llmAvailable
          const isDisabled = isLocalDisabled || isLLMDisabled

          return (
            <button
              key={m.id}
              onClick={() => !isDisabled && onModeChange(m.id)}
              disabled={isDisabled}
              title={isLLMDisabled ? 'Configure API keys in Settings to enable' : undefined}
              className={`relative flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 md:py-2 px-1.5 sm:px-2 md:px-3 rounded-md sm:rounded-lg transition-all ${
                isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isActive
                  ? isDark
                    ? 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-lg'
                    : 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-md'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold">{m.label}</span>

              {/* Status indicator */}
              {m.id === 'local' && (
                <span className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  localReady
                    ? 'bg-emerald-400'
                    : localLoading
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-zinc-400'
                }`} />
              )}
              {m.requiresLLM && (
                <span className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  llmAvailable
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
                }`} />
              )}
            </button>
          )
        })}
      </div>

      {/* LLM Error Banner - Hidden on mobile */}
      {llmError && (mode === 'llm' || mode === 'hybrid') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`hidden sm:flex items-start gap-2 p-2 sm:p-3 rounded-lg text-xs ${
            isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">LLM Not Configured</p>
            <p className="opacity-80 mt-0.5">{llmError}</p>
          </div>
        </motion.div>
      )}

      {/* Local AI Setup Help - Hidden on mobile */}
      {mode === 'local' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`hidden sm:flex items-start gap-2 p-2 sm:p-3 rounded-lg text-xs ${
            isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
          }`}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Local AI - Private & Offline</p>
            <p className="opacity-80">
              Uses on-device AI via Transformers.js. No data leaves your browser.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function AskMessage({
  message,
  isStreaming,
  isDark,
  onAbort,
  onCopy,
}: {
  message: Message
  isStreaming?: boolean
  isDark: boolean
  onAbort?: () => void
  onCopy?: (text: string) => void
}) {
  const isUser = message.role === 'user'

  const getModeIcon = () => {
    switch (message.mode) {
      case 'local': return <Cpu className="w-4 h-4 text-white" />
      case 'llm': return <Brain className="w-4 h-4 text-white" />
      case 'hybrid': return <Sparkles className="w-4 h-4 text-white" />
    }
  }

  const getModeColor = () => {
    switch (message.mode) {
      case 'local': return isDark ? 'bg-purple-600' : 'bg-purple-500'
      case 'llm': return isDark ? 'bg-emerald-600' : 'bg-emerald-500'
      case 'hybrid': return isDark ? 'bg-gradient-to-br from-purple-600 to-emerald-600' : 'bg-gradient-to-br from-purple-500 to-emerald-500'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-1.5 sm:gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar - Smaller on mobile */}
      <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-md sm:rounded-lg flex items-center justify-center ${
        isUser
          ? isDark ? 'bg-blue-600' : 'bg-blue-500'
          : getModeColor()
      }`}>
        {isUser ? (
          <HelpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-white" />
        ) : (
          <span className="[&>svg]:w-2.5 [&>svg]:h-2.5 sm:[&>svg]:w-3 sm:[&>svg]:h-3 md:[&>svg]:w-4 md:[&>svg]:h-4">{getModeIcon()}</span>
        )}
      </div>

      {/* Content - Tighter on mobile */}
      <div className={`flex-1 max-w-[92%] sm:max-w-[90%] md:max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 ${
          isUser
            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            : isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
        }`}>
          {isUser ? (
            <p className="text-[13px] sm:text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <StreamingText
              text={message.content}
              isStreaming={isStreaming || false}
              theme={isDark ? 'dark' : 'light'}
              onAbort={onAbort}
              showCopy={!isStreaming}
              markdown={message.mode !== 'local'}
              className="text-[13px] sm:text-sm"
            />
          )}
        </div>

        {/* Meta info - Compact on mobile */}
        <div className={`mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        } ${isUser ? 'justify-end' : ''}`}>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {message.mode === 'local' && message.score !== undefined && (
            <span className={`flex items-center gap-0.5 ${
              message.score > 0.7 ? 'text-emerald-500' : message.score > 0.4 ? 'text-yellow-500' : 'text-red-400'
            }`}>
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {Math.round(message.score * 100)}%
            </span>
          )}

          {message.latency && (
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {message.latency}ms
            </span>
          )}

          {message.usage?.tokens && (
            <span className="hidden sm:inline">{message.usage.tokens} tokens</span>
          )}

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-500">
              <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {message.sources.length}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK ACTIONS
═══════════════════════════════════════════════════════════════════════════ */

interface QuickActionsProps {
  isDark: boolean
  strandTitle?: string
  onAsk: (question: string) => void
}

function QuickActions({ isDark, strandTitle, onAsk }: QuickActionsProps) {
  const suggestions = useMemo(() => {
    const base = [
      { label: 'Summarize', query: 'What are the key points?', icon: Layers },
      { label: 'Explain', query: 'Explain this in simple terms', icon: MessageSquare },
      { label: 'Key Terms', query: 'What are the important terms and concepts?', icon: BookOpen },
    ]
    
    if (strandTitle) {
      base.unshift({
        label: `About "${strandTitle}"`,
        query: `What is ${strandTitle} about?`,
        icon: Search,
      })
    }
    
    return base.slice(0, 4)
  }, [strandTitle])

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => {
        const Icon = s.icon
        return (
          <button
            key={s.label}
            onClick={() => onAsk(s.query)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200'
            }`}
          >
            <Icon className="w-3 h-3" />
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AskTab({
  isOpen,
  onClose,
  strandContent = '',
  strandTitle,
  strandPath,
  theme = 'dark',
  defaultMode = 'local', // Local is default for privacy
  systemPrompt,
  availableWeaves = [],
  availableTags = [],
  totalStrands = 0,
  onSemanticStatusChange,
}: AskTabProps) {
  const isDark = theme === 'dark'
  const [mode, setMode] = useState<AskMode>(defaultMode)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [localModelReady, setLocalModelReady] = useState(false)
  const [localModelLoading, setLocalModelLoading] = useState(false)
  const [localProcessing, setLocalProcessing] = useState(false)
  const [semanticEngine, setSemanticEngine] = useState<SemanticSearchEngine | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [llmAvailable, setLLMAvailable] = useState(false)
  const [llmError, setLLMError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Text-to-Speech for reading answers
  const tts = useTextToSpeech()

  // Check LLM availability on mount
  useEffect(() => {
    const checkLLMAvailability = () => {
      const available = isLLMAvailable()
      setLLMAvailable(available)
      
      if (!available && (mode === 'llm' || mode === 'hybrid')) {
        setLLMError('No API keys configured. Go to Settings → API Keys to add your OpenAI, Anthropic, or Ollama configuration.')
        // Fall back to local mode
        setMode('local')
      } else {
        setLLMError(null)
      }
    }
    
    checkLLMAvailability()
    
    // Listen for API key changes
    const handleKeyChange = () => checkLLMAvailability()
    window.addEventListener('api-keys-changed', handleKeyChange)
    return () => window.removeEventListener('api-keys-changed', handleKeyChange)
  }, [mode])

  // LLM streaming
  const { text, isStreaming, error, usage, stream, abort, reset } = useStream({
    system: systemPrompt || `You are a helpful AI assistant for a knowledge management system called Quarry Codex. ${
      strandTitle ? `The user is viewing "${strandTitle}". Use this context:\n\n${strandContent.slice(0, 4000)}` : ''
    }`,
    onComplete: useCallback((responseText: string, responseUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => {
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: responseText,
            usage: responseUsage?.totalTokens ? { tokens: responseUsage.totalTokens } : undefined,
          }
        }
        return updated
      })
    }, []),
  })

  // Update streaming message
  useEffect(() => {
    if (isStreaming && text) {
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant' && (updated[lastIdx]?.mode === 'llm' || updated[lastIdx]?.mode === 'hybrid')) {
          updated[lastIdx] = { ...updated[lastIdx], content: text }
        }
        return updated
      })
    }
  }, [text, isStreaming])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, text])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // Initialize semantic search engine
  useEffect(() => {
    if (isOpen && !semanticEngine && (mode === 'local' || mode === 'hybrid')) {
      const initEngine = async () => {
        setLocalModelLoading(true)
        try {
          const engine = new SemanticSearchEngine('info')
          await engine.initialize(
            (status: BackendStatus) => {
              setBackendStatus(status)
              if (status.type === 'ort' || status.type === 'transformers') {
                setLocalModelReady(true)
                onSemanticStatusChange?.('ready')
              } else {
                onSemanticStatusChange?.('offline', status.reason)
              }
            }
          )
          setSemanticEngine(engine)
        } catch (err) {
          console.warn('[AskTab] Semantic engine init failed:', err)
          onSemanticStatusChange?.('offline', 'Model unavailable')
        } finally {
          setLocalModelLoading(false)
        }
      }
      initEngine()
    }
  }, [isOpen, semanticEngine, mode, onSemanticStatusChange])

  // Handle local Q&A send
  const handleLocalSend = useCallback(async (question: string): Promise<Message> => {
    const startTime = performance.now()
    
    // Try semantic search first if available
    if (semanticEngine) {
      try {
        const result = await semanticEngine.answerQuestion(question)
        const latency = Math.round(performance.now() - startTime)
        
        return {
          id: generateId(),
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
          mode: 'local',
          score: result.confidence,
          latency,
          sources: result.sources,
        }
      } catch (err) {
        console.warn('[AskTab] Semantic search failed, falling back to Q&A pipeline:', err)
      }
    }
    
    // Fallback to distilbert Q&A pipeline
    if (!strandContent) {
      return {
        id: generateId(),
        role: 'assistant',
        content: 'No document content available. Please open a strand first.',
        timestamp: new Date(),
        mode: 'local',
        score: 0,
      }
    }

    try {
      const qaPipeline = await getLocalQA()
      if (!qaPipeline) throw new Error('Local model not available')

      const result = await qaPipeline(question, strandContent) as LocalQAResult
      const latency = Math.round(performance.now() - startTime)

      return {
        id: generateId(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        mode: 'local',
        score: result.score,
        latency,
      }
    } catch (err) {
      return {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Local Q&A failed'}`,
        timestamp: new Date(),
        mode: 'local',
        score: 0,
      }
    }
  }, [strandContent, semanticEngine])

  // Handle LLM send
  const handleLLMSend = useCallback(async (question: string) => {
    // Check if LLM is available
    if (!llmAvailable) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ **LLM Not Configured**

No API keys are set up. To use Cloud AI mode, please configure at least one provider:

1. **OpenAI** - Get an API key at [platform.openai.com](https://platform.openai.com)
2. **Anthropic Claude** - Get an API key at [console.anthropic.com](https://console.anthropic.com)
3. **Ollama** - Run locally at [ollama.com](https://ollama.com) (free, no API key needed)

Go to **Settings → API Keys** to add your configuration.

*Tip: Use **Local** mode for private, on-device Q&A that works without any configuration!*`,
        timestamp: new Date(),
        mode: 'llm',
        score: 0,
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }
    
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: mode === 'hybrid' ? 'hybrid' : 'llm',
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      const apiMessages = [...messages.filter(m => m.mode === 'llm' || m.mode === 'hybrid'), { role: 'user' as const, content: question }].map(m => ({
        role: m.role,
        content: m.content,
      }))

      await stream(apiMessages)
    } catch (err) {
      // Update the message with the error
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant') {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `❌ **LLM Error**

${errorMsg}

**Troubleshooting:**
- Check your API key is valid and has credits
- Verify your internet connection
- For Ollama, ensure the server is running at the configured URL

*Try **Local** mode for offline Q&A!*`,
          }
        }
        return updated
      })
    }
  }, [messages, stream, mode, llmAvailable])

  // Handle send
  const handleSend = useCallback(async (questionOverride?: string) => {
    const trimmedInput = (questionOverride || input).trim()
    if (!trimmedInput) return
    if (isStreaming || localProcessing) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
      mode,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    if (mode === 'local') {
      setLocalProcessing(true)
      const response = await handleLocalSend(trimmedInput)
      setMessages(prev => [...prev, response])
      setLocalProcessing(false)
    } else if (mode === 'llm') {
      await handleLLMSend(trimmedInput)
    } else if (mode === 'hybrid') {
      // Hybrid: Get local answer first, then enhance with LLM
      setLocalProcessing(true)
      const localResponse = await handleLocalSend(trimmedInput)
      setLocalProcessing(false)
      
      // If local has good confidence, use it. Otherwise, enhance with LLM
      if (localResponse.score && localResponse.score > 0.7) {
        setMessages(prev => [...prev, localResponse])
      } else {
        // Enhance with LLM, including local context
        const enhancedPrompt = localResponse.content && localResponse.score && localResponse.score > 0.3
          ? `Based on local search (confidence: ${Math.round(localResponse.score * 100)}%): "${localResponse.content}"\n\nPlease expand on this or correct if needed: ${trimmedInput}`
          : trimmedInput
        
        await handleLLMSend(enhancedPrompt)
      }
    }
  }, [input, mode, isStreaming, localProcessing, handleLocalSend, handleLLMSend])

  // Key handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Clear messages
  const handleClear = useCallback(() => {
    setMessages([])
    reset()
  }, [reset])

  // Handle voice input
  const handleVoiceInput = useCallback((transcript: string) => {
    setInput(transcript)
    setShowVoiceInput(false)
    // Auto-submit if it ends with a question mark
    if (transcript.trim().endsWith('?')) {
      handleSend(transcript)
    }
  }, [handleSend])

  const isProcessing = isStreaming || localProcessing

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className={`fixed inset-0 sm:inset-2 md:inset-auto md:right-4 md:bottom-4 md:w-[480px] md:h-[680px] z-50 flex flex-col rounded-none sm:rounded-2xl shadow-2xl overflow-hidden ${
        isDark
          ? 'bg-zinc-900 border border-zinc-700'
          : 'bg-white border border-zinc-200'
      }`}
    >
      {/* Header - Compact on mobile */}
      <div className={`flex items-center justify-between px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border-b ${
        isDark ? 'border-zinc-700 bg-gradient-to-r from-zinc-900 to-zinc-800' : 'border-zinc-200 bg-gradient-to-r from-zinc-50 to-white'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <AskNavIcon
            size={24}
            isActive={true}
            theme={isDark ? 'dark' : 'light'}
            className="sm:w-9 sm:h-9"
          />
          <div>
            <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Ask Codex
            </h3>
            <p className={`hidden sm:block text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {mode === 'local' && (localModelReady ? 'Private on-device AI' : localModelLoading ? 'Loading model...' : 'Initializing...')}
              {mode === 'llm' && 'Cloud AI powered'}
              {mode === 'hybrid' && 'Local + Cloud enhanced'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Selector - Compact on mobile */}
      <div className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
        <ModeSelector
          mode={mode}
          onModeChange={setMode}
          localReady={localModelReady}
          localLoading={localModelLoading}
          isDark={isDark}
          backendStatus={backendStatus}
          llmAvailable={llmAvailable}
          llmError={llmError}
        />
      </div>

      {/* Settings Panel (collapsible) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 py-3 border-b overflow-hidden ${
              isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-100 bg-zinc-50'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Context
                </span>
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {strandTitle || 'No strand selected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Knowledge Base
                </span>
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {totalStrands} strands
                </span>
              </div>
              {backendStatus && (
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Model Backend
                  </span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {backendStatus.type === 'ort' ? `ONNX (${backendStatus.deviceInfo})` : 
                     backendStatus.type === 'transformers' ? 'Transformers.js' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages - Compact on mobile */}
      <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 md:p-4 space-y-1.5 sm:space-y-2 md:space-y-3">
        {messages.length === 0 ? (
          <div className={`py-2 sm:py-3 md:py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <div className="text-center mb-2 sm:mb-3 md:mb-6">
              <div className="mb-1.5 sm:mb-2 md:mb-4 flex justify-center">
                <AskNavIcon
                  size={32}
                  isActive={false}
                  theme={isDark ? 'dark' : 'light'}
                  className="sm:w-12 sm:h-12 md:w-16 md:h-16"
                />
              </div>
              <h4 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Ask anything
              </h4>
              <p className="hidden sm:block text-sm mb-2">
                {mode === 'local'
                  ? 'Private, on-device AI. Your questions never leave your device.'
                  : mode === 'hybrid'
                    ? 'Best of both: local speed with cloud intelligence.'
                    : llmAvailable
                      ? 'Full cloud AI for complex questions.'
                      : '⚠️ Configure API keys in Settings to use Cloud AI.'}
              </p>

              {/* Mode-specific info - Compact on mobile */}
              <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {mode === 'local' && <Cpu className="w-3 h-3" />}
                {mode === 'llm' && <Brain className="w-3 h-3" />}
                {mode === 'hybrid' && <Sparkles className="w-3 h-3" />}
                <span className="hidden sm:inline">
                  {mode === 'local' && 'Transformers.js Embeddings'}
                  {mode === 'llm' && (llmAvailable ? 'Claude / GPT-4 / Ollama' : 'No providers configured')}
                  {mode === 'hybrid' && 'Local → Cloud Enhancement'}
                </span>
                <span className="sm:hidden">
                  {mode === 'local' && 'Local AI'}
                  {mode === 'llm' && 'Cloud AI'}
                  {mode === 'hybrid' && 'Hybrid'}
                </span>
              </div>
            </div>

            {/* Suggested Questions - NLP generated from content */}
            {strandContent && (
              <SuggestedQuestions
                currentStrand={strandPath}
                strandContent={strandContent}
                onSelectQuestion={(q) => handleSend(q)}
                theme={isDark ? 'dark' : 'light'}
                maxQuestions={3}
              />
            )}

            {/* Quick actions fallback */}
            {!strandContent && (
              <QuickActions
                isDark={isDark}
                strandTitle={strandTitle}
                onAsk={(q) => handleSend(q)}
              />
            )}
          </div>
        ) : (
          messages.map((message, idx) => (
            <AskMessage
              key={message.id}
              message={message}
              isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
              isDark={isDark}
              onAbort={abort}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          isOpen={showVoiceInput}
          onClose={() => setShowVoiceInput(false)}
          onTranscript={handleVoiceInput}
          theme={isDark ? 'dark' : 'light'}
        />
      )}

      {/* Input - Compact on mobile */}
      <div className={`p-1.5 sm:p-2 md:p-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        <div className={`flex items-end gap-1 sm:gap-1.5 md:gap-2 rounded-lg sm:rounded-xl p-1 sm:p-1.5 md:p-2 ${
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isProcessing
                ? 'Processing...'
                : mode === 'local'
                  ? 'Ask privately...'
                  : 'Ask anything...'
            }
            disabled={isProcessing}
            rows={1}
            className={`flex-1 resize-none bg-transparent outline-none text-base py-1.5 sm:py-2 px-2 max-h-24 sm:max-h-32 ${
              isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
            }`}
            style={{ minHeight: '32px', fontSize: '16px' }}
          />

          {/* Voice Input Button - Smaller on mobile */}
          <button
            onClick={() => setShowVoiceInput(true)}
            disabled={isProcessing}
            className={`p-1.5 sm:p-2 md:p-2.5 rounded-md sm:rounded-lg transition-colors ${
              isProcessing
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-violet-400'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-violet-600'
            }`}
            title="Voice input"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {isProcessing ? (
            <button
              onClick={mode !== 'local' ? abort : undefined}
              disabled={mode === 'local'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                mode !== 'local'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-400'
              }`}
            >
              {mode === 'local' ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <>
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs font-medium">Stop</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                input.trim()
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-500'
                    : 'bg-zinc-200 text-zinc-400'
              }`}
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs font-medium">Send</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}



