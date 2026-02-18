'use client'

/**
 * Ask Panel - Tabulated AI Interface
 *
 * Unified interface for asking questions with two modes:
 * - LLM (Cloud): Full conversational AI with streaming
 * - Local (Offline): On-device Q&A with transformers.js
 *
 * @module codex/ui/AskPanel
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Brain, Cpu, Send, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, Wifi, WifiOff, AlertCircle,
  ChevronDown, HelpCircle, Zap, Clock, Check, Info,
  Wand2, Tags, FolderTree, Link2, FileText, MapPin, Calendar
} from 'lucide-react'
import { useStream } from '@/lib/llm/useStream'
import { useOracle } from '@/lib/planner/oracle'
import StreamingText from '../common/StreamingText'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type AskMode = 'llm' | 'local' | 'enrich'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode: AskMode
  usage?: { tokens: number }
  score?: number // For local Q&A confidence
  latency?: number // Response time in ms
}

interface LocalQAResult {
  answer: string
  score: number
  start: number
  end: number
}

export interface AskPanelProps {
  isOpen: boolean
  onClose: () => void
  strandContent?: string
  strandTitle?: string
  /** Full path to the current strand (for enrichment context) */
  strandPath?: string
  theme?: 'light' | 'dark'
  defaultMode?: AskMode
  /** Custom system prompt for LLM mode */
  systemPrompt?: string
  /** Callback when an enrichment action is completed */
  onEnrichmentComplete?: () => void
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
   TAB COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TabProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  sublabel: string
  isDark: boolean
  disabled?: boolean
}

