'use client'

/**
 * Study Suggestions Client Component
 * @module codex/suggestions
 *
 * Generates personalized learning suggestions using:
 * - Programmatic NLP extraction (always available)
 * - AI-enhanced suggestions with chain-of-thought prompting (when configured)
 * - Spiral curriculum integration for progressive learning
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Lightbulb,
  RefreshCw,
  Sparkles,
  Brain,
  Compass,
  Target,
  Link2,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  Info,
  BookOpen,
  Code,
  HelpCircle,
  Zap,
  Search,
  GraduationCap,
  Cpu,
  Settings,
  ChevronRight,
  Repeat,
  TrendingUp,
  Layers,
  ChevronDown,
  FileText,
  FolderOpen,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import AmbienceRightSidebar from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { usePreferences } from '@/components/quarry/hooks/usePreferences'
import { useAPIKeys } from '@/lib/config/useAPIKeys'
import { REPO_CONFIG } from '@/components/quarry/constants'
import { useGithubTree } from '@/components/quarry/hooks/useGithubTree'
import { useSelectedStrandsSafe } from '@/components/quarry/contexts/SelectedStrandsContext'
import type { KnowledgeTreeNode } from '@/components/quarry/types'
import {
  extractKeywords,
  extractTechEntities,
  classifyContentType,
  analyzeReadingLevel,
  extractEntitiesAsync,
  extractKeyPhrasesAsync,
  parseMarkdownBlocks,
} from '@/lib/nlp'

// Generation mode types
type GenerationMode = 'programmatic' | 'ai-enhanced'

// Bloom's Taxonomy levels for spiral curriculum
type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'

interface Suggestion {
  text: string
  category: 'clarification' | 'exploration' | 'application' | 'connection'
  relatedTopics?: string[]
  type?: 'question' | 'action' | 'explore'
  bloomLevel?: BloomLevel
  spiralPhase?: number // 1 = foundational, 2 = intermediate, 3 = advanced
}

// Bloom's taxonomy configuration for spiral curriculum
const BLOOM_LEVELS: Record<BloomLevel, { label: string; description: string; order: number }> = {
  remember: { label: 'Remember', description: 'Recall facts and basic concepts', order: 1 },
  understand: { label: 'Understand', description: 'Explain ideas or concepts', order: 2 },
  apply: { label: 'Apply', description: 'Use information in new situations', order: 3 },
  analyze: { label: 'Analyze', description: 'Draw connections among ideas', order: 4 },
  evaluate: { label: 'Evaluate', description: 'Justify a decision or course of action', order: 5 },
  create: { label: 'Create', description: 'Produce new or original work', order: 6 },
}

const CATEGORY_CONFIG = {
  clarification: {
    icon: Brain,
    label: 'Clarification',
    description: 'Questions to verify understanding',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  exploration: {
    icon: Compass,
    label: 'Exploration',
    description: 'Questions for deeper investigation',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  application: {
    icon: Target,
    label: 'Application',
    description: 'Real-world use cases',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  connection: {
    icon: Link2,
    label: 'Connection',
    description: 'Links to related topics',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
}

/**
 * Spiral Curriculum Templates
 * These templates generate questions at different Bloom's taxonomy levels
 * to support progressive deepening of understanding
 */
const SPIRAL_TEMPLATES = {
  // Phase 1: Foundational (Remember & Understand)
  foundational: {
    remember: [
      'What is {topic}?',
      'List the key components of {topic}',
      'Define {topic} in your own words',
      'What are the basic facts about {topic}?',
    ],
    understand: [
      'Explain how {topic} works',
      'Summarize the main concepts of {topic}',
      'Why is {topic} important?',
      'Compare {topic} with similar concepts',
    ],
  },
  // Phase 2: Intermediate (Apply & Analyze)
  intermediate: {
    apply: [
      'How would you use {topic} to solve a problem?',
      'Implement a simple example using {topic}',
      'Apply {topic} to a real-world scenario',
      'What modifications would you make to {topic} for production?',
    ],
    analyze: [
      'What are the trade-offs when using {topic}?',
      'How does {topic} interact with other concepts?',
      'What patterns emerge when studying {topic}?',
      'Break down {topic} into its component parts',
    ],
  },
  // Phase 3: Advanced (Evaluate & Create)
  advanced: {
    evaluate: [
      'What are the strengths and weaknesses of {topic}?',
      'When should you NOT use {topic}?',
      'How would you improve {topic}?',
      'Compare different approaches to {topic}',
    ],
    create: [
      'Design a new solution using {topic}',
      'Combine {topic} with other concepts to create something new',
      'How would you teach {topic} to others?',
      'Create a mental model or diagram for {topic}',
    ],
  },
}

