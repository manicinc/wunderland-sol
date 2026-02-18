'use client'

/**
 * SearchFullView - Full-featured search, visualization, and schema explorer
 * @module codex/ui/SearchFullView
 *
 * @description
 * Rendered when QuarryViewer has initialView='search'.
 * Contains search, knowledge graph, and schema explorer tabs.
 */

import Link from 'next/link'
import CodexSearch from '@/components/codex-search'
import CodexGraph from '@/components/codex-graph'
import CodexSchemaExplorer from '@/components/codex-schema-explorer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Map, Database, Sparkles, Home } from 'lucide-react'

interface SearchFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

// Dark themes
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

export default function SearchFullView({ theme = 'light', onOpenPreferences, onNavigateToStrand }: SearchFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)

  return (
    <div className={`flex-1 overflow-auto ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Search
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Search, visualize, and explore Quarry Codex
            </p>
          </div>
          <Link
            href="/quarry"
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
            }`}
            title="Back to Codex"
          >
            <Home className="w-5 h-5" />
          </Link>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="visualize" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Visualize
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Schema
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-8">
            <div className="max-w-4xl mx-auto">
              <CodexSearch />

              {/* Search Tips */}
              <div className={`mt-12 rounded-2xl p-8 ${
                isDark
                  ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20'
                  : 'bg-gradient-to-r from-purple-50 to-blue-50'
              }`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Pro Search Tips
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Natural Language</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ask questions like "How does OpenStrand handle authentication?" or
                      "What is the architecture of AgentOS?"
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Smart Filters</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Use prefixes like <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>type:loom</code> or
                      <code className={`ml-1 px-1 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>tag:tutorial</code>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Semantic Search</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Search understands context and meaning, not just keywords.
                      Try searching for concepts and ideas.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Relationships</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Find connected knowledge with <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>related:</code>
                      or <code className={`ml-1 px-1 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>requires:</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Visualize Tab */}
          <TabsContent value="visualize" className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Knowledge Graph</h2>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Explore the connections between concepts in Quarry Codex
              </p>
            </div>

            <CodexGraph height={600} />

            <div className="mt-8 grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  Weaves
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Complete universes of knowledge, self-contained and comprehensive
                </p>
              </div>
              <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  Looms
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Curated collections of related strands within a weave
                </p>
              </div>
              <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  Strands
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Individual units of knowledge - documents, images, or data
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Schema Tab */}
          <TabsContent value="schema" className="space-y-8">
            <CodexSchemaExplorer />
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <div className={`mt-16 text-center p-8 rounded-2xl relative overflow-hidden ${
          isDark ? 'bg-gradient-to-r from-gray-900 to-gray-800' : 'bg-gradient-to-r from-gray-50 to-gray-100'
        }`}>
          <div className="pointer-events-none absolute inset-0 opacity-10 flex items-center justify-center select-none">
            <span className="text-5xl md:text-7xl font-black tracking-widest text-red-500 uppercase">
              DON&apos;T PANIC
            </span>
          </div>
          <p className={`relative text-xs uppercase tracking-[0.25em] mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Your guide to the Quarry Codex
          </p>
          <h2 className="relative text-2xl font-bold mb-4">Ready to explore?</h2>
          <p className={`relative mb-6 max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The Quarry Codex is constantly growing. Browse the latest additions or contribute your own knowledge.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/quarry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Browse Codex
            </Link>
            <Link
              href="https://github.com/framersai/codex"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-600 hover:text-white transition-colors"
            >
              Contribute on GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