function Tab({ active, onClick, icon, label, sublabel, isDark, disabled }: TabProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        active
          ? isDark
            ? 'bg-zinc-800 text-white'
            : 'bg-white text-zinc-900 shadow-sm'
          : isDark
            ? 'text-zinc-400 hover:text-zinc-200'
            : 'text-zinc-500 hover:text-zinc-700'
      }`}
    >
      {active && (
        <motion.div
          layoutId="ask-tab-indicator"
          className={`absolute inset-0 rounded-xl ${
            isDark
              ? 'bg-gradient-to-r from-zinc-800 to-zinc-700 border border-zinc-600'
              : 'bg-white border border-zinc-200 shadow-sm'
          }`}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        <span className="flex flex-col items-start">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {sublabel}
          </span>
        </span>
      </span>
    </button>
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
}: {
  message: Message
  isStreaming?: boolean
  isDark: boolean
  onAbort?: () => void
}) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser
          ? isDark ? 'bg-blue-600' : 'bg-blue-500'
          : message.mode === 'llm'
            ? isDark ? 'bg-emerald-600' : 'bg-emerald-500'
            : isDark ? 'bg-purple-600' : 'bg-purple-500'
      }`}>
        {isUser ? (
          <HelpCircle className="w-4 h-4 text-white" />
        ) : message.mode === 'llm' ? (
          <Brain className="w-4 h-4 text-white" />
        ) : (
          <Cpu className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 ${
          isUser
            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            : isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <StreamingText
              text={message.content}
              isStreaming={isStreaming || false}
              theme={isDark ? 'dark' : 'light'}
              onAbort={onAbort}
              showCopy={!isStreaming}
              markdown={message.mode === 'llm'}
              className="text-sm"
            />
          )}
        </div>

        {/* Meta info */}
        <div className={`mt-1 flex items-center gap-2 text-xs ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        } ${isUser ? 'justify-end' : ''}`}>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {message.mode === 'local' && message.score !== undefined && (
            <span className={`flex items-center gap-1 ${
              message.score > 0.7 ? 'text-emerald-500' : message.score > 0.4 ? 'text-yellow-500' : 'text-red-400'
            }`}>
              <Check className="w-3 h-3" />
              {Math.round(message.score * 100)}%
            </span>
          )}

          {message.latency && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {message.latency}ms
            </span>
          )}

          {message.usage?.tokens && (
            <span>{message.usage.tokens} tokens</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODEL STATUS INDICATOR
═══════════════════════════════════════════════════════════════════════════ */

function ModelStatus({
  mode,
  isLoading,
  isReady,
  isDark,
}: {
  mode: AskMode
  isLoading: boolean
  isReady: boolean
  isDark: boolean
}) {
  if (mode === 'llm') {
    return (
      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
        <span>Cloud AI ready</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading local model...</span>
      </div>
    )
  }

  if (isReady) {
    return (
      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <WifiOff className="w-3.5 h-3.5 text-purple-500" />
        <span>Offline mode ready</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
      <WifiOff className="w-3.5 h-3.5" />
      <span>Click to load local model</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENRICH MODE COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function EnrichWelcome({
  isDark,
  onSuggestionClick,
}: {
  isDark: boolean
  onSuggestionClick: (text: string) => void
}) {
  const suggestions = [
    { text: 'Suggest tags for this document', icon: <Tags className="w-4 h-4" /> },
    { text: 'Extract mentions and entities', icon: <Link2 className="w-4 h-4" /> },
    { text: 'Suggest a category for this document', icon: <FolderTree className="w-4 h-4" /> },
    { text: 'Find related documents', icon: <FileText className="w-4 h-4" /> },
    { text: 'Suggest embeddable views', icon: <MapPin className="w-4 h-4" /> },
    { text: 'Analyze document content', icon: <Sparkles className="w-4 h-4" /> },
  ]

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4`}>
          <Wand2 className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Document Enrichment
        </h3>
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Enhance your document with AI-powered insights
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.text}
            onClick={() => onSuggestionClick(suggestion.text)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <span className={isDark ? 'text-amber-400' : 'text-amber-500'}>
              {suggestion.icon}
            </span>
            <span className="line-clamp-2">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EnrichMessage({
  message,
  isDark,
  onConfirm,
  onCancel,
}: {
  message: { id: string; role: string; content: string; timestamp: string; action?: any; actionResult?: any; isLoading?: boolean }
  isDark: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const isUser = message.role === 'user'
  const hasAction = message.action && !message.actionResult && message.action.requiresConfirmation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser
          ? isDark ? 'bg-blue-600' : 'bg-blue-500'
          : isDark ? 'bg-amber-600' : 'bg-amber-500'
      }`}>
        {isUser ? (
          <HelpCircle className="w-4 h-4 text-white" />
        ) : (
          <Wand2 className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 ${
          isUser
            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            : isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Action confirmation */}
          {hasAction && (
            <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            }`}>
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Action result indicator */}
          {message.actionResult && (
            <div className={`mt-2 flex items-center gap-1 text-xs ${
              message.actionResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {message.actionResult.success ? (
                <Check className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {message.actionResult.success ? 'Done' : 'Failed'}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`mt-1 text-[10px] ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        } ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AskPanel({
  isOpen,
  onClose,
  strandContent = '',
  strandTitle,
  strandPath,
  theme = 'dark',
  defaultMode = 'llm',
  systemPrompt,
  onEnrichmentComplete,
}: AskPanelProps) {
  const isDark = theme === 'dark'
  const [mode, setMode] = useState<AskMode>(defaultMode)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [localModelReady, setLocalModelReady] = useState(false)
  const [localModelLoading, setLocalModelLoading] = useState(false)
  const [localProcessing, setLocalProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Oracle for enrichment mode
  const {
    messages: oracleMessages,
    isProcessing: oracleProcessing,
    sendMessage: sendOracleMessage,
    confirmAction: confirmOracleAction,
    cancelAction: cancelOracleAction,
    clearMessages: clearOracleMessages,
  } = useOracle({
    requireConfirmation: true,
    enrichmentContext: {
      strandPath,
      strandContent,
    },
    onActionComplete: () => onEnrichmentComplete?.(),
  })

  // LLM streaming
  const { text, isStreaming, error, usage, stream, abort, reset } = useStream({
    system: systemPrompt || `You are a helpful AI assistant. ${
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
        if (updated[lastIdx]?.role === 'assistant' && updated[lastIdx]?.mode === 'llm') {
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

  // Preload local model when switching to local mode
  useEffect(() => {
    if (mode === 'local' && !localModelReady && !localModelLoading) {
      setLocalModelLoading(true)
      getLocalQA()
        .then(() => {
          setLocalModelReady(true)
          setLocalModelLoading(false)
        })
        .catch(() => setLocalModelLoading(false))
    }
  }, [mode, localModelReady, localModelLoading])

  // Handle LLM send
  const handleLLMSend = useCallback(async (question: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      mode: 'llm',
    }

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: 'llm',
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])

    const apiMessages = [...messages.filter(m => m.mode === 'llm'), userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    await stream(apiMessages)
  }, [messages, stream])

  // Handle Local Q&A send
  const handleLocalSend = useCallback(async (question: string) => {
    if (!strandContent) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'No document content available for local Q&A. Please open a strand first.',
        timestamp: new Date(),
        mode: 'local',
        score: 0,
      }])
      return
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      mode: 'local',
    }

    setMessages(prev => [...prev, userMessage])
    setLocalProcessing(true)

    const startTime = performance.now()

    try {
      const qaPipeline = await getLocalQA()
      if (!qaPipeline) throw new Error('Local model not available')

      const result = await qaPipeline(question, strandContent) as LocalQAResult
      const latency = Math.round(performance.now() - startTime)

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        mode: 'local',
        score: result.score,
        latency,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Local Q&A failed'}`,
        timestamp: new Date(),
        mode: 'local',
        score: 0,
      }])
    } finally {
      setLocalProcessing(false)
    }
  }, [strandContent])

  // Handle Enrich mode send
  const handleEnrichSend = useCallback(async (question: string) => {
    await sendOracleMessage(question)
  }, [sendOracleMessage])

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    if (mode === 'llm' && isStreaming) return
    if (mode === 'local' && localProcessing) return
    if (mode === 'enrich' && oracleProcessing) return

    setInput('')

    if (mode === 'llm') {
      await handleLLMSend(trimmedInput)
    } else if (mode === 'local') {
      await handleLocalSend(trimmedInput)
    } else {
      await handleEnrichSend(trimmedInput)
    }
  }, [input, mode, isStreaming, localProcessing, oracleProcessing, handleLLMSend, handleLocalSend, handleEnrichSend])

  // Key handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Clear messages for current mode
  const handleClear = useCallback(() => {
    if (mode === 'enrich') {
      clearOracleMessages()
    } else {
      setMessages(prev => prev.filter(m => m.mode !== mode))
      if (mode === 'llm') reset()
    }
  }, [mode, reset, clearOracleMessages])

  // Filter messages for current mode
  const visibleMessages = useMemo(() => {
    return messages.filter(m => m.mode === mode)
  }, [messages, mode])

  const isProcessing = mode === 'llm' ? isStreaming : mode === 'local' ? localProcessing : oracleProcessing

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-4 md:inset-auto md:right-4 md:bottom-4 md:w-[440px] md:h-[620px] z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden ${
        isDark
          ? 'bg-zinc-900 border border-zinc-700'
          : 'bg-white border border-zinc-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-zinc-700' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${
            mode === 'llm'
              ? 'from-emerald-500 to-cyan-500'
              : mode === 'local'
                ? 'from-purple-500 to-pink-500'
                : 'from-amber-500 to-orange-500'
          }`}>
            {mode === 'llm' ? (
              <Brain className="w-5 h-5 text-white" />
            ) : mode === 'local' ? (
              <Cpu className="w-5 h-5 text-white" />
            ) : (
              <Wand2 className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Ask AI
            </h3>
            <ModelStatus
              mode={mode}
              isLoading={localModelLoading}
              isReady={localModelReady}
              isDark={isDark}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'}`}>
        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
          <Tab
            active={mode === 'llm'}
            onClick={() => setMode('llm')}
            icon={<Brain className="w-4 h-4" />}
            label="LLM"
            sublabel="Cloud AI"
            isDark={isDark}
          />
          <Tab
            active={mode === 'local'}
            onClick={() => setMode('local')}
            icon={<Cpu className="w-4 h-4" />}
            label="Local"
            sublabel="Offline"
            isDark={isDark}
          />
          <Tab
            active={mode === 'enrich'}
            onClick={() => setMode('enrich')}
            icon={<Wand2 className="w-4 h-4" />}
            label="Enrich"
            sublabel="Document"
            isDark={isDark}
          />
        </div>
      </div>

      {/* Mode Info Banner */}
      <div className={`px-4 py-2 text-xs flex items-start gap-2 ${
        isDark ? 'bg-zinc-800/30 text-zinc-400' : 'bg-zinc-50 text-zinc-500'
      }`}>
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {mode === 'llm' ? (
          <span>Full conversational AI with streaming. Requires internet connection.</span>
        ) : mode === 'local' ? (
          <span>Fast on-device Q&A using the current document. Works offline. Best for factual questions.</span>
        ) : (
          <span>Enrich your document with AI: extract mentions, suggest tags, categorize, find related docs, and more.</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === 'enrich' ? (
          // Enrich mode - use Oracle messages
          oracleMessages.length === 0 ? (
            <EnrichWelcome isDark={isDark} onSuggestionClick={sendOracleMessage} />
          ) : (
            oracleMessages.map((message) => (
              <EnrichMessage
                key={message.id}
                message={message}
                isDark={isDark}
                onConfirm={() => confirmOracleAction(message.id)}
                onCancel={() => cancelOracleAction(message.id)}
              />
            ))
          )
        ) : visibleMessages.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {mode === 'llm' ? 'Ask anything' : 'Ask about this document'}
            </p>
            {strandTitle && mode === 'local' && (
              <p className="text-xs mt-1 opacity-75">
                Context: "{strandTitle}"
              </p>
            )}
          </div>
        ) : (
          visibleMessages.map((message, idx) => (
            <AskMessage
              key={message.id}
              message={message}
              isStreaming={mode === 'llm' && isStreaming && idx === visibleMessages.length - 1 && message.role === 'assistant'}
              isDark={isDark}
              onAbort={abort}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        <div className={`flex items-end gap-2 rounded-xl p-2 ${
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
                : mode === 'llm'
                  ? 'Ask anything...'
                  : mode === 'local'
                    ? 'Ask about this document...'
                    : 'How should I enrich this document?'
            }
            disabled={isProcessing || (mode === 'local' && localModelLoading)}
            rows={1}
            className={`flex-1 resize-none bg-transparent outline-none text-sm py-2 px-2 max-h-32 ${
              isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
            }`}
            style={{ minHeight: '40px' }}
          />

          {isProcessing ? (
            <button
              onClick={mode === 'llm' ? abort : undefined}
              disabled={mode === 'local'}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'llm'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-400'
              }`}
            >
              {mode === 'llm' ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || (mode === 'local' && localModelLoading)}
              className={`p-2.5 rounded-lg transition-colors ${
                input.trim() && !(mode === 'local' && localModelLoading)
                  ? mode === 'llm'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : mode === 'local'
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-500'
                    : 'bg-zinc-200 text-zinc-400'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRIGGER BUTTON
═══════════════════════════════════════════════════════════════════════════ */

export function AskPanelTrigger({
  onClick,
  className = '',
  theme = 'dark',
}: {
  onClick: () => void
  className?: string
  theme?: 'light' | 'dark'
}) {
  const isDark = theme === 'dark'

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
        isDark
          ? 'bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white shadow-lg'
          : 'bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 text-white shadow-lg'
      } ${className}`}
    >
      <Sparkles className="w-4 h-4" />
      Ask AI
    </button>
  )
}