/**
 * Flatten tree to get all strands (markdown files)
 */
function flattenTreeToStrands(nodes: KnowledgeTreeNode[], prefix = ''): Array<{ path: string; title: string; depth: number }> {
  const strands: Array<{ path: string; title: string; depth: number }> = []

  for (const node of nodes) {
    if (node.type === 'file' && node.path.endsWith('.md')) {
      strands.push({
        path: node.path,
        title: node.name.replace('.md', '').replace(/_/g, ' ').replace(/-/g, ' '),
        depth: prefix.split('/').filter(Boolean).length,
      })
    }
    if (node.children && node.children.length > 0) {
      strands.push(...flattenTreeToStrands(node.children, node.path))
    }
  }

  return strands
}

/**
 * Generate a suggestion from a template
 */
function generateFromTemplate(
  template: string,
  topic: string,
  category: Suggestion['category'],
  bloomLevel: BloomLevel,
  spiralPhase: number
): Suggestion {
  return {
    text: template.replace('{topic}', topic),
    category,
    relatedTopics: [topic],
    type: 'question',
    bloomLevel,
    spiralPhase,
  }
}

/**
 * Generate programmatic suggestions from content using NLP
 * Integrates spiral curriculum with Bloom's taxonomy levels
 */
async function generateProgrammaticSuggestions(content: string, title: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = []

  // Extract entities and keywords
  const entities = await extractEntitiesAsync(content)
  const keywords = extractKeywords(content, 15)
  const techEntities = extractTechEntities(content)
  const contentType = classifyContentType(content)
  const readingLevel = analyzeReadingLevel(content)
  const keyPhrases = await extractKeyPhrasesAsync(content, 10)
  const blocks = parseMarkdownBlocks(content)

  // Get headings for topic questions
  const headings = blocks
    .filter(b => b.type === 'heading' && b.headingLevel && b.headingLevel <= 3)
    .map(b => b.content)
    .slice(0, 10)

  // Get key topics for spiral curriculum
  const concepts = [...(entities.concepts || []), ...(techEntities.concepts || [])].slice(0, 6)
  const technologies = entities.technologies?.slice(0, 4) || []
  const allTopics = [...new Set([...concepts, ...technologies, ...headings.slice(0, 3)])]

  // Generate spiral curriculum suggestions for each topic
  for (const topic of allTopics.slice(0, 4)) {
    // Phase 1: Foundational (Remember & Understand)
    const rememberTemplates = SPIRAL_TEMPLATES.foundational.remember
    const understandTemplates = SPIRAL_TEMPLATES.foundational.understand
    suggestions.push(
      generateFromTemplate(
        rememberTemplates[Math.floor(Math.random() * rememberTemplates.length)],
        topic,
        'clarification',
        'remember',
        1
      ),
      generateFromTemplate(
        understandTemplates[Math.floor(Math.random() * understandTemplates.length)],
        topic,
        'clarification',
        'understand',
        1
      )
    )

    // Phase 2: Intermediate (Apply & Analyze)
    const applyTemplates = SPIRAL_TEMPLATES.intermediate.apply
    const analyzeTemplates = SPIRAL_TEMPLATES.intermediate.analyze
    suggestions.push(
      generateFromTemplate(
        applyTemplates[Math.floor(Math.random() * applyTemplates.length)],
        topic,
        'application',
        'apply',
        2
      ),
      generateFromTemplate(
        analyzeTemplates[Math.floor(Math.random() * analyzeTemplates.length)],
        topic,
        'exploration',
        'analyze',
        2
      )
    )

    // Phase 3: Advanced (Evaluate & Create)
    const evaluateTemplates = SPIRAL_TEMPLATES.advanced.evaluate
    const createTemplates = SPIRAL_TEMPLATES.advanced.create
    suggestions.push(
      generateFromTemplate(
        evaluateTemplates[Math.floor(Math.random() * evaluateTemplates.length)],
        topic,
        'exploration',
        'evaluate',
        3
      ),
      generateFromTemplate(
        createTemplates[Math.floor(Math.random() * createTemplates.length)],
        topic,
        'connection',
        'create',
        3
      )
    )
  }

  // Add content-type specific suggestions
  if (contentType.primary === 'tutorial') {
    suggestions.push({
      text: `Implement ${title} step-by-step in a practice project`,
      category: 'application',
      type: 'action',
      bloomLevel: 'apply',
      spiralPhase: 2,
    })
  } else if (contentType.primary === 'conceptual') {
    suggestions.push({
      text: `Draw a concept map connecting the key ideas in ${title}`,
      category: 'connection',
      type: 'action',
      bloomLevel: 'create',
      spiralPhase: 3,
    })
  }

  // Add spaced repetition reminder
  suggestions.push({
    text: 'Review this material again in 1-3 days to strengthen retention',
    category: 'connection',
    type: 'action',
    bloomLevel: 'remember',
    spiralPhase: 1,
  })

  // Add difficulty-based progressive suggestions
  if (readingLevel.level === 'beginner') {
    suggestions.push({
      text: 'Identify prerequisite topics to study before diving deeper',
      category: 'exploration',
      type: 'action',
      bloomLevel: 'analyze',
      spiralPhase: 2,
    })
  } else if (readingLevel.level === 'advanced') {
    suggestions.push({
      text: 'Connect this advanced topic to foundational concepts you already know',
      category: 'connection',
      type: 'question',
      bloomLevel: 'analyze',
      spiralPhase: 2,
    })
  }

  // Add meta-learning suggestions
  suggestions.push({
    text: 'Create flashcards for the key concepts to aid retention',
    category: 'application',
    type: 'action',
    bloomLevel: 'remember',
    spiralPhase: 1,
  })
  suggestions.push({
    text: 'Write a summary in your own words to test comprehension',
    category: 'application',
    type: 'action',
    bloomLevel: 'understand',
    spiralPhase: 1,
  })

  // Shuffle and limit, but ensure variety across spiral phases
  const phase1 = suggestions.filter(s => s.spiralPhase === 1).slice(0, 4)
  const phase2 = suggestions.filter(s => s.spiralPhase === 2).slice(0, 4)
  const phase3 = suggestions.filter(s => s.spiralPhase === 3).slice(0, 4)

  return [...phase1, ...phase2, ...phase3].slice(0, 12)
}

