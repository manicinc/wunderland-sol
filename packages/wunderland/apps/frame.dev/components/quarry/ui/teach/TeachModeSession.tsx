/**
 * Teach Mode Session Component
 *
 * Active teaching conversation interface with:
 * - Voice and text input
 * - Message history display
 * - Real-time session stats
 * - AI student responses
 *
 * @module codex/ui/TeachModeSession
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Send, StopCircle, Clock,
  AlertCircle, Sparkles, User, Bot, Volume2,
  Keyboard, X, Loader2,
} from 'lucide-react'
import type { TeachMessage, StudentPersona } from '@/types/openstrand'
import { STUDENT_PERSONAS } from '@/types/openstrand'

interface TeachModeSessionProps {
  /** Current session messages */
  messages: TeachMessage[]
  /** Selected AI persona */
  persona: StudentPersona
  /** Session start time */
  startTime: Date
  /** Current gaps found count */
  gapsFound: number
  /** Theme */
  isDark?: boolean
  /** Whether AI is currently generating response */
  isAiThinking?: boolean
  /** Callback to send user message */
  onSendMessage: (content: string, isVoice: boolean) => Promise<void>
  /** Callback to end session */
  onEndSession: () => void
  /** Callback to cancel session */
  onCancel: () => void
}

/**
 * Format duration in mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Voice input component
 */
function VoiceInput({
  isRecording,
  onStartRecording,
  onStopRecording,
  isDark,
  disabled,
}: {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  isDark: boolean
  disabled: boolean
}) {
  return (
    <motion.button
      onClick={isRecording ? onStopRecording : onStartRecording}
      disabled={disabled}
      className={`
        relative p-4 rounded-full transition-all
        ${isRecording
          ? 'bg-red-500 text-white'
          : isDark
            ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {isRecording ? (
        <>
          <MicOff className="w-6 h-6" />
          {/* Pulsing ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-500"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </>
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </motion.button>
  )
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
  persona,
  isDark,
}: {
  message: TeachMessage
  persona: StudentPersona
  isDark: boolean
}) {
  const isUser = message.role === 'user'
  const personaConfig = STUDENT_PERSONAS.find(p => p.id === persona)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser
          ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
          : isDark ? 'bg-zinc-700' : 'bg-zinc-100'
        }
      `}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <span className="text-sm">{personaConfig?.icon || '🤖'}</span>
        )}
      </div>

      {/* Message content */}
      <div className={`
        flex-1 max-w-[80%] p-3 rounded-2xl
        ${isUser
          ? isDark ? 'bg-blue-500/20 text-blue-100' : 'bg-blue-100 text-blue-900'
          : isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-white text-zinc-800 shadow-sm'
        }
        ${isUser ? 'rounded-tr-md' : 'rounded-tl-md'}
      `}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Voice indicator */}
        {message.isVoice && isUser && (
          <div className={`
            flex items-center gap-1 mt-2 text-xs
            ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
          `}>
            <Volume2 className="w-3 h-3" />
            <span>Voice input</span>
          </div>
        )}

        {/* Gaps indicator (for student messages) */}
        {!isUser && message.gaps && message.gaps.length > 0 && (
          <div className={`
            flex items-center gap-1 mt-2 text-xs
            ${isDark ? 'text-amber-400' : 'text-amber-600'}
          `}>
            <AlertCircle className="w-3 h-3" />
            <span>{message.gaps.length} potential gap{message.gaps.length > 1 ? 's' : ''} identified</span>
          </div>
        )}

        {/* Timestamp */}
        <div className={`
          text-[10px] mt-1 ${isUser ? 'text-right' : ''}
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * AI thinking indicator
 */
function ThinkingIndicator({ isDark, persona }: { isDark: boolean; persona: StudentPersona }) {
  const personaConfig = STUDENT_PERSONAS.find(p => p.id === persona)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}
      `}>
        <span className="text-sm">{personaConfig?.icon || '🤖'}</span>
      </div>
      <div className={`
        p-3 rounded-2xl rounded-tl-md
        ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}
      `}>
        <div className="flex items-center gap-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Thinking...
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Teach Mode Session
 *
 * Main conversation interface for teaching sessions
 */
