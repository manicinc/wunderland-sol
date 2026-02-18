/**
 * Answer Card - Beautiful display for Q&A responses
 * @module codex/ui/AnswerCard
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronUp, BookOpen, Code, ExternalLink,
  Copy, Check, Zap, FileText, Hash, Volume2, Square, Pause
} from 'lucide-react'
import type { SearchResult } from '@/lib/search/semanticSearch'
import Link from 'next/link'

interface AnswerCardProps {
  /** The original question */
  question: string
  /** The generated answer */
  answer: string
  /** Confidence score (0-1) */
  confidence: number
  /** Source documents */
  sources: SearchResult[]
  /** When the question was asked */
  timestamp: Date
  /** Theme */
  theme?: string
  /** Read answer aloud handler */
  onReadAloud?: (text: string) => void
  /** Stop TTS handler */
  onStopReading?: () => void
  /** Whether TTS is currently speaking this answer */
  isSpeaking?: boolean
  /** Whether TTS is supported */
  ttsSupported?: boolean
}

/**
 * Display Q&A responses in beautiful cards
 */
export default function AnswerCard({
  question,
  answer,
  confidence,
  sources,
  timestamp,
  theme = 'light',
  onReadAloud,
  onStopReading,
  isSpeaking = false,
  ttsSupported = false,
}: AnswerCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  /**
   * Handle read aloud - strips markdown for cleaner speech
   */
  const handleReadAloud = () => {
    if (isSpeaking && onStopReading) {
      onStopReading()
    } else if (onReadAloud) {
      // Include question for context
      const textToRead = `Question: ${question}. Answer: ${answer}`
      onReadAloud(textToRead)
    }
  }
  
  const isDark = theme.includes('dark')
  const isSepia = theme.includes('sepia')
  const isTerminal = theme.includes('terminal')

  /**
   * Copy code to clipboard
   */
  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Clamp confidence to 0-1 range (safety measure for unnormalized scores)
  const clampedConfidence = Math.min(1, Math.max(0, confidence))
  
  /**
   * Format confidence as percentage with color
   */
  const getConfidenceColor = () => {
    if (clampedConfidence > 0.9) return 'text-green-600 dark:text-green-400'
    if (clampedConfidence > 0.7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  /**
   * Parse answer for code blocks and formatting
   */
  const parseAnswer = (text: string) => {
    const parts: React.ReactNode[] = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const inlineCodeRegex = /`([^`]+)`/g
    
    let lastIndex = 0
    let match
    
    // Find code blocks
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        let textPart = text.slice(lastIndex, match.index)
        
        // Replace inline code in text parts
        textPart = textPart.replace(inlineCodeRegex, (_, code) => 
          `<code class="inline-code">${code}</code>`
        )
        
        parts.push(
          <span 
            key={lastIndex} 
            dangerouslySetInnerHTML={{ __html: textPart }}
          />
        )
      }
      
      // Add code block
      const language = match[1] || 'text'
      const code = match[2].trim()
      const codeId = `code-${match.index}`
      
      parts.push(
        <div key={match.index} className="my-4">
          <div className={`
            relative rounded-lg overflow-hidden
            ${isDark ? 'bg-gray-900' : 'bg-gray-100'}
          `}>
            <div className={`
              flex items-center justify-between px-4 py-2 border-b
              ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-200'}
            `}>
              <span className="text-xs font-mono opacity-70">{language}</span>
              <div className="relative group">
                <button
                  onClick={() => copyCode(code, codeId)}
                  className={`
                    p-1.5 rounded transition-colors
                    ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-300'}
                  `}
                  aria-label="Copy code"
                >
                  {copiedCode === codeId ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                {/* Tooltip */}
                <span className={`
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                  px-2 py-1 text-[10px] font-medium whitespace-nowrap
                  rounded shadow-lg z-50 pointer-events-none
                  transition-opacity
                  ${copiedCode === codeId 
                    ? 'bg-emerald-600 text-white opacity-100' 
                    : 'bg-zinc-800 text-white opacity-0 group-hover:opacity-100'
                  }
                `}>
                  {copiedCode === codeId ? 'Copied!' : 'Copy'}
                  <span className={`
                    absolute top-full left-1/2 -translate-x-1/2
                    border-4 border-transparent
                    ${copiedCode === codeId ? 'border-t-emerald-600' : 'border-t-zinc-800'}
                  `} />
                </span>
              </div>
            </div>
            <pre className={`
              p-4 overflow-x-auto text-sm
              ${isTerminal ? 'font-mono terminal-text' : ''}
            `}>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      let textPart = text.slice(lastIndex)
      textPart = textPart.replace(inlineCodeRegex, (_, code) => 
        `<code class="inline-code">${code}</code>`
      )
      parts.push(
        <span 
          key={lastIndex} 
          dangerouslySetInnerHTML={{ __html: textPart }}
        />
      )
    }
    
    return parts
  }

  return (
    <motion.div
      layout
      className={`
        rounded-xl overflow-hidden shadow-lg
        ${isSepia && isDark ? 'bg-amber-950/50' : ''}
        ${isSepia && !isDark ? 'bg-amber-50' : ''}
        ${!isSepia && isDark ? 'bg-gray-800' : ''}
        ${!isSepia && !isDark ? 'bg-white' : ''}
        ${isTerminal ? 'terminal-frame' : ''}
      `}
    >
      {/* Question Header - Ultra Compact */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full px-2 py-1.5 flex items-center justify-between text-left
          transition-colors
          ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap className="w-3.5 h-3.5 shrink-0 text-purple-500" />
          <span className="text-sm font-medium truncate">{question}</span>
          <span className={`shrink-0 text-[10px] font-medium ${getConfidenceColor()}`}>
            {Math.round(clampedConfidence * 100)}%
          </span>
          {sources.length > 0 && (
            <span className="shrink-0 text-[10px] opacity-60">{sources.length} src</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Read Aloud Button */}
          {ttsSupported && onReadAloud && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleReadAloud()
              }}
              className={`
                p-2 rounded-lg transition-all
                ${isSpeaking 
                  ? isDark 
                    ? 'bg-purple-900/50 text-purple-400 hover:bg-purple-900/70' 
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  : isDark 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                }
              `}
              title={isSpeaking ? 'Stop reading' : 'Read answer aloud'}
              aria-label={isSpeaking ? 'Stop reading' : 'Read answer aloud'}
            >
              {isSpeaking ? (
                <Square className="w-4 h-4" fill="currentColor" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 shrink-0" />
          )}
        </div>
      </button>

      {/* Answer Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`
              px-2 pb-2 pt-1 border-t
              ${isDark ? 'border-gray-700' : 'border-gray-200'}
            `}>
              {/* Answer Text */}
              <div className={`
                mt-1 prose prose-sm max-w-none leading-normal
                ${isDark ? 'prose-invert' : ''}
              `}>
                {parseAnswer(answer)}
              </div>

              {/* Sources - Ultra Compact */}
              {sources.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1 mb-1.5 text-[9px] uppercase tracking-wide opacity-60">
                    <BookOpen className="w-3 h-3" />
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.slice(0, 4).map((source, idx) => (
                      <Link
                        key={idx}
                        href={`/quarry/${source.entry.path.replace(/\.md$/, '')}`}
                        className={`
                          inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors
                          ${isDark
                            ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }
                        `}
                        title={source.snippet}
                      >
                        {source.entry.contentType === 'code' ? (
                          <Code className="w-3 h-3 opacity-60" />
                        ) : (
                          <FileText className="w-3 h-3 opacity-60" />
                        )}
                        <span className="truncate max-w-[120px]">{source.entry.title}</span>
                        <span className={`text-[10px] ${source.score > 0.9 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {Math.round(source.score * 100)}%
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline code styling */}
      <style jsx global>{`
        .inline-code {
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
          ${isDark 
            ? 'background-color: rgba(156, 163, 175, 0.2); color: #e5e7eb;' 
            : 'background-color: rgba(107, 114, 128, 0.1); color: #374151;'
          }
        }
      `}</style>
    </motion.div>
  )
}