/**
 * Get Bloom's level color
 */
function getBloomColor(level: BloomLevel | undefined): { bg: string; text: string } {
  switch (level) {
    case 'remember': return { bg: 'bg-slate-500/20', text: 'text-slate-500' }
    case 'understand': return { bg: 'bg-blue-500/20', text: 'text-blue-500' }
    case 'apply': return { bg: 'bg-green-500/20', text: 'text-green-500' }
    case 'analyze': return { bg: 'bg-purple-500/20', text: 'text-purple-500' }
    case 'evaluate': return { bg: 'bg-orange-500/20', text: 'text-orange-500' }
    case 'create': return { bg: 'bg-pink-500/20', text: 'text-pink-500' }
    default: return { bg: 'bg-zinc-500/20', text: 'text-zinc-500' }
  }
}

/**
 * Suggestion Card Component
 */
interface SuggestionCardProps {
  suggestion: Suggestion
  index: number
  isDark: boolean
  strandPath: string | null
  router: ReturnType<typeof useRouter>
}

function SuggestionCard({ suggestion, index, isDark, strandPath, router }: SuggestionCardProps) {
  const config = CATEGORY_CONFIG[suggestion.category] || CATEGORY_CONFIG.clarification
  const Icon = config.icon
  const bloomColor = getBloomColor(suggestion.bloomLevel)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-xl border transition-colors cursor-pointer group ${isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
        }`}
      onClick={() => {
        const params = new URLSearchParams()
        if (strandPath) params.set('strand', strandPath)
        params.set('q', suggestion.text)
        router.push(`/quarry/search?${params.toString()}`)
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1">
          <p className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {suggestion.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {config.description}
            </span>
            {suggestion.bloomLevel && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${bloomColor.bg} ${bloomColor.text}`}>
                {BLOOM_LEVELS[suggestion.bloomLevel]?.label || suggestion.bloomLevel}
              </span>
            )}
          </div>
          {suggestion.relatedTopics && suggestion.relatedTopics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestion.relatedTopics.slice(0, 3).map(topic => (
                <span
                  key={topic}
                  className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                    }`}
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`} />
      </div>
    </motion.div>
  )
}

