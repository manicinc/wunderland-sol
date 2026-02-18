/**
 * OracleChat Component
 *
 * Floating chat interface for the Oracle AI assistant.
 * Supports natural language task management with confirmation mode.
 *
 * NOTE: Oracle functionality is also integrated into the main UnifiedAskInterface
 * via the "Planner" mode tab. This standalone component can be used for embedding
 * the chat as a floating widget in other views.
 *
 * @module components/quarry/ui/planner/OracleChat
 */

'use client'

import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Check,
  XCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOracle, type OracleMessage } from '@/lib/planner/oracle'
import Tooltip from '../common/Tooltip'

export interface OracleChatEnrichmentContext {
  strandPath?: string
  blockId?: string
  content?: string
}

export interface OracleChatProps {
  theme?: 'light' | 'dark'
  defaultOpen?: boolean
  position?: 'bottom-right' | 'bottom-left'
  onActionComplete?: () => void
  className?: string
  /** Document context for enrichment commands */
  enrichmentContext?: OracleChatEnrichmentContext
}

function OracleChatComponent({
  theme = 'dark',
  defaultOpen = false,
  position = 'bottom-right',
  onActionComplete,
  className,
  enrichmentContext,
}: OracleChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    isProcessing,
    sendMessage,
    confirmAction,
    cancelAction,
    clearMessages,
    setEnrichmentContext,
  } = useOracle({
    requireConfirmation: true,
    onActionComplete: () => onActionComplete?.(),
    enrichmentContext,
  })

  // Update enrichment context when it changes
  useEffect(() => {
    if (enrichmentContext) {
      setEnrichmentContext(enrichmentContext)
    }
  }, [enrichmentContext, setEnrichmentContext])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isProcessing) return

    const message = inputValue.trim()
    setInputValue('')
    await sendMessage(message)
  }, [inputValue, isProcessing, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div
      className={cn(
        'fixed z-50',
        position === 'bottom-right' ? 'right-6 bottom-6' : 'left-6 bottom-6',
        className
      )}
    >
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'mb-4 rounded-2xl border shadow-2xl overflow-hidden flex flex-col',
              isExpanded ? 'w-[480px] h-[600px]' : 'w-[380px] h-[500px]',
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-gray-200'
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-violet-600/20 to-blue-600/20 border-zinc-800'
                  : 'bg-gradient-to-r from-violet-50 to-blue-50 border-gray-100'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-gradient-to-br from-violet-500 to-blue-500'
                  )}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3
                    className={cn(
                      'text-sm font-semibold',
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    Oracle
                  </h3>
                  <p
                    className={cn(
                      'text-[10px]',
                      theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
                    )}
                  >
                    AI Task Assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip content={isExpanded ? 'Minimize' : 'Expand'} placement="bottom">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      theme === 'dark'
                        ? 'hover:bg-zinc-800 text-zinc-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    )}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </Tooltip>
                {messages.length > 0 && (
                  <Tooltip content="Clear messages" placement="bottom">
                    <button
                      onClick={clearMessages}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        theme === 'dark'
                          ? 'hover:bg-zinc-800 text-zinc-400 hover:text-red-400'
                          : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                )}
                <Tooltip content="Close" placement="bottom">
                  <button
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      theme === 'dark'
                        ? 'hover:bg-zinc-800 text-zinc-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <WelcomeMessage theme={theme} onSuggestionClick={sendMessage} />
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    theme={theme}
                    onConfirm={() => confirmAction(message.id)}
                    onCancel={() => cancelAction(message.id)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className={cn(
                'p-4 border-t',
                theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border',
                  theme === 'dark'
                    ? 'bg-zinc-800 border-zinc-700 focus-within:border-violet-500'
                    : 'bg-gray-50 border-gray-200 focus-within:border-violet-400'
                )}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Oracle anything..."
                  disabled={isProcessing}
                  className={cn(
                    'flex-1 bg-transparent text-sm focus:outline-none',
                    theme === 'dark'
                      ? 'text-white placeholder:text-zinc-500'
                      : 'text-gray-900 placeholder:text-gray-400'
                  )}
                />
                <Tooltip content={isProcessing ? 'Sending...' : 'Send message'} placement="top">
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isProcessing}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      inputValue.trim() && !isProcessing
                        ? 'bg-violet-500 text-white hover:bg-violet-600'
                        : theme === 'dark'
                          ? 'text-zinc-600'
                          : 'text-gray-300'
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </Tooltip>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all',
          'bg-gradient-to-br from-violet-500 to-blue-500',
          'hover:shadow-xl hover:shadow-violet-500/25',
          isOpen && 'scale-90 opacity-50'
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>
  )
}

/**
 * Welcome message with quick suggestions
 */
function WelcomeMessage({
  theme,
  onSuggestionClick,
}: {
  theme: 'light' | 'dark'
  onSuggestionClick: (text: string) => void
}) {
  const suggestions = [
    "What should I focus on?",
    "Add a task 'Review emails' for today",
    "Timebox my day",
    "When am I free for 2 hours?",
  ]

  return (
    <div className="text-center py-4">
      <div
        className={cn(
          'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4',
          'bg-gradient-to-br from-violet-500/20 to-blue-500/20'
        )}
      >
        <Sparkles
          className={cn(
            'w-8 h-8',
            theme === 'dark' ? 'text-violet-400' : 'text-violet-500'
          )}
        />
      </div>
      <h3
        className={cn(
          'text-lg font-semibold mb-2',
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}
      >
        Hi! I'm Oracle
      </h3>
      <p
        className={cn(
          'text-sm mb-6',
          theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
        )}
      >
        Your AI task management assistant. Ask me anything!
      </p>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className={cn(
              'w-full px-4 py-2 rounded-lg text-sm text-left transition-colors',
              theme === 'dark'
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
  theme,
  onConfirm,
  onCancel,
}: {
  message: OracleMessage
  theme: 'light' | 'dark'
  onConfirm: () => void
  onCancel: () => void
}) {
  const isUser = message.role === 'user'
  const hasAction = message.action && !message.actionResult && message.action.requiresConfirmation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-violet-500 text-white rounded-br-md'
            : theme === 'dark'
              ? 'bg-zinc-800 text-zinc-100 rounded-bl-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
        )}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Action confirmation */}
        {hasAction && (
          <div
            className={cn(
              'mt-3 pt-3 border-t flex items-center gap-2',
              theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'
            )}
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
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  )}
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
            className={cn(
              'mt-2 flex items-center gap-1 text-xs',
              message.actionResult.success ? 'text-emerald-400' : 'text-red-400'
            )}
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
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-violet-200' : theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
          )}
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

export const OracleChat = memo(OracleChatComponent)
export default OracleChat
