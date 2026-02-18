/**
 * AIGenerateModal - Modal for AI-powered content generation
 * @module quarry/ui/blockCommands/modals/AIGenerateModal
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Send, Loader2, Lightbulb } from 'lucide-react'

export interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
  /** Optional callback for actual AI generation */
  onGenerate?: (prompt: string) => Promise<string>
}

const PROMPT_SUGGESTIONS = [
  'Write a brief introduction about...',
  'Summarize the key points of...',
  'Create a list of pros and cons for...',
  'Explain the concept of...',
  'Write a step-by-step guide for...',
  'Generate ideas for...',
]

export function AIGenerateModal({
  isOpen,
  onClose,
  onInsert,
  isDark,
  onGenerate,
}: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setPrompt('')
      setGeneratedContent('')
      setError('')
      setIsGenerating(false)
    }
  }, [isOpen])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError('')
    setGeneratedContent('')

    try {
      if (onGenerate) {
        // Use provided AI generation function
        const result = await onGenerate(prompt)
        setGeneratedContent(result)
      } else {
        // Fallback: create a placeholder
        await new Promise(resolve => setTimeout(resolve, 1500))
        setGeneratedContent(`<!-- AI-generated content for: "${prompt}" -->\n\n[AI content would appear here. Connect an AI provider to enable generation.]`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, onGenerate])

  const handleInsert = useCallback(() => {
    if (generatedContent) {
      onInsert(generatedContent)
      onClose()
    }
  }, [generatedContent, onInsert, onClose])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setPrompt(suggestion)
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl+Enter to generate
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isGenerating && prompt.trim()) {
        handleGenerate()
      }
    }
  }, [isGenerating, prompt, handleGenerate])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
          }}
          className={[
            'relative z-10 w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className={[
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  AI Generate
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Describe what you want to create
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={[
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500',
              ].join(' ')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Prompt input */}
            <div>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like me to write?"
                rows={3}
                disabled={isGenerating}
                className={[
                  'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-violet-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-violet-500',
                  isGenerating && 'opacity-50',
                ].join(' ')}
              />
              <div className={[
                'flex justify-between items-center mt-1 text-xs',
                isDark ? 'text-zinc-500' : 'text-zinc-400',
              ].join(' ')}>
                <span>
                  <kbd className={[
                    'px-1 py-0.5 rounded',
                    isDark ? 'bg-zinc-700' : 'bg-zinc-100',
                  ].join(' ')}>⌘</kbd>
                  +
                  <kbd className={[
                    'px-1 py-0.5 rounded',
                    isDark ? 'bg-zinc-700' : 'bg-zinc-100',
                  ].join(' ')}>Enter</kbd>
                  {' '}to generate
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors',
                    isGenerating || !prompt.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700',
                  ].join(' ')}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggestions */}
            {!generatedContent && !isGenerating && (
              <div>
                <div className={[
                  'flex items-center gap-1.5 text-xs mb-2',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  <Lightbulb className="w-3.5 h-3.5" />
                  Try these prompts
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={[
                        'text-xs px-2 py-1 rounded-full transition-colors',
                        isDark
                          ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                      ].join(' ')}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generated content preview */}
            {generatedContent && (
              <div>
                <div className={[
                  'text-xs mb-2',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Generated content
                </div>
                <div className={[
                  'max-h-48 overflow-y-auto rounded-lg p-3 text-sm',
                  isDark ? 'bg-zinc-900' : 'bg-zinc-50',
                ].join(' ')}>
                  <pre className="whitespace-pre-wrap font-sans">
                    {generatedContent}
                  </pre>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className={[
                'px-3 py-2 rounded-lg text-sm',
                isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600',
              ].join(' ')}>
                {error}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className={[
            'flex gap-3 p-4 border-t',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <button
              onClick={onClose}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!generatedContent}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                generatedContent
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700'
                  : 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400',
              ].join(' ')}
            >
              Insert Content
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AIGenerateModal