export function TeachModeSession({
  messages,
  persona,
  startTime,
  gapsFound,
  isDark = false,
  isAiThinking = false,
  onSendMessage,
  onEndSession,
  onCancel,
}: TeachModeSessionProps) {
  const [inputText, setInputText] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [isRecording, setIsRecording] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const personaConfig = STUDENT_PERSONAS.find(p => p.id === persona)

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiThinking])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setInputText(transcript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  // Handle voice recording
  const startRecording = useCallback(() => {
    if (recognitionRef.current) {
      setInputText('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  // Handle sending message
  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isSending) return

    setIsSending(true)
    try {
      await onSendMessage(text, inputMode === 'voice' && isRecording)
      setInputText('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }, [inputText, isSending, inputMode, isRecording, onSendMessage])

  // Handle key press in text input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className={`
      flex flex-col h-full
      ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80'}
        backdrop-blur-sm
      `}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{personaConfig?.icon}</span>
          <div>
            <h3 className={`font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Teaching to {personaConfig?.name}
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {personaConfig?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Session stats */}
          <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>{gapsFound} gaps</span>
            </div>
          </div>

          {/* End session button */}
          <button
            onClick={onEndSession}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium
              ${isDark
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }
            `}
          >
            End Session
          </button>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className={`
              p-1.5 rounded-lg
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial prompt from student */}
        {messages.length === 0 && !isAiThinking && (
          <div className={`
            text-center py-8
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <span className="text-4xl mb-4 block">{personaConfig?.icon}</span>
            <p className="text-lg font-medium mb-2">
              Hi! I'm ready to learn.
            </p>
            <p className="text-sm">
              Explain the topic to me, and I'll ask questions to help you discover gaps in your understanding.
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            persona={persona}
            isDark={isDark}
          />
        ))}

        {/* AI thinking indicator */}
        {isAiThinking && (
          <ThinkingIndicator isDark={isDark} persona={persona} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={`
        p-4 border-t
        ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80'}
        backdrop-blur-sm
      `}>
        {/* Input mode toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setInputMode('voice')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
              ${inputMode === 'voice'
                ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                : isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
              }
            `}
          >
            <Mic className="w-4 h-4" />
            Voice
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
              ${inputMode === 'text'
                ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                : isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
              }
            `}
          >
            <Keyboard className="w-4 h-4" />
            Text
          </button>
        </div>

        {/* Voice input mode */}
        {inputMode === 'voice' ? (
          <div className="flex flex-col items-center gap-3">
            <VoiceInput
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              isDark={isDark}
              disabled={isSending || isAiThinking}
            />
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {isRecording ? 'Listening... Click to stop' : 'Click to start speaking'}
            </p>

            {/* Show transcript while recording */}
            {inputText && (
              <div className={`
                w-full p-3 rounded-lg text-sm
                ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-zinc-700'}
              `}>
                {inputText}
              </div>
            )}

            {/* Send button when there's text */}
            {inputText && !isRecording && (
              <button
                onClick={handleSend}
                disabled={isSending || isAiThinking}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                  ${isDark
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                  ${(isSending || isAiThinking) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            )}
          </div>
        ) : (
          /* Text input mode */
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your explanation..."
              disabled={isSending || isAiThinking}
              rows={2}
              className={`
                flex-1 p-3 rounded-lg resize-none
                ${isDark
                  ? 'bg-zinc-800 text-zinc-200 placeholder-zinc-500 border-zinc-700'
                  : 'bg-white text-zinc-800 placeholder-zinc-400 border-zinc-200'
                }
                border focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${(isSending || isAiThinking) ? 'opacity-50' : ''}
              `}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSending || isAiThinking}
              className={`
                self-end p-3 rounded-lg
                ${isDark
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                ${(!inputText.trim() || isSending || isAiThinking) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TeachModeSession
