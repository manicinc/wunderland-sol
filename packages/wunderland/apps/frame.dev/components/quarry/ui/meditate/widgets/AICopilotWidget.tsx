'use client'

/**
 * AI Copilot Widget
 * @module components/quarry/ui/meditate/widgets/AICopilotWidget
 * 
 * AI chat interface for productivity assistance.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Sparkles,
  User,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface AICopilotWidgetProps {
  theme: ThemeName
  onNavigate: (path: string) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK PROMPTS
═══════════════════════════════════════════════════════════════════════════ */

const QUICK_PROMPTS = [
  { label: 'Today\'s focus', prompt: 'What should I focus on today?' },
  { label: 'Weekly summary', prompt: 'Summarize my productivity this week' },
  { label: 'Break ideas', prompt: 'What should I do during my break?' },
  { label: 'Motivate me', prompt: 'Give me some motivation to stay focused' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AICopilotWidget({
  theme,
  onNavigate,
}: AICopilotWidgetProps) {
  const isDark = isDarkTheme(theme)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response (in real implementation, call your LLM API)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(content),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }, [isLoading])

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Clear chat
  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2',
        'border-b',
        isDark ? 'border-white/10' : 'border-black/10'
      )}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-white' : 'text-black'
          )}>
            AI Copilot
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className={cn(
              'p-1.5 rounded-lg',
              isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('/quarry/ask')}
            className={cn(
              'p-1.5 rounded-lg',
              isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'
            )}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              'bg-purple-500/20'
            )}>
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className={cn(
              'text-sm text-center',
              isDark ? 'text-white/60' : 'text-black/60'
            )}>
              How can I help you focus today?
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs',
                    'transition-all duration-200',
                    isDark
                      ? 'bg-white/10 text-white/70 hover:bg-white/15'
                      : 'bg-black/5 text-black/70 hover:bg-black/10'
                  )}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex gap-2',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'assistant'
                    ? 'bg-purple-500/20'
                    : isDark
                      ? 'bg-white/10'
                      : 'bg-black/10'
                )}
              >
                {message.role === 'assistant' ? (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <User className={cn(
                    'w-3.5 h-3.5',
                    isDark ? 'text-white/60' : 'text-black/60'
                  )} />
                )}
              </div>
              <div
                className={cn(
                  'flex-1 px-3 py-2 rounded-xl text-sm',
                  message.role === 'assistant'
                    ? isDark
                      ? 'bg-white/5 text-white/90'
                      : 'bg-black/5 text-black/90'
                    : 'bg-purple-500/20 text-purple-100'
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-500/20">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className={cn(
              'px-3 py-2 rounded-xl',
              isDark ? 'bg-white/5' : 'bg-black/5'
            )}>
              <Loader2 className={cn(
                'w-4 h-4 animate-spin',
                isDark ? 'text-white/50' : 'text-black/50'
              )} />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'p-3 border-t',
          isDark ? 'border-white/10' : 'border-black/10'
        )}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className={cn(
              'flex-1 px-3 py-2 rounded-xl text-sm',
              'outline-none',
              isDark
                ? 'bg-white/10 text-white placeholder:text-white/40'
                : 'bg-black/5 text-black placeholder:text-black/40'
            )}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setIsListening(!isListening)}
            className={cn(
              'p-2 rounded-xl',
              isListening
                ? 'bg-red-500/20 text-red-400'
                : isDark
                  ? 'hover:bg-white/10 text-white/50'
                  : 'hover:bg-black/5 text-black/50'
            )}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-2 rounded-xl',
              'transition-all duration-200',
              input.trim() && !isLoading
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                : isDark
                  ? 'bg-white/5 text-white/30'
                  : 'bg-black/5 text-black/30'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK RESPONSE GENERATOR
═══════════════════════════════════════════════════════════════════════════ */

function generateMockResponse(input: string): string {
  const lower = input.toLowerCase()

  if (lower.includes('focus') || lower.includes('today')) {
    return "Based on your recent activity, I'd suggest focusing on completing your most important task first. Try a 25-minute focus session with the Pomodoro timer, then take a short break. You've got this! 💪"
  }

  if (lower.includes('summary') || lower.includes('week')) {
    return "This week you've completed 12 Pomodoro sessions totaling 5 hours of focused work. Your most productive day was Tuesday. Keep up the great work!"
  }

  if (lower.includes('break')) {
    return "Great question! For your break, try: stretching for 2 minutes, stepping outside for fresh air, or doing some deep breathing exercises. Your brain will thank you!"
  }

  if (lower.includes('motivat')) {
    return "Remember: every small step counts! You're building momentum with each focus session. The work you're doing today is creating the future you want. Stay focused, stay strong! ✨"
  }

  return "I'm here to help you stay focused and productive. You can ask me about your productivity stats, get motivation, or find ideas for breaks. What would you like to know?"
}





