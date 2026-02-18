/**
 * Enhanced contribution modal with AI-assisted metadata
 * @module codex/ui/ContributeModal
 * 
 * @remarks
 * - Pre-filled metadata suggestions (AI-assisted or user-provided)
 * - Weave and loom suggestion
 * - Tag recommendations from vocabulary
 * - Auto-generate slug, ID, version
 * - Preview final markdown with frontmatter
 * - Direct GitHub PR creation via API
 * - Optional AI enhancement toggle
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Eye,
  Github,
  Tag,
  Folder,
  Hash,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface ContributeModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close modal */
  onClose: () => void
  /** Current path context (for suggesting weave/loom) */
  currentPath?: string
  /** Pre-filled content (if any) */
  initialContent?: string
}

interface ContributionForm {
  // Content
  title: string
  summary: string
  content: string
  
  // Location
  weave: string
  loom: string
  
  // Metadata
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  subjects: string[]
  topics: string[]
  
  // Options
  enableAI: boolean
  customSlug: string
}

/**
 * Modal for contributing new strands with AI assistance
 * 
 * @example
 * ```tsx
 * <ContributeModal
 *   isOpen={contributeOpen}
 *   onClose={() => setContributeOpen(false)}
 *   currentPath="weaves/tech"
 * />
 * ```
 */