export default function SuggestionsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { preferences } = usePreferences()
  const { configuredProviders, loading: keysLoading } = useAPIKeys()

  // Get tree data for strand picker
  const { tree, loading: treeLoading, totalStrands } = useGithubTree()

  // Get sidebar selection context
  const selectedStrandsContext = useSelectedStrandsSafe()

  const strandPath = searchParams.get('strand')

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'programmatic' | 'llm' | 'hybrid'>('programmatic')
  const [generationMode, setGenerationMode] = useState<GenerationMode>('programmatic')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [spiralPhaseFilter, setSpiralPhaseFilter] = useState<number | null>(null)
  const [content, setContent] = useState<string>('')
  const [strandTitle, setStrandTitle] = useState<string>('')
  const [processingTime, setProcessingTime] = useState<number>(0)
  const [showStrandPicker, setShowStrandPicker] = useState(false)
  const [strandSearch, setStrandSearch] = useState('')
  const strandPickerRef = useRef<HTMLDivElement>(null)

  const isDark = preferences.theme?.includes('dark')

  // Flatten tree to get strand options
  const strandOptions = useMemo(() => {
    if (!tree || tree.length === 0) return []
    // Only get strands from weaves folder
    const weavesFolder = tree.find(n => n.name === 'weaves' && n.type === 'dir')
    if (!weavesFolder?.children) return []
    return flattenTreeToStrands(weavesFolder.children, 'weaves')
  }, [tree])

  // Filter strands by search
  const filteredStrandOptions = useMemo(() => {
    if (!strandSearch) return strandOptions.slice(0, 50) // Limit for performance
    const search = strandSearch.toLowerCase()
    return strandOptions
      .filter(s => s.title.toLowerCase().includes(search) || s.path.toLowerCase().includes(search))
      .slice(0, 50)
  }, [strandOptions, strandSearch])

  // Listen for sidebar selection changes
  useEffect(() => {
    if (!selectedStrandsContext || selectedStrandsContext.strands.length === 0) return
    // If sidebar has a selection and we don't have a strand path, use the first selected strand
    const firstSelected = selectedStrandsContext.strands[0]
    if (firstSelected && (!strandPath || strandPath !== firstSelected.path)) {
      // Update URL with the selected strand
      router.replace(`/quarry/suggestions?strand=${encodeURIComponent(firstSelected.path)}`)
    }
  }, [selectedStrandsContext?.strands, strandPath, router])

  // Close strand picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (strandPickerRef.current && !strandPickerRef.current.contains(event.target as Node)) {
        setShowStrandPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle strand selection from picker
  const handleStrandSelect = useCallback((path: string) => {
    setShowStrandPicker(false)
    setStrandSearch('')
    router.replace(`/quarry/suggestions?strand=${encodeURIComponent(path)}`)
  }, [router])

  // Check if LLM providers are configured (anthropic = Claude)
  const hasLLMAccess = configuredProviders.length > 0 && configuredProviders.some(
    p => p === 'anthropic' || p === 'openai'
  )

  // Fetch strand content
  const fetchContent = useCallback(async () => {
    if (!strandPath) return

    try {
      const res = await fetch(`https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}/${strandPath}`)
      if (res.ok) {
        const text = await res.text()
        setContent(text)

        // Extract title from frontmatter or first heading
        const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/title:\s*['"]?([^'"\n]+)['"]?/m)
        if (titleMatch) {
          setStrandTitle(titleMatch[1])
        } else {
          // Use filename as fallback
          const filename = strandPath.split('/').pop()?.replace('.md', '') || 'Untitled'
          setStrandTitle(filename.replace(/_/g, ' ').replace(/-/g, ' '))
        }
      }
    } catch (err) {
      console.error('Failed to fetch content:', err)
      setError('Failed to load strand content')
    }
  }, [strandPath])

  // Chain-of-Thought prompt for AI-enhanced suggestions
  const buildChainOfThoughtPrompt = useCallback((contentSample: string, title: string) => {
    return `You are an expert learning coach using Bloom's Taxonomy and spiral curriculum principles.

TASK: Generate 12 personalized study suggestions for the following content.

CONTENT TITLE: ${title}
CONTENT SAMPLE:
${contentSample.slice(0, 6000)}

CHAIN OF THOUGHT PROCESS:

Step 1 - ANALYZE THE CONTENT:
First, identify:
- Main topics and concepts
- Difficulty level (beginner/intermediate/advanced)
- Content type (tutorial, conceptual, reference, etc.)
- Key technologies or frameworks mentioned
- Prerequisites implied

Step 2 - APPLY BLOOM'S TAXONOMY:
For each key topic, generate suggestions across the cognitive levels:
- Remember: What should the learner memorize?
- Understand: How can they demonstrate comprehension?
- Apply: How can they use this knowledge practically?
- Analyze: What connections and patterns should they explore?
- Evaluate: What critical assessments can they make?
- Create: What can they produce using this knowledge?

Step 3 - INTEGRATE SPIRAL CURRICULUM:
Organize suggestions into three phases:
- Phase 1 (Foundational): Basic recall and understanding
- Phase 2 (Intermediate): Application and analysis
- Phase 3 (Advanced): Evaluation and creation

Step 4 - ADD METACOGNITIVE ELEMENTS:
Include suggestions for:
- Spaced repetition and review timing
- Self-assessment strategies
- Connection to prior knowledge

OUTPUT FORMAT (JSON array):
[
  {
    "text": "suggestion text here",
    "category": "clarification|exploration|application|connection",
    "type": "question|action|explore",
    "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
    "spiralPhase": 1|2|3,
    "relatedTopics": ["topic1", "topic2"]
  }
]

Generate exactly 12 suggestions with 4 from each spiral phase. Be specific and actionable.
Output ONLY the JSON array, no other text.`
  }, [])

  // Generate suggestions
  const generateSuggestions = useCallback(async () => {
    if (!content) return

    setLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Use AI-enhanced mode with chain-of-thought prompting
      if (generationMode === 'ai-enhanced' && hasLLMAccess) {
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'suggestions',
              content: content.slice(0, 10000),
              strandSlug: strandPath,
              title: strandTitle,
              useLLM: true,
              maxItems: 12,
              // Include chain-of-thought prompt for better results
              prompt: buildChainOfThoughtPrompt(content, strandTitle),
              chainOfThought: true,
              spiralCurriculum: true,
              bloomsTaxonomy: true,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            if (data.success && data.items?.length > 0) {
              // Ensure items have required fields
              const processedItems = data.items.map((item: Partial<Suggestion>) => ({
                ...item,
                bloomLevel: item.bloomLevel || 'understand',
                spiralPhase: item.spiralPhase || 1,
              }))
              setSuggestions(processedItems)
              setSource('llm')
              setProcessingTime(Date.now() - startTime)
              return
            }
          }
        } catch (llmErr) {
          console.log('[Suggestions] LLM generation failed, falling back to programmatic:', llmErr)
        }
      }

      // Programmatic generation with spiral curriculum
      const programmaticSuggestions = await generateProgrammaticSuggestions(content, strandTitle)
      setSuggestions(programmaticSuggestions)
      setSource('programmatic')
      setProcessingTime(Date.now() - startTime)

    } catch (err) {
      console.error('[Suggestions] Generation failed:', err)
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [content, strandPath, strandTitle, generationMode, hasLLMAccess, buildChainOfThoughtPrompt])

  // Fetch content on mount
  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Generate when content is loaded
  useEffect(() => {
    if (content) {
      generateSuggestions()
    }
  }, [content]) // Only regenerate when content changes, not on every dependency change

  // Toggle category filter
  const toggleFilter = (category: string) => {
    setActiveFilters(prev =>
      prev.includes(category)
        ? prev.filter(f => f !== category)
        : [...prev, category]
    )
  }

  // Toggle spiral phase filter
  const togglePhaseFilter = (phase: number) => {
    setSpiralPhaseFilter(prev => prev === phase ? null : phase)
  }

  // Filter suggestions by category and spiral phase
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions

    // Filter by category
    if (activeFilters.length > 0) {
      filtered = filtered.filter(s => activeFilters.includes(s.category))
    }

    // Filter by spiral phase
    if (spiralPhaseFilter !== null) {
      filtered = filtered.filter(s => s.spiralPhase === spiralPhaseFilter)
    }

    return filtered
  }, [suggestions, activeFilters, spiralPhaseFilter])

  // Group suggestions by spiral phase for display
  const suggestionsByPhase = useMemo(() => {
    return {
      phase1: filteredSuggestions.filter(s => s.spiralPhase === 1),
      phase2: filteredSuggestions.filter(s => s.spiralPhase === 2),
      phase3: filteredSuggestions.filter(s => s.spiralPhase === 3),
    }
  }, [filteredSuggestions])

  // Sidebar content
  const sidebarContent = (
    <div className="p-4 space-y-6">
      {/* Generation Mode Tabs */}
      <div>
        <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Generation Mode
        </h3>
        <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
          <button
            onClick={() => setGenerationMode('programmatic')}
            className={`w-full flex items-center gap-2 p-3 text-sm transition-colors ${generationMode === 'programmatic'
                ? isDark ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'bg-blue-50 text-blue-600 border-l-2 border-blue-500'
                : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
          >
            <Cpu className="w-4 h-4" />
            <div className="flex-1 text-left">
              <div className="font-medium">Programmatic</div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                NLP-based, always available
              </div>
            </div>
            {generationMode === 'programmatic' && (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => hasLLMAccess && setGenerationMode('ai-enhanced')}
            disabled={!hasLLMAccess}
            className={`w-full flex items-center gap-2 p-3 text-sm transition-colors border-t ${generationMode === 'ai-enhanced'
                ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-l-2 border-emerald-500'
                : hasLLMAccess
                  ? isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 border-zinc-700' : 'bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200'
                  : isDark ? 'bg-zinc-900 text-zinc-600 border-zinc-700 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <div className="flex-1 text-left">
              <div className="font-medium">AI Enhanced</div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {hasLLMAccess ? 'Chain-of-thought prompting' : 'Configure API key in settings'}
              </div>
            </div>
            {generationMode === 'ai-enhanced' && hasLLMAccess && (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {!hasLLMAccess && (
              <Link href="/quarry/settings" className="text-xs underline">
                Setup
              </Link>
            )}
          </button>
        </div>
      </div>

      {/* Spiral Curriculum Phases */}
      <div>
        <h3 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          <Layers className="w-4 h-4" />
          Spiral Learning
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => togglePhaseFilter(1)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${spiralPhaseFilter === 1
                ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${spiralPhaseFilter === 1 ? 'bg-blue-500' : isDark ? 'bg-zinc-600' : 'bg-zinc-300'}`} />
            <span>Foundational</span>
            <span className={`text-xs ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Remember & Understand
            </span>
          </button>
          <button
            onClick={() => togglePhaseFilter(2)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${spiralPhaseFilter === 2
                ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${spiralPhaseFilter === 2 ? 'bg-purple-500' : isDark ? 'bg-zinc-600' : 'bg-zinc-300'}`} />
            <span>Intermediate</span>
            <span className={`text-xs ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Apply & Analyze
            </span>
          </button>
          <button
            onClick={() => togglePhaseFilter(3)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${spiralPhaseFilter === 3
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${spiralPhaseFilter === 3 ? 'bg-amber-500' : isDark ? 'bg-zinc-600' : 'bg-zinc-300'}`} />
            <span>Advanced</span>
            <span className={`text-xs ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Evaluate & Create
            </span>
          </button>
        </div>
      </div>

      {/* Strand Picker */}
      <div ref={strandPickerRef}>
        <h3 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          <FileText className="w-4 h-4" />
          Select Strand
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowStrandPicker(!showStrandPicker)}
            className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-lg text-sm transition-colors border ${isDark
                ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 text-zinc-300'
                : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
              }`}
          >
            <span className="truncate">
              {strandTitle || 'Choose a strand...'}
            </span>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showStrandPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {showStrandPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border shadow-xl max-h-80 overflow-hidden ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
                  }`}
              >
                {/* Search input */}
                <div className={`p-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                  <div className="relative">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    <input
                      type="text"
                      value={strandSearch}
                      onChange={(e) => setStrandSearch(e.target.value)}
                      placeholder="Search strands..."
                      className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md border ${isDark
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                        } focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Strand list */}
                <div className="overflow-y-auto max-h-60">
                  {treeLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className={`w-5 h-5 animate-spin mx-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    </div>
                  ) : filteredStrandOptions.length === 0 ? (
                    <div className={`p-4 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {strandSearch ? 'No strands match your search' : 'No strands available'}
                    </div>
                  ) : (
                    filteredStrandOptions.map((strand) => (
                      <button
                        key={strand.path}
                        onClick={() => handleStrandSelect(strand.path)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${strandPath === strand.path
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                            : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                          }`}
                      >
                        <div className="font-medium truncate">{strand.title}</div>
                        <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {strand.path}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Stats footer */}
                <div className={`p-2 border-t text-xs ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
                  {totalStrands} strands available
                  {strandSearch && ` • ${filteredStrandOptions.length} matching`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar selection hint */}
        {selectedStrandsContext && selectedStrandsContext.strands.length > 0 && (
          <div className={`mt-2 p-2 rounded-lg text-xs ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{selectedStrandsContext.strands.length} strand{selectedStrandsContext.strands.length > 1 ? 's' : ''} selected in sidebar</span>
            </div>
          </div>
        )}
      </div>

      {/* Strand Info */}
      {strandTitle && (
        <div>
          <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Active Strand
          </h3>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <p className={`font-medium text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {strandTitle}
            </p>
            {strandPath && (
              <Link
                href={`/quarry/${strandPath.replace('.md', '')}`}
                className={`text-xs mt-1 inline-block ${isDark ? 'text-cyan-400' : 'text-cyan-600'} hover:underline`}
              >
                View strand →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Link
            href={strandPath ? `/quarry/learn?strand=${encodeURIComponent(strandPath)}` : '/quarry/learn'}
            className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
              }`}
          >
            <GraduationCap className="w-4 h-4" />
            Learning Studio
          </Link>
          <Link
            href={strandPath ? `/quarry/search?strand=${encodeURIComponent(strandPath)}` : '/quarry/search'}
            className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
              }`}
          >
            <Search className="w-4 h-4" />
            Search & Ask
          </Link>
        </div>
      </div>

      {/* Generation Stats */}
      {suggestions.length > 0 && (
        <div>
          <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Generation Info
          </h3>
          <div className={`p-3 rounded-lg text-xs space-y-1 ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
            <p className="flex justify-between">
              <span>Source:</span>
              <span className={source === 'llm' ? 'text-emerald-500' : 'text-blue-500'}>
                {source === 'llm' ? 'AI Enhanced' : 'NLP Analysis'}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Mode:</span>
              <span>{generationMode === 'ai-enhanced' ? 'Chain-of-Thought' : 'Programmatic'}</span>
            </p>
            <p className="flex justify-between">
              <span>Suggestions:</span>
              <span>{suggestions.length}</span>
            </p>
            <p className="flex justify-between">
              <span>Time:</span>
              <span>{processingTime}ms</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <QuarryPageLayout
      title="Study Suggestions"
      description={strandTitle ? `for "${strandTitle}"` : undefined}
      leftPanelContent={sidebarContent}
      theme={preferences.theme}
      showRightPanel={true}
      rightPanelContent={<AmbienceRightSidebar theme={preferences.theme} />}
      rightPanelWidth={260}
    >
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Study Suggestions
              </h1>
              {strandTitle && (
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  for "{strandTitle}"
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode indicator badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${generationMode === 'ai-enhanced'
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-blue-500/20 text-blue-500'
              }`}>
              {generationMode === 'ai-enhanced' ? (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>AI</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3 h-3" />
                  <span>NLP</span>
                </>
              )}
            </div>

            <button
              onClick={generateSuggestions}
              disabled={loading || !content}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} disabled:opacity-50`}
              title="Regenerate suggestions"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Filter className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            const isActive = activeFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border ${isActive
                    ? `${config.bgColor} ${config.color} ${config.borderColor}`
                    : isDark
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
                {isActive && <X className="w-3 h-3 ml-1" />}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            <p>{error}</p>
            <button
              onClick={generateSuggestions}
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* No Content */}
        {!content && !loading && !error && (
          <div className="text-center py-12">
            <Lightbulb className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
            <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Select a Strand to Get Started
            </h2>
            <p className={`mb-6 max-w-md mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Choose a strand using the picker in the sidebar, select strands from the tree browser, or visit a strand page and click "Suggest".
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowStrandPicker(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Open Strand Picker
              </button>
              <Link
                href="/quarry/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isDark
                    ? 'border-zinc-700 text-zinc-300 hover:border-zinc-600'
                    : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
                  }`}
              >
                <FolderOpen className="w-4 h-4" />
                Browse Codex
              </Link>
            </div>

            {/* Quick strand suggestions */}
            {strandOptions.length > 0 && (
              <div className="mt-8">
                <p className={`text-sm mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Or try one of these strands:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {strandOptions.slice(0, 5).map((strand) => (
                    <button
                      key={strand.path}
                      onClick={() => handleStrandSelect(strand.path)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${isDark
                          ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-700'
                        }`}
                    >
                      {strand.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Grid with Spiral Phase Grouping */}
        {!loading && filteredSuggestions.length > 0 && (
          <div className="space-y-6">
            {/* Phase 1: Foundational */}
            {suggestionsByPhase.phase1.length > 0 && spiralPhaseFilter !== 2 && spiralPhaseFilter !== 3 && (
              <div>
                <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Foundational</span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Remember & Understand
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {suggestionsByPhase.phase1.map((suggestion, index) => (
                      <SuggestionCard
                        key={`p1-${suggestion.text.slice(0, 20)}-${index}`}
                        suggestion={suggestion}
                        index={index}
                        isDark={isDark}
                        strandPath={strandPath}
                        router={router}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Phase 2: Intermediate */}
            {suggestionsByPhase.phase2.length > 0 && spiralPhaseFilter !== 1 && spiralPhaseFilter !== 3 && (
              <div>
                <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium">Intermediate</span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Apply & Analyze
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {suggestionsByPhase.phase2.map((suggestion, index) => (
                      <SuggestionCard
                        key={`p2-${suggestion.text.slice(0, 20)}-${index}`}
                        suggestion={suggestion}
                        index={index}
                        isDark={isDark}
                        strandPath={strandPath}
                        router={router}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Phase 3: Advanced */}
            {suggestionsByPhase.phase3.length > 0 && spiralPhaseFilter !== 1 && spiralPhaseFilter !== 2 && (
              <div>
                <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">Advanced</span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Evaluate & Create
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {suggestionsByPhase.phase3.map((suggestion, index) => (
                      <SuggestionCard
                        key={`p3-${suggestion.text.slice(0, 20)}-${index}`}
                        suggestion={suggestion}
                        index={index}
                        isDark={isDark}
                        strandPath={strandPath}
                        router={router}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state after generation */}
        {!loading && content && filteredSuggestions.length === 0 && suggestions.length > 0 && (
          <div className="text-center py-8">
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              No suggestions match the selected filters.
            </p>
            <button
              onClick={() => setActiveFilters([])}
              className="mt-2 text-sm text-cyan-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </QuarryPageLayout>
  )
}
