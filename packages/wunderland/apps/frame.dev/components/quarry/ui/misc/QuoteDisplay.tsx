/**
 * Quote Display Component
 * @module codex/ui/QuoteDisplay
 * 
 * Displays inspirational quotes with elegant styling.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Quote as QuoteIcon, RefreshCw } from 'lucide-react'
import { getDailyQuote, getRandomQuote, type Quote } from '@/lib/codex/quotes'

interface QuoteDisplayProps {
  /** Use daily quote (consistent per day) vs random */
  daily?: boolean
  /** Compact mode */
  compact?: boolean
  /** Allow refresh */
  allowRefresh?: boolean
  /** Current theme */
  theme?: string
}

/**
 * Elegant quote display with source attribution
 */
export default function QuoteDisplay({
  daily = false,
  compact = false,
  allowRefresh = true,
  theme = 'light',
}: QuoteDisplayProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  useEffect(() => {
    // Only get a new random quote on initial mount to avoid hydration mismatch
    if (!hasInitialized) {
      setQuote(daily ? getDailyQuote() : getRandomQuote())
      setHasInitialized(true)
    }
  }, [daily, hasInitialized])
  
  const handleRefresh = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setQuote(getRandomQuote())
      setIsAnimating(false)
    }, 200)
  }
  
  if (!quote) return null
  
  if (compact) {
    return (
      <div className="text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic leading-relaxed">
          "{quote.text}"
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          — {quote.author}
        </p>
      </div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 
        dark:from-zinc-800/50 dark:to-zinc-900/50
        border border-zinc-200/50 dark:border-zinc-700/50"
    >
      {/* Quote icon */}
      <div className="absolute -top-2 -left-2">
        <div className="p-1.5 rounded-full bg-white dark:bg-zinc-800 
          border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <QuoteIcon className="w-3 h-3 text-zinc-400" />
        </div>
      </div>
      
      {/* Refresh button */}
      {allowRefresh && (
        <button
          onClick={handleRefresh}
          className="absolute top-2 right-2 p-1 rounded hover:bg-zinc-200/50 
            dark:hover:bg-zinc-700/50 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 text-zinc-400 ${isAnimating ? 'animate-spin' : ''}`} />
        </button>
      )}
      
      {/* Quote content */}
      <motion.div
        key={quote.text}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-2"
      >
        <blockquote className="text-sm text-zinc-700 dark:text-zinc-300 
          italic leading-relaxed font-serif">
          "{quote.text}"
        </blockquote>
        
        <footer className="mt-3 flex items-center justify-between">
          <cite className="text-xs text-zinc-500 dark:text-zinc-400 not-italic font-medium">
            — {quote.author}
          </cite>
          {quote.source && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {quote.source}
            </span>
          )}
        </footer>
        
        {/* Tags */}
        {quote.tags && quote.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {quote.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full
                  bg-zinc-200/50 dark:bg-zinc-700/50
                  text-zinc-500 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}












