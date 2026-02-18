/**
 * Citation Manager Plugin for FABRIC
 *
 * Manage academic citations with BibTeX support.
 * Use [@citation-key] syntax in your strands.
 */

import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Search, Trash2, ExternalLink, Copy } from 'lucide-react'

// Base plugin class
class FabricPlugin {
  manifest: any
  api: any
  context: any
  async onLoad() {}
  async onUnload() {}
  protected log(message: string) {
    console.log(`[${this.manifest?.name}] ${message}`)
  }
  protected success(message: string) {
    this.api?.showNotice(message, 'success')
  }
}

// Types
interface Citation {
  key: string
  type: 'article' | 'book' | 'inproceedings' | 'misc'
  title: string
  author: string
  year: string
  journal?: string
  publisher?: string
  url?: string
  doi?: string
  pages?: string
  volume?: string
  issue?: string
}

interface WidgetProps {
  api: any
  settings: Record<string, unknown>
  theme: string
  isDark: boolean
}

interface RendererProps {
  match: RegExpMatchArray
  api: any
  content: string
}

// Citation Library Widget
function CitationLibraryWidget({ api, settings, theme, isDark }: WidgetProps) {
  const [citations, setCitations] = useState<Citation[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // Load citations from storage
  useEffect(() => {
    const stored = api.getData<Citation[]>('citations') || []
    setCitations(stored)
  }, [api])

  // Save citations to storage
  const saveCitations = (newCitations: Citation[]) => {
    setCitations(newCitations)
    api.setData('citations', newCitations)
  }

  // Add citation
  const addCitation = (citation: Citation) => {
    saveCitations([...citations, citation])
    setShowAdd(false)
    api.showNotice(`Added citation: ${citation.key}`, 'success')
  }

  // Remove citation
  const removeCitation = (key: string) => {
    saveCitations(citations.filter((c) => c.key !== key))
    api.showNotice('Citation removed', 'info')
  }

  // Copy citation key to clipboard
  const copyKey = (key: string) => {
    navigator.clipboard.writeText(`[@${key}]`)
    api.showNotice('Copied to clipboard', 'success')
  }

  // Filter citations
  const filtered = citations.filter(
    (c) =>
      c.key.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="citation-widget p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className="font-semibold text-sm">Citations</span>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            ({citations.length})
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`p-1 rounded ${
            isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search citations..."
          className={`w-full pl-7 pr-2 py-1.5 text-xs rounded border ${
            isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
              : 'bg-white border-zinc-200 text-zinc-800'
          }`}
        />
      </div>

      {/* Add Form */}
      {showAdd && (
        <AddCitationForm
          onAdd={addCitation}
          onCancel={() => setShowAdd(false)}
          isDark={isDark}
        />
      )}

      {/* Citation List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className={`text-xs text-center py-4 ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            {citations.length === 0
              ? 'No citations yet. Add one to get started.'
              : 'No matching citations found.'}
          </p>
        ) : (
          filtered.map((citation) => (
            <CitationCard
              key={citation.key}
              citation={citation}
              onCopy={copyKey}
              onRemove={removeCitation}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Add Citation Form
function AddCitationForm({
  onAdd,
  onCancel,
  isDark,
}: {
  onAdd: (c: Citation) => void
  onCancel: () => void
  isDark: boolean
}) {
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState<Citation['type']>('article')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!key || !title || !author || !year) return

    onAdd({ key, title, author, year, type })
  }

  const inputClass = `w-full px-2 py-1.5 text-xs rounded border ${
    isDark
      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
      : 'bg-white border-zinc-200 text-zinc-800'
  }`

  return (
    <form onSubmit={handleSubmit} className={`p-2 mb-3 rounded ${
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
    }`}>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Citation key (e.g., smith2024)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Author(s)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={inputClass}
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Citation['type'])}
          className={inputClass}
        >
          <option value="article">Journal Article</option>
          <option value="book">Book</option>
          <option value="inproceedings">Conference Paper</option>
          <option value="misc">Other</option>
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Add Citation
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`px-2 py-1.5 text-xs rounded ${
            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
          }`}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Citation Card
function CitationCard({
  citation,
  onCopy,
  onRemove,
  isDark,
}: {
  citation: Citation
  onCopy: (key: string) => void
  onRemove: (key: string) => void
  isDark: boolean
}) {
  return (
    <div className={`p-2 rounded text-xs ${
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`font-mono font-medium ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              @{citation.key}
            </span>
            <span className={`px-1 py-0.5 rounded text-[9px] ${
              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
            }`}>
              {citation.type}
            </span>
          </div>
          <p className={`font-medium truncate mt-1 ${
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}>
            {citation.title}
          </p>
          <p className={`truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {citation.author} ({citation.year})
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onCopy(citation.key)}
            className={`p-1 rounded ${
              isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
            }`}
            title="Copy citation key"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(citation.key)}
            className={`p-1 rounded text-red-500 ${
              isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
            }`}
            title="Remove citation"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Citation Reference Renderer (inline in markdown)
function CitationReference({ match, api }: RendererProps) {
  const citationKey = match[1]
  const [citation, setCitation] = useState<Citation | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const citations = api.getData<Citation[]>('citations') || []
    const found = citations.find((c: Citation) => c.key === citationKey)
    setCitation(found || null)
  }, [citationKey, api])

  if (!citation) {
    return (
      <span className="citation-ref citation-missing" title="Citation not found">
        [@{citationKey}]
      </span>
    )
  }

  return (
    <span
      className="citation-ref"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      ({citation.author.split(',')[0].trim()}, {citation.year})
      {showTooltip && (
        <span className="citation-tooltip">
          <strong>{citation.title}</strong>
          <br />
          {citation.author} ({citation.year})
        </span>
      )}
    </span>
  )
}

// Plugin Class
class CitationManagerPlugin extends FabricPlugin {
  async onLoad() {
    // Register sidebar widget for managing citations
    this.api.registerSidebarWidget(CitationLibraryWidget)

    // Register markdown renderer for [@key] syntax
    this.api.registerMarkdownRenderer({
      pattern: /\[@([^\]]+)\]/g,
      component: CitationReference,
      priority: 10,
    })

    // Register command to insert citation
    this.api.registerCommand({
      id: 'citation:insert',
      name: 'Insert Citation',
      shortcut: 'mod+shift+c',
      callback: () => {
        this.api.showNotice('Use [@citation-key] syntax to insert citations', 'info')
      },
    })

    this.log('Citation Manager loaded!')
  }

  async onUnload() {
    this.log('Citation Manager unloaded')
  }
}

export default CitationManagerPlugin
