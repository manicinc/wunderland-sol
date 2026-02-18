'use client'

/**
 * Batch Generate Client Component
 * @module codex/batch-generate
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Sparkles as SparklesIcon,
  GraduationCap,
  FileQuestion,
  Folder,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { usePreferences } from '@/components/quarry/hooks/usePreferences'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import AmbienceRightSidebar from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import ToolPageLeftSidebar from '@/components/quarry/ui/sidebar/ToolPageLeftSidebar'

interface StrandInfo {
  path: string
  title?: string
  content: string
  selected: boolean
}

interface WeaveInfo {
  name: string
  path: string
  strands: StrandInfo[]
  expanded: boolean
}

interface BatchResult {
  strandPath: string
  success: boolean
  itemCount: number
  error?: string
}

export default function BatchGenerateClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { preferences } = usePreferences()
  
  const weavePath = searchParams.get('weave')
  
  const [weaves, setWeaves] = useState<WeaveInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BatchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [genType, setGenType] = useState<'flashcards' | 'quiz'>('flashcards')
  const [useLLM, setUseLLM] = useState(false)
  const [itemsPerStrand, setItemsPerStrand] = useState(5)
  
  const isDark = preferences.theme?.includes('dark')

  // Fetch weaves and strands
  useEffect(() => {
    const fetchStructure = async () => {
      setLoading(true)
      try {
        // Fetch tree structure from GitHub
        const res = await fetch(
          'https://api.github.com/repos/rfrramersai/quarry/git/trees/main?recursive=1'
        )
        
        if (!res.ok) throw new Error('Failed to fetch repository structure')
        
        const data = await res.json()
        const tree = data.tree as Array<{ path: string; type: string }>
        
        // Group by weaves
        const weaveMap = new Map<string, StrandInfo[]>()
        
        for (const item of tree) {
          if (item.type !== 'blob' || !item.path.endsWith('.md')) continue
          if (!item.path.startsWith('weaves/')) continue
          
          const parts = item.path.split('/')
          if (parts.length < 3) continue
          
          const weaveName = parts[1]
          
          if (!weaveMap.has(weaveName)) {
            weaveMap.set(weaveName, [])
          }
          
          weaveMap.get(weaveName)!.push({
            path: item.path,
            title: parts[parts.length - 1].replace('.md', ''),
            content: '', // Will fetch on demand
            selected: weavePath ? item.path.includes(weavePath) : false,
          })
        }
        
        // Convert to array
        const weaveList: WeaveInfo[] = Array.from(weaveMap.entries()).map(([name, strands]) => ({
          name,
          path: `weaves/${name}`,
          strands,
          expanded: weavePath ? name === weavePath : false,
        }))
        
        setWeaves(weaveList.sort((a, b) => a.name.localeCompare(b.name)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load structure')
      } finally {
        setLoading(false)
      }
    }
    
    fetchStructure()
  }, [weavePath])

  // Toggle weave expansion
  const toggleWeave = (weaveName: string) => {
    setWeaves(prev => prev.map(w => 
      w.name === weaveName ? { ...w, expanded: !w.expanded } : w
    ))
  }

  // Toggle strand selection
  const toggleStrand = (weaveName: string, strandPath: string) => {
    setWeaves(prev => prev.map(w => {
      if (w.name !== weaveName) return w
      return {
        ...w,
        strands: w.strands.map(s => 
          s.path === strandPath ? { ...s, selected: !s.selected } : s
        ),
      }
    }))
  }

  // Select all strands in a weave
  const selectAllInWeave = (weaveName: string, selected: boolean) => {
    setWeaves(prev => prev.map(w => {
      if (w.name !== weaveName) return w
      return {
        ...w,
        strands: w.strands.map(s => ({ ...s, selected })),
      }
    }))
  }

  // Get selected strands
  const selectedStrands = weaves.flatMap(w => w.strands.filter(s => s.selected))

  // Fetch content for selected strands and generate
  const handleGenerate = useCallback(async () => {
    if (selectedStrands.length === 0) return
    
    setGenerating(true)
    setProgress(0)
    setResults([])
    setError(null)
    
    try {
      // Fetch content for all selected strands
      const strandsWithContent: Array<{ path: string; title?: string; content: string }> = []
      
      for (let i = 0; i < selectedStrands.length; i++) {
        const strand = selectedStrands[i]
        setProgress(Math.round((i / selectedStrands.length) * 50)) // First 50% for fetching
        
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/rfrramersai/quarry/main/${strand.path}`
          )
          if (res.ok) {
            const content = await res.text()
            strandsWithContent.push({
              path: strand.path,
              title: strand.title,
              content,
            })
          }
        } catch {
          // Skip failed fetches
        }
      }
      
      if (strandsWithContent.length === 0) {
        throw new Error('No content could be fetched')
      }
      
      setProgress(50) // Fetching complete
      
      // Call batch generation API
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: genType,
          strands: strandsWithContent,
          useLLM,
          itemsPerStrand,
        }),
      })
      
      if (!res.ok) throw new Error('Generation failed')
      
      const data = await res.json()
      
      setProgress(100)
      setResults(data.results || [])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [selectedStrands, genType, useLLM, itemsPerStrand])

  const successCount = results.filter(r => r.success).length
  const totalItems = results.reduce((sum, r) => sum + r.itemCount, 0)

  return (
    <QuarryPageLayout
      title="Batch Generate"
      description="Generate content for multiple strands"
      showRightPanel={true}
      rightPanelContent={<AmbienceRightSidebar />}
      rightPanelWidth={260}
      forceSidebarSmall={true}
      leftPanelContent={
        <ToolPageLeftSidebar
          isDark={isDark}
          title="Batch Generate"
          description="Generate flashcards, quizzes, and learning content for multiple strands at once."
          tips={[
            'Select multiple strands from different weaves',
            'AI enhancement improves question quality',
            'Generated content is saved to each strand'
          ]}
          relatedLinks={[
            { href: '/quarry/learn', label: 'Learn Mode', icon: GraduationCap },
            { href: '/quarry/suggestions', label: 'AI Suggestions', icon: SparklesIcon },
          ]}
        />
      }
    >
      <div className={`min-h-screen ${isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/quarry/"
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    Batch Generate
                  </h1>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Generate content for multiple strands
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Settings */}
        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Generation Settings
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Type */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGenType('flashcards')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    genType === 'flashcards'
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Flashcards
                </button>
                <button
                  onClick={() => setGenType('quiz')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    genType === 'quiz'
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <FileQuestion className="w-4 h-4" />
                  Quiz
                </button>
              </div>
            </div>
            
            {/* AI Toggle */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">AI Enhancement</label>
              <button
                onClick={() => setUseLLM(!useLLM)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  useLLM
                    ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                    : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                <Zap className="w-4 h-4" />
                {useLLM ? 'AI Enabled' : 'NLP Only'}
              </button>
            </div>
            
            {/* Items per strand */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Items per Strand</label>
              <select
                value={itemsPerStrand}
                onChange={e => setItemsPerStrand(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  isDark ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-900'
                }`}
              >
                <option value={3}>3 items</option>
                <option value={5}>5 items</option>
                <option value={8}>8 items</option>
                <option value={10}>10 items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Count & Generate Button */}
        <div className={`p-4 rounded-xl mb-6 flex items-center justify-between ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}>
          <div>
            <span className="text-lg font-bold">{selectedStrands.length}</span>
            <span className={`ml-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>strands selected</span>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generating || selectedStrands.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Generate
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        {generating && (
          <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Results: {successCount}/{results.length} successful, {totalItems} items generated
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((r, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'
                  }`}
                >
                  <span className="text-sm truncate flex-1">{r.strandPath.split('/').pop()}</span>
                  {r.success ? (
                    <span className="text-emerald-500 text-sm">{r.itemCount} items</span>
                  ) : (
                    <span className="text-red-500 text-sm">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`p-4 rounded-xl mb-6 border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {error}
          </div>
        )}

        {/* Weave List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="space-y-2">
            {weaves.map(weave => (
              <div 
                key={weave.name}
                className={`rounded-xl overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}
              >
                {/* Weave Header */}
                <div 
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-50'
                  }`}
                  onClick={() => toggleWeave(weave.name)}
                >
                  <div className="flex items-center gap-3">
                    {weave.expanded ? (
                      <FolderOpen className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Folder className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="font-medium">{weave.name}</span>
                    <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      ({weave.strands.length} strands)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        selectAllInWeave(weave.name, !weave.strands.every(s => s.selected))
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-100 hover:bg-zinc-200'
                      }`}
                    >
                      {weave.strands.every(s => s.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                    {weave.expanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
                
                {/* Strands */}
                <AnimatePresence>
                  {weave.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-200 dark:border-zinc-700"
                    >
                      <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        {weave.strands.map(strand => (
                          <label
                            key={strand.path}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              strand.selected
                                ? isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'
                                : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={strand.selected}
                              onChange={() => toggleStrand(weave.name, strand.path)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-sm truncate">{strand.title}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
        </main>
      </div>
    </QuarryPageLayout>
  )
}