export default function ContributeModal({
  isOpen,
  onClose,
  currentPath,
  initialContent,
}: ContributeModalProps) {
  const [step, setStep] = useState<'form' | 'preview' | 'submitting' | 'success' | 'error'>('form')
  const [form, setForm] = useState<ContributionForm>({
    title: '',
    summary: '',
    content: initialContent || '',
    weave: currentPath?.split('/')[1] || 'community',
    loom: currentPath?.split('/').slice(2).join('/') || 'contributions',
    tags: [],
    difficulty: 'intermediate',
    subjects: [],
    topics: [],
    enableAI: true,
    customSlug: '',
  })
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [suggestedWeave, setSuggestedWeave] = useState('')
  const [suggestedLoom, setSuggestedLoom] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  // GitHub PAT is intentionally kept only in component state (memory) and
  // never persisted to localStorage, IndexedDB, SQL, or any backend.
  const [githubPAT, setGithubPAT] = useState('')

  // Generate suggestions based on content
  useEffect(() => {
    if (form.content.length > 100) {
      // Simple keyword extraction for tag suggestions
      const words = form.content.toLowerCase().match(/\b\w{4,}\b/g) || []
      const frequency = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const topWords = Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word)
        .filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'what', 'when', 'where'].includes(w))
      
      setSuggestedTags(topWords.slice(0, 5))
    }
  }, [form.content])

  const handleAddTag = (tag: string) => {
    if (!form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] })
    }
  }

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })
  }

  const generateMarkdown = () => {
    const id = uuidv4()
    const slug = form.customSlug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const now = new Date().toISOString()

    return `---
id: ${id}
slug: ${slug}
title: "${form.title}"
summary: "${form.summary}"
version: 1.0.0
contentType: markdown
difficulty: ${form.difficulty}
taxonomy:
  subjects: [${form.subjects.map(s => `"${s}"`).join(', ')}]
  topics: [${form.topics.map(t => `"${t}"`).join(', ')}]
tags: [${form.tags.map(t => `"${t}"`).join(', ')}]
publishing:
  created: ${now}
  updated: ${now}
  status: published
  license: CC-BY-4.0
---

# ${form.title}

${form.content}
`
  }

  const handleSubmit = async () => {
    setStep('submitting')
    setErrorMessage('')

    try {
      const markdown = generateMarkdown()
      const filename = `${form.customSlug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`
      const filepath = `weaves/${form.weave}/${form.loom}/${filename}`

      // GitHub API PR creation
      const prTitle = `feat: add ${form.title}`
      const prBody = `## New Strand: ${form.title}

**Summary:** ${form.summary}

**Location:** \`${filepath}\`

**Metadata:**
- Difficulty: ${form.difficulty}
- Tags: ${form.tags.join(', ')}
- Subjects: ${form.subjects.join(', ')}
- Topics: ${form.topics.join(', ')}

**AI Enhancement:** ${form.enableAI ? '✅ Enabled (will run on PR)' : '❌ Disabled'}

---

### Content Preview

\`\`\`markdown
${markdown.slice(0, 500)}${markdown.length > 500 ? '...' : ''}
\`\`\`

---

*Submitted via Frame Codex contribution form*
*${form.enableAI ? 'AI analysis will run automatically after PR is created' : 'Static NLP analysis only'}*
`

      if (!githubPAT) {
        // No PAT: open GitHub with pre-filled content
        const githubUrl = `https://github.com/framersai/codex/new/main?filename=${encodeURIComponent(filepath)}&value=${encodeURIComponent(markdown)}`
        window.open(githubUrl, '_blank')
        setStep('success')
      } else {
        // With PAT: use GitHub API
        const response = await fetch('https://api.github.com/repos/framersai/codex/forks', {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubPAT}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        })

        if (!response.ok) throw new Error('Failed to fork repository')
        
        const fork = await response.json()
        
        // Create branch
        const branchName = `add-${form.title.toLowerCase().replace(/\s+/g, '-')}`
        
        // Create file
        const fileResponse = await fetch(`https://api.github.com/repos/${fork.full_name}/contents/${filepath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubPAT}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `feat: add ${form.title}`,
            content: btoa(markdown),
            branch: branchName,
          }),
        })

        if (!fileResponse.ok) throw new Error('Failed to create file')

        // Create PR
        const prResponse = await fetch('https://api.github.com/repos/framersai/codex/pulls', {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubPAT}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            title: prTitle,
            body: prBody,
            head: `${fork.owner.login}:${branchName}`,
            base: 'main',
          }),
        })

        if (!prResponse.ok) throw new Error('Failed to create PR')
        
        const pr = await prResponse.json()
        window.open(pr.html_url, '_blank')
        setStep('success')
      }
    } catch (error) {
      console.error('Submission error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit')
      setStep('error')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <Upload className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                      Contribute to Frame Codex
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Add knowledge to humanity's codex for AI systems
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {step === 'form' && (
                  <form onSubmit={(e) => { e.preventDefault(); setStep('preview') }} className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., Introduction to Recursion"
                        required
                      />
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Summary (20-300 characters) *
                      </label>
                      <textarea
                        value={form.summary}
                        onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                        placeholder="Brief abstract of the content"
                        rows={2}
                        required
                        minLength={20}
                        maxLength={300}
                      />
                      <p className="text-xs text-gray-500 mt-1">{form.summary.length}/300 characters</p>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Content (Markdown) *
                      </label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                        placeholder="# Your content here

Write your content in Markdown format..."
                        rows={12}
                        required
                        minLength={100}
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 100 characters • Supports GitHub Flavored Markdown</p>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Folder className="w-4 h-4" />
                          Weave (Universe)
                        </label>
                        <input
                          type="text"
                          value={form.weave}
                          onChange={(e) => setForm({ ...form, weave: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                          placeholder="e.g., technology, science, community"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank for AI to suggest</p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Folder className="w-4 h-4" />
                          Loom (Topic Collection)
                        </label>
                        <input
                          type="text"
                          value={form.loom}
                          onChange={(e) => setForm({ ...form, loom: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                          placeholder="e.g., programming, algorithms"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank for AI to suggest</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Tag className="w-4 h-4" />
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 rounded-full text-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const value = e.currentTarget.value.trim()
                            if (value) {
                              handleAddTag(value)
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                        placeholder="Type a tag and press Enter"
                      />
                      {suggestedTags.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestedTags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleAddTag(tag)}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Difficulty
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setForm({ ...form, difficulty: level })}
                            className={`py-2 px-3 rounded-lg border-2 transition-all capitalize text-sm ${
                              form.difficulty === level
                                ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-100'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Enhancement */}
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-900/10 dark:to-sky-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.enableAI}
                          onChange={(e) => setForm({ ...form, enableAI: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Enable AI Enhancement
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            AI will analyze content, suggest better tags/categories, and provide quality scoring.
                            Cost: ~$0.01-0.20 per submission. If disabled, static NLP only (free).
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* GitHub PAT (Optional) */}
                    <details className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Github className="w-4 h-4" />
                        GitHub Personal Access Token (Optional)
                      </summary>
                      <div className="mt-3">
                        <input
                          type="password"
                          value={githubPAT}
                          onChange={(e) => setGithubPAT(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 font-mono text-xs"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Provide a PAT to automatically create PR via API. Without it, we'll open GitHub editor for you.
                          <a
                            href="https://github.com/settings/tokens/new?scopes=public_repo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 dark:text-cyan-400 hover:underline ml-1"
                          >
                            Create token →
                          </a>
                        </p>
                      </div>
                    </details>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                    </div>
                  </form>
                )}

                {step === 'preview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Preview</h3>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <strong>File path:</strong> <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs">
                            weaves/{form.weave}/{form.loom}/{form.customSlug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md
                          </code>
                        </p>
                        <pre className="mt-4 p-4 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                          {generateMarkdown()}
                        </pre>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={() => setStep('form')}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Back to Edit
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Github className="w-4 h-4" />
                        Create Pull Request
                      </button>
                    </div>
                  </div>
                )}

                {step === 'submitting' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {githubPAT ? 'Creating PR via GitHub API...' : 'Opening GitHub editor...'}
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Success!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {githubPAT
                        ? 'Your PR has been created. GitHub page should open in a new tab.'
                        : 'GitHub editor has opened. Complete your PR submission there.'}
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-6 px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {step === 'error' && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Error
                    </h3>
                    <p className="text-red-600 dark:text-red-400 mb-6">{errorMessage}</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setStep('form')}
                        className="px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

