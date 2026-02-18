'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Link as LinkIcon, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

interface SubmissionFormData {
  title: string
  content: string
  url?: string
  tags: string
  difficulty: 'beginner' | 'intermediate' | 'advanced' | ''
  subjects: string
  topics: string
}

interface CodexSubmitProps {
  isOpen: boolean
  onClose: () => void
}

export default function CodexSubmit({ isOpen, onClose }: CodexSubmitProps) {
  const [mode, setMode] = useState<'url' | 'file' | 'text'>('text')
  const [formData, setFormData] = useState<SubmissionFormData>({
    title: '',
    content: '',
    url: '',
    tags: '',
    difficulty: '',
    subjects: '',
    topics: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Validate required fields
      if (!formData.title || !formData.content) {
        throw new Error('Title and content are required')
      }

      // Generate metadata
      const metadata = {
        title: formData.title,
        slug: formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        difficulty: formData.difficulty || 'intermediate',
        taxonomy: {
          subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
          topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        },
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        version: '1.0.0',
        contentType: 'strand',
      }

      // Build markdown content with frontmatter
      const frontmatter = `---
id: ${crypto.randomUUID()}
slug: ${metadata.slug}
title: "${metadata.title}"
difficulty: ${metadata.difficulty}
taxonomy:
  subjects: [${metadata.taxonomy.subjects.map(s => `"${s}"`).join(', ')}]
  topics: [${metadata.taxonomy.topics.map(t => `"${t}"`).join(', ')}]
tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]
version: ${metadata.version}
contentType: ${metadata.contentType}
---

${formData.content}
`

      // Create GitHub PR via API
      const prBody = `## New Strand Submission

**Title:** ${metadata.title}
**Difficulty:** ${metadata.difficulty}
**Tags:** ${metadata.tags.join(', ')}

### Content Preview
\`\`\`markdown
${frontmatter.slice(0, 500)}...
\`\`\`

---
*This PR was auto-generated via the Quarry Codex submission form.*
`

      // For now, just show success and provide GitHub link
      // In production, this would use GitHub API with a PAT
      const githubUrl = `https://github.com/framersai/quarry/new/master?filename=weaves/community/looms/submissions/strands/${metadata.slug}.md&value=${encodeURIComponent(frontmatter)}`
      
      setSubmitStatus('success')
      
      // Open GitHub in new tab after short delay
      setTimeout(() => {
        window.open(githubUrl, '_blank')
      }, 1500)

    } catch (error) {
      console.error('Submission error:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setFormData(prev => ({
        ...prev,
        content,
        title: prev.title || file.name.replace(/\.(md|mdx|txt)$/i, ''),
      }))
    }
    reader.readAsText(file)
  }

  const handleUrlScrape = async () => {
    if (!formData.url) return
    
    setIsSubmitting(true)
    try {
      // In production, this would use a serverless function to scrape/convert
      // For now, just show a message
      setErrorMessage('URL scraping coming soon! For now, please paste content directly.')
      setSubmitStatus('error')
    } catch (error) {
      setErrorMessage('Failed to fetch URL content')
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[100] backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Submit to Quarry Codex
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Contribute knowledge to humanity's open repository
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'text'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setMode('file')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'file'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => setMode('url')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'url'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                URL
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* URL Mode */}
            {mode === 'url' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  URL to Import
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/article"
                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleUrlScrape}
                    disabled={!formData.url || isSubmitting}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors"
                  >
                    Fetch
                  </button>
                </div>
              </div>
            )}

            {/* File Upload Mode */}
            {mode === 'file' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Upload File
                </label>
                <input
                  type="file"
                  accept=".md,.mdx,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Introduction to Recursion"
                required
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Content * (Markdown supported)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="# Your Content Here

Write your knowledge contribution in Markdown..."
                required
                rows={12}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select...</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="recursion, algorithms, tutorial"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.subjects}
                  onChange={(e) => setFormData(prev => ({ ...prev, subjects: e.target.value }))}
                  placeholder="technology, computer-science"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.topics}
                  onChange={(e) => setFormData(prev => ({ ...prev, topics: e.target.value }))}
                  placeholder="algorithms, programming"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Opening GitHub to create your PR...
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {errorMessage}
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By submitting, you agree to license your contribution under MIT.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title || !formData.content}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
