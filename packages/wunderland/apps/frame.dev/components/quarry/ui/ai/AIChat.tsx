'use client'

/**
 * AI Chat Component
 *
 * Full-featured chat interface with LLM streaming support.
 * Features:
 * - Real-time streaming responses
 * - Message history
 * - Context from current strand
 * - Abort/retry capabilities
 * - Token usage display
 *
 * @module codex/ui/AIChat
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, Bot, User, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, Settings, ChevronDown
} from 'lucide-react'
import { useStream, type UseStreamOptions } from '@/lib/llm/useStream'
import StreamingText, { StreamingIndicator } from '../common/StreamingText'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIChatProps {
  /** Whether chat is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand content for context */
  strandContent?: string
  /** Current strand title */
  strandTitle?: string
  /** System prompt override */
  systemPrompt?: string
  /** Theme */
  theme?: 'light' | 'dark'
  /** Initial messages */
  initialMessages?: Message[]
  /** Called when messages change */
  onMessagesChange?: (messages: Message[]) => void
  /** Stream options */
  streamOptions?: Partial<UseStreamOptions>
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getDefaultSystemPrompt(strandTitle?: string, strandContent?: string): string {
  let prompt = `You are a helpful AI assistant for Quarry Codex, a knowledge management platform.
Be concise, accurate, and helpful. Use markdown formatting when appropriate.`

  if (strandTitle && strandContent) {
    prompt += `

The user is currently viewing a document titled "${strandTitle}".
Here is the document content for context:

---
${strandContent.slice(0, 4000)}
${strandContent.length > 4000 ? '\n[Content truncated...]' : ''}
---

Use this context to provide relevant answers. Reference specific parts of the document when helpful.`
  }

  return prompt
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function ChatMessage({
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
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? isDark ? 'bg-blue-600' : 'bg-blue-500'
          : isDark ? 'bg-emerald-600' : 'bg-emerald-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
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
              className="text-sm"
            />
          )}
        </div>

        {/* Timestamp and usage */}
        <div className={`mt-1 text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'} ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.usage && !isStreaming && (
            <span className="ml-2">
              • {message.usage.totalTokens.toLocaleString()} tokens
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AIChat({
  isOpen,
  onClose,
  strandContent,
  strandTitle,
  systemPrompt,
  theme = 'dark',
  initialMessages = [],
  onMessagesChange,
  streamOptions = {},
}: AIChatProps) {
  const isDark = theme === 'dark'
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Build system prompt
  const fullSystemPrompt = systemPrompt || getDefaultSystemPrompt(strandTitle, strandContent)

  // Streaming hook
  const { text, isStreaming, error, usage, stream, abort, reset } = useStream({
    ...streamOptions,
    system: fullSystemPrompt,
    onComplete: useCallback((responseText: string, responseUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => {
      // Update the last assistant message with final content
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant') {
          // Only set usage if all fields are present
          const validUsage = responseUsage && 
            typeof responseUsage.promptTokens === 'number' &&
            typeof responseUsage.completionTokens === 'number' &&
            typeof responseUsage.totalTokens === 'number'
            ? {
                promptTokens: responseUsage.promptTokens,
                completionTokens: responseUsage.completionTokens,
                totalTokens: responseUsage.totalTokens,
              }
            : undefined
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: responseText,
            usage: validUsage,
          }
        }
        return updated
      })
    }, []),
    onError: useCallback((errorMsg: string) => {
      // Update last message with error
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `Error: ${errorMsg}`,
          }
        }
        return updated
      })
    }, []),
  })

  // Update streaming message content
  useEffect(() => {
    if (isStreaming && text) {
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: text,
          }
        }
        return updated
      })
    }
  }, [text, isStreaming])

  // Notify parent of message changes
  useEffect(() => {
    onMessagesChange?.(messages)
  }, [messages, onMessagesChange])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, text])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Send message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isStreaming) return

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    }

    // Add placeholder assistant message
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput('')

    // Build message history for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Start streaming
    try {
      await stream(apiMessages)
    } catch {
      // Error handled in onError callback
    }
  }, [input, isStreaming, messages, stream])

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Clear chat
  const handleClear = useCallback(() => {
    setMessages([])
    reset()
  }, [reset])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-4 md:inset-auto md:right-4 md:bottom-4 md:w-[420px] md:h-[600px] z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden ${
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
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-emerald-600' : 'bg-emerald-500'
          }`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              AI Assistant
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {strandTitle ? `Viewing: ${strandTitle}` : 'Ask anything'}
            </p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Start a conversation</p>
            {strandTitle && (
              <p className="text-xs mt-1">
                I have context about "{strandTitle}"
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
                isDark={isDark}
                onAbort={abort}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Streaming indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}
          >
            <StreamingIndicator
              isStreaming={isStreaming}
              tokens={text.split(/\s+/).length}
              theme={isDark ? 'dark' : 'light'}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
            placeholder={isStreaming ? 'Generating...' : 'Ask a question...'}
            disabled={isStreaming}
            rows={1}
            className={`flex-1 resize-none bg-transparent outline-none text-sm py-2 px-2 max-h-32 ${
              isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
            }`}
            style={{ minHeight: '40px' }}
          />

          {isStreaming ? (
            <button
              onClick={abort}
              className="p-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-2.5 rounded-lg transition-colors ${
                input.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
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

export function AIChatTrigger({
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
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
      } ${className}`}
    >
      <Sparkles className="w-4 h-4" />
      Ask AI
    </button>
  )
}
