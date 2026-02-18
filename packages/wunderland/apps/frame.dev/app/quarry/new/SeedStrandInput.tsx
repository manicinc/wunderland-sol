'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  Tag, 
  Lightbulb,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'

interface Definition {
  word: string
  partOfSpeech: string
  definition: string
  example?: string
  synonyms?: string[]
}

interface SeedResult {
  word: string
  definitions: Definition[]
  suggestedTags: string[]
  suggestedCategory: string
  relatedConcepts: string[]
  templateContent: string
}

interface SeedStrandInputProps {
  onSeedComplete: (result: SeedResult) => void
  onCancel: () => void
}

// Simple stop words for filtering
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
])

export default function SeedStrandInput({ onSeedComplete, onCancel }: SeedStrandInputProps) {
  const [seedInput, setSeedInput] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Extract meaningful words from input
  const extractKeywords = useCallback((text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
  }, [])

  // Infer category from definition
  const inferCategory = useCallback((definitions: Definition[]): string => {
    const text = definitions.map(d => d.definition + ' ' + (d.example || '')).join(' ').toLowerCase()
    
    if (text.includes('computer') || text.includes('software') || text.includes('algorithm') || text.includes('code')) {
      return 'technology'
    }
    if (text.includes('science') || text.includes('research') || text.includes('experiment')) {
      return 'science'
    }
    if (text.includes('philosophy') || text.includes('thinking') || text.includes('mind')) {
      return 'philosophy'
    }
    if (text.includes('art') || text.includes('creative') || text.includes('design')) {
      return 'creative'
    }
    if (text.includes('business') || text.includes('market') || text.includes('company')) {
      return 'business'
    }
    return 'general'
  }, [])

  // Generate template content from seed
  const generateTemplate = useCallback((word: string, definitions: Definition[], category: string): string => {
    const mainDef = definitions[0]
    
    return `# ${word.charAt(0).toUpperCase() + word.slice(1)}

## Overview

${mainDef.definition}

${mainDef.example ? `> "${mainDef.example}"` : ''}

## Key Concepts

- [ ] Define core principles
- [ ] Explore related ideas
- [ ] Document practical applications

## Notes

*Add your thoughts and observations here...*

## References

- [Add references]

---
*This strand was seeded from the concept "${word}"*
`
  }, [])

  // Look up word using free dictionary API
  const lookupWord = useCallback(async () => {
    if (!seedInput.trim()) return

    setIsLookingUp(true)
    setError(null)
    setLookupResult(null)

    const keywords = extractKeywords(seedInput)
    const primaryWord = keywords[0] || seedInput.trim().split(' ')[0]

    try {
      // Use the free dictionary API
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(primaryWord)}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No definition found for "${primaryWord}"`)
        }
        throw new Error('Failed to look up definition')
      }

      const data = await response.json()
      
      // Parse the API response
      const definitions: Definition[] = []
      const allSynonyms: string[] = []

      for (const entry of data) {
        for (const meaning of entry.meanings || []) {
          for (const def of meaning.definitions?.slice(0, 2) || []) {
            definitions.push({
              word: entry.word,
              partOfSpeech: meaning.partOfSpeech,
              definition: def.definition,
              example: def.example,
              synonyms: def.synonyms?.slice(0, 5)
            })
            if (def.synonyms) {
              allSynonyms.push(...def.synonyms.slice(0, 3))
            }
          }
        }
      }

      if (definitions.length === 0) {
        throw new Error('No definitions found')
      }

      const category = inferCategory(definitions)
      const suggestedTags = [
        primaryWord,
        ...keywords.slice(1, 3),
        category
      ].filter((v, i, a) => a.indexOf(v) === i)

      const result: SeedResult = {
        word: primaryWord,
        definitions: definitions.slice(0, 3),
        suggestedTags,
        suggestedCategory: category,
        relatedConcepts: [...new Set(allSynonyms)].slice(0, 6),
        templateContent: generateTemplate(primaryWord, definitions, category)
      }

      setLookupResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up definition')
    } finally {
      setIsLookingUp(false)
    }
  }, [seedInput, extractKeywords, inferCategory, generateTemplate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      lookupWord()
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Start from a seed word or concept</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a word or phrase to explore..."
            className="w-full px-4 py-3 pr-24 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={isLookingUp}
          />
          <button
            onClick={lookupWord}
            disabled={!seedInput.trim() || isLookingUp}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Look up
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {lookupResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            {/* Definition Card */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                    {lookupResult.word}
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    {lookupResult.definitions[0]?.partOfSpeech}
                  </span>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {lookupResult.definitions[0]?.definition}
              </p>

              {lookupResult.definitions[0]?.example && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic border-l-2 border-cyan-500 pl-3">
                  "{lookupResult.definitions[0].example}"
                </p>
              )}
            </div>

            {/* Suggested Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Tag className="w-4 h-4" />
                <span>Suggested tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lookupResult.suggestedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Concepts */}
            {lookupResult.relatedConcepts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Lightbulb className="w-4 h-4" />
                  <span>Related concepts</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lookupResult.relatedConcepts.map((concept, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => onSeedComplete(lookupResult)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Create Strand
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!lookupResult && !isLookingUp && !error && (
        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">
          <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Enter a word to discover its meaning and create a strand</p>
        </div>
      )}
    </div>
  )
}
